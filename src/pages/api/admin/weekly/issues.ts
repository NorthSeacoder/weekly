import type { APIRoute } from 'astro';
import { initDatabase, query } from '../../../../../lib/database';

// 生产环境预渲染，开发环境服务端渲染
export const prerender = import.meta.env.MODE === 'production';

export const GET: APIRoute = async ({ request, url }) => {
  try {

    initDatabase();

    // 获取查询参数
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');

    // 构建查询条件
    let whereConditions: string[] = [];
    const queryParams: any[] = [];

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 查询周刊期号列表
    const issuesQuery = `
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
      ${whereClause}
      ORDER BY issue_number DESC
      LIMIT ? OFFSET ?
    `;

    const issues = await query(issuesQuery, [...queryParams, limit, offset]);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM weekly_issues
      ${whereClause}
    `;

    const [countResult] = await query(countQuery, queryParams);
    const total = (countResult as any).total;

    // 获取状态统计
    const statusStatsQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM weekly_issues
      GROUP BY status
      ORDER BY 
        CASE status 
          WHEN 'draft' THEN 1 
          WHEN 'published' THEN 2 
          WHEN 'archived' THEN 3 
        END
    `;

    const statusStats = await query(statusStatsQuery);

    return new Response(JSON.stringify({
      success: true,
      data: {
        issues: issues,
        pagination: {
          total,
          limit,
          offset,
          has_more: offset + limit < total
        },
        status_stats: statusStats
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('获取周刊期号列表错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 