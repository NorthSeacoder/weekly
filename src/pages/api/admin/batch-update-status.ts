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