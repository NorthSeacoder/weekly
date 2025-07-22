import { useDatabase } from '@/lib/data-source-config';
import type { BlogPost } from '@/types/blog';
import type { WeeklyPost } from '@/types/weekly';

/**
 * 统一的博客内容获取接口
 * 根据配置自动选择从文件系统或数据库获取数据
 */
export async function getBlogPosts(): Promise<Record<string, BlogPost[]>> {
    if (useDatabase()) {
        // 从数据库获取
        const { getBlogPosts: getBlogPostsFromDB } = await import('./blog-db');
        return getBlogPostsFromDB();
    } else {
        // 从文件系统获取
        const { getBlogPosts: getBlogPostsFromFS } = await import('./blog');
        return getBlogPostsFromFS();
    }
}

/**
 * 统一的周刊内容获取接口
 */
export async function getWeeklyPosts(): Promise<WeeklyPost[]> {
    if (useDatabase()) {
        // 从数据库获取
        const { getWeeklyPosts: getWeeklyPostsFromDB } = await import('./weekly-db');
        return getWeeklyPostsFromDB();
    } else {
        // 从文件系统获取
        const { getWeeklyPosts: getWeeklyPostsFromFS } = await import('./weekly');
        return getWeeklyPostsFromFS();
    }
}

/**
 * 统一的博客文章获取接口（通过slug）
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    if (useDatabase()) {
        const { getBlogPostBySlug: getBlogPostBySlugFromDB } = await import('./blog-db');
        return getBlogPostBySlugFromDB(slug);
    } else {
        const { getBlogPostBySlug: getBlogPostBySlugFromFS } = await import('./blog');
        return getBlogPostBySlugFromFS(slug);
    }
}

/**
 * 统一的博客静态路径生成
 */
export const getStaticPathsBlogPost = async () => {
    if (useDatabase()) {
        const { getStaticPathsBlogPost: getStaticPathsFromDB } = await import('./blog-db');
        return getStaticPathsFromDB();
    } else {
        const { getStaticPathsBlogPost: getStaticPathsFromFS } = await import('./blog');
        return getStaticPathsFromFS();
    }
};

/**
 * 统一的周刊静态路径生成
 */
export const getStaticPathsWeeklyPost = async () => {
    console.log('useDatabase',useDatabase());
    if (useDatabase()) {
        const { getStaticPathsWeeklyPost: getStaticPathsFromDB } = await import('./weekly-db');
        return getStaticPathsFromDB();
    } else {
        const { getStaticPathsWeeklyPost: getStaticPathsFromFS } = await import('./weekly');
        return getStaticPathsFromFS();
    }
};

/**
 * 获取当前数据源信息（用于调试）
 */
export function getDataSourceInfo() {
    return {
        source: useDatabase() ? 'database' : 'filesystem',
        timestamp: new Date().toISOString()
    };
} 