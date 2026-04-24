import { WeeklyService } from '@/lib/content-service';
import type { WeeklyPost } from '@/types/weekly';

/**
 * 获取所有周刊文章
 * 直接从数据库获取数据（summary 版本，适合列表/导航等）
 */
export async function getWeeklyPosts(): Promise<WeeklyPost[]> {
    return WeeklyService.getWeeklyPostSummaries();
}

export async function getLatestWeeklyPost(): Promise<WeeklyPost | null> {
    return WeeklyService.getLatestWeeklyPostSummary();
}

/**
 * 获取所有周刊文章（包含 sections，适合详情页/Feed/搜索索引）
 */
export async function getWeeklyPostsWithSections(): Promise<WeeklyPost[]> {
    return WeeklyService.getWeeklyPosts();
}

export async function getWeeklyPostWithSectionsBySlug(slug: string): Promise<WeeklyPost | null> {
    return WeeklyService.getWeeklyPostBySlugWithSections(slug);
}

export async function getLatestWeeklyPostsWithSections(limit = 12): Promise<WeeklyPost[]> {
    return WeeklyService.getLatestWeeklyPostsWithSections(limit);
}

export async function getWeeklyIssueRoutes(): Promise<Array<Pick<WeeklyPost, 'id' | 'slug' | 'title' | 'date' | 'permalink'>>> {
    return WeeklyService.getWeeklyIssueRoutes();
}

/**
 * 生成周刊文章的静态路径
 */
export const getStaticPathsWeeklyPost = async () => {
    try {
        const posts = await getWeeklyIssueRoutes();
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
