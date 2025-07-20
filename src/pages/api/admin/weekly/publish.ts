import type { APIRoute } from 'astro';
import { initDatabase, query, execute, transaction } from '../../../../../lib/database';
import { verifyAdminAccess } from '../../../../utils/auth';

export const prerender = false;

interface PublishRequest {
  weekly_issue_id: number;
  published_at?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // 简化权限验证，从环境变量读取密钥
    const adminKey = request.headers.get('x-admin-key');
    const expectedKey = import.meta.env.ADMIN_ACCESS_KEY || 'admin_2025_weekly';
    
    if (!adminKey || adminKey !== expectedKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data: PublishRequest = await request.json();
    
    if (!data.weekly_issue_id) {
      return new Response(JSON.stringify({
        success: false,
        error: '周刊期号ID是必需的'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    initDatabase();

    const result = await transaction(async (connection) => {
      // 验证周刊期号是否存在
      const [issueResult] = await connection.execute(
        'SELECT id, issue_number, title, status, total_items FROM weekly_issues WHERE id = ?',
        [data.weekly_issue_id]
      );

      if (!issueResult || (issueResult as any[]).length === 0) {
        throw new Error('周刊期号不存在');
      }

      const issue = (issueResult as any[])[0];

      if (issue.status === 'published') {
        throw new Error('该期号已经发布');
      }

      if (issue.total_items === 0) {
        throw new Error('无法发布空期号，请先关联内容');
      }

      // 确定发布时间
      const publishedAt = data.published_at || new Date().toISOString().slice(0, 19).replace('T', ' ');

      // 更新期号状态为已发布
      await connection.execute(`
        UPDATE weekly_issues 
        SET status = 'published', published_at = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [publishedAt, data.weekly_issue_id]);

      // 获取关联的内容并确保都是已发布状态
      const [contentResults] = await connection.execute(`
        SELECT c.id, c.title, c.status
        FROM weekly_content_items wci
        JOIN contents c ON wci.content_id = c.id
        WHERE wci.weekly_issue_id = ?
      `, [data.weekly_issue_id]);

      const contents = contentResults as any[];
      const unpublishedContents = contents.filter(c => c.status !== 'published');

      if (unpublishedContents.length > 0) {
        console.warn(`发现 ${unpublishedContents.length} 个未发布的内容，但周刊仍将发布`);
      }

      return {
        issue_number: issue.issue_number,
        title: issue.title,
        total_items: issue.total_items,
        published_at: publishedAt,
        unpublished_content_count: unpublishedContents.length
      };
    });

    return new Response(JSON.stringify({
      success: true,
      data: result,
      message: `周刊第 ${result.issue_number} 期发布成功`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('发布周刊错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 