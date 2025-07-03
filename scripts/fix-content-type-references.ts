#!/usr/bin/env tsx

// 加载环境变量
import { config } from 'dotenv';
config();

import { initDatabase, query, execute, transaction } from '../lib/database';

class ContentTypeReferenceFixer {
    constructor() {
        initDatabase();
    }

    async fixContentTypeReferences() {
        console.log('🔧 开始修复内容类型引用...');
        
        try {
            // 设置正确的字符集
            await execute("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
            
            // 获取当前的content_types
            const contentTypes = await query('SELECT id, slug FROM content_types ORDER BY id');
            console.log('📝 当前 Content Types:', contentTypes);
            
            if (contentTypes.length === 0) {
                console.log('❌ content_types 表为空，请先运行 db:fix-garbled');
                return;
            }
            
            // 创建slug到新ID的映射
            const typeMap = new Map();
            contentTypes.forEach((ct: any) => {
                typeMap.set(ct.slug, ct.id);
            });
            console.log('🗺️ 类型映射:', Object.fromEntries(typeMap));
            
            await transaction(async (connection) => {
                // 修复周刊内容的类型引用
                const weeklyTypeId = typeMap.get('weekly');
                if (weeklyTypeId) {
                    const weeklyUpdateResult = await connection.execute(
                        `UPDATE contents 
                         SET content_type_id = ? 
                         WHERE source LIKE 'sections/%' OR slug LIKE '%-weekly-%' OR content_type_id = 1`,
                        [weeklyTypeId]
                    );
                    console.log(`✅ 修复了周刊内容类型引用，影响 ${(weeklyUpdateResult as any).affectedRows} 行`);
                }
                
                // 修复博客内容的类型引用
                const blogTypeId = typeMap.get('blog');
                if (blogTypeId) {
                    const blogUpdateResult = await connection.execute(
                        `UPDATE contents 
                         SET content_type_id = ? 
                         WHERE source LIKE 'blogs/%' OR content_type_id = 2`,
                        [blogTypeId]
                    );
                    console.log(`✅ 修复了博客内容类型引用，影响 ${(blogUpdateResult as any).affectedRows} 行`);
                }
            });
            
            // 验证修复结果
            await this.verifyFix();
            
            console.log('✅ 内容类型引用修复完成！');
        } catch (error) {
            console.error('❌ 修复过程中出现错误:', error);
            process.exit(1);
        }
    }

    private async verifyFix() {
        console.log('\n🔍 验证修复结果...');
        
        // 检查是否还有孤立的内容类型引用
        const orphanedContents = await query(`
            SELECT COUNT(*) as count 
            FROM contents 
            WHERE content_type_id NOT IN (SELECT id FROM content_types)
        `);
        
        if (orphanedContents[0].count > 0) {
            console.log(`⚠️ 仍有 ${orphanedContents[0].count} 个内容引用了不存在的内容类型`);
            
            // 显示这些孤立的引用
            const orphanedDetails = await query(`
                SELECT content_type_id, COUNT(*) as count, 
                       GROUP_CONCAT(DISTINCT SUBSTRING(COALESCE(source, slug), 1, 50) SEPARATOR ', ') as sample_paths
                FROM contents 
                WHERE content_type_id NOT IN (SELECT id FROM content_types)
                GROUP BY content_type_id
                LIMIT 5
            `);
            
            console.log('🔍 孤立引用详情:');
            orphanedDetails.forEach((row: any) => {
                console.log(`  - Type ID ${row.content_type_id}: ${row.count} 个内容`);
                console.log(`    示例路径: ${row.sample_paths}`);
            });
        } else {
            console.log('✅ 所有内容的类型引用都正常！');
        }
        
        // 统计各类型的内容数量
        const typeStats = await query(`
            SELECT ct.name, ct.slug, COUNT(c.id) as content_count
            FROM content_types ct
            LEFT JOIN contents c ON ct.id = c.content_type_id
            GROUP BY ct.id, ct.name, ct.slug
            ORDER BY ct.id
        `);
        
        console.log('\n📊 各类型内容统计:');
        typeStats.forEach((row: any) => {
            console.log(`  - ${row.name} (${row.slug}): ${row.content_count} 个内容`);
        });
    }

    async checkCurrentStatus() {
        console.log('🔍 检查当前状态...');
        
        // 检查content_types表
        const contentTypes = await query('SELECT * FROM content_types');
        console.log('\n📝 Content Types:');
        contentTypes.forEach((row: any) => {
            console.log(`  - ID: ${row.id}, Name: "${row.name}", Slug: "${row.slug}"`);
        });
        
        // 检查contents表中的content_type_id分布
        const typeDistribution = await query(`
            SELECT content_type_id, COUNT(*) as count
            FROM contents 
            GROUP BY content_type_id 
            ORDER BY content_type_id
        `);
        
        console.log('\n📊 Contents表中的content_type_id分布:');
        typeDistribution.forEach((row: any) => {
            console.log(`  - Type ID ${row.content_type_id}: ${row.count} 个内容`);
        });
        
        // 检查孤立引用
        const orphaned = await query(`
            SELECT COUNT(*) as count 
            FROM contents 
            WHERE content_type_id NOT IN (SELECT id FROM content_types)
        `);
        
        console.log(`\n⚠️ 孤立引用: ${orphaned[0].count} 个内容引用了不存在的内容类型`);
    }
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    const fixer = new ContentTypeReferenceFixer();
    
    if (args.includes('--check')) {
        await fixer.checkCurrentStatus();
    } else {
        await fixer.checkCurrentStatus();
        await fixer.fixContentTypeReferences();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

export default ContentTypeReferenceFixer; 