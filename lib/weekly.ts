import {getCachedData} from '@/lib/cache';
import {handleDir} from '@/lib/file';
import type {PostsByMonth, WeeklyPost} from '@/types/weekly';
import dayjs from 'dayjs';
import path from 'path';
// import {getPermalink} from '@/src/utils/permalinks'; // 注释掉，避免在Node.js环境中导入Astro虚拟模块

// ============================================================================
// Config
// ----------------------------------------------------------------------------
// 这一期合并策略的两个核心参数：
//   1. MIN_ITEMS_PER_WEEK  ——  低于多少条算“内容太少”
//   2. MAX_BUFFER_WEEKS    ——  最多可以累积多少周不发，防止一直不结算
// 你可以视需求写进 .env 或其它 config；此处直接硬编码演示。
// ============================================================================
export const MIN_ITEMS_PER_WEEK = 3;
export const MAX_BUFFER_WEEKS = 6;   // 可选：放宽上限，允许最长 6 周合并成一期

// 固定的 category 顺序（原逻辑保持不变）
const categoryOrder = ['工具', '文章', '教程', '言论', 'bug', '面试题', 'repos', 'bigones', '网站', 'demo'];

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------
type Dayjs = dayjs.Dayjs;
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

// ---------------------------------------------------------------------------
// 主入口 – 对外暴露的 API 与缓存包装
// ---------------------------------------------------------------------------
const contentDir = path.join(process.cwd(), 'sections');

export async function getWeeklyPosts(): Promise<WeeklyPost[]> {
    return getCachedData<WeeklyPost[]>(
        'weekly-posts',
        async () => {
            try {
                if (!contentDir) throw new Error('Content directory path is not defined');

                const content = handleDir(contentDir);
                if (!content || content.length === 0) {
                    console.warn('No content found in directory');
                    return [];
                }

                const {posts} = processData(content);
                return posts;
            } catch (error) {
                console.error('Error generating weekly posts:', error);
                return [];
            }
        },
        {debug: true}
    );
}

// ---------------------------------------------------------------------------
// 核心：把相邻稀疏周合并后生成 posts
// ---------------------------------------------------------------------------
export function processData(data: DataItem[]): {posts: WeeklyPost[]; postsByMonth: PostsByMonth} {
    // —— Step 1. 先按周拆分 ---------------------------------------------------
    const getWeekRange = (date: Dayjs): [Dayjs, Dayjs] => [date.startOf('week'), date.endOf('week')];

    const weeklyData = data.reduce<Record<string, DataItem[]>>((acc, item) => {
        const date = dayjs(item.metadata.date);
        const [startOfWeek, endOfWeek] = getWeekRange(date);
        const key = `${startOfWeek.format('YYYY-MM-DD')} to ${endOfWeek.format('YYYY-MM-DD')}`;
        (acc[key] ||= []).push(item);
        return acc;
    }, {});

    const weekKeys = Object.keys(weeklyData)
        .sort((a, b) => dayjs(a.split(' to ')[0]).valueOf() - dayjs(b.split(' to ')[0]).valueOf());

    // —— Step 2. 遍历周，合并稀疏周 ------------------------------------------
    const mergedWeeks: {range: [Dayjs, Dayjs][], items: DataItem[]}[] = [];

    let bufferItems: DataItem[] = [];
    let bufferRanges: [Dayjs, Dayjs][] = [];

    for (let i = 0; i < weekKeys.length; i++) {
        const key = weekKeys[i];
        const [s, e] = key.split(' to ').map(d => dayjs(d)) as [Dayjs, Dayjs];
        bufferItems.push(...weeklyData[key]);
        bufferRanges.push([s, e]);

        const isLastWeek = i === weekKeys.length - 1;
        const reachedMaxWeeks = bufferRanges.length >= MAX_BUFFER_WEEKS;
        const reachedMinItems = bufferItems.length >= MIN_ITEMS_PER_WEEK;

        if (reachedMinItems || reachedMaxWeeks || isLastWeek) {
            mergedWeeks.push({range: bufferRanges, items: bufferItems});
            bufferItems = [];
            bufferRanges = [];
        }
    }

    // —— Step 3. 把合并后的区块生成 WeeklyPost ------------------------------
    const posts: WeeklyPost[] = [];
    const postsByMonth: string[] = [];
    let issueNo = 1; // 期号从 1 开始递增

    for (const block of mergedWeeks) {
        const {items, range} = block;
        const tags = new Set<string>();
        const sources = new Set<string>();
        const categories: Record<string, string[]> = {};
        const sections: {content: string; tags: string[]; category?: string; source?: string}[] = [];

        items.forEach(item => {
            const {category} = item.metadata;
            const contentWithoutFrontmatter = removeFrontmatter(item.content);
            (categories[category] ||= []).push(contentWithoutFrontmatter);
            
            // 创建section对象
            sections.push({
                content: contentWithoutFrontmatter,
                tags: item.metadata.tags,
                category: item.metadata.category,
                source: item.metadata.source
            });
            
            item.metadata.tags.forEach(t => tags.add(t));
            sources.add(item.metadata.source);
        });

        const contentParts: string[] = [];
        categoryOrder.forEach(cat => {
            if (categories[cat]) {
                contentParts.push(`\n## ${cat}\n`);
                contentParts.push(...categories[cat]);
            }
        });

        // 整理日期范围 & 期号
        const start = range[0][0];
        const end = range[range.length - 1][1];
        const month = end.format('YYYY-MM');
        postsByMonth.unshift(month);

        posts.unshift({
            id: month,
            slug: `${issueNo}`,
            title: `我不知道的周刊第 ${issueNo} 期（${start.format('YYYY-MM-DD')} – ${end.format('YYYY-MM-DD')}）`,
            date: end.toISOString(),
            tags: Array.from(tags),
            source: Array.from(sources),
            content: contentParts.join(''),
            permalink: `/weekly/${issueNo}`, // 简化permalink生成，避免依赖Astro配置
            sections: sections.sort((a, b) => {
                // 按照 categoryOrder 的顺序排序 sections
                return categoryOrder.indexOf(a.category || '') - categoryOrder.indexOf(b.category || '');
            })
        });

        issueNo += 1;
    }

    return {posts, postsByMonth};
}

// ---------------------------------------------------------------------------
// 工具函数：移除 Markdown front‑matter
// ---------------------------------------------------------------------------
function removeFrontmatter(content: string): string {
    const fmRegex = /^---\n[\s\S]*?\n---\n/;
    return content.replace(fmRegex, '');
}
