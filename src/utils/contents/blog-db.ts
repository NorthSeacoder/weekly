import { BlogService } from '@/lib/content-service';
import type { BlogPost } from '@/types/blog';

/**
 * 获取所有博客文章（数据库版本）
 */
export async function getBlogPosts(): Promise<Record<string, BlogPost[]>> {
    return BlogService.getBlogPosts();
}

/**
 * 生成博客文章的静态路径（数据库版本）
 */
export const getStaticPathsBlogPost = async () => {
    try {
        const posts = await getBlogPosts();
        const blogList = Object.values(posts).flat();
        return blogList.map((post) => ({
            params: {
                slug: post.slug
            },
            props: { post }
        }));
    } catch (error) {
        console.error('Error generating static paths:', error);
        return [];
    }
};

/**
 * 根据slug获取单篇博客文章（数据库版本）
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    return BlogService.getBlogPostBySlug(slug);
} 