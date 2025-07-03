#!/usr/bin/env tsx

// 加载环境变量
import { config } from 'dotenv';
config();

import { initDatabase, query, execute, transaction } from '../lib/database';
import type { RowDataPacket } from 'mysql2/promise';

interface ContentRow extends RowDataPacket {
    id: number;
    title: string;
    slug: string;
    content: string;
    content_type_id: number;
    created_at: string;
}

class DatabaseIssueFixer {
    constructor() {
        initDatabase();
    }

    async fixAllIssues() {
        console.log('🔧 开始修复数据库问题...');
        
        try {
            // 设置正确的字符集
            await execute("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
            
            // 修复标签计数问题
            await this.fixTagCounts();
            
            // 修复博客分类问题
            await this.fixBlogCategories();
            
            // 修复时间数据问题
            await this.fixTimeIssues();
            
            console.log('✅ 数据库问题修复完成！');
        } catch (error) {
            console.error('❌ 修复过程中出现错误:', error);
        }
    }

    async fixTagCounts() {
        console.log('\n📊 修复标签计数问题:');
        
        try {
            // 获取所有标签的实际使用次数
            const tagStats = await query(`
                SELECT 
                    t.id,
                    t.name,
                    t.count as stored_count,
                    COUNT(ct.content_id) as actual_count
                FROM tags t
                LEFT JOIN content_tags ct ON t.id = ct.tag_id
                GROUP BY t.id
                HAVING t.count != COUNT(ct.content_id)
            `);
            
            console.log(`发现 ${tagStats.length} 个标签计数不一致`);
            
            for (const tag of tagStats) {
                await execute(
                    'UPDATE tags SET count = ? WHERE id = ?',
                    [tag.actual_count, tag.id]
                );
                console.log(`  ✅ ${tag.name}: ${tag.stored_count} → ${tag.actual_count}`);
            }
            
            console.log('✅ 标签计数修复完成');
        } catch (error) {
            console.error('❌ 修复标签计数时出错:', error);
        }
    }

    async fixBlogCategories() {
        console.log('\n📂 修复博客分类问题:');
        
        try {
            // 检查没有分类的博客内容
            const uncategorizedBlogs = await query(`
                SELECT c.id, c.title
                FROM contents c
                JOIN content_types ct ON c.content_type_id = ct.id
                WHERE ct.slug = 'blog' AND c.category_id IS NULL
                LIMIT 10
            `);
            
            console.log(`发现 ${uncategorizedBlogs.length} 个没有分类的博客`);
            
            if (uncategorizedBlogs.length > 0) {
                // 根据标题或内容自动分类
                for (const blog of uncategorizedBlogs) {
                    const categoryId = await this.determineBlogCategory(blog.title);
                    if (categoryId) {
                        await execute(
                            'UPDATE contents SET category_id = ? WHERE id = ?',
                            [categoryId, blog.id]
                        );
                        console.log(`  ✅ "${blog.title}" 已分类`);
                    }
                }
            }
            
            console.log('✅ 博客分类修复完成');
        } catch (error) {
            console.error('❌ 修复博客分类时出错:', error);
        }
    }

    private async determineBlogCategory(title: string): Promise<number | null> {
        // 根据标题关键词判断分类
        const categoryMap = [
            { keywords: ['V8', 'v8'], categorySlug: 'v8' },
            { keywords: ['HTTP', 'http', 'Cookie', 'HTTPS'], categorySlug: 'http' },
            { keywords: ['Pixi.js', 'pixi'], categorySlug: 'pixijs' },
            { keywords: ['VSCode', 'vscode'], categorySlug: 'vscode-extension' },
            { keywords: ['i18next', '国际化'], categorySlug: 'i18next' },
            { keywords: ['WebSocket', 'websocket'], categorySlug: 'websocket' },
            { keywords: ['浏览器', 'browser'], categorySlug: 'browser' },
            { keywords: ['React', 'react'], categorySlug: 'react' },
            { keywords: ['CSS', 'css'], categorySlug: 'css' },
            { keywords: ['Bug', 'bug'], categorySlug: 'bug-fixes' }
        ];
        
        for (const mapping of categoryMap) {
            if (mapping.keywords.some(keyword => title.includes(keyword))) {
                const [category] = await query(
                    'SELECT id FROM categories WHERE slug = ?',
                    [mapping.categorySlug]
                );
                return category ? category.id : null;
            }
        }
        
        return null;
    }

    async fixTimeIssues() {
        console.log('\n⏰ 修复时间数据问题:');
        
        try {
            // 修复创建时间晚于发布时间的问题
            const timeIssues = await query(`
                SELECT id, title, created_at, published_at
                FROM contents 
                WHERE created_at > published_at AND published_at IS NOT NULL
                LIMIT 10
            `);
            
            console.log(`发现 ${timeIssues.length} 个时间数据问题`);
            
            for (const content of timeIssues) {
                // 将创建时间设置为发布时间之前
                const newCreatedAt = new Date(content.published_at);
                newCreatedAt.setHours(newCreatedAt.getHours() - 1); // 提前1小时
                
                await execute(
                    'UPDATE contents SET created_at = ? WHERE id = ?',
                    [newCreatedAt, content.id]
                );
                console.log(`  ✅ "${content.title}" 时间已修复`);
            }
            
            console.log('✅ 时间数据修复完成');
        } catch (error) {
            console.error('❌ 修复时间数据时出错:', error);
        }
    }

    async generateReport() {
        console.log('\n📋 生成数据库状态报告:');
        
        try {
            // 基本统计
            const stats = await query(`
                SELECT 
                    'contents' as table_name,
                    COUNT(*) as count
                FROM contents
                UNION ALL
                SELECT 'tags', COUNT(*) FROM tags
                UNION ALL
                SELECT 'categories', COUNT(*) FROM categories
                UNION ALL
                SELECT 'weekly_issues', COUNT(*) FROM weekly_issues
                UNION ALL
                SELECT 'content_tags', COUNT(*) FROM content_tags
                UNION ALL
                SELECT 'weekly_content_items', COUNT(*) FROM weekly_content_items
            `);
            
            console.log('表统计:');
            stats.forEach(stat => {
                console.log(`  ${stat.table_name}: ${stat.count} 条记录`);
            });
            
            // 内容类型分布
            const contentTypeStats = await query(`
                SELECT 
                    ct.name,
                    COUNT(c.id) as count,
                    COUNT(CASE WHEN c.status = 'published' THEN 1 END) as published_count
                FROM content_types ct
                LEFT JOIN contents c ON ct.id = c.content_type_id
                GROUP BY ct.id
            `);
            
            console.log('\n内容类型分布:');
            contentTypeStats.forEach(stat => {
                console.log(`  ${stat.name}: ${stat.count} 总计, ${stat.published_count} 已发布`);
            });
            
            // 分类使用情况
            const categoryStats = await query(`
                SELECT 
                    c.name,
                    COUNT(contents.id) as content_count
                FROM categories c
                LEFT JOIN contents ON c.id = contents.category_id
                GROUP BY c.id
                ORDER BY content_count DESC
                LIMIT 10
            `);
            
            console.log('\n热门分类 (Top 10):');
            categoryStats.forEach(stat => {
                console.log(`  ${stat.name}: ${stat.content_count} 个内容`);
            });
            
            console.log('\n✅ 报告生成完成');
        } catch (error) {
            console.error('❌ 生成报告时出错:', error);
        }
    }

    // 清空所有数据（危险操作，仅用于重新开始）
    async clearAllData() {
        console.log('⚠️ 警告：即将清空所有数据！');
        console.log('这个操作不可逆，请确认你要重新开始迁移');
        
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question('输入 "YES" 确认清空所有数据: ', async (answer) => {
                rl.close();
                
                if (answer === 'YES') {
                    try {
                        await transaction(async (connection) => {
                            // 按依赖关系顺序删除
                            await connection.execute('DELETE FROM content_relations');
                            await connection.execute('DELETE FROM content_attributes');
                            await connection.execute('DELETE FROM weekly_content_items');
                            await connection.execute('DELETE FROM content_tags');
                            await connection.execute('DELETE FROM contents');
                            await connection.execute('DELETE FROM weekly_issues');
                            await connection.execute('DELETE FROM tags');
                            await connection.execute('DELETE FROM categories WHERE parent_id IS NOT NULL');
                            await connection.execute('DELETE FROM categories');
                            
                            // 重置自增ID
                            await connection.execute('ALTER TABLE contents AUTO_INCREMENT = 1');
                            await connection.execute('ALTER TABLE weekly_issues AUTO_INCREMENT = 1');
                            await connection.execute('ALTER TABLE categories AUTO_INCREMENT = 1');
                            await connection.execute('ALTER TABLE tags AUTO_INCREMENT = 1');
                        });
                        
                        console.log('✅ 所有数据已清空');
                        resolve(true);
                    } catch (error) {
                        console.error('❌ 清空数据时出错:', error);
                        resolve(false);
                    }
                } else {
                    console.log('❌ 操作已取消');
                    resolve(false);
                }
            });
        });
    }
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    const fixer = new DatabaseIssueFixer();
    
    if (args.includes('--report')) {
        await fixer.generateReport();
    } else if (args.includes('--fix-tags')) {
        await fixer.fixTagCounts();
    } else if (args.includes('--fix-categories')) {
        await fixer.fixBlogCategories();
    } else if (args.includes('--fix-time')) {
        await fixer.fixTimeIssues();
    } else {
        await fixer.fixAllIssues();
        await fixer.generateReport();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

export default DatabaseIssueFixer; 