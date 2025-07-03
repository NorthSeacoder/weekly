import { WeeklyService } from '@/lib/content-service';
import type { WeeklyPost, PostsByMonth } from '@/types/weekly';

/**
 * 获取所有周刊文章（数据库版本）
 */
export async function getWeeklyPosts(): Promise<WeeklyPost[]> {
    return WeeklyService.getWeeklyPosts();
}

/**
 * 生成周刊文章的静态路径（数据库版本）
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

/**
 * 根据slug获取单期周刊（数据库版本）
 */
export async function getWeeklyPostBySlug(slug: string): Promise<WeeklyPost | null> {
    try {
        const allPosts = await getWeeklyPosts();
        return allPosts.find(post => post.slug === slug) || null;
    } catch (error) {
        console.error('Error getting weekly post by slug:', error);
        return null;
    }
}

/**
 * 获取周刊按月份分组的数据（数据库版本）
 */
export async function getPostsByMonth(): Promise<PostsByMonth> {
    try {
        const posts = await getWeeklyPosts();
        const monthSet = new Set<string>();
        
        posts.forEach(post => {
            const date = new Date(post.date);
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthSet.add(month);
        });
        
        return Array.from(monthSet).sort().reverse();
    } catch (error) {
        console.error('Error getting posts by month:', error);
        return [];
    }
} 