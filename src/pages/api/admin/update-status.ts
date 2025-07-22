import type { APIRoute } from 'astro';
import { ContentService } from '../../../../lib/database-service';

// 生产环境预渲染，开发环境服务端渲染
export const prerender = import.meta.env.MODE === 'production';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, status } = body;

    // 验证参数
    if (!id || !status) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required parameters' 
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

    // 更新状态
    const success = await ContentService.updateStatus(parseInt(id), status);

    if (success) {
      return new Response(JSON.stringify({ 
        success: true,
        message: `Content status updated to ${status}` 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to update content status' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error updating content status:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 