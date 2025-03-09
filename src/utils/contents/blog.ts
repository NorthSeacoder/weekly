import {getCachedData} from '@/lib/cache';
import type {BlogPost} from '@/types/blog';
import {getEnhancedCollection} from './content-utils';
import getReadingTime from 'reading-time';
import dayjs from 'dayjs';
import {getPermalink} from '../permalinks';
import {processMarkdown} from '../remark';

export async function getBlogPosts(): Promise<Record<string, BlogPost[]>> {
    return getCachedData<Record<string, BlogPost[]>>(
        'blog-posts',
        async () => {
            try {
                const content = await getEnhancedCollection('blog');

                if (!content || content.length === 0) {
                    console.warn('No content found in directory');
                    return [];
                }
                const blogList = await Promise.all(
                    content.map(async (item) => {
                        return {
                            ...item.data,
                            date: dayjs(item.data.date).format('YYYY-MM-DD'),
                            content: await processMarkdown(item.body),
                            readingTime: getReadingTime(item.body ?? '').text,
                            permalink: getPermalink(item.data.slug, 'blog-post'),
                            id: item.id.split('-').pop()
                        };
                    })
                );
                return blogList.filter((item) => !item.hidden).reduce((acc, item) => {
                    acc[item.category] = acc[item.category] || [];
                    acc[item.category].push(item);
                    return acc;
                }, {});
            } catch (error) {
                console.error('Error generating blog posts:', error);
                console.error('Error details:', {
                    message: (error as Error).message,
                    stack: (error as Error).stack
                });
                return {};
            }
        },
        {debug: true}
    );
}

export const getStaticPathsBlogPost = async () => {
    try {
        const posts = await getBlogPosts();
        const blogList = Object.values(posts).flat();
        return blogList.map((post) => ({
            params: {
                slug: post.slug
            },
            props: {post}
        }));
    } catch (error) {
        console.error('Error generating static paths:', error);
        return [];
    }
};
