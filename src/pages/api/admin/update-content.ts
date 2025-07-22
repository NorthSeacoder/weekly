import type { APIRoute } from 'astro';
import { ContentService } from '../../../../lib/database-service';

// 生产环境预渲染，开发环境服务端渲染
export const prerender = import.meta.env.MODE === 'production';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, contentData, tags } = body;

    // 验证参数
    if (!id || !contentData) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required parameters' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证内容数据
    const allowedFields = [
      'title', 'description', 'content', 'category_id', 'source',
      'meta_title', 'meta_description', 'content_format', 'status', 'featured', 'sort_order',
      'published_at', 'screenshot_api'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (contentData[field] !== undefined) {
        updateData[field] = contentData[field];
      }
    }

    // 验证必填字段
    if (updateData.title !== undefined && !updateData.title.trim()) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '标题不能为空' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (updateData.content !== undefined && !updateData.content.trim()) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '内容不能为空' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证状态值
    if (updateData.status && !['draft', 'published', 'archived', 'hidden'].includes(updateData.status)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid status value' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证内容格式
    if (updateData.content_format && !['markdown', 'mdx', 'html', 'plain'].includes(updateData.content_format)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid content format' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 更新内容
    const contentSuccess = await ContentService.updateContent(parseInt(id), updateData);

    if (!contentSuccess) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to update content' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 更新标签（如果提供了）
    if (tags && Array.isArray(tags)) {
      const tagsSuccess = await ContentService.updateContentTags(parseInt(id), tags);
      if (!tagsSuccess) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Content updated but failed to update tags' 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Content updated successfully' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating content:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 