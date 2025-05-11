import {getCachedData} from '@/lib/cache';
import getReadingTime from 'reading-time';
import type {PostsByMonth, WeeklyPost, Section} from '@/types/weekly';
import dayjs from 'dayjs';
import {getEnhancedCollection} from './content-utils';
import type {EnhancedEntry} from './content-utils';
import {getPermalink} from '../permalinks';

type Dayjs = dayjs.Dayjs;

interface Metadata {
    tags: string[];
    source: string;
    date: string;
    category: string;
}

export type DataItem = EnhancedEntry<'weekly'>;

// 固定的 category 顺序
const categoryOrder = ['工具', '文章', '教程', '言论', 'bug', '面试题', 'repos', 'bigones', '网站', 'prompt'];
// 添加一个新的辅助函数来移除 frontmatter
function removeFrontmatter(content: string | undefined): string {
    // 匹配开头的 frontmatter 部分
    const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
    return content?.replace(frontmatterRegex, '') || '';
}

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
    const baseDate = dayjs('2024-06-24');
    Object.keys(weeklyData)
        .sort()
        .forEach((week) => {
            const items = weeklyData[week];
            const contentParts: string[] = [];
            const tags: Set<string> = new Set();
            const source: Set<string> = new Set();
            const categories: Record<string, string[]> = {};
            const sections: Section[] = [];
            let totalWordCount: number = 0;
            let lastUpdated: Date | undefined = undefined;

            // 首先处理每个 item 并创建对应的 section
            items.forEach((item) => {
                const category = item.data.category;
                if (!categories[category]) {
                    categories[category] = [];
                }
                const contentWithoutFrontmatter = removeFrontmatter(item.body);
                categories[category].push('\n', contentWithoutFrontmatter);

                // 为每个 item 创建一个 section
                sections.push({
                    content: contentWithoutFrontmatter,
                    tags: item.data.tags,
                    category: item.data.category,
                    source: item.data.source
                });

                item.data.tags.forEach((tag) => tags.add(tag));
                source.add(item.data.source);

                // if (item.data.lastUpdated) {
                //     if (!lastUpdated || item.data.lastUpdated > lastUpdated) {
                //         lastUpdated = item.data.lastUpdated;
                //     }
                // }

                if (item.data.wordCount) {
                    totalWordCount += item.data.wordCount;
                }
            });

            // 按照固定的 category 顺序处理内容
            categoryOrder.forEach((category) => {
                if (categories[category]) {
                    contentParts.push(`\n## ${category} \n`);
                    contentParts.push(...categories[category]);
                }
            });

            const [startOfWeek, endOfWeek] = week.split(' to ');
            const startOfWeekDate = dayjs(startOfWeek);
            const endOfWeekDate = dayjs(endOfWeek);
            const month = endOfWeekDate.format('YYYY-MM');
            const weekNumber = Math.floor(startOfWeekDate.diff(baseDate, 'week'));
            postsByMonth.unshift(month);
            posts.unshift({
                content: contentParts.join(''),
                readingTime: getReadingTime(contentParts.join('')).text,
                tags: Array.from(tags),
                source: Array.from(source),
                id: month,
                slug: `${weekNumber}`,
                date: endOfWeek,
                title: `我不知道的周刊第 ${weekNumber} 期`,
                permalink: getPermalink(String(weekNumber), 'weekly'),
                lastUpdated: lastUpdated ?? dayjs(lastUpdated).format('YYYY-MM-DD HH:mm:ss'),
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
