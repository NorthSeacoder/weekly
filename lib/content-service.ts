import { query, initDatabase } from './database';
import { getCachedData } from './cache';
import { parseStructuredContent } from './structured-content';
import type { RowDataPacket } from 'mysql2/promise';
import type { WeeklyPost, Section } from '@/types/weekly';
import { getPermalink } from '@/src/utils/permalinks';

// 初始化数据库连接
initDatabase();

// 数据库查询结果类型定义
interface WeeklyIssueRow extends RowDataPacket {
    id: number;
    issue_number: number;
    title: string;
    slug: string;
    description: string;
    start_date: string;
    end_date: string;
    published_at: string;
    total_items: number;
    total_word_count: number;
    reading_time: number;
    status: string;
    cover?: string;
    desc?: string;
}

/**
 * 周刊内容服务
 */
export class WeeklyService {
    /**
     * 获取所有周刊期号
     */
    static async getWeeklyPosts(): Promise<WeeklyPost[]> {
        return getCachedData<WeeklyPost[]>(
            'weekly-posts-db',
            async () => {
                try {
                    const sql = `
                        SELECT
                            wi.*
                        FROM weekly_issues wi
                        WHERE wi.status = 'published'
                        ORDER BY wi.issue_number DESC
                    `;

                    const issues = await query<WeeklyIssueRow[]>(sql);

                    if (!issues || issues.length === 0) {
                        console.warn('No weekly issues found in database');
                        return [];
                    }

                    const posts: WeeklyPost[] = [];

                    for (const issue of issues) {
                        const sections = await this.getWeeklyIssueSections(issue.id);
                        const tags = this.extractTagsFromSections(sections);
                        const sources = this.extractSourcesFromSections(sections);
                        const sectionsWordCount = sections.reduce((acc, s) => acc + (s.wordCount || 0), 0);
                        const sectionsReading = sections.reduce((acc, s) => {
                            if (typeof s.readingTime === 'number') return acc + s.readingTime;
                            if (typeof s.readingTime === 'string') {
                                const parsed = parseFloat(s.readingTime);
                                return Number.isFinite(parsed) ? acc + parsed : acc;
                            }
                            return acc;
                        }, 0);
                        const totalWordCount = issue.total_word_count || sectionsWordCount || undefined;
                        const readingMinutes =
                            issue.reading_time ||
                            sectionsReading ||
                            (totalWordCount ? Math.max(1, Math.ceil(totalWordCount / 200)) : undefined);

                        posts.push({
                            id: issue.id.toString(),
                            slug: issue.slug,
                            title: issue.title,
                            date: issue.end_date,
                            cover: issue.cover,
                            desc: issue.desc,
                            sections: sections,
                            tags: tags,
                            source: sources,
                            permalink: getPermalink(issue.slug, 'weekly'),
                            readingTime: readingMinutes ? `${readingMinutes} 分钟` : undefined,
                            wordCount: totalWordCount
                        });
                    }

                    return posts;

                } catch (error) {
                    console.error('Error getting weekly posts from database:', error);
                    return [];
                }
            },
            { debug: true }
        );
    }

    /**
     * 获取周刊期号的所有内容条目
     */
    private static async getWeeklyIssueSections(issueId: number): Promise<Section[]> {
        try {
            const sql = `
                SELECT
                    wci.sort_order,
                    c.title,
                    c.content,
                    c.source,
                    c.source_url,
                    c.image_url,
                    c.description,
                    c.summary,
                    c.word_count,
                    c.reading_time,
                    c.screenshot_api,
                    cat.name as category_name,
                    GROUP_CONCAT(t.name SEPARATOR ',') as tags
                FROM weekly_content_items wci
                JOIN contents c ON wci.content_id = c.id
                LEFT JOIN categories cat ON c.category_id = cat.id
                LEFT JOIN content_tags ct ON c.id = ct.content_id
                LEFT JOIN tags t ON ct.tag_id = t.id
                WHERE wci.weekly_issue_id = ?
                GROUP BY c.id, wci.sort_order
                ORDER BY wci.sort_order ASC
            `;

            const rows = await query<RowDataPacket[]>(sql, [issueId]);

            return rows.map(row => ({
                content: parseStructuredContent(row.content),
                tags: row.tags ? row.tags.split(',').map((tag: string) => tag.trim()) : [],
                category: row.category_name,
                source: row.source || row.source_url,
                source_url: row.source_url,
                title: row.title,
                summary: row.summary || row.description,
                image_url: row.image_url,
                wordCount: row.word_count,
                readingTime: row.reading_time,
                screenshot_api: row.screenshot_api
            }));

        } catch (error) {
            console.error('Error getting weekly issue sections:', error);
            return [];
        }
    }

    /**
     * 从sections中提取所有标签
     */
    private static extractTagsFromSections(sections: Section[]): string[] {
        const tagSet = new Set<string>();
        for (const section of sections) {
            for (const tag of section.tags) {
                if (tagSet.size >= 10) break;
                tagSet.add(tag);
            }
            if (tagSet.size >= 10) break;
        }
        return Array.from(tagSet);
    }

    /**
     * 从sections中提取所有来源
     */
    private static extractSourcesFromSections(sections: Section[]): string[] {
        const sourceSet = new Set<string>();
        sections.forEach(section => {
            if (section.source) {
                sourceSet.add(section.source);
            }
        });
        return Array.from(sourceSet);
    }
}
