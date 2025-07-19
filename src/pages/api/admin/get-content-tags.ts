import type { APIRoute } from 'astro';
import { verifyAdminAccess } from '../../../utils/auth';
import { ContentService } from '../../../../lib/database-service';

// 禁用预渲染以访问request.headers
export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
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
    const contentId = url.searchParams.get('id');
    
    if (!contentId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing content ID' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取内容标签
    const tags = await ContentService.getContentTags(parseInt(contentId));

    return new Response(JSON.stringify({ 
      success: true,
      data: tags.map(tag => tag.name)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Failed to get content tags:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 