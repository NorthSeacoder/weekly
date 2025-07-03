#!/usr/bin/env tsx

// 加载环境变量
import { config } from 'dotenv';
config();

import { initDatabase, query, execute } from '../lib/database';
import type { RowDataPacket } from 'mysql2/promise';

class DatabaseTableChecker {
    constructor() {
        initDatabase();
    }

    async checkAllTables() {
        console.log('🔍 检查数据库表状态...');
        
        try {
            // 设置正确的字符集
            await execute("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
            
            // 检查所有表的数据
            await this.checkTableData();
            
            // 检查字符集设置
            await this.checkCharsetSettings();
            
            // 检查乱码数据
            await this.checkGarbledData();
            
            console.log('✅ 数据库检查完成！');
        } catch (error) {
            console.error('❌ 检查过程中出现错误:', error);
        }
    }

    private async checkTableData() {
        console.log('\n📊 检查表数据统计:');
        
        const tables = [
            'content_types',
            'categories', 
            'tags',
            'contents',
            'content_tags',
            'weekly_issues',
            'weekly_content_items'
        ];

        for (const table of tables) {
            try {
                const [result] = await query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = result.count;
                
                if (count === 0) {
                    console.log(`  ⚠️  ${table}: 空表 (${count} 条记录)`);
                } else {
                    console.log(`  ✅ ${table}: ${count} 条记录`);
                }
                
                // 显示部分数据样本
                if (count > 0) {
                    await this.showTableSample(table);
                }
            } catch (error) {
                console.log(`  ❌ ${table}: 检查失败 - ${error}`);
            }
        }
    }

    private async showTableSample(tableName: string) {
        try {
            let sampleQuery = '';
            
            switch (tableName) {
                case 'content_types':
                    sampleQuery = 'SELECT id, name, slug FROM content_types LIMIT 3';
                    break;
                case 'categories':
                    sampleQuery = 'SELECT id, name, slug FROM categories LIMIT 5';
                    break;
                case 'tags':
                    sampleQuery = 'SELECT id, name, slug FROM tags LIMIT 5';
                    break;
                case 'contents':
                    sampleQuery = 'SELECT id, title, LEFT(content, 50) as content_preview FROM contents LIMIT 3';
                    break;
                case 'weekly_issues':
                    sampleQuery = 'SELECT id, issue_number, title FROM weekly_issues LIMIT 3';
                    break;
                default:
                    return;
            }
            
            const samples = await query(sampleQuery);
            if (samples.length > 0) {
                console.log(`    样本数据:`);
                samples.forEach((row: any, index: number) => {
                    console.log(`      ${index + 1}. ${JSON.stringify(row)}`);
                });
            }
        } catch (error) {
            console.log(`    ⚠️ 无法获取样本数据: ${error}`);
        }
    }

    private async checkCharsetSettings() {
        console.log('\n🔤 检查表字符集设置:');
        
        try {
            const charsetInfo = await query(`
                SELECT 
                    TABLE_NAME,
                    TABLE_COLLATION,
                    CHARACTER_SET_NAME
                FROM information_schema.TABLES t
                JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY c
                    ON t.TABLE_COLLATION = c.COLLATION_NAME
                WHERE TABLE_SCHEMA = DATABASE()
                ORDER BY TABLE_NAME
            `);
            
            charsetInfo.forEach((row: any) => {
                const isCorrect = row.CHARACTER_SET_NAME === 'utf8mb4' && 
                                row.TABLE_COLLATION.includes('utf8mb4');
                const status = isCorrect ? '✅' : '⚠️';
                console.log(`  ${status} ${row.TABLE_NAME}: ${row.CHARACTER_SET_NAME} / ${row.TABLE_COLLATION}`);
            });
        } catch (error) {
            console.error('❌ 检查字符集时出错:', error);
        }
    }

    private async checkGarbledData() {
        console.log('\n🔍 检查乱码数据:');
        
        try {
            // 检查 content_types 表
            await this.checkTableForGarbledData('content_types', ['name', 'slug']);
            
            // 检查 categories 表
            await this.checkTableForGarbledData('categories', ['name', 'slug']);
            
            // 检查 tags 表
            await this.checkTableForGarbledData('tags', ['name', 'slug']);
            
            // 检查 contents 表
            await this.checkTableForGarbledData('contents', ['title']);
            
        } catch (error) {
            console.error('❌ 检查乱码数据时出错:', error);
        }
    }

    private async checkTableForGarbledData(tableName: string, columns: string[]) {
        for (const column of columns) {
            try {
                // 检查是否包含真正的乱码字符
                const garbledRows = await query(`
                    SELECT id, ${column}
                    FROM ${tableName} 
                    WHERE ${column} REGEXP '[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]'
                       OR ${column} LIKE '%%'
                       OR ${column} LIKE '%\\\\x%'
                       OR ${column} REGEXP '[\uFFFD]'
                    LIMIT 10
                `);
                
                if (garbledRows.length > 0) {
                    console.log(`  ⚠️ ${tableName}.${column} 发现疑似乱码:`);
                    garbledRows.forEach((row: any) => {
                        console.log(`    ID: ${row.id}, 内容: "${row[column]}"`);
                    });
                } else {
                    console.log(`  ✅ ${tableName}.${column} 无乱码数据`);
                }
            } catch (error) {
                console.log(`  ❌ 检查 ${tableName}.${column} 时出错: ${error}`);
            }
        }
    }

    async fixEmptyTables() {
        console.log('\n🔧 修复空表问题...');
        
        try {
            // 检查并重新插入基础数据
            await this.ensureContentTypes();
            await this.ensureCategories();
            
            console.log('✅ 空表修复完成');
        } catch (error) {
            console.error('❌ 修复空表时出错:', error);
        }
    }

    private async ensureContentTypes() {
        const [count] = await query('SELECT COUNT(*) as count FROM content_types');
        
        if (count.count === 0) {
            console.log('  📝 重新插入 content_types 数据...');
            await execute(`
                INSERT INTO content_types (name, slug, description) VALUES 
                ('周刊', 'weekly', '周刊内容类型'),
                ('博客', 'blog', '博客文章类型')
            `);
            console.log('  ✅ content_types 数据已插入');
        } else {
            console.log('  ✅ content_types 表已有数据');
        }
    }

    private async ensureCategories() {
        const [count] = await query('SELECT COUNT(*) as count FROM categories');
        
        if (count.count === 0) {
            console.log('  📝 重新插入 categories 数据...');
            
            // 插入周刊分类
            await execute(`
                INSERT INTO categories (name, slug, sort_order, description) VALUES 
                ('工具', 'tools', 1, '实用工具推荐'),
                ('文章', 'articles', 2, '优质文章分享'),
                ('教程', 'tutorials', 3, '学习教程'),
                ('言论', 'quotes', 4, '精彩言论'),
                ('bug', 'bugs', 5, 'Bug分析'),
                ('面试题', 'interviews', 6, '面试题目'),
                ('repos', 'repos', 7, '开源项目'),
                ('bigones', 'bigones', 8, '重要资源'),
                ('网站', 'websites', 9, '网站推荐'),
                ('prompt', 'prompts', 10, 'AI提示词'),
                ('demo', 'demos', 11, '演示项目')
            `);
            
            // 插入博客分类
            await execute(`
                INSERT INTO categories (name, slug, description) VALUES 
                ('V8引擎', 'v8', 'V8引擎相关技术文章'),
                ('HTTP协议', 'http', 'HTTP协议深度解析'),
                ('Pixi.js', 'pixijs', 'Pixi.js游戏引擎技术'),
                ('VSCode扩展', 'vscode-extension', 'VSCode扩展开发'),
                ('国际化', 'i18next', 'i18next国际化框架'),
                ('WebSocket', 'websocket', 'WebSocket实时通信'),
                ('浏览器技术', 'browser', '浏览器底层技术'),
                ('React框架', 'react', 'React前端框架'),
                ('前端工程化', 'frontend-engineering', '前端工程化实践'),
                ('前端架构', 'frontend-architecture', '前端架构设计'),
                ('CSS技术', 'css', 'CSS样式技术'),
                ('Bug解决', 'bug-fixes', 'Bug修复案例')
            `);
            
            console.log('  ✅ categories 数据已插入');
        } else {
            console.log('  ✅ categories 表已有数据');
        }
    }

    async fixCharsetIssues() {
        console.log('\n🔧 修复字符集问题...');
        
        try {
            // 设置连接字符集
            await execute("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
            
            // 修复表字符集
            const tables = ['content_types', 'categories', 'tags', 'contents', 'weekly_issues'];
            
            for (const table of tables) {
                console.log(`  🔄 修复表 ${table} 的字符集...`);
                await execute(`ALTER TABLE ${table} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
                console.log(`  ✅ 表 ${table} 字符集修复完成`);
            }
            
            console.log('✅ 字符集修复完成');
        } catch (error) {
            console.error('❌ 修复字符集时出错:', error);
        }
    }
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    const checker = new DatabaseTableChecker();
    
    if (args.includes('--fix-empty')) {
        await checker.fixEmptyTables();
    } else if (args.includes('--fix-charset')) {
        await checker.fixCharsetIssues();
    } else if (args.includes('--fix-all')) {
        await checker.fixCharsetIssues();
        await checker.fixEmptyTables();
        await checker.checkAllTables();
    } else {
        await checker.checkAllTables();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

export default DatabaseTableChecker; 