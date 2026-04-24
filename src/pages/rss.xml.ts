import rss from '@astrojs/rss';
import type {APIContext} from 'astro';
import {getLatestWeeklyPostsWithSections} from '@/src/utils/contents/unified-content';
import {structuredContentToText} from '@/lib/structured-content';

export async function GET(context: APIContext) {
    const latestPosts = await getLatestWeeklyPostsWithSections(12);

    return rss({
        title: '我不知道的周刊',
        description: '前端技术周刊，每周分享有价值的前端技术内容',
        site: context.site!,
        items: latestPosts.map((post) => ({
            title: post.title,
            pubDate: new Date(post.date),
            description: post.desc || post.title,
            link: `/weekly/${post.slug}/`,
            content: post.sections?.map((section) => structuredContentToText(section.content)).join('\n\n')
        })),
        customData: `<language>zh-CN</language>`,
        stylesheet: '/pretty-feed-v3.xsl'
    });
}
