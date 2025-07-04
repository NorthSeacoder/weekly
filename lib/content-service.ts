import { query, initDatabase } from './database';
import { getCachedData } from './cache';
import type { RowDataPacket } from 'mysql2/promise';
import type { WeeklyPost, Section } from '@/types/weekly';
import type { BlogPost } from '@/types/blog';
import dayjs from 'dayjs';
import { getPermalink } from '@/src/utils/permalinks';
import { processMarkdown } from '@/src/utils/remark';

// 初始化数据库连接
initDatabase();

// 数据库查询结果类型定义
interface ContentRow extends RowDataPacket {
    id: number;
    content_type_id: number;
    category_id: number;
    title: string;
    slug: string;
    description: string;
    content: string;
    content_format: string;
    status: string;
    published_at: string;
    source?: string;
    source_url?: string;
    word_count: number;
    reading_time: number;
    view_count: number;
    created_at: string;
    updated_at: string;
    // 关联数据
    category_name?: string;
    category_slug?: string;
    tags?: string;
    content_type_slug?: string;
}

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
}

/**
 * 博客内容服务
 */
export class BlogService {
    /**
     * 获取所有博客文章，按分类分组
     */
    static async getBlogPosts(): Promise<Record<string, BlogPost[]>> {
        return getCachedData<Record<string, BlogPost[]>>(
            'blog-posts-db',
            async () => {
                try {
                    const sql = `
                        SELECT 
                            c.*,
                            cat.name as category_name,
                            cat.slug as category_slug,
                            GROUP_CONCAT(t.name SEPARATOR ',') as tags
                        FROM contents c
                        LEFT JOIN categories cat ON c.category_id = cat.id
                        LEFT JOIN content_tags ct ON c.id = ct.content_id
                        LEFT JOIN tags t ON ct.tag_id = t.id
                        LEFT JOIN content_types ct_type ON c.content_type_id = ct_type.id
                        WHERE ct_type.slug = 'blog' 
                            AND c.status = 'published'
                        GROUP BY c.id
                        ORDER BY c.published_at DESC
                    `;
                    
                    const rows = await query<ContentRow[]>(sql);
                    
                    if (!rows || rows.length === 0) {
                        console.warn('No blog posts found in database');
                        return {};
                    }
                    
                    const blogList = await Promise.all(
                        rows.map(row => this.transformToBlogPost(row))
                    );
                    
                    // 按分类分组
                    return blogList.reduce((acc, item) => {
                        const category = item.category || 'uncategorized';
                        acc[category] = acc[category] || [];
                        acc[category].push(item);
                        return acc;
                    }, {} as Record<string, BlogPost[]>);
                    
                } catch (error) {
                    console.error('Error getting blog posts from database:', error);
                    return {};
                }
            },
            { debug: true }
        );
    }

    /**
     * 根据slug获取单篇博客文章
     */
    static async getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
        try {
            const sql = `
                SELECT 
                    c.*,
                    cat.name as category_name,
                    cat.slug as category_slug,
                    GROUP_CONCAT(t.name SEPARATOR ',') as tags
                FROM contents c
                LEFT JOIN categories cat ON c.category_id = cat.id
                LEFT JOIN content_tags ct ON c.id = ct.content_id
                LEFT JOIN tags t ON ct.tag_id = t.id
                LEFT JOIN content_types ct_type ON c.content_type_id = ct_type.id
                WHERE ct_type.slug = 'blog' 
                    AND c.status = 'published'
                    AND c.slug = ?
                GROUP BY c.id
                LIMIT 1
            `;
            
            const rows = await query<ContentRow[]>(sql, [slug]);
            
            if (!rows || rows.length === 0) {
                return null;
            }
            
            return await this.transformToBlogPost(rows[0]);
            
        } catch (error) {
            console.error('Error getting blog post by slug:', error);
            return null;
        }
    }

    private static async transformToBlogPost(row: ContentRow): Promise<BlogPost> {
        // 处理 markdown 内容转换为 HTML
        const content = await processMarkdown(row.content);
        
        return {
            id: row.id.toString(),
            title: row.title,
            slug: row.slug,
            desc: row.description,
            content: content,
            category: row.category_name,
            tags: row.tags ? row.tags.split(',').map(tag => tag.trim()) : [],
            date: dayjs(row.published_at).format('YYYY-MM-DD'),
            permalink: getPermalink(row.slug, 'blog-post'),
            readingTime: `${row.reading_time} 分钟`,
            wordCount: row.word_count,
            lastUpdated: dayjs(row.updated_at).format('YYYY-MM-DD HH:mm:ss')
        };
    }
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
                        const content = this.generateWeeklyContent(sections);
                        
                        posts.push({
                            id: issue.id.toString(),
                            slug: issue.slug,
                            title: issue.title,
                            date: issue.published_at,
                            content: content,
                            sections: sections,
                            tags: tags,
                            source: sources,
                            permalink: getPermalink(issue.slug, 'weekly'),
                            readingTime: `${issue.reading_time} 分钟`,
                            wordCount: issue.total_word_count
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
                content: row.content,
                tags: row.tags ? row.tags.split(',').map((tag: string) => tag.trim()) : [],
                category: row.category_name,
                source: row.source
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
        sections.forEach(section => {
            section.tags.forEach(tag => tagSet.add(tag));
        });
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

    /**
     * 生成周刊完整内容（按分类组织）
     */
    private static generateWeeklyContent(sections: Section[]): string {
        // 固定的分类顺序
        const categoryOrder = ['工具', '文章', '教程', '言论', 'bug', '面试题', 'repos', 'bigones', '网站', 'prompt', 'demo'];
        
        // 按分类分组
        const categorizedSections: Record<string, Section[]> = {};
        sections.forEach(section => {
            const category = section.category || '其他';
            if (!categorizedSections[category]) {
                categorizedSections[category] = [];
            }
            categorizedSections[category].push(section);
        });
        
        // 按固定顺序生成内容
        const contentParts: string[] = [];
        
        categoryOrder.forEach(category => {
            if (categorizedSections[category]) {
                contentParts.push(`\n## ${category}\n`);
                categorizedSections[category].forEach(section => {
                    contentParts.push(section.content);
                    contentParts.push('\n');
                });
            }
        });
        
        return contentParts.join('');
    }
}

// 所有服务已通过 export class 导出 