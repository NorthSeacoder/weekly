#!/usr/bin/env tsx

// 加载环境变量
import { config } from 'dotenv';
config();

import { initDatabase, query, execute, transaction } from '../lib/database';

class GarbledDataFixer {
    constructor() {
        initDatabase();
    }

    async fixAllGarbledData() {
        console.log('🔧 开始修复乱码数据...');
        
        try {
            // 设置正确的字符集
            await execute("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
            
            // 修复 content_types 表
            await this.fixContentTypes();
            
            // 修复 categories 表  
            await this.fixCategories();
            
            // 验证修复结果
            await this.verifyFix();
            
            console.log('✅ 乱码数据修复完成！');
        } catch (error) {
            console.error('❌ 修复过程中出现错误:', error);
            process.exit(1);
        }
    }

    private async fixContentTypes() {
        console.log('\n📝 修复 content_types 表...');
        
        await transaction(async (connection) => {
            // 检查当前数据
            const currentData = await connection.execute('SELECT * FROM content_types');
            console.log('  当前数据:', currentData[0]);
            
            // 清空表
            await connection.execute('DELETE FROM content_types');
            console.log('  ✅ 已清空 content_types 表');
            
            // 重新插入正确的数据
            await connection.execute(`
                INSERT INTO content_types (name, slug, description) VALUES 
                ('周刊', 'weekly', '周刊内容类型'),
                ('博客', 'blog', '博客文章类型')
            `);
            console.log('  ✅ 已重新插入正确的 content_types 数据');
            
            // 验证插入结果
            const newData = await connection.execute('SELECT * FROM content_types');
            console.log('  新数据:', newData[0]);
        });
    }

    private async fixCategories() {
        console.log('\n📂 修复 categories 表...');
        
        await transaction(async (connection) => {
            // 首先保存需要保留的分类映射关系
            const categoryMappings = await connection.execute(`
                SELECT DISTINCT c.category_id, cat.slug 
                FROM contents c 
                JOIN categories cat ON c.category_id = cat.id 
                WHERE c.category_id IS NOT NULL
            `);
            
            console.log('  📊 发现', (categoryMappings[0] as any[]).length, '个分类正在使用中');
            
            // 清空 categories 表
            await connection.execute('DELETE FROM categories');
            console.log('  ✅ 已清空 categories 表');
            
            // 重新插入周刊分类
            await connection.execute(`
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
            
            // 重新插入博客分类
            await connection.execute(`
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
            
            console.log('  ✅ 已重新插入正确的 categories 数据');
            
            // 修复内容表中的分类引用
            await this.fixContentCategoryReferences(connection, categoryMappings[0] as any[]);
        });
    }

    private async fixContentCategoryReferences(connection: any, oldMappings: any[]) {
        console.log('\n🔗 修复内容分类引用...');
        
        // 获取新的分类映射
        const newCategories = await connection.execute('SELECT id, slug FROM categories');
        const newCategoryMap = new Map();
        (newCategories[0] as any[]).forEach(cat => {
            newCategoryMap.set(cat.slug, cat.id);
        });
        
        // 修复每个内容的分类引用
        for (const mapping of oldMappings as any[]) {
            const newCategoryId = newCategoryMap.get(mapping.slug);
            if (newCategoryId) {
                await connection.execute(
                    'UPDATE contents SET category_id = ? WHERE category_id = ?',
                    [newCategoryId, mapping.category_id]
                );
            } else {
                console.log(`  ⚠️ 找不到分类 slug: ${mapping.slug}，将设为 NULL`);
                await connection.execute(
                    'UPDATE contents SET category_id = NULL WHERE category_id = ?',
                    [mapping.category_id]
                );
            }
        }
        
        console.log('  ✅ 内容分类引用修复完成');
    }

    private async verifyFix() {
        console.log('\n🔍 验证修复结果...');
        
        // 检查 content_types
        const contentTypes = await query('SELECT * FROM content_types');
        console.log('📝 Content Types:');
        contentTypes.forEach((row: any) => {
            console.log(`  - ID: ${row.id}, Name: "${row.name}", Slug: "${row.slug}"`);
        });
        
        // 检查 categories（显示前10个）
        const categories = await query('SELECT * FROM categories LIMIT 10');
        console.log('\n📂 Categories (前10个):');
        categories.forEach((row: any) => {
            console.log(`  - ID: ${row.id}, Name: "${row.name}", Slug: "${row.slug}"`);
        });
        
        // 统计数据
        const [ctCount] = await query('SELECT COUNT(*) as count FROM content_types');
        const [catCount] = await query('SELECT COUNT(*) as count FROM categories');
        const [contentsCount] = await query('SELECT COUNT(*) as count FROM contents');
        
        console.log('\n📊 数据统计:');
        console.log(`  - Content Types: ${ctCount.count} 个`);
        console.log(`  - Categories: ${catCount.count} 个`);
        console.log(`  - Contents: ${contentsCount.count} 个`);
        
        // 检查是否还有乱码
        const garbledContentTypes = await query(`
            SELECT * FROM content_types 
            WHERE name REGEXP '[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]'
               OR name LIKE '%?%'
               OR name LIKE '%�%'
        `);
        
        const garbledCategories = await query(`
            SELECT * FROM categories 
            WHERE name REGEXP '[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]'
               OR name LIKE '%?%'
               OR name LIKE '%�%'
        `);
        
        if (garbledContentTypes.length === 0 && garbledCategories.length === 0) {
            console.log('✅ 未发现乱码数据！');
        } else {
            console.log('⚠️ 仍发现乱码数据:');
            if (garbledContentTypes.length > 0) {
                console.log('  Content Types:', garbledContentTypes);
            }
            if (garbledCategories.length > 0) {
                console.log('  Categories:', garbledCategories);
            }
        }
    }

    async checkDataIntegrity() {
        console.log('🔍 检查数据完整性...');
        
        // 检查内容引用的分类是否存在
        const orphanedContents = await query(`
            SELECT COUNT(*) as count 
            FROM contents 
            WHERE category_id IS NOT NULL 
            AND category_id NOT IN (SELECT id FROM categories)
        `);
        
        if (orphanedContents[0].count > 0) {
            console.log(`⚠️ 发现 ${orphanedContents[0].count} 个内容引用了不存在的分类`);
        } else {
            console.log('✅ 所有内容的分类引用都正常');
        }
        
        // 检查内容类型引用
        const orphanedContentTypes = await query(`
            SELECT COUNT(*) as count 
            FROM contents 
            WHERE content_type_id NOT IN (SELECT id FROM content_types)
        `);
        
        if (orphanedContentTypes[0].count > 0) {
            console.log(`⚠️ 发现 ${orphanedContentTypes[0].count} 个内容引用了不存在的内容类型`);
        } else {
            console.log('✅ 所有内容的类型引用都正常');
        }
    }
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    const fixer = new GarbledDataFixer();
    
    if (args.includes('--check')) {
        await fixer.checkDataIntegrity();
    } else {
        await fixer.fixAllGarbledData();
        await fixer.checkDataIntegrity();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

export default GarbledDataFixer; 