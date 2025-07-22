import type { APIRoute } from 'astro';
import { initDatabase, query } from '../../../../../lib/database';

// 生产环境预渲染，开发环境服务端渲染
export const prerender = import.meta.env.MODE === 'production';

export const GET: APIRoute = async ({ request, url }) => {
  try {

    initDatabase();

    // 获取查询参数
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const categoryFilter = url.searchParams.get('category');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');

    // 构建查询条件
    let whereConditions = [
      'c.status = "published"',
      'c.content_type_id = (SELECT id FROM content_types WHERE slug = "weekly")',
      'c.id NOT IN (SELECT content_id FROM weekly_content_items)'
    ];
    
    const queryParams: any[] = [];

    if (categoryFilter) {
      whereConditions.push('cat.slug = ?');
      queryParams.push(categoryFilter);
    }

    if (dateFrom) {
      whereConditions.push('DATE(c.created_at) >= ?');
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push('DATE(c.created_at) <= ?');
      queryParams.push(dateTo);
    }

    // 查询未关联的内容
    const contentQuery = `
      SELECT 
        c.id,
        c.title,
        c.slug,
        c.description,
        c.word_count,
        c.reading_time,
        c.source,
        c.created_at,
        c.updated_at,
        cat.name as category_name,
        cat.slug as category_slug,
        GROUP_CONCAT(t.name SEPARATOR ',') as tags
      FROM contents c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN content_tags ct ON c.id = ct.content_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const contents = await query(contentQuery, [...queryParams, limit, offset]);

    // 查询总数
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM contents c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE ${whereConditions.join(' AND ')}
    `;

    const [countResult] = await query(countQuery, queryParams);
    const total = (countResult as any).total;

    // 格式化结果
    const formattedContents = (contents as any[]).map(item => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      description: item.description,
      word_count: item.word_count,
      reading_time: item.reading_time,
      source: item.source,
      created_at: item.created_at,
      updated_at: item.updated_at,
      category: {
        name: item.category_name,
        slug: item.category_slug
      },
      tags: item.tags ? item.tags.split(',').map((tag: string) => tag.trim()) : []
    }));

    // 获取分类统计
    const categoryStatsQuery = `
      SELECT 
        cat.name as category_name,
        cat.slug as category_slug,
        COUNT(c.id) as count
      FROM contents c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.status = "published"
        AND c.content_type_id = (SELECT id FROM content_types WHERE slug = "weekly")
        AND c.id NOT IN (SELECT content_id FROM weekly_content_items)
      GROUP BY cat.id, cat.name, cat.slug
      ORDER BY count DESC
    `;

    const categoryStats = await query(categoryStatsQuery);

    return new Response(JSON.stringify({
      success: true,
      data: {
        contents: formattedContents,
        pagination: {
          total,
          limit,
          offset,
          has_more: offset + limit < total
        },
        category_stats: categoryStats
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('获取未关联内容错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 