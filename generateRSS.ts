import dotenv from 'dotenv';
import {Feed} from 'feed';
import fs from 'fs';
import {remark} from 'remark';
import gemoji from 'remark-gemoji';
import html from 'remark-html';
import { query, initDatabase } from './lib/database';
import type { RowDataPacket } from 'mysql2/promise';

dotenv.config({path: './.env'});

// 初始化数据库连接
initDatabase();

// RSS 专用的数据库查询结果类型
interface RSSWeeklyIssueRow extends RowDataPacket {
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

interface RSSSectionRow extends RowDataPacket {
    sort_order: number;
    title: string;
    content: string;
    source: string;
    category_name: string;
    tags: string;
}

// RSS 专用的数据结构
interface RSSWeeklyPost {
    title: string;
    slug: string;
    content: string;
    date: string;
    tags: string[];
}

// 简化的周刊数据获取函数 - 专门为 RSS 使用，避免 permalink 依赖
const getWeeklyPostsForRSS = async (): Promise<RSSWeeklyPost[]> => {
    try {
        // 获取所有已发布的周刊期号
        const sql = `
            SELECT 
                wi.*
            FROM weekly_issues wi
            WHERE wi.status = 'published'
            ORDER BY wi.issue_number DESC
            LIMIT 12
        `;
        
        const issues = await query<RSSWeeklyIssueRow[]>(sql);
        
        if (!issues || issues.length === 0) {
            console.warn('No weekly issues found in database');
            return [];
        }
        
        const posts: RSSWeeklyPost[] = [];
        
        for (const issue of issues) {
            const sections = await getWeeklyIssueSectionsForRSS(issue.id);
            const tags = extractTagsFromSections(sections);
            const content = generateWeeklyContentForRSS(sections);
            
            posts.push({
                slug: issue.slug,
                title: issue.title,
                date: issue.published_at,
                content: content,
                tags: tags
            });
        }
        
        return posts;
        
    } catch (error) {
        console.error('Error getting weekly posts from database:', error);
        return [];
    }
};

// 获取周刊期号的所有内容条目 - RSS 专用
const getWeeklyIssueSectionsForRSS = async (issueId: number): Promise<RSSSectionRow[]> => {
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
        
        return await query<RSSSectionRow[]>(sql, [issueId]);
        
    } catch (error) {
        console.error('Error getting weekly issue sections:', error);
        return [];
    }
};

// 从sections中提取所有标签 - RSS 专用
const extractTagsFromSections = (sections: RSSSectionRow[]): string[] => {
    const tagSet = new Set<string>();
    sections.forEach(section => {
        if (section.tags) {
            section.tags.split(',').forEach(tag => tagSet.add(tag.trim()));
        }
    });
    return Array.from(tagSet);
};

// 生成周刊完整内容（按分类组织）- RSS 专用
const generateWeeklyContentForRSS = (sections: RSSSectionRow[]): string => {
    // 固定的分类顺序
    const categoryOrder = ['工具', '文章', '教程', '言论', 'bug', '面试题', 'repos', 'bigones', '网站', 'prompt', 'demo'];
    
    // 按分类分组
    const categorizedSections: Record<string, RSSSectionRow[]> = {};
    sections.forEach(section => {
        const category = section.category_name || '其他';
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
};

// 使用已有的环境变量和站点配置
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const AUTHOR_NAME = process.env.NEXT_PUBLIC_AUTHOR_NAME;
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME;
const SITE_DESCRIPTION = process.env.NEXT_PUBLIC_SITE_DESCRIPTION;

const markdownToHtml = (markdown: string) => remark().use(html).use(gemoji).processSync(markdown).toString();

const generateRssFeed = async () => {
    const author = {
        name: AUTHOR_NAME,
        link: SITE_URL
    };
    const posts = await getWeeklyPostsForRSS();

    const latestPosts = posts.slice(0, 12).filter((i) => i);
    const feed = new Feed({
        title: SITE_NAME as string,
        description: SITE_DESCRIPTION,
        id: SITE_URL,
        link: SITE_URL,
        generator: SITE_URL,
        feedLinks: {
            rss2: `${SITE_URL}/rss.xml`
        },
        author,
        copyright: `Copyright © ${new Date().getFullYear()} by ${AUTHOR_NAME}`,
        language: 'zh-CN',
        favicon: `${SITE_URL}/favicon.ico`,
        image: `${SITE_URL}/og-image.jpg`
    });

    latestPosts.forEach((post) => {
        feed.addItem({
            title: post.title,
            id: `${SITE_URL}/weekly/${post.slug}`,
            link: `${SITE_URL}/weekly/${post.slug}`,
            description: post.title || '',
            content: markdownToHtml(post.content),
            date: new Date(post.date),
            author: [author],
            category: post.tags ? post.tags.map(tag => ({ name: tag })) : []
        });
    });

    const rssOutput = feed.rss2();
    
    const styleSheetProcessingInstruction = '<?xml-stylesheet href="/pretty-feed-v3.xsl" type="text/xsl"?>';
    
    const finalRssOutput = rssOutput.replace(
        '<?xml version="1.0" encoding="utf-8"?>',
        '<?xml version="1.0" encoding="utf-8"?>\n' + styleSheetProcessingInstruction
    );

    if (!fs.existsSync('./public/pretty-feed-v3.xsl')) {
        console.warn('警告: public目录中未找到pretty-feed-v3.xsl文件。RSS样式将不会生效。');
    }
    
    fs.writeFileSync(`./dist/rss.xml`, finalRssOutput, 'utf8');
    console.log('RSS feed 生成成功，已应用样式表。');
};

generateRssFeed();
