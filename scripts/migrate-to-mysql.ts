#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { initDatabase, query, execute, transaction, DatabaseUtils } from '../lib/database';
import getReadingTime from 'reading-time';
import dayjs from 'dayjs';

interface FileContent {
    path: string;
    frontmatter: any;
    content: string;
    stats: fs.Stats;
}

interface ContentTypeMap {
    [key: string]: number;
}

interface CategoryMap {
    [key: string]: number;
}

interface TagMap {
    [key: string]: number;
}

class ContentMigrator {
    private contentTypeMap: ContentTypeMap = {};
    private categoryMap: CategoryMap = {};
    private tagMap: TagMap = {};

    constructor() {
        // 初始化数据库连接
        initDatabase();
    }

    async migrate(cleanFirst: boolean = false) {
        console.log('🚀 开始数据迁移...');
        
        try {
            // 检查并创建数据库结构
            await this.setupDatabase();
            
            // 可选：清理现有数据
            if (cleanFirst) {
                await this.cleanExistingData();
            }
            
            // 加载映射数据
            await this.loadMappings();
            
            // 迁移博客内容
            await this.migrateBlogContents();
            
            // 迁移周刊内容
            await this.migrateWeeklyContents();
            
            console.log('✅ 数据迁移完成！');
        } catch (error) {
            console.error('❌ 数据迁移失败:', error);
            process.exit(1);
        }
    }

    private async setupDatabase() {
        console.log('📋 检查数据库结构...');
        
        // 设置正确的字符集
        await execute("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
        
        // 读取并执行 schema.sql
        const schemaPath = path.join(process.cwd(), 'database/schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf-8');
            const statements = schema.split(';').filter(s => s.trim().length > 0);
            
            for (const statement of statements) {
                if (statement.trim().toLowerCase().startsWith('create table') || 
                    statement.trim().toLowerCase().startsWith('insert into')) {
                    try {
                        await execute(statement);
                    } catch (error: any) {
                        // 忽略表已存在的错误
                        if (!error.message.includes('already exists') && 
                            !error.message.includes('Duplicate entry')) {
                            console.warn('⚠️ SQL执行警告:', error.message);
                        }
                    }
                }
            }
        } else {
            console.error('❌ 找不到数据库架构文件: database/schema.sql');
            process.exit(1);
        }
    }

    private async loadMappings() {
        console.log('📊 加载数据映射...');
        
        // 加载内容类型映射
        const contentTypes = await query('SELECT id, slug FROM content_types');
        for (const ct of contentTypes) {
            this.contentTypeMap[ct.slug] = ct.id;
        }
        
        // 加载分类映射
        const categories = await query('SELECT id, slug FROM categories');
        for (const cat of categories) {
            this.categoryMap[cat.slug] = cat.id;
        }
        
        // 加载标签映射
        const tags = await query('SELECT id, name FROM tags');
        for (const tag of tags) {
            this.tagMap[tag.name] = tag.id;
        }
    }

    private async migrateBlogContents() {
        console.log('📚 迁移博客内容...');
        
        const blogsDir = path.join(process.cwd(), 'blogs');
        const blogFiles = this.getAllMdxFiles(blogsDir);
        
        let migratedCount = 0;
        
        for (const file of blogFiles) {
            try {
                await this.migrateBlogFile(file);
                migratedCount++;
                console.log(`  ✅ 已迁移: ${file.path}`);
            } catch (error) {
                console.error(`  ❌ 迁移失败: ${file.path}`, error);
            }
        }
        
        console.log(`📚 博客内容迁移完成，共迁移 ${migratedCount} 篇文章`);
    }

    private async migrateWeeklyContents() {
        console.log('📅 迁移周刊内容...');
        
        const sectionsDir = path.join(process.cwd(), 'sections');
        const weeklyFiles = this.getAllMdxFiles(sectionsDir);
        
        // 按日期对周刊内容进行分组
        const weeklyGroups = this.groupWeeklyByDate(weeklyFiles);
        
        let migratedCount = 0;
        
        for (const [weekRange, files] of Object.entries(weeklyGroups)) {
            try {
                await this.migrateWeeklyIssue(weekRange, files);
                migratedCount++;
                console.log(`  ✅ 已迁移周刊: ${weekRange}`);
            } catch (error) {
                console.error(`  ❌ 迁移周刊失败: ${weekRange}`, error);
            }
        }
        
        console.log(`📅 周刊内容迁移完成，共迁移 ${migratedCount} 期周刊`);
    }

    private getAllMdxFiles(dir: string): FileContent[] {
        const files: FileContent[] = [];
        
        function walkDir(currentDir: string) {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stats = fs.statSync(fullPath);
                
                if (stats.isDirectory()) {
                    walkDir(fullPath);
                } else if (item.endsWith('.mdx') || item.endsWith('.md')) {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const parsed = matter(content);
                    
                    files.push({
                        path: fullPath,
                        frontmatter: parsed.data,
                        content: parsed.content,
                        stats
                    });
                }
            }
        }
        
        walkDir(dir);
        return files;
    }

    private async migrateBlogFile(file: FileContent) {
        return transaction(async (connection) => {
            const { frontmatter, content, path: filePath } = file;
            
            // 确保分类存在
            const categorySlug = this.getCategorySlugFromPath(filePath, 'blog');
            const categoryId = await this.ensureCategory(categorySlug, connection);
            
            // 确保标签存在
            const tagIds = await this.ensureTags(frontmatter.tags || [], connection);
            
            // 准备内容数据
            const readingTime = getReadingTime(content);
            const contentData = {
                content_type_id: this.contentTypeMap['blog'],
                category_id: categoryId,
                title: frontmatter.title || '未命名文章',
                slug: frontmatter.slug || this.generateSlugFromTitle(frontmatter.title || '未命名文章'),
                description: frontmatter.desc || '',
                content: content,
                content_format: 'mdx',
                status: frontmatter.hidden ? 'hidden' : 'published',
                published_at: frontmatter.date ? dayjs(frontmatter.date).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss'),
                word_count: readingTime.words,
                reading_time: Math.ceil(readingTime.minutes),
                created_at: dayjs(file.stats.birthtime).format('YYYY-MM-DD HH:mm:ss'),
                updated_at: dayjs(file.stats.mtime).format('YYYY-MM-DD HH:mm:ss')
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
                const tagValues = tagIds.map(tagId => [contentId, tagId]);
                await this.batchInsertContentTags(tagValues, connection);
            }
            
            return contentId;
        });
    }

    private groupWeeklyByDate(files: FileContent[]): Record<string, FileContent[]> {
        const groups: Record<string, FileContent[]> = {};
        
        for (const file of files) {
            const date = dayjs(file.frontmatter.date);
            const weekStart = date.startOf('week');
            const weekEnd = date.endOf('week');
            const weekKey = `${weekStart.format('YYYY-MM-DD')} to ${weekEnd.format('YYYY-MM-DD')}`;
            
            if (!groups[weekKey]) {
                groups[weekKey] = [];
            }
            groups[weekKey].push(file);
        }
        
        return groups;
    }

    private async migrateWeeklyIssue(weekRange: string, files: FileContent[]) {
        return transaction(async (connection) => {
            const [startDate, endDate] = weekRange.split(' to ');
            const issueNumber = await this.getNextIssueNumber();
            
            // 创建周刊期号
            const issueData = {
                issue_number: issueNumber,
                title: `我不知道的周刊第 ${issueNumber} 期`,
                slug: `${issueNumber}`,
                start_date: startDate,
                end_date: endDate,
                total_items: files.length,
                status: 'published',
                published_at: endDate + ' 23:59:59'
            };
            
            const [issueResult] = await connection.execute(
                `INSERT INTO weekly_issues (${Object.keys(issueData).join(', ')}) 
                 VALUES (${Object.keys(issueData).map(() => '?').join(', ')})`,
                Object.values(issueData)
            );
            
            const weeklyIssueId = (issueResult as any).insertId;
            
            // 迁移每个条目
            const contentIds: number[] = [];
            for (const [index, file] of files.entries()) {
                const contentId = await this.migrateWeeklyItem(file, connection);
                contentIds.push(contentId);
                
                // 关联到周刊
                await connection.execute(
                    'INSERT INTO weekly_content_items (weekly_issue_id, content_id, sort_order) VALUES (?, ?, ?)',
                    [weeklyIssueId, contentId, index]
                );
            }
            
            return weeklyIssueId;
        });
    }

    private async migrateWeeklyItem(file: FileContent, connection: any) {
        const { frontmatter, content } = file;
        
        // 确保分类存在
        const categorySlug = this.mapWeeklyCategoryToSlug(frontmatter.category);
        const categoryId = await this.ensureCategory(categorySlug, connection);
        
        // 确保标签存在
        const tagIds = await this.ensureTags(frontmatter.tags || [], connection);
        
        // 准备内容数据
        const readingTime = getReadingTime(content);
        const contentData = {
            content_type_id: this.contentTypeMap['weekly'],
            category_id: categoryId,
            title: frontmatter.title || '未命名周刊内容',
            slug: this.generateSlugFromTitle(frontmatter.title || '未命名周刊内容'),
            description: '',
            content: content,
            content_format: 'mdx',
            status: 'published',
            published_at: frontmatter.date ? dayjs(frontmatter.date).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss'),
            source: frontmatter.source || '',
            word_count: readingTime.words,
            reading_time: Math.ceil(readingTime.minutes),
            created_at: frontmatter.date ? dayjs(frontmatter.date).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss'),
            updated_at: frontmatter.date ? dayjs(frontmatter.date).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss')
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
            const tagValues = tagIds.map(tagId => [contentId, tagId]);
            await this.batchInsertContentTags(tagValues, connection);
        }
        
        return contentId;
    }

    private getCategorySlugFromPath(filePath: string, contentType: string): string {
        const parts = filePath.split(path.sep);
        
        if (contentType === 'blog') {
            // blogs/v8/001.xxx.mdx -> v8
            const blogIndex = parts.findIndex(p => p === 'blogs');
            if (blogIndex >= 0 && blogIndex + 1 < parts.length) {
                return parts[blogIndex + 1];
            }
        }
        
        return 'uncategorized';
    }

    private mapWeeklyCategoryToSlug(category: string): string {
        const mapping: Record<string, string> = {
            '工具': 'tools',
            '文章': 'articles',
            '教程': 'tutorials',
            '言论': 'quotes',
            'bug': 'bugs',
            '面试题': 'interviews',
            'repos': 'repos',
            'bigones': 'bigones',
            '网站': 'websites',
            'prompt': 'prompts',
            'Prompt': 'prompts',
            'demo': 'demos',
            '开源': 'open-source',
            '资源': 'resources',
            '技巧': 'tips',
            '经验': 'experience',
            '技术': 'technology',
            '博客': 'blogs',
            'AI': 'ai',
            '博主': 'bloggers',
            '教育': 'education',
            '开发工具': 'dev-tools',
            '讨论': 'discussion',
            '观点': 'opinions',
            '读书': 'reading',
            '访谈': 'interviews',
            '设计': 'design',
            '服务': 'services',
            '思考': 'thoughts',
            '应用': 'applications',
            '平台': 'platforms',
            '安全': 'security',
            '健康': 'health',
            '书籍': 'books',
            '专栏': 'columns'
        };
        
        return mapping[category] || 'tools';
    }

    private async ensureCategory(slug: string, connection: any): Promise<number> {
        if (this.categoryMap[slug]) {
            return this.categoryMap[slug];
        }
        
        // 创建新分类
        const [result] = await connection.execute(
            'INSERT INTO categories (name, slug) VALUES (?, ?)',
            [slug, slug]
        );
        
        const categoryId = (result as any).insertId;
        this.categoryMap[slug] = categoryId;
        
        return categoryId;
    }

    private async ensureTags(tagNames: string[], connection: any): Promise<number[]> {
        const tagIds: number[] = [];
        
        for (const tagName of tagNames) {
            if (!tagName || tagName.trim() === '') {
                continue; // 跳过空标签
            }
            
            const cleanTagName = tagName.trim();
            
            if (this.tagMap[cleanTagName]) {
                tagIds.push(this.tagMap[cleanTagName]);
            } else {
                try {
                    // 先尝试查找是否已存在
                    const existingTag = await connection.execute(
                        'SELECT id FROM tags WHERE name = ?',
                        [cleanTagName]
                    );
                    
                    if (existingTag[0].length > 0) {
                        const tagId = existingTag[0][0].id;
                        this.tagMap[cleanTagName] = tagId;
                        tagIds.push(tagId);
                    } else {
                        // 创建新标签
                        const slug = cleanTagName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
                        const [result] = await connection.execute(
                            'INSERT INTO tags (name, slug, count) VALUES (?, ?, 0)',
                            [cleanTagName, slug]
                        );
                        
                        const tagId = (result as any).insertId;
                        this.tagMap[cleanTagName] = tagId;
                        tagIds.push(tagId);
                    }
                } catch (error: any) {
                    if (error.code === 'ER_DUP_ENTRY') {
                        // 如果是重复错误，重新查询获取ID
                        const existingTag = await connection.execute(
                            'SELECT id FROM tags WHERE name = ?',
                            [cleanTagName]
                        );
                        if (existingTag[0].length > 0) {
                            const tagId = existingTag[0][0].id;
                            this.tagMap[cleanTagName] = tagId;
                            tagIds.push(tagId);
                        }
                    } else {
                        console.error(`创建标签失败: ${cleanTagName}`, error);
                    }
                }
            }
        }
        
        return tagIds;
    }

    private async batchInsertContentTags(values: number[][], connection: any) {
        if (values.length === 0) return;
        
        const placeholders = values.map(() => '(?, ?)').join(', ');
        const flatValues = values.flat();
        
        await connection.execute(
            `INSERT INTO content_tags (content_id, tag_id) VALUES ${placeholders}`,
            flatValues
        );
    }

    private async getNextIssueNumber(): Promise<number> {
        const result = await query('SELECT MAX(issue_number) as max_issue FROM weekly_issues');
        return (result[0]?.max_issue || 0) + 1;
    }

    private generateSlugFromTitle(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 100);
    }

    private async cleanExistingData() {
        console.log('🧹 清理现有数据...');
        
        // 按依赖关系顺序删除
        await execute('DELETE FROM weekly_content_items');
        await execute('DELETE FROM content_tags');
        await execute('DELETE FROM contents');
        await execute('DELETE FROM weekly_issues');
        
        // 重置自增ID
        await execute('ALTER TABLE contents AUTO_INCREMENT = 1');
        await execute('ALTER TABLE weekly_issues AUTO_INCREMENT = 1');
        
        console.log('✅ 数据清理完成');
    }
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    const cleanFirst = args.includes('--clean');
    
    if (cleanFirst) {
        console.log('⚠️ 注意：将清理现有数据后重新迁移');
    }
    
    const migrator = new ContentMigrator();
    await migrator.migrate(cleanFirst);
}

if (require.main === module) {
    main().catch(console.error);
}

export default ContentMigrator; 