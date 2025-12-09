import { WeeklyService } from '@/lib/content-service';
import type { WeeklyPost } from '@/types/weekly';

/**
 * 获取所有周刊文章
 * 直接从数据库获取数据
 */
export async function getWeeklyPosts(): Promise<WeeklyPost[]> {
    return WeeklyService.getWeeklyPosts();
}

/**
 * 生成周刊文章的静态路径
 */
export const getStaticPathsWeeklyPost = async () => {
    try {
        const posts = await getWeeklyPosts();
        return posts.map((post) => ({
            params: {
                slug: post.slug
            },
            props: { post }
        }));
    } catch (error) {
        console.error('Error generating weekly static paths:', error);
        return [];
    }
};
