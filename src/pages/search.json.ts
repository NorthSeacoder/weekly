import type { APIRoute } from 'astro';
import { getWeeklyPosts } from '~/utils/contents/unified-content';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    // 获取周刊数据
    const weeklyPosts = await getWeeklyPosts();
    const weeklyData = weeklyPosts.map(post => {
      return {
        title: post.title,
        description: post.desc || post.title,
        tags: post.tags || [],
        date: post.date,
        permalink: post.permalink,
        category: post.category || ''
      };
    });

    // 按日期倒序排序
    const allData = weeklyData.sort((a, b) => {
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
