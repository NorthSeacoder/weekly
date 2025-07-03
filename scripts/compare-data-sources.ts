#!/usr/bin/env tsx

// 加载环境变量
import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { initDatabase, query } from '../lib/database';

interface FileContent {
    path: string;
    title: string;
    category?: string;
    date?: Date;
    slug?: string;
    type: 'blog' | 'weekly';
}

interface DbContent {
    id: number;
    title: string;
    slug: string;
    category?: string;
    published_at?: Date;
    type: 'blog' | 'weekly';
}

class DataSourceComparator {
    private fileContents: FileContent[] = [];
    private dbContents: DbContent[] = [];

    async compare() {
        console.log('🔍 开始数据源对比分析...\n');
        
        // 收集文件系统数据
        await this.collectFileSystemData();
        
        // 收集数据库数据
        await this.collectDatabaseData();
        
        // 进行对比分析
        this.analyzeData();
    }

    private async collectFileSystemData() {
        console.log('📁 收集文件系统数据...');
        
        // 收集博客文件
        const blogsDir = path.join(process.cwd(), 'blogs');
        if (fs.existsSync(blogsDir)) {
            this.collectFilesFromDir(blogsDir, 'blog');
        }
        
        // 收集周刊文件
        const sectionsDir = path.join(process.cwd(), 'sections');
        if (fs.existsSync(sectionsDir)) {
            this.collectFilesFromDir(sectionsDir, 'weekly');
        }
        
        console.log(`✅ 文件系统数据收集完成: ${this.fileContents.length} 个文件`);
    }

    private collectFilesFromDir(dir: string, type: 'blog' | 'weekly') {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                this.collectFilesFromDir(fullPath, type);
            } else if (item.endsWith('.mdx')) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const { data } = matter(content);
                    
                    this.fileContents.push({
                        path: fullPath,
                        title: data.title || item.replace('.mdx', ''),
                        category: data.category,
                        date: data.date,
                        slug: data.slug,
                        type
                    });
                } catch (error) {
                    console.warn(`⚠️ 解析文件失败: ${fullPath}`);
                }
            }
        }
    }

    private async collectDatabaseData() {
        console.log('🗄️ 收集数据库数据...');
        
        try {
            initDatabase();
            
            const contents = await query(`
                SELECT 
                    c.id,
                    c.title,
                    c.slug,
                    c.published_at,
                    ct.slug as content_type,
                    cat.name as category
                FROM contents c
                LEFT JOIN content_types ct ON c.content_type_id = ct.id
                LEFT JOIN categories cat ON c.category_id = cat.id
                ORDER BY c.id
            `);
            
            this.dbContents = contents.map((row: any) => ({
                id: row.id,
                title: row.title,
                slug: row.slug,
                category: row.category,
                published_at: row.published_at,
                type: row.content_type === 'blog' ? 'blog' : 'weekly'
            }));
            
            console.log(`✅ 数据库数据收集完成: ${this.dbContents.length} 条记录`);
        } catch (error) {
            console.error('❌ 数据库数据收集失败:', error);
        }
    }

    private analyzeData() {
        console.log('\n📊 数据对比分析:');
        console.log('='.repeat(60));
        
        // 基本统计
        const fileBlogs = this.fileContents.filter(f => f.type === 'blog');
        const fileWeeklies = this.fileContents.filter(f => f.type === 'weekly');
        const dbBlogs = this.dbContents.filter(d => d.type === 'blog');
        const dbWeeklies = this.dbContents.filter(d => d.type === 'weekly');
        
        console.log('📈 数量对比:');
        console.log(`  博客文章: 文件系统 ${fileBlogs.length} vs 数据库 ${dbBlogs.length} (差异: ${fileBlogs.length - dbBlogs.length})`);
        console.log(`  周刊内容: 文件系统 ${fileWeeklies.length} vs 数据库 ${dbWeeklies.length} (差异: ${fileWeeklies.length - dbWeeklies.length})`);
        console.log(`  总计: 文件系统 ${this.fileContents.length} vs 数据库 ${this.dbContents.length} (差异: ${this.fileContents.length - this.dbContents.length})`);
        
        // 查找缺失的内容
        console.log('\n🔍 详细差异分析:');
        
        // 根据标题匹配查找缺失的博客
        const missingBlogs = fileBlogs.filter(file => 
            !dbBlogs.some(db => db.title === file.title)
        );
        
        if (missingBlogs.length > 0) {
            console.log(`\n❌ 数据库中缺失的博客 (${missingBlogs.length} 个):`);
            missingBlogs.slice(0, 10).forEach(blog => {
                console.log(`  - ${blog.title}`);
                console.log(`    路径: ${blog.path}`);
            });
            if (missingBlogs.length > 10) {
                console.log(`  ... 还有 ${missingBlogs.length - 10} 个`);
            }
        }
        
        // 查找缺失的周刊内容
        const missingWeeklies = fileWeeklies.filter(file => 
            !dbWeeklies.some(db => db.title === file.title)
        );
        
        if (missingWeeklies.length > 0) {
            console.log(`\n❌ 数据库中缺失的周刊内容 (${missingWeeklies.length} 个):`);
            missingWeeklies.slice(0, 10).forEach(weekly => {
                console.log(`  - ${weekly.title}`);
                console.log(`    路径: ${weekly.path}`);
            });
            if (missingWeeklies.length > 10) {
                console.log(`  ... 还有 ${missingWeeklies.length - 10} 个`);
            }
        }
        
        // 查找数据库中多出的内容
        const extraInDb = this.dbContents.filter(db => 
            !this.fileContents.some(file => file.title === db.title)
        );
        
        if (extraInDb.length > 0) {
            console.log(`\n➕ 数据库中多出的内容 (${extraInDb.length} 个):`);
            extraInDb.slice(0, 10).forEach(content => {
                console.log(`  - ${content.title} (${content.type})`);
            });
            if (extraInDb.length > 10) {
                console.log(`  ... 还有 ${extraInDb.length - 10} 个`);
            }
        }
        
        // 分析文件问题
        this.analyzeFileIssues();
        
        console.log('\n💡 建议:');
        if (missingBlogs.length > 0 || missingWeeklies.length > 0) {
            console.log('  1. 运行 npm run migrate:mysql 重新迁移数据');
            console.log('  2. 检查迁移日志中的错误信息');
            console.log('  3. 手动检查缺失文件的格式是否正确');
        }
        
        if (extraInDb.length > 0) {
            console.log('  4. 检查数据库中是否有重复或无效数据');
        }
        
        console.log('='.repeat(60));
    }

    private analyzeFileIssues() {
        console.log('\n🔍 文件问题分析:');
        
        // 检查没有标题的文件
        const noTitleFiles = this.fileContents.filter(f => !f.title || f.title.trim() === '');
        if (noTitleFiles.length > 0) {
            console.log(`  ⚠️ 没有标题的文件: ${noTitleFiles.length} 个`);
        }
        
        // 检查没有分类的文件
        const noCategoryFiles = this.fileContents.filter(f => !f.category);
        if (noCategoryFiles.length > 0) {
            console.log(`  ⚠️ 没有分类的文件: ${noCategoryFiles.length} 个`);
        }
        
        // 检查没有日期的文件
        const noDateFiles = this.fileContents.filter(f => !f.date);
        if (noDateFiles.length > 0) {
            console.log(`  ⚠️ 没有日期的文件: ${noDateFiles.length} 个`);
        }
        
        // 检查重复标题
        const titleCounts = new Map<string, number>();
        this.fileContents.forEach(f => {
            const count = titleCounts.get(f.title) || 0;
            titleCounts.set(f.title, count + 1);
        });
        
        const duplicateTitles = Array.from(titleCounts.entries()).filter(([, count]) => count > 1);
        if (duplicateTitles.length > 0) {
            console.log(`  ⚠️ 重复标题: ${duplicateTitles.length} 个`);
            duplicateTitles.slice(0, 5).forEach(([title, count]) => {
                console.log(`    - "${title}" (${count} 次)`);
            });
        }
    }
}

// 主函数
async function main() {
    const comparator = new DataSourceComparator();
    await comparator.compare();
}

if (require.main === module) {
    main().catch(console.error);
}

export default DataSourceComparator; 