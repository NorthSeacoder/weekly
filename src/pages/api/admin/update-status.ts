import type { APIRoute } from 'astro';
import { verifyAdminAccess } from '../../../utils/auth';
import { ContentService } from '../../../../lib/database-service';

// 禁用预渲染以访问request.headers
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
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