import type { APIRoute } from 'astro';
import { initDatabase, query } from '../../../../../lib/database';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // 简化权限验证，从环境变量读取密钥
    const adminKey = request.headers.get('x-admin-key') || url.searchParams.get('admin_key');
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

    const issueId = url.searchParams.get('id');
    if (!issueId) {
      return new Response(JSON.stringify({
        success: false,
        error: '期号ID是必需的'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    initDatabase();

    // 获取期号基本信息
    const issueQuery = `
      SELECT 
        id,
        issue_number,
        title,
        slug,
        description,
        start_date,
        end_date,
        total_items,
        total_word_count,
        reading_time,
        status,
        published_at,
        created_at,
        updated_at
      FROM weekly_issues
      WHERE id = ?
    `;

    const [issue] = await query(issueQuery, [issueId]);

    if (!issue) {
      return new Response(JSON.stringify({
        success: false,
        error: '期号不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取关联的内容
    const contentQuery = `
      SELECT 
        c.id,
        c.title,
        c.slug,
        c.description,
        c.content,
        c.word_count,
        c.reading_time,
        c.source,
        c.created_at,
        c.updated_at,
        cat.name as category_name,
        cat.slug as category_slug,
        wci.sort_order,
        GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ',') as tags
      FROM weekly_content_items wci
      JOIN contents c ON wci.content_id = c.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN content_tags ct ON c.id = ct.content_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE wci.weekly_issue_id = ?
      GROUP BY c.id, wci.sort_order
      ORDER BY wci.sort_order ASC
    `;

    const contents = await query(contentQuery, [issueId]);

    // 格式化内容数据
    const formattedContents = (contents as any[]).map(item => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      description: item.description,
      content: item.content,
      word_count: item.word_count,
      reading_time: item.reading_time,
      source: item.source,
      created_at: item.created_at,
      updated_at: item.updated_at,
      category: item.category_name,
      category_slug: item.category_slug,
      sort_order: item.sort_order,
      tags: item.tags ? item.tags.split(',').map((tag: string) => tag.trim()) : []
    }));

    return new Response(JSON.stringify({
      success: true,
      data: {
        issue: issue,
        sections: formattedContents
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('获取期号详情错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 