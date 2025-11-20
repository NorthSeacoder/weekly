import type { APIRoute } from 'astro';
import { getWeeklyPosts, getBlogPosts } from '~/utils/contents/unified-content';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    // 获取周刊数据
    const weeklyPosts = await getWeeklyPosts();
    const weeklyData = weeklyPosts.map(post => {
      const sectionPreview = post.sections?.[0]?.content ?? '';
      return {
        type: 'weekly',
        title: post.title,
        description: sectionPreview,
        tags: post.tags || [],
        date: post.date,
        permalink: post.permalink,
        category: post.category || ''
      };
    });

    // 获取博客数据
    const blogPosts = await getBlogPosts();
    const blogData = Object.values(blogPosts)
      .flat()
      .map(post => ({
        type: 'blog',
        title: post.title,
        description: post.desc || '',
        tags: post.tags || [],
        date: post.date,
        permalink: post.permalink,
        category: post.category || ''
      }));

    // 合并并按日期倒序排序
    const allData = [...weeklyData, ...blogData].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    return new Response(JSON.stringify(allData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('生成搜索数据时出错:', error);
    return new Response(JSON.stringify({ error: '生成搜索数据失败' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
