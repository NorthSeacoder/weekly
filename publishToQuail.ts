import {WeeklyService} from './lib/content-service';
import {structuredContentToText} from './lib/structured-content';
import dotenv from 'dotenv';

dotenv.config();
const API_BASE = 'https://api.quail.ink';

interface PostData {
    title: string;
    content: string;
    status?: string;
    tags?: string;
    excerpt?: string;
    language?: string;
    metadata?: {
        author?: string;
        publication_date?: string;
        source?: string;
    };
}

async function request(endpoint: string, method: string, data?: any) {
    const QUAIL_API_KEY = process.env.QUAIL_API_KEY;

    console.log(`[DEBUG] Sending ${method} request to ${endpoint}`);
    if (data) {
        console.log('[DEBUG] Request data:', JSON.stringify(data, null, 2));
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-QUAIL-KEY': QUAIL_API_KEY as string
        },
        body: data ? JSON.stringify(data) : undefined
    });

    const json = await response.json();

    if (!response.ok) {
        console.error('[DEBUG] Response status:', response.status);
        console.error('[DEBUG] Response headers:', response.headers);
        console.error('[DEBUG] Error response:', json);
        throw new Error(`API error: ${json.message || json.msg || response.statusText}`);
    }

    console.log('[DEBUG] Response:', JSON.stringify(json.data, null, 2));
    return json.data;
}

function transformContent(content: string): string {
    console.log('[DEBUG] Transforming content', content);
    return content;
}

async function publishToQuail() {
    const QUAIL_API_KEY = process.env.QUAIL_API_KEY;
    const LIST_ID = process.env.QUAIL_LIST_ID;

    if (!QUAIL_API_KEY || !LIST_ID) {
        throw new Error('Missing Quail API key or List ID');
    }

    const listId = parseInt(LIST_ID, 10);
    if (isNaN(listId)) {
        throw new Error('LIST_ID must be a valid number');
    }

    const posts = await WeeklyService.getWeeklyPosts();
    if (!posts || posts.length === 0) {
        console.log('No posts to publish');
        return;
    }

    const latestPost = posts[0];
    console.log(`Publishing latest post: ${latestPost.title}`);

    // 从 sections 中提取内容
    const contentText = latestPost.sections
        ?.map(section => structuredContentToText(section.content))
        .join('\n\n') || '';

    const postData: PostData = {
        title: latestPost.title,
        content: transformContent(contentText),
        status: 'published',
        tags: latestPost.tags.join(','),
        excerpt: generateExcerpt(contentText),
        language: 'zh',
        metadata: {
            author: process.env.NEXT_PUBLIC_AUTHOR_NAME,
            publication_date: String(latestPost.date),
            source: 'weekly'
        }
    };

    try {
        // 搜索文章
        const searchResult = await request(`/posts/search`, 'POST', {
            q: postData.title,
            list: listId
        });

        let post;
        if (searchResult && searchResult.length > 0) {
            const existingPost = searchResult[0];
            // 更新文章
            post = await request(`/lists/${listId}/posts/${existingPost.id}/update`, 'PUT', postData);
            console.log('Updated existing weekly post on Quail');

            // 发布文章
            await request(`/lists/${listId}/posts/${existingPost.slug}/publish`, 'PUT');
        } else {
            // 创建新文章
            post = await request(`/lists/${listId}/posts`, 'POST', postData);
            console.log('Created new weekly post on Quail');

            // 发布文章
            await request(`/lists/${listId}/posts/${post.slug}/publish`, 'PUT');
        }

        // 投递文章
        await request(`/lists/${listId}/posts/${post.slug}/deliver`, 'PUT', {channels: ['email']});

        console.log('Post published and delivered successfully');
        return post;
    } catch (error: any) {
        console.error('Failed to publish to Quail:', error);
        throw error;
    }
}

function generateExcerpt(content: string, maxLength: number = 200): string {
    const plainText = content
        .replace(/^---[\s\S]*?---/, '')
        .replace(/[#*`]/g, '')
        .replace(/\n+/g, ' ')
        .trim();

    return plainText.length > maxLength ? plainText.slice(0, maxLength) + '...' : plainText;
}

publishToQuail().catch((error) => {
    console.error('Failed to publish to Quail:', error);
    process.exit(1);
});
