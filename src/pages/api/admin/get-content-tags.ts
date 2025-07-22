import type { APIRoute } from 'astro';
import { ContentService } from '../../../../lib/database-service';

// 生产环境预渲染，开发环境服务端渲染
export const prerender = import.meta.env.MODE === 'production';

export const GET: APIRoute = async ({ request, url }) => {
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