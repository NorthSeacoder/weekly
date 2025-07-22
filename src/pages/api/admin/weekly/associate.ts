import type { APIRoute } from 'astro';
import { initDatabase, query, execute, transaction } from '../../../../../lib/database';

// 生产环境预渲染，开发环境服务端渲染
export const prerender = import.meta.env.MODE === 'production';

interface AssociateRequest {
  weekly_issue_id: number;
  content_ids: number[];
}

export const POST: APIRoute = async ({ request }) => {
  try {

    const data: AssociateRequest = await request.json();
    
    if (!data.weekly_issue_id || !data.content_ids || !Array.isArray(data.content_ids)) {
      return new Response(JSON.stringify({
        success: false,
        error: '周刊期号ID和内容ID数组是必需的'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    initDatabase();

    const result = await transaction(async (connection) => {
      // 验证周刊期号是否存在
      const [issueCheck] = await connection.execute(
        'SELECT id FROM weekly_issues WHERE id = ?',
        [data.weekly_issue_id]
      );

      if (!issueCheck || (issueCheck as any[]).length === 0) {
        throw new Error('周刊期号不存在');
      }

      // 验证内容是否存在且为已发布状态
      const [contentCheck] = await connection.execute(
        `SELECT id FROM contents WHERE id IN (${data.content_ids.map(() => '?').join(',')}) AND status = 'published'`,
        data.content_ids
      );

      const validContentIds = (contentCheck as any[]).map(row => row.id);
      if (validContentIds.length !== data.content_ids.length) {
        const invalidIds = data.content_ids.filter(id => !validContentIds.includes(id));
        throw new Error(`以下内容ID无效或未发布: ${invalidIds.join(', ')}`);
      }

      // 检查是否已有关联
      const [existingAssociations] = await connection.execute(
        `SELECT content_id FROM weekly_content_items 
         WHERE weekly_issue_id = ? AND content_id IN (${data.content_ids.map(() => '?').join(',')})`,
        [data.weekly_issue_id, ...data.content_ids]
      );

      const existingContentIds = (existingAssociations as any[]).map(row => row.content_id);
      if (existingContentIds.length > 0) {
        throw new Error(`以下内容已关联到此期号: ${existingContentIds.join(', ')}`);
      }

      // 获取当前期号的最大排序值
      const [maxSortResult] = await connection.execute(
        'SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM weekly_content_items WHERE weekly_issue_id = ?',
        [data.weekly_issue_id]
      );
      let currentSort = ((maxSortResult as any).max_sort ?? -1) + 1;

      // 批量插入关联关系
      const insertPromises = data.content_ids.map(async (contentId) => {
        await connection.execute(
          'INSERT INTO weekly_content_items (weekly_issue_id, content_id, sort_order) VALUES (?, ?, ?)',
          [data.weekly_issue_id, contentId, currentSort++]
        );
      });

      await Promise.all(insertPromises);

      // 更新周刊期号的统计信息
      const [statsResult] = await connection.execute(`
        SELECT 
          COUNT(*) as total_items,
          SUM(c.word_count) as total_word_count,
          SUM(c.reading_time) as total_reading_time
        FROM weekly_content_items wci
        JOIN contents c ON wci.content_id = c.id
        WHERE wci.weekly_issue_id = ?
      `, [data.weekly_issue_id]);

      const stats = (statsResult as any)[0];

      await connection.execute(`
        UPDATE weekly_issues 
        SET total_items = ?, total_word_count = ?, reading_time = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [
        stats.total_items,
        stats.total_word_count || 0,
        stats.total_reading_time || 0,
        data.weekly_issue_id
      ]);

      return {
        associated_count: data.content_ids.length,
        total_items: stats.total_items,
        total_word_count: stats.total_word_count || 0,
        reading_time: stats.total_reading_time || 0
      };
    });

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('关联内容错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 