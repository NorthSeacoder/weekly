#!/usr/bin/env tsx

// 加载环境变量
import { config } from 'dotenv';
config();

import { initDatabase, query, execute, transaction } from '../lib/database';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import getReadingTime from 'reading-time';
import dayjs from 'dayjs';
import readline from 'readline';

interface WeeklyItemData {
    title: string;
    category: string;
    tags: string[];
    source?: string;
    content: string;
    date: string;
}

class WeeklyItemCreator {
    private contentTypeId: number = 0;
    private categoryMap: Map<string, number> = new Map();
    private tagMap: Map<string, number> = new Map();

    constructor() {
        initDatabase();
    }

    async createWeeklyItem(mode: 'interactive' | 'file' = 'interactive', filePath?: string) {
        console.log('📝 创建新的周刊内容...\n');

        try {
            await this.loadMappings();

            let itemData: WeeklyItemData;

            if (mode === 'file' && filePath) {
                itemData = await this.loadFromFile(filePath);
            } else {
                itemData = await this.collectInteractiveInput();
            }

            const contentId = await this.insertToDatabase(itemData);
            await this.associateWithWeeklyIssue(contentId, itemData.date);

            console.log(`\n✅ 周刊内容创建成功！`);
            console.log(`   内容ID: ${contentId}`);
            console.log(`   标题: ${itemData.title}`);
            console.log(`   分类: ${itemData.category}`);

        } catch (error) {
            console.error('❌ 创建失败:', error);
        }
    }

    private async loadMappings() {
        // 加载内容类型
        const contentTypes = await query('SELECT id FROM content_types WHERE slug = "weekly"');
        if (contentTypes.length === 0) {
            throw new Error('找不到周刊内容类型');
        }
        this.contentTypeId = contentTypes[0].id;

        // 加载分类映射
        const categories = await query('SELECT id, slug, name FROM categories');
        for (const cat of categories) {
            this.categoryMap.set(cat.slug, cat.id);
            this.categoryMap.set(cat.name, cat.id);
        }

        // 加载标签映射
        const tags = await query('SELECT id, name FROM tags');
        for (const tag of tags) {
            this.tagMap.set(tag.name, tag.id);
        }
    }

    private async loadFromFile(filePath: string): Promise<WeeklyItemData> {
        console.log(`📁 从文件加载: ${filePath}`);

        if (!fs.existsSync(filePath)) {
            throw new Error(`文件不存在: ${filePath}`);
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(fileContent);

        return {
            title: data.title || path.basename(filePath, path.extname(filePath)),
            category: data.category || '工具',
            tags: data.tags || [],
            source: data.source || '',
            content: content,
            date: data.date || dayjs().format('YYYY-MM-DD')
        };
    }

    private async collectInteractiveInput(): Promise<WeeklyItemData> {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (prompt: string): Promise<string> => {
            return new Promise((resolve) => {
                rl.question(prompt, resolve);
            });
        };

        try {
            console.log('请输入周刊内容信息：\n');

            const title = await question('📝 标题: ');
            const category = await question('📂 分类 (工具/文章/教程/开源/资源等): ') || '工具';
            const tagsInput = await question('🏷️  标签 (用逗号分隔): ');
            const source = await question('🔗 来源 (可选): ');
            const date = await question(`📅 日期 (YYYY-MM-DD, 默认今天 ${dayjs().format('YYYY-MM-DD')}): `) || dayjs().format('YYYY-MM-DD');

            console.log('\n📝 请输入内容 (输入 "END" 结束):');
            let content = '';
            let line = '';
            while ((line = await question('')) !== 'END') {
                content += line + '\n';
            }

            const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

            return {
                title,
                category,
                tags,
                source,
                content: content.trim(),
                date
            };

        } finally {
            rl.close();
        }
    }

    private async insertToDatabase(itemData: WeeklyItemData): Promise<number> {
        return transaction(async (connection) => {
            // 确保分类存在
            const categoryId = await this.ensureCategory(itemData.category, connection);

            // 确保标签存在
            const tagIds = await this.ensureTags(itemData.tags, connection);

            // 准备内容数据
            const readingTime = getReadingTime(itemData.content);
            const contentData = {
                content_type_id: this.contentTypeId,
                category_id: categoryId,
                title: itemData.title,
                slug: this.generateSlug(itemData.title),
                description: '',
                content: itemData.content,
                content_format: 'mdx',
                status: 'published',
                published_at: dayjs(itemData.date).format('YYYY-MM-DD HH:mm:ss'),
                source: itemData.source || '',
                word_count: readingTime.words,
                reading_time: Math.ceil(readingTime.minutes),
                created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
            };

            // 插入内容
            const [result] = await connection.execute(
                `INSERT INTO contents (${Object.keys(contentData).join(', ')}) 
                 VALUES (${Object.keys(contentData).map(() => '?').join(', ')})`,
                Object.values(contentData)
            );

            const contentId = (result as any).insertId;

            // 关联标签
            if (tagIds.length > 0) {
                for (const tagId of tagIds) {
                    await connection.execute(
                        'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)',
                        [contentId, tagId]
                    );
                }

                // 更新标签计数
                for (const tagId of tagIds) {
                    await connection.execute(
                        'UPDATE tags SET count = count + 1 WHERE id = ?',
                        [tagId]
                    );
                }
            }

            return contentId;
        });
    }

    private async associateWithWeeklyIssue(contentId: number, date: string) {
        // 查找或创建对应的周刊期号
        const weekStart = dayjs(date).startOf('week');
        const weekEnd = dayjs(date).endOf('week');

        let weeklyIssue = await query(`
            SELECT id FROM weekly_issues 
            WHERE start_date <= ? AND end_date >= ?
        `, [date, date]);

        let weeklyIssueId: number;

        if (weeklyIssue.length === 0) {
            // 创建新的周刊期号
            const issueNumber = await this.getNextIssueNumber();
            const issueData = {
                issue_number: issueNumber,
                title: `我不知道的周刊第 ${issueNumber} 期`,
                slug: `${issueNumber}`,
                start_date: weekStart.format('YYYY-MM-DD'),
                end_date: weekEnd.format('YYYY-MM-DD'),
                total_items: 1,
                status: 'published',
                published_at: weekEnd.format('YYYY-MM-DD') + ' 23:59:59'
            };

            const result = await execute(
                `INSERT INTO weekly_issues (${Object.keys(issueData).join(', ')}) 
                 VALUES (${Object.keys(issueData).map(() => '?').join(', ')})`,
                Object.values(issueData)
            ) as any;

            weeklyIssueId = result.insertId;
            console.log(`📅 创建新周刊期号: 第 ${issueNumber} 期`);
        } else {
            weeklyIssueId = weeklyIssue[0].id;
            // 更新该期的总数
            await execute(
                'UPDATE weekly_issues SET total_items = total_items + 1 WHERE id = ?',
                [weeklyIssueId]
            );
        }

        // 获取当前期号的最大排序
        const maxSort = await query(`
            SELECT COALESCE(MAX(sort_order), -1) as max_sort 
            FROM weekly_content_items 
            WHERE weekly_issue_id = ?
        `, [weeklyIssueId]);

        const sortOrder = (maxSort[0]?.max_sort ?? -1) + 1;

        // 关联到周刊
        await execute(
            'INSERT INTO weekly_content_items (weekly_issue_id, content_id, sort_order) VALUES (?, ?, ?)',
            [weeklyIssueId, contentId, sortOrder]
        );
    }

    private async ensureCategory(categoryName: string, connection: any): Promise<number> {
        const categoryId = this.categoryMap.get(categoryName);
        if (categoryId) {
            return categoryId;
        }

        // 创建新分类
        const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
        const [result] = await connection.execute(
            'INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, 999)',
            [categoryName, slug]
        );

        const newCategoryId = (result as any).insertId;
        this.categoryMap.set(categoryName, newCategoryId);
        
        console.log(`📂 创建新分类: ${categoryName}`);
        return newCategoryId;
    }

    private async ensureTags(tagNames: string[], connection: any): Promise<number[]> {
        const tagIds: number[] = [];

        for (const tagName of tagNames) {
            if (!tagName || tagName.trim() === '') continue;

            const cleanTagName = tagName.trim();
            let tagId = this.tagMap.get(cleanTagName);

            if (!tagId) {
                // 创建新标签
                const slug = cleanTagName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
                const [result] = await connection.execute(
                    'INSERT INTO tags (name, slug, count) VALUES (?, ?, 0)',
                    [cleanTagName, slug]
                );

                tagId = (result as any).insertId;
                if (!tagId) {
                    throw new Error(`创建标签失败: ${cleanTagName}`);
                }
                this.tagMap.set(cleanTagName, tagId);
                
                console.log(`🏷️ 创建新标签: ${cleanTagName}`);
            }

            if (tagId) {
                tagIds.push(tagId);
            }
        }

        return tagIds;
    }

    private async getNextIssueNumber(): Promise<number> {
        const result = await query('SELECT COALESCE(MAX(issue_number), 0) + 1 as next_number FROM weekly_issues');
        return result[0].next_number;
    }

    private generateSlug(title: string): string {
        return title.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-\u4e00-\u9fa5]/g, '')
            .substring(0, 100);
    }
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    const mode = args.includes('--interactive') ? 'interactive' : 
                 args.includes('--file') ? 'file' : 'interactive';
    
    const fileIndex = args.indexOf('--file');
    const filePath = fileIndex !== -1 && args[fileIndex + 1] ? args[fileIndex + 1] : undefined;

    if (mode === 'file' && !filePath) {
        console.error('❌ 使用 --file 模式时必须指定文件路径');
        console.log('用法: npm run weekly:add -- --file path/to/file.mdx');
        process.exit(1);
    }

    const creator = new WeeklyItemCreator();
    await creator.createWeeklyItem(mode, filePath);
}

if (require.main === module) {
    main().catch(console.error);
}

export default WeeklyItemCreator; 