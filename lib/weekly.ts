import {getCachedData} from '@/lib/cache';
import {handleDir} from '@/lib/file';
import type {PostsByMonth, WeeklyPost} from '@/types/weekly';
import dayjs from 'dayjs';
import path from 'path';

type Dayjs = dayjs.Dayjs
interface Metadata {
    tags: string[];
    source: string;
    date: string;
    category: string;
}

interface DataItem {
    metadata: Metadata;
    content: string;
}

const contentDir = path.join(process.cwd(), 'sections');

// 固定的 category 顺序
const categoryOrder = ['工具', '文章', '教程', '言论', 'bug', '面试题', 'repos', 'bigones', '网站', 'demo'];

export function processData(data: DataItem[]): {posts: WeeklyPost[]; postsByMonth: PostsByMonth} {
    // 获取一周的开始和结束日期
    const getWeekRange = (date: Dayjs): [Dayjs, Dayjs] => {
        const startOfWeek = date.startOf('week');
        const endOfWeek = date.endOf('week');
        return [startOfWeek, endOfWeek];
    };

    // 按周组织数据
    const weeklyData = data.reduce<Record<string, DataItem[]>>((acc, item) => {
        const date = dayjs(item.metadata.date);
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

            items.forEach((item) => {
                const category = item.metadata.category;
                if (!categories[category]) {
                    categories[category] = [];
                }
                const contentWithoutFrontmatter = removeFrontmatter(item.content);
                categories[category].push(contentWithoutFrontmatter);
                item.metadata.tags.forEach((tag) => tags.add(tag));
                source.add(item.metadata.source);
            });
            // 按照固定的 category 顺序拼接内容
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
                tags: Array.from(tags),
                source: Array.from(source),
                id: month,
                slug: `${weekNumber}`,
                date: endOfWeek,
                title: `我不知道的周刊第 ${weekNumber} 期`
            });
        });
    return {posts, postsByMonth};
}

// 添加一个新的辅助函数来移除 frontmatter
function removeFrontmatter(content: string): string {
    // 匹配开头的 frontmatter 部分
    const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
    return content.replace(frontmatterRegex, '');
}

export function getWeeklyPosts(): WeeklyPost[] {
    return getCachedData<WeeklyPost[]>(
        'weekly-posts',
        () => {
            try {
                if (!contentDir) {
                    throw new Error('Content directory path is not defined');
                }

                const content = handleDir(contentDir);

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
                    stack: (error as Error).stack,
                    contentDir
                });
                return [];
            }
        },
        {debug: true}
    );
}
