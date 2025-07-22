import type { APIRoute } from 'astro';
import { ContentService } from '../../../../lib/database-service';

// 生产环境预渲染，开发环境服务端渲染
export const prerender = import.meta.env.MODE === 'production';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { ids, status } = body;

    // 验证参数
    if (!ids || !Array.isArray(ids) || ids.length === 0 || !status) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required parameters or invalid ids array' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证状态值
    const validStatuses = ['draft', 'published', 'archived', 'hidden'];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid status value' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证所有ID都是数字
    const numericIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (numericIds.length !== ids.length) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'All IDs must be valid numbers' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 批量更新状态
    const affectedRows = await ContentService.batchUpdateStatus(numericIds, status);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Updated ${affectedRows} content items to ${status}`,
      affectedRows 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error batch updating content status:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 