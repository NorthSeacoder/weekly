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
        console.log('📚 迁移博客内容（支持更新已存在记录）...');
        
        const blogsDir = path.join(process.cwd(), 'blogs');
        if (!fs.existsSync(blogsDir)) {
            console.log('   📂 未找到 blogs 文件夹，跳过博客迁移');
            return;
        }
        
        const blogFiles = this.getAllMdxFiles(blogsDir);
        console.log(`   📄 找到 ${blogFiles.length} 个博客文件`);
        
        let newCount = 0;
        let updateCount = 0;
        let errorCount = 0;
        
        for (const file of blogFiles) {
            try {
                await this.migrateBlogFile(file);
                // 迁移成功的计数通过 migrateBlogFile 内部的 console.log 来区分新增和更新
            } catch (error) {
                console.error(`  ❌ 迁移失败: ${file.path}`, error);
                errorCount++;
            }
        }
        
        console.log(`📚 博客内容迁移完成`);
        console.log(`   📊 总计: ${blogFiles.length} 个文件，错误: ${errorCount} 个`);
    }

    private async migrateWeeklyContents() {
        console.log('📅 跳过周刊内容迁移（数据已在数据库中）...');
        console.log('   如需迁移周刊内容，请使用专门的周刊同步工具');
        console.log('   周刊数据应该通过 weekly:add 或直接在数据库中管理');
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
            const title = frontmatter.title || '未命名文章';
            const slug = frontmatter.slug || this.generateSlugFromTitle(title);
            
            // 检查是否已存在相同的记录（基于 title 和 slug）
            const existingContent = await connection.execute(
                'SELECT id FROM contents WHERE title = ? OR slug = ? LIMIT 1',
                [title, slug]
            );
            
            const contentData = {
                content_type_id: this.contentTypeMap['blog'],
                category_id: categoryId,
                title: title,
                slug: slug,
                description: frontmatter.desc || '',
                content: content,
                content_format: 'mdx',
                status: frontmatter.hidden ? 'hidden' : 'published',
                published_at: frontmatter.date ? dayjs(frontmatter.date).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss'),
                word_count: readingTime.words,
                reading_time: Math.ceil(readingTime.minutes),
                updated_at: dayjs(file.stats.mtime).format('YYYY-MM-DD HH:mm:ss')
            };
            
            let contentId: number;
            
            if (existingContent[0] && Array.isArray(existingContent[0]) && existingContent[0].length > 0) {
                // 更新已存在的记录
                contentId = (existingContent[0] as any)[0].id;
                
                const updateFields = Object.keys(contentData).map(key => `${key} = ?`).join(', ');
                await connection.execute(
                    `UPDATE contents SET ${updateFields} WHERE id = ?`,
                    [...Object.values(contentData), contentId]
                );
                
                console.log(`  🔄 已更新: ${title}`);
            } else {
                // 插入新记录
                const insertData = {
                    ...contentData,
                    created_at: dayjs(file.stats.birthtime).format('YYYY-MM-DD HH:mm:ss')
                };
                
                const [result] = await connection.execute(
                    `INSERT INTO contents (${Object.keys(insertData).join(', ')}) 
                     VALUES (${Object.keys(insertData).map(() => '?').join(', ')})`,
                    Object.values(insertData)
                );
                
                contentId = (result as any).insertId;
                console.log(`  ➕ 已新增: ${title}`);
            }
            
            // 更新标签关联（先删除旧的，再插入新的）
            await connection.execute('DELETE FROM content_tags WHERE content_id = ?', [contentId]);
            
            if (tagIds.length > 0) {
                const tagValues = tagIds.map(tagId => [contentId, tagId]);
                await this.batchInsertContentTags(tagValues, connection);
            }
            
            return contentId;
        });
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