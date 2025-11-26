import {getCachedData} from '@/lib/cache';
import {parseStructuredContent, structuredContentToText} from '@/lib/structured-content';
import getReadingTime from 'reading-time';
import type {PostsByMonth, WeeklyPost, Section, StructuredContent} from '@/types/weekly';
import dayjs from 'dayjs';
import {getEnhancedCollection} from './content-utils';
import type {EnhancedEntry} from './content-utils';
import {getPermalink} from '../permalinks';

type Dayjs = dayjs.Dayjs;

export type DataItem = EnhancedEntry<'weekly'>;

// 固定的 category 顺序
const categoryOrder = ['工具', '文章', '教程', '言论', 'bug', '面试题', 'repos', 'bigones', '网站', 'prompt'];
// 添加一个新的辅助函数来移除 frontmatter
function removeFrontmatter(content: string | undefined): string {
    // 匹配开头的 frontmatter 部分
    const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
    return content?.replace(frontmatterRegex, '') || '';
}

const getSourceFromContent = (content: StructuredContent): string | undefined => {
    if (!content || typeof content !== 'object' || Array.isArray(content)) return undefined;
    const possible = (content as any).source_url;
    return typeof possible === 'string' ? possible : undefined;
};

const getWordCountFromContent = (content: StructuredContent): number | undefined => {
    if (!content || typeof content !== 'object' || Array.isArray(content)) return undefined;
    const wc = (content as any).word_count ?? (content as any).wordCount;
    return typeof wc === 'number' ? wc : undefined;
};

const getReadingTimeFromContent = (content: StructuredContent): number | undefined => {
    if (!content || typeof content !== 'object' || Array.isArray(content)) return undefined;
    const rt = (content as any).reading_time ?? (content as any).readingTime;
    if (typeof rt === 'number') return rt;
    const parsed = typeof rt === 'string' ? parseFloat(rt) : Number(rt);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const getTitleFromContent = (content: StructuredContent): string | undefined => {
    if (!content || typeof content !== 'object' || Array.isArray(content)) return undefined;
    const title = (content as any).title;
    return typeof title === 'string' ? title : undefined;
};

const getSummaryFromContent = (content: StructuredContent): string | undefined => {
    if (!content || typeof content !== 'object' || Array.isArray(content)) return undefined;
    const summary = (content as any).summary || (content as any).description;
    return typeof summary === 'string' ? summary : undefined;
};

const getImageFromContent = (content: StructuredContent): string | undefined => {
    if (!content || typeof content !== 'object' || Array.isArray(content)) return undefined;
    const img = (content as any).image_url;
    return typeof img === 'string' ? img : undefined;
};

export function processData(data: DataItem[]): {posts: WeeklyPost[]; postsByMonth: PostsByMonth} {
    // 获取一周的开始和结束日期
    const getWeekRange = (date: Dayjs): [Dayjs, Dayjs] => {
        const startOfWeek = date.startOf('week');
        const endOfWeek = date.endOf('week');
        return [startOfWeek, endOfWeek];
    };

    // 按周组织数据
    const weeklyData = data.reduce<Record<string, DataItem[]>>((acc, item) => {
        const date = dayjs(item.data.date);
        const [startOfWeek, endOfWeek] = getWeekRange(date);
        const weekKey = `${startOfWeek.format('YYYY-MM-DD')} to ${endOfWeek.format('YYYY-MM-DD')}`;

        if (!acc[weekKey]) {
            acc[weekKey] = [];
        }
        acc[weekKey].push(item);
        return acc;
    }, {});
    const posts: WeeklyPost[] = [];
    const postsByMonth: string[] = [];
    let weekCount = 0;
    Object.keys(weeklyData)
        .sort()
        .forEach((week) => {
            const weekNumber = ++weekCount;
            const items = weeklyData[week];
            const contentParts: string[] = [];
            const tags: Set<string> = new Set();
            const source: Set<string> = new Set();
            const categories: Record<string, string[]> = {};
            const sections: Section[] = [];
            let totalWordCount: number = 0;
            let totalReadingMinutes: number = 0;

            // 首先处理每个 item 并创建对应的 section
            items.forEach((item) => {
                const category = item.data.category;
                if (!categories[category]) {
                    categories[category] = [];
                }
                const contentWithoutFrontmatter = removeFrontmatter(item.body);
                const structuredContent = parseStructuredContent(contentWithoutFrontmatter);
                const plainContent = structuredContentToText(structuredContent);
                categories[category].push('\n', plainContent);

                // 为每个 item 创建一个 section
                const derivedSource = item.data.source || getSourceFromContent(structuredContent);
                const sectionWordCount = item.data.wordCount ?? getWordCountFromContent(structuredContent);
                const sectionReading = getReadingTimeFromContent(structuredContent);
                const sectionTitle = item.data.title || getTitleFromContent(structuredContent);
                const sectionSummary = getSummaryFromContent(structuredContent);
                const sectionImage = getImageFromContent(structuredContent);
                sections.push({
                    content: structuredContent,
                    tags: item.data.tags,
                    category: item.data.category,
                    source: derivedSource,
                    source_url: derivedSource,
                    title: sectionTitle,
                    summary: sectionSummary,
                    description: sectionSummary,
                    image_url: sectionImage,
                    wordCount: sectionWordCount,
                    readingTime: sectionReading
                });

                item.data.tags.forEach((tag) => tags.add(tag));
                if (derivedSource) {
                    source.add(derivedSource);
                }

                if (sectionReading) {
                    totalReadingMinutes += sectionReading;
                }

                const wordsFromMetaOrContent = sectionWordCount ?? (plainContent ? getReadingTime(plainContent).words : 0);
                totalWordCount += wordsFromMetaOrContent;
            });

            // 按照固定的 category 顺序处理内容
            categoryOrder.forEach((category) => {
                if (categories[category]) {
                    contentParts.push(`\n${category}:\n`);
                    contentParts.push(...categories[category]);
                }
            });

            const [startOfWeek, endOfWeek] = week.split(' to ');
            const endOfWeekDate = dayjs(endOfWeek);
            const month = endOfWeekDate.format('YYYY-MM');
            postsByMonth.unshift(month);
            const readingMinutes =
                totalReadingMinutes ||
                (totalWordCount ? Math.max(1, Math.ceil(totalWordCount / 200)) : Math.ceil(getReadingTime(contentParts.join('')).minutes));
            posts.unshift({
                content: contentParts.join(''),
                readingTime: readingMinutes ? `${readingMinutes} 分钟` : undefined,
                tags: Array.from(tags),
                source: Array.from(source),
                id: month,
                slug: `${weekNumber}`,
                date: endOfWeek,
                title: `我不知道的周刊第 ${weekNumber} 期`,
                permalink: getPermalink(String(weekNumber), 'weekly'),
                wordCount: totalWordCount || undefined,
                sections: sections.sort((a, b) => {
                    // 按照 categoryOrder 的顺序排序 sections
                    return categoryOrder.indexOf(a.category || '') - categoryOrder.indexOf(b.category || '');
                })
            });
        });
    return {posts, postsByMonth};
}
export async function getWeeklyPosts(): Promise<WeeklyPost[]> {
    return getCachedData<WeeklyPost[]>(
        'weekly-posts',
        async () => {
            try {
                const content = await getEnhancedCollection('weekly');

                if (!content || content.length === 0) {
                    console.warn('No content found in directory');
                    return [];
                }

                const {posts} = processData(content);
                return posts;
            } catch (error) {
                console.error('Error generating weekly posts:', error);
                console.error('Error details:', {
                    message: (error as Error).message,
                    stack: (error as Error).stack
                });
                return [];
            }
        },
        {debug: true}
    );
}

export const getStaticPathsWeeklyPost = async () => {
    try {
        const posts = await getWeeklyPosts();
        return posts.flatMap((post) => ({
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
