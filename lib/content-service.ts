import { query, initDatabase } from './database';
import { getCachedData } from './cache';
import { parseStructuredContent } from './structured-content';
import type { RowDataPacket } from 'mysql2/promise';
import type { WeeklyPost, Section } from '@/types/weekly';
import { getPermalink } from '@/src/utils/permalinks';

// 初始化数据库连接
initDatabase();

function normalizeScore(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(numeric) ? numeric : null;
}

function normalizeInt(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(numeric) ? Math.trunc(numeric) : null;
}

function parseJsonField(value: unknown): unknown | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

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

interface WeeklyIssueRouteRow extends RowDataPacket {
    id: number;
    issue_number: number;
    title: string;
    slug: string;
    end_date: string;
}

interface WeeklyIssueAggregatesRow extends RowDataPacket {
    issue_id: number;
    cover_image_url: string | null;
    tags: string | null;
    sources: string | null;
}

/**
 * 周刊内容服务
 */
export class WeeklyService {
    static async getWeeklyIssueRoutes(): Promise<Array<Pick<WeeklyPost, 'id' | 'slug' | 'title' | 'date' | 'permalink'>>> {
        return getCachedData(
            'weekly-issue-routes-db',
            async () => {
                try {
                    const sql = `
                        SELECT
                            wi.id,
                            wi.issue_number,
                            wi.title,
                            wi.slug,
                            wi.end_date
                        FROM weekly_issues wi
                        WHERE wi.status = 'published'
                        ORDER BY wi.issue_number DESC
                    `;
                    const rows = await query<WeeklyIssueRouteRow[]>(sql);
                    return rows.map((row) => ({
                        id: row.id.toString(),
                        slug: row.slug,
                        title: row.title,
                        date: row.end_date,
                        permalink: getPermalink(row.slug, 'weekly')
                    }));
                } catch (error) {
                    console.error('Error getting weekly issue routes from database:', error);
                    return [];
                }
            },
            { debug: process.env.NODE_ENV === 'development' }
        );
    }

    static async getLatestWeeklyPostSummary(): Promise<WeeklyPost | null> {
        return getCachedData<WeeklyPost | null>(
            'weekly-latest-db-summary',
            async () => {
                try {
                    const issueSql = `
                        SELECT
                            wi.*
                        FROM weekly_issues wi
                        WHERE wi.status = 'published'
                        ORDER BY wi.issue_number DESC
                        LIMIT 1
                    `;

                    const issues = await query<WeeklyIssueRow[]>(issueSql);
                    const issue = issues?.[0];
                    if (!issue) return null;

                    const aggregatesSql = `
                        SELECT
                            wci.weekly_issue_id as issue_id,
                            SUBSTRING_INDEX(
                                GROUP_CONCAT(
                                    CASE
                                        WHEN c.image_url IS NOT NULL AND c.image_url <> '' THEN c.image_url
                                        ELSE NULL
                                    END
                                    ORDER BY wci.sort_order SEPARATOR ','
                                ),
                                ',',
                                1
                            ) as cover_image_url,
                            GROUP_CONCAT(DISTINCT t.name SEPARATOR ',') as tags,
                            GROUP_CONCAT(
                                DISTINCT COALESCE(NULLIF(c.source, ''), c.source_url)
                                SEPARATOR ','
                            ) as sources
                        FROM weekly_content_items wci
                        JOIN contents c ON wci.content_id = c.id
                        LEFT JOIN content_tags ct ON c.id = ct.content_id
                        LEFT JOIN tags t ON ct.tag_id = t.id
                        WHERE wci.weekly_issue_id = ?
                        GROUP BY wci.weekly_issue_id
                    `;

                    const aggregates = await query<WeeklyIssueAggregatesRow[]>(aggregatesSql, [issue.id]);
                    const agg = aggregates?.[0];

                    const tags = agg?.tags
                        ? agg.tags
                            .split(',')
                            .map(tag => tag.trim())
                            .filter(Boolean)
                            .slice(0, 10)
                        : [];
                    const sources = agg?.sources
                        ? Array.from(
                            new Set(
                                agg.sources
                                    .split(',')
                                    .map(source => source.trim())
                                    .filter(Boolean)
                            )
                        ).slice(0, 10)
                        : [];

                    const totalWordCount = issue.total_word_count || undefined;
                    const readingMinutes =
                        issue.reading_time ||
                        (totalWordCount ? Math.max(1, Math.ceil(totalWordCount / 200)) : undefined);

                    return {
                        id: issue.id.toString(),
                        slug: issue.slug,
                        title: issue.title,
                        date: issue.end_date,
                        cover: issue.cover || agg?.cover_image_url || undefined,
                        desc: issue.desc || issue.description || undefined,
                        sections: [],
                        tags,
                        source: sources,
                        permalink: getPermalink(issue.slug, 'weekly'),
                        readingTime: readingMinutes ? `${readingMinutes} 分钟` : undefined,
                        wordCount: totalWordCount
                    };
                } catch (error) {
                    console.error('Error getting latest weekly post summary from database:', error);
                    return null;
                }
            },
            { debug: process.env.NODE_ENV === 'development' }
        );
    }

    static async getWeeklyPostBySlugWithSections(slug: string): Promise<WeeklyPost | null> {
        return getCachedData<WeeklyPost | null>(
            `weekly-post-db:${slug}`,
            async () => {
                try {
                    const issueSql = `
                        SELECT
                            wi.*
                        FROM weekly_issues wi
                        WHERE wi.status = 'published' AND wi.slug = ?
                        LIMIT 1
                    `;

                    const issues = await query<WeeklyIssueRow[]>(issueSql, [slug]);
                    const issue = issues?.[0];
                    if (!issue) return null;

                    const sectionsSql = `
                        SELECT
                            wci.weekly_issue_id as issue_id,
                            wci.sort_order,
                            c.id as content_id,
                            c.title,
                            c.content,
                            c.source,
                            c.source_url,
                            c.image_url,
                            c.image_source,
                            c.image_width,
                            c.image_height,
                            c.original_score,
                            c.summary_score,
                            c.ai_metadata,
                            c.description,
                            c.summary,
                            c.word_count,
                            c.reading_time,
                            c.screenshot_api,
                            cat.name as category_name
                        FROM weekly_content_items wci
                        JOIN contents c ON wci.content_id = c.id
                        LEFT JOIN categories cat ON c.category_id = cat.id
                        WHERE wci.weekly_issue_id = ?
                        ORDER BY wci.sort_order ASC
                    `;

                    const sectionRows = await query<RowDataPacket[]>(sectionsSql, [issue.id]);
                    const sectionsWithIds: Array<{ section: Section; contentId: number }> = [];
                    const contentIds: number[] = [];

                    for (const row of sectionRows) {
                        const contentId = Number(row.content_id);
                        if (Number.isFinite(contentId)) contentIds.push(contentId);

                        sectionsWithIds.push({
                            contentId,
                            section: {
                                content: parseStructuredContent(row.content),
                                tags: [],
                                category: row.category_name,
                                source: row.source || row.source_url,
                                source_url: row.source_url,
                                title: row.title,
                                summary: row.summary || row.description,
                                image_url: row.image_url,
                                image_source: row.image_source,
                                image_width: normalizeInt(row.image_width),
                                image_height: normalizeInt(row.image_height),
                                original_score: normalizeScore(row.original_score),
                                summary_score: normalizeScore(row.summary_score),
                                ai_metadata: parseJsonField(row.ai_metadata),
                                wordCount: row.word_count,
                                readingTime: row.reading_time,
                                screenshot_api: row.screenshot_api
                            }
                        });
                    }

                    const uniqueContentIds = Array.from(new Set(contentIds)).filter(Boolean);
                    const tagsByContentId = new Map<number, string[]>();

                    if (uniqueContentIds.length > 0) {
                        const placeholders = uniqueContentIds.map(() => '?').join(',');
                        const tagsSql = `
                            SELECT
                                ct.content_id,
                                GROUP_CONCAT(DISTINCT t.name SEPARATOR ',') as tags
                            FROM content_tags ct
                            JOIN tags t ON ct.tag_id = t.id
                            WHERE ct.content_id IN (${placeholders})
                            GROUP BY ct.content_id
                        `;
                        const tagRows = await query<RowDataPacket[]>(tagsSql, uniqueContentIds);
                        for (const row of tagRows) {
                            const contentId = Number(row.content_id);
                            const tags =
                                row.tags
                                    ? row.tags
                                        .split(',')
                                        .map((tag: string) => tag.trim())
                                        .filter(Boolean)
                                    : [];
                            tagsByContentId.set(contentId, tags);
                        }
                    }

                    const sections = sectionsWithIds.map(({ section, contentId }) => {
                        const tags = tagsByContentId.get(contentId);
                        if (tags) section.tags = tags;
                        return section;
                    });

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
                    const computedCover = issue.cover || sections.find(s => !!s.image_url)?.image_url || undefined;
                    const computedDesc = issue.desc || issue.description || undefined;

                    return {
                        id: issue.id.toString(),
                        slug: issue.slug,
                        title: issue.title,
                        date: issue.end_date,
                        cover: computedCover,
                        desc: computedDesc,
                        sections,
                        tags,
                        source: sources,
                        permalink: getPermalink(issue.slug, 'weekly'),
                        readingTime: readingMinutes ? `${readingMinutes} 分钟` : undefined,
                        wordCount: totalWordCount
                    };
                } catch (error) {
                    console.error('Error getting weekly post by slug from database:', error);
                    return null;
                }
            },
            { debug: process.env.NODE_ENV === 'development' }
        );
    }

    static async getLatestWeeklyPostsWithSections(limit = 12): Promise<WeeklyPost[]> {
        return getCachedData<WeeklyPost[]>(
            `weekly-posts-db-latest:${limit}`,
            async () => {
                try {
                    const issuesSql = `
                        SELECT
                            wi.*
                        FROM weekly_issues wi
                        WHERE wi.status = 'published'
                        ORDER BY wi.issue_number DESC
                        LIMIT ?
                    `;

                    const issues = await query<WeeklyIssueRow[]>(issuesSql, [limit]);
                    if (!issues || issues.length === 0) return [];

                    const issueIds = issues.map(issue => issue.id);
                    const issueIdPlaceholders = issueIds.map(() => '?').join(',');

                    const sectionsSql = `
                        SELECT
                            wci.weekly_issue_id as issue_id,
                            wci.sort_order,
                            c.id as content_id,
                            c.title,
                            c.content,
                            c.source,
                            c.source_url,
                            c.image_url,
                            c.image_source,
                            c.image_width,
                            c.image_height,
                            c.original_score,
                            c.summary_score,
                            c.ai_metadata,
                            c.description,
                            c.summary,
                            c.word_count,
                            c.reading_time,
                            c.screenshot_api,
                            cat.name as category_name
                        FROM weekly_content_items wci
                        JOIN contents c ON wci.content_id = c.id
                        LEFT JOIN categories cat ON c.category_id = cat.id
                        WHERE wci.weekly_issue_id IN (${issueIdPlaceholders})
                        ORDER BY wci.weekly_issue_id ASC, wci.sort_order ASC
                    `;

                    const sectionRows = await query<RowDataPacket[]>(sectionsSql, issueIds);
                    const sectionsWithIdsByIssueId = new Map<number, Array<{ section: Section; contentId: number }>>();
                    const contentIds: number[] = [];

                    for (const row of sectionRows) {
                        const issueId = Number(row.issue_id);
                        const contentId = Number(row.content_id);
                        if (Number.isFinite(contentId)) contentIds.push(contentId);

                        const section: Section = {
                            content: parseStructuredContent(row.content),
                            tags: [],
                            category: row.category_name,
                            source: row.source || row.source_url,
                            source_url: row.source_url,
                            title: row.title,
                            summary: row.summary || row.description,
                            image_url: row.image_url,
                            image_source: row.image_source,
                            image_width: normalizeInt(row.image_width),
                            image_height: normalizeInt(row.image_height),
                            original_score: normalizeScore(row.original_score),
                            summary_score: normalizeScore(row.summary_score),
                            ai_metadata: parseJsonField(row.ai_metadata),
                            wordCount: row.word_count,
                            readingTime: row.reading_time,
                            screenshot_api: row.screenshot_api
                        };

                        const arr = sectionsWithIdsByIssueId.get(issueId);
                        if (arr) arr.push({ section, contentId });
                        else sectionsWithIdsByIssueId.set(issueId, [{ section, contentId }]);
                    }

                    const uniqueContentIds = Array.from(new Set(contentIds)).filter(Boolean);
                    const tagsByContentId = new Map<number, string[]>();

                    if (uniqueContentIds.length > 0) {
                        const contentIdPlaceholders = uniqueContentIds.map(() => '?').join(',');
                        const tagsSql = `
                            SELECT
                                ct.content_id,
                                GROUP_CONCAT(DISTINCT t.name SEPARATOR ',') as tags
                            FROM content_tags ct
                            JOIN tags t ON ct.tag_id = t.id
                            WHERE ct.content_id IN (${contentIdPlaceholders})
                            GROUP BY ct.content_id
                        `;
                        const tagRows = await query<RowDataPacket[]>(tagsSql, uniqueContentIds);
                        for (const row of tagRows) {
                            const contentId = Number(row.content_id);
                            const tags =
                                row.tags
                                    ? row.tags
                                        .split(',')
                                        .map((tag: string) => tag.trim())
                                        .filter(Boolean)
                                    : [];
                            tagsByContentId.set(contentId, tags);
                        }
                    }

                    const posts: WeeklyPost[] = [];
                    for (const issue of issues) {
                        const sectionsWithIds = sectionsWithIdsByIssueId.get(issue.id) || [];
                        const sections = sectionsWithIds.map(({ section, contentId }) => {
                            const tags = tagsByContentId.get(contentId);
                            if (tags) section.tags = tags;
                            return section;
                        });

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
                        const computedCover = issue.cover || sections.find(s => !!s.image_url)?.image_url || undefined;
                        const computedDesc = issue.desc || issue.description || undefined;

                        posts.push({
                            id: issue.id.toString(),
                            slug: issue.slug,
                            title: issue.title,
                            date: issue.end_date,
                            cover: computedCover,
                            desc: computedDesc,
                            sections,
                            tags,
                            source: sources,
                            permalink: getPermalink(issue.slug, 'weekly'),
                            readingTime: readingMinutes ? `${readingMinutes} 分钟` : undefined,
                            wordCount: totalWordCount
                        });
                    }

                    return posts;
                } catch (error) {
                    console.error('Error getting latest weekly posts with sections from database:', error);
                    return [];
                }
            },
            { debug: process.env.NODE_ENV === 'development' }
        );
    }

    static async getWeeklyPostSummaries(): Promise<WeeklyPost[]> {
        return getCachedData<WeeklyPost[]>(
            'weekly-posts-db-summary',
            async () => {
                try {
                    const issuesSql = `
                        SELECT
                            wi.*
                        FROM weekly_issues wi
                        WHERE wi.status = 'published'
                        ORDER BY wi.issue_number DESC
                    `;

                    const issues = await query<WeeklyIssueRow[]>(issuesSql);
                    if (!issues || issues.length === 0) return [];

                    const issueIds = issues.map(issue => issue.id);
                    const placeholders = issueIds.map(() => '?').join(',');

                    const aggregatesSql = `
                        SELECT
                            wci.weekly_issue_id as issue_id,
                            SUBSTRING_INDEX(
                                GROUP_CONCAT(
                                    CASE
                                        WHEN c.image_url IS NOT NULL AND c.image_url <> '' THEN c.image_url
                                        ELSE NULL
                                    END
                                    ORDER BY wci.sort_order SEPARATOR ','
                                ),
                                ',',
                                1
                            ) as cover_image_url,
                            GROUP_CONCAT(DISTINCT t.name SEPARATOR ',') as tags,
                            GROUP_CONCAT(
                                DISTINCT COALESCE(NULLIF(c.source, ''), c.source_url)
                                SEPARATOR ','
                            ) as sources
                        FROM weekly_content_items wci
                        JOIN contents c ON wci.content_id = c.id
                        LEFT JOIN content_tags ct ON c.id = ct.content_id
                        LEFT JOIN tags t ON ct.tag_id = t.id
                        WHERE wci.weekly_issue_id IN (${placeholders})
                        GROUP BY wci.weekly_issue_id
                    `;

                    const aggregates = await query<WeeklyIssueAggregatesRow[]>(aggregatesSql, issueIds);
                    const aggregatesByIssueId = new Map<number, WeeklyIssueAggregatesRow>();
                    for (const row of aggregates) aggregatesByIssueId.set(row.issue_id, row);

                    return issues.map(issue => {
                        const agg = aggregatesByIssueId.get(issue.id);
                        const tags = agg?.tags
                            ? agg.tags
                                .split(',')
                                .map(tag => tag.trim())
                                .filter(Boolean)
                                .slice(0, 10)
                            : [];
                        const sources = agg?.sources
                            ? Array.from(
                                new Set(
                                    agg.sources
                                        .split(',')
                                        .map(source => source.trim())
                                        .filter(Boolean)
                                )
                            ).slice(0, 10)
                            : [];

                        const totalWordCount = issue.total_word_count || undefined;
                        const readingMinutes =
                            issue.reading_time ||
                            (totalWordCount ? Math.max(1, Math.ceil(totalWordCount / 200)) : undefined);

                        return {
                            id: issue.id.toString(),
                            slug: issue.slug,
                            title: issue.title,
                            date: issue.end_date,
                            cover: issue.cover || agg?.cover_image_url || undefined,
                            desc: issue.desc || issue.description || undefined,
                            sections: [],
                            tags,
                            source: sources,
                            permalink: getPermalink(issue.slug, 'weekly'),
                            readingTime: readingMinutes ? `${readingMinutes} 分钟` : undefined,
                            wordCount: totalWordCount
                        };
                    });
                } catch (error) {
                    console.error('Error getting weekly post summaries from database:', error);
                    return [];
                }
            },
            { debug: process.env.NODE_ENV === 'development' }
        );
    }

    /**
     * 获取所有周刊期号
     */
    static async getWeeklyPosts(): Promise<WeeklyPost[]> {
        return getCachedData<WeeklyPost[]>(
            'weekly-posts-db',
            async () => {
                try {
                    const issuesSql = `
                        SELECT
                            wi.*
                        FROM weekly_issues wi
                        WHERE wi.status = 'published'
                        ORDER BY wi.issue_number DESC
                    `;

                    const issues = await query<WeeklyIssueRow[]>(issuesSql);

                    if (!issues || issues.length === 0) {
                        console.warn('No weekly issues found in database');
                        return [];
                    }

                    const issueIds = issues.map(issue => issue.id);
                    const issueIdPlaceholders = issueIds.map(() => '?').join(',');

                    const sectionsSql = `
                        SELECT
                            wci.weekly_issue_id as issue_id,
                            wci.sort_order,
                            c.id as content_id,
                            c.title,
                            c.content,
                            c.source,
                            c.source_url,
                            c.image_url,
                            c.image_source,
                            c.image_width,
                            c.image_height,
                            c.original_score,
                            c.summary_score,
                            c.ai_metadata,
                            c.description,
                            c.summary,
                            c.word_count,
                            c.reading_time,
                            c.screenshot_api,
                            cat.name as category_name
                        FROM weekly_content_items wci
                        JOIN contents c ON wci.content_id = c.id
                        LEFT JOIN categories cat ON c.category_id = cat.id
                        WHERE wci.weekly_issue_id IN (${issueIdPlaceholders})
                        ORDER BY wci.weekly_issue_id ASC, wci.sort_order ASC
                    `;

                    const sectionRows = await query<RowDataPacket[]>(sectionsSql, issueIds);
                    const sectionsWithIdsByIssueId = new Map<number, Array<{ section: Section; contentId: number }>>();
                    const contentIds: number[] = [];

                    for (const row of sectionRows) {
                        const issueId = Number(row.issue_id);
                        const contentId = Number(row.content_id);
                        if (Number.isFinite(contentId)) contentIds.push(contentId);

                        const section: Section = {
                            content: parseStructuredContent(row.content),
                            tags: [],
                            category: row.category_name,
                            source: row.source || row.source_url,
                            source_url: row.source_url,
                            title: row.title,
                            summary: row.summary || row.description,
                            image_url: row.image_url,
                            image_source: row.image_source,
                            image_width: normalizeInt(row.image_width),
                            image_height: normalizeInt(row.image_height),
                            original_score: normalizeScore(row.original_score),
                            summary_score: normalizeScore(row.summary_score),
                            ai_metadata: parseJsonField(row.ai_metadata),
                            wordCount: row.word_count,
                            readingTime: row.reading_time,
                            screenshot_api: row.screenshot_api
                        };

                        const arr = sectionsWithIdsByIssueId.get(issueId);
                        if (arr) arr.push({ section, contentId });
                        else sectionsWithIdsByIssueId.set(issueId, [{ section, contentId }]);
                    }

                    const uniqueContentIds = Array.from(new Set(contentIds)).filter(Boolean);
                    const tagsByContentId = new Map<number, string[]>();

                    if (uniqueContentIds.length > 0) {
                        const contentIdPlaceholders = uniqueContentIds.map(() => '?').join(',');
                        const tagsSql = `
                            SELECT
                                ct.content_id,
                                GROUP_CONCAT(DISTINCT t.name SEPARATOR ',') as tags
                            FROM content_tags ct
                            JOIN tags t ON ct.tag_id = t.id
                            WHERE ct.content_id IN (${contentIdPlaceholders})
                            GROUP BY ct.content_id
                        `;
                        const tagRows = await query<RowDataPacket[]>(tagsSql, uniqueContentIds);
                        for (const row of tagRows) {
                            const contentId = Number(row.content_id);
                            const tags =
                                row.tags
                                    ? row.tags
                                        .split(',')
                                        .map((tag: string) => tag.trim())
                                        .filter(Boolean)
                                    : [];
                            tagsByContentId.set(contentId, tags);
                        }
                    }

                    const posts: WeeklyPost[] = [];

                    for (const issue of issues) {
                        const sectionsWithIds = sectionsWithIdsByIssueId.get(issue.id) || [];
                        const sections = sectionsWithIds.map(({ section, contentId }) => {
                            const tags = tagsByContentId.get(contentId);
                            if (tags) section.tags = tags;
                            return section;
                        });
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
                        const computedCover = issue.cover || sections.find(s => !!s.image_url)?.image_url || undefined;
                        const computedDesc = issue.desc || issue.description || undefined;

                        posts.push({
                            id: issue.id.toString(),
                            slug: issue.slug,
                            title: issue.title,
                            date: issue.end_date,
                            cover: computedCover,
                            desc: computedDesc,
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
            { debug: process.env.NODE_ENV === 'development' }
        );
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
