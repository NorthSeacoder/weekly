import type { APIRoute } from 'astro';
import { verifyAdminAccess } from '../../../utils/auth';
import { CategoryService } from '../../../../lib/database-service';
import { query } from '../../../../lib/database';

// 禁用预渲染以访问request.headers
export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  // 权限验证
  if (!verifyAdminAccess(request)) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Unauthorized' 
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 获取所有分类
    const categories = await CategoryService.getAll();

    // 获取所有标签
    const tags = await query<{id: number, name: string, count: number}[]>(`
      SELECT id, name, count 
      FROM tags 
      ORDER BY count DESC, name ASC
    `);

    // 获取内容类型
    const contentTypes = await query<{id: number, name: string, slug: string}[]>(`
      SELECT id, name, slug 
      FROM content_types 
      ORDER BY name ASC
    `);

    return new Response(JSON.stringify({ 
      success: true,
      data: {
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          parent_id: cat.parent_id
        })),
        tags: tags.map(tag => ({
          id: tag.id,
          name: tag.name,
          count: tag.count
        })),
        contentTypes: contentTypes.map(type => ({
          id: type.id,
          name: type.name,
          slug: type.slug
        })),
        statusOptions: [
          { value: 'draft', label: '草稿' },
          { value: 'published', label: '已发布' },
          { value: 'hidden', label: '已隐藏' },
          { value: 'archived', label: '已归档' }
        ],
        formatOptions: [
          { value: 'mdx', label: 'MDX' },
          { value: 'markdown', label: 'Markdown' },
          { value: 'html', label: 'HTML' },
          { value: 'plain', label: '纯文本' }
        ]
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching options:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 