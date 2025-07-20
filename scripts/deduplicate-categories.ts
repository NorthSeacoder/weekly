#!/usr/bin/env tsx

// 去重 categories 表，合并重复分类并更新相关引用
import { config } from 'dotenv';
config();

import { initDatabase, query, execute } from '../lib/database';
import type { RowDataPacket } from 'mysql2/promise';

interface DuplicateMapping {
    keepId: number;
    keepSlug: string;
    removeId: number;
    removeSlug: string;
    categoryName: string;
    contentCount: number;
}

class CategoryDeduplicator {
    private duplicateMappings: DuplicateMapping[] = [
        {
            keepId: 53,
            keepSlug: 'pixijs',
            removeId: 86,
            removeSlug: 'pixi.js',
            categoryName: 'Pixi.js',
            contentCount: 10
        },
        {
            keepId: 59,
            keepSlug: 'frontend-engineering',
            removeId: 89,
            removeSlug: 'frontend-engineering-2',
            categoryName: '前端工程化',
            contentCount: 6
        },
        {
            keepId: 60,
            keepSlug: 'frontend-architecture',
            removeId: 90,
            removeSlug: 'frontend-architecture-2',
            categoryName: '前端架构',
            contentCount: 3
        },
        {
            keepId: 41,
            keepSlug: 'articles',
            removeId: 97,
            removeSlug: 'articles-2',
            categoryName: '文章',
            contentCount: 0
        },
        {
            keepId: 52,
            keepSlug: 'http',
            removeId: 85,
            removeSlug: 'HTTP',
            categoryName: 'HTTP',
            contentCount: 5
        }
    ];

    constructor() {
        initDatabase();
    }

    async run() {
        console.log('🔧 开始去重 categories 表...');
        
        try {
            // 1. 备份数据
            await this.backupData();
            
            // 2. 检查外键约束
            await this.checkForeignKeys();
            
            // 3. 验证当前数据状态
            await this.validateCurrentState();
            
            // 4. 迁移内容引用
            await this.migrateContentReferences();
            
            // 5. 删除重复分类
            await this.removeDuplicateCategories();
            
            // 6. 最终验证
            await this.finalValidation();
            
            console.log('✅ categories 表去重完成！');
            
        } catch (error) {
            console.error('❌ 去重过程中出现错误:', error);
            console.log('💡 建议检查备份文件并手动回滚');
        }
    }

    private async backupData() {
        console.log('\n📦 备份相关数据...');
        
        // 备份要处理的分类
        const categoriesToProcess = await query(
            'SELECT * FROM categories WHERE id IN (53, 86, 59, 89, 60, 90, 41, 97, 52, 85)'
        );
        
        // 备份受影响的内容  
        const affectedContents = await query(
            'SELECT id, title, category_id FROM contents WHERE category_id IN (86, 89, 90, 97, 85)'
        );
        
        const backupData = {
            timestamp: new Date().toISOString(),
            categories: categoriesToProcess,
            affectedContents: affectedContents,
            operation: 'category-deduplication'
        };
        
        const fs = await import('fs');
        const backupFile = `./scripts/category-deduplication-backup-${Date.now()}.json`;
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        
        console.log(`✅ 数据备份至: ${backupFile}`);
        console.log(`  - 分类记录: ${categoriesToProcess.length} 条`);
        console.log(`  - 受影响内容: ${affectedContents.length} 条`);
    }

    private async checkForeignKeys() {
        console.log('\n🔍 检查外键约束...');
        
        // 查找所有引用 categories 表的外键
        const foreignKeys = await query(`
            SELECT 
                TABLE_NAME as table_name,
                COLUMN_NAME as column_name,
                CONSTRAINT_NAME as constraint_name,
                REFERENCED_TABLE_NAME as referenced_table,
                REFERENCED_COLUMN_NAME as referenced_column
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE REFERENCED_TABLE_NAME = 'categories'
            AND TABLE_SCHEMA = DATABASE()
        `);
        
        console.log('发现的外键引用:');
        console.table(foreignKeys);
        
        // 检查每个外键表中的引用情况
        for (const fk of foreignKeys) {
            const references = await query(
                `SELECT ${fk.column_name}, COUNT(*) as count 
                 FROM ${fk.table_name} 
                 WHERE ${fk.column_name} IN (86, 89, 90, 97, 85) 
                 GROUP BY ${fk.column_name}`
            );
            
            if (references.length > 0) {
                console.log(`\n表 ${fk.table_name}.${fk.column_name} 中的引用:`);
                console.table(references);
            }
        }
    }

    private async validateCurrentState() {
        console.log('\n🔎 验证当前数据状态...');
        
        for (const mapping of this.duplicateMappings) {
            // 检查要保留的分类
            const [keepCategory] = await query(
                'SELECT id, name, slug FROM categories WHERE id = ?',
                [mapping.keepId]
            );
            
            // 检查要删除的分类
            const [removeCategory] = await query(
                'SELECT id, name, slug FROM categories WHERE id = ?',
                [mapping.removeId]
            );
            
            if (!keepCategory) {
                throw new Error(`要保留的分类 ID ${mapping.keepId} 不存在`);
            }
            
            if (!removeCategory) {
                console.log(`⚠️ 要删除的分类 ID ${mapping.removeId} 已不存在，跳过处理`);
                continue;
            }
            
            // 检查内容引用数量
            const [contentCount] = await query(
                'SELECT COUNT(*) as count FROM contents WHERE category_id = ?',
                [mapping.removeId]
            );
            
            console.log(`✅ ${mapping.categoryName}:`);
            console.log(`    保留: ID ${mapping.keepId} (${keepCategory.slug})`);
            console.log(`    删除: ID ${mapping.removeId} (${removeCategory.slug}) - ${contentCount.count}个内容引用`);
        }
    }

    private async migrateContentReferences() {
        console.log('\n🚀 迁移内容引用...');
        
        // 开始事务
        await execute('START TRANSACTION');
        
        try {
            for (const mapping of this.duplicateMappings) {
                const [contentCount] = await query(
                    'SELECT COUNT(*) as count FROM contents WHERE category_id = ?',
                    [mapping.removeId]
                );
                
                if (contentCount.count > 0) {
                    console.log(`  迁移 ${mapping.categoryName}: ${contentCount.count} 个内容 (${mapping.removeId} → ${mapping.keepId})`);
                    
                    const result = await execute(
                        'UPDATE contents SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE category_id = ?',
                        [mapping.keepId, mapping.removeId]
                    );
                    
                    console.log(`    更新了 ${result.affectedRows} 行`);
                } else {
                    console.log(`  ${mapping.categoryName}: 无需迁移内容`);
                }
            }
            
            // 提交迁移事务
            await execute('COMMIT');
            console.log('✅ 内容引用迁移完成');
            
        } catch (error) {
            await execute('ROLLBACK');
            console.log('❌ 内容引用迁移失败，已回滚');
            throw error;
        }
    }

    private async removeDuplicateCategories() {
        console.log('\n🗑️ 删除重复分类...');
        
        // 开始事务
        await execute('START TRANSACTION');
        
        try {
            for (const mapping of this.duplicateMappings) {
                // 验证该分类已无内容引用
                const [contentCount] = await query(
                    'SELECT COUNT(*) as count FROM contents WHERE category_id = ?',
                    [mapping.removeId]
                );
                
                if (contentCount.count > 0) {
                    throw new Error(`分类 ID ${mapping.removeId} 仍有 ${contentCount.count} 个内容引用，无法删除`);
                }
                
                console.log(`  删除分类: ID ${mapping.removeId} (${mapping.categoryName})`);
                
                const result = await execute(
                    'DELETE FROM categories WHERE id = ?',
                    [mapping.removeId]
                );
                
                console.log(`    删除了 ${result.affectedRows} 行`);
            }
            
            // 提交删除事务
            await execute('COMMIT');
            console.log('✅ 重复分类删除完成');
            
        } catch (error) {
            await execute('ROLLBACK');
            console.log('❌ 分类删除失败，已回滚');
            throw error;
        }
    }

    private async finalValidation() {
        console.log('\n🔎 最终验证...');
        
        // 检查是否还有重复分类
        const duplicateNames = await query(`
            SELECT name, COUNT(*) as count, GROUP_CONCAT(id ORDER BY id) as ids
            FROM categories 
            GROUP BY name 
            HAVING COUNT(*) > 1
        `);
        
        if (duplicateNames.length > 0) {
            console.log('⚠️ 仍存在重复的分类名称:');
            console.table(duplicateNames);
        } else {
            console.log('✅ 无重复分类名称');
        }
        
        // 检查是否还有重复slug
        const duplicateSlugs = await query(`
            SELECT slug, COUNT(*) as count, GROUP_CONCAT(id ORDER BY id) as ids
            FROM categories 
            GROUP BY slug 
            HAVING COUNT(*) > 1
        `);
        
        if (duplicateSlugs.length > 0) {
            console.log('⚠️ 仍存在重复的slug:');
            console.table(duplicateSlugs);
        } else {
            console.log('✅ 无重复slug');
        }
        
        // 检查内容引用完整性
        const orphanedContents = await query(`
            SELECT COUNT(*) as count 
            FROM contents 
            WHERE category_id IS NOT NULL 
            AND category_id NOT IN (SELECT id FROM categories)
        `);
        
        if (orphanedContents[0].count > 0) {
            console.log(`❌ 发现 ${orphanedContents[0].count} 个内容引用了不存在的分类`);
        } else {
            console.log('✅ 所有内容的分类引用完整');
        }
        
        // 显示最终的分类统计
        const [totalCategories] = await query('SELECT COUNT(*) as count FROM categories');
        console.log(`\n📊 最终统计: 共 ${totalCategories.count} 个分类`);
    }
}

// 执行去重
const deduplicator = new CategoryDeduplicator();
deduplicator.run().catch(console.error); 