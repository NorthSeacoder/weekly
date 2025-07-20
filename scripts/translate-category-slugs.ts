#!/usr/bin/env tsx

// 翻译 categories 表中的中文 slug 为英文
import { config } from 'dotenv';
config();

import { initDatabase, query, execute } from '../lib/database';
import type { RowDataPacket } from 'mysql2/promise';

interface CategoryRecord {
    id: number;
    name: string;
    slug: string;
}

interface TranslationMapping {
    id: number;
    currentSlug: string;
    newSlug: string;
    reason: string;
}

class CategorySlugTranslator {
    private translationMappings: TranslationMapping[] = [
        {
            id: 89,
            currentSlug: '前端工程化',
            newSlug: 'frontend-engineering-2',
            reason: '避免与ID 59的frontend-engineering冲突'
        },
        {
            id: 90,
            currentSlug: '前端架构',
            newSlug: 'frontend-architecture-2', 
            reason: '避免与ID 60的frontend-architecture冲突'
        },
        {
            id: 93,
            currentSlug: '框架',
            newSlug: 'frameworks',
            reason: '直接翻译'
        },
        {
            id: 94,
            currentSlug: '浏览器',
            newSlug: 'browser-2',
            reason: '避免与ID 57的browser冲突'
        },
        {
            id: 95,
            currentSlug: '前端基础',
            newSlug: 'frontend-basics',
            reason: '直接翻译'
        },
        {
            id: 96,
            currentSlug: '大纲',
            newSlug: 'outline',
            reason: '直接翻译'
        },
        {
            id: 97,
            currentSlug: '文章',
            newSlug: 'articles-2',
            reason: '避免与ID 41的articles冲突'
        }
    ];

    constructor() {
        initDatabase();
    }

    async run() {
        console.log('🔧 开始翻译 categories 表中的中文 slug...');
        
        try {
            // 1. 备份当前数据
            await this.backupCurrentData();
            
            // 2. 验证需要翻译的记录
            await this.validateRecords();
            
            // 3. 检查目标slug冲突
            await this.checkTargetSlugConflicts();
            
            // 4. 执行翻译更新
            await this.executeTranslation();
            
            // 5. 验证结果
            await this.validateResults();
            
            console.log('✅ categories 表 slug 翻译完成！');
            
        } catch (error) {
            console.error('❌ 翻译过程中出现错误:', error);
            console.log('💡 建议检查数据库连接和权限设置');
        }
    }

    private async backupCurrentData() {
        console.log('\n📦 备份当前 categories 数据...');
        
        const categories = await query('SELECT * FROM categories WHERE id IN (89, 90, 93, 94, 95, 96, 97)');
        
        console.log('当前需要翻译的记录:');
        console.table(categories);
        
        // 保存备份到文件
        const backupData = {
            timestamp: new Date().toISOString(),
            records: categories
        };
        
        const fs = await import('fs');
        fs.writeFileSync(
            `./scripts/category-slug-backup-${Date.now()}.json`,
            JSON.stringify(backupData, null, 2)
        );
        
        console.log('✅ 数据备份完成');
    }

    private async validateRecords() {
        console.log('\n🔍 验证需要翻译的记录...');
        
        for (const mapping of this.translationMappings) {
            const [record] = await query(
                'SELECT id, name, slug FROM categories WHERE id = ?',
                [mapping.id]
            );
            
            if (!record) {
                throw new Error(`未找到ID为 ${mapping.id} 的分类记录`);
            }
            
            if (record.slug !== mapping.currentSlug) {
                console.log(`⚠️ ID ${mapping.id} 的当前slug "${record.slug}" 与预期 "${mapping.currentSlug}" 不符`);
                // 更新映射中的当前slug
                mapping.currentSlug = record.slug;
            }
            
            console.log(`✅ ID ${mapping.id}: "${record.name}" (${record.slug}) → ${mapping.newSlug}`);
        }
    }

    private async checkTargetSlugConflicts() {
        console.log('\n⚠️ 检查目标slug冲突...');
        
        for (const mapping of this.translationMappings) {
            const existingRecord = await query(
                'SELECT id, name, slug FROM categories WHERE slug = ? AND id != ?',
                [mapping.newSlug, mapping.id]
            );
            
            if (existingRecord.length > 0) {
                console.log(`❌ 冲突检测: slug "${mapping.newSlug}" 已被 ID ${existingRecord[0].id} (${existingRecord[0].name}) 使用`);
                throw new Error(`无法使用slug "${mapping.newSlug}"，存在冲突`);
            } else {
                console.log(`✅ slug "${mapping.newSlug}" 可用`);
            }
        }
    }

    private async executeTranslation() {
        console.log('\n🚀 执行翻译更新...');
        
        // 开始事务
        await execute('START TRANSACTION');
        
        try {
            for (const mapping of this.translationMappings) {
                console.log(`  更新 ID ${mapping.id}: "${mapping.currentSlug}" → "${mapping.newSlug}"`);
                
                const result = await execute(
                    'UPDATE categories SET slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [mapping.newSlug, mapping.id]
                );
                
                console.log(`    影响行数: ${result.affectedRows}`);
            }
            
            // 提交事务
            await execute('COMMIT');
            console.log('✅ 所有更新已提交');
            
        } catch (error) {
            // 回滚事务
            await execute('ROLLBACK');
            console.log('❌ 更新失败，已回滚事务');
            throw error;
        }
    }

    private async validateResults() {
        console.log('\n🔎 验证翻译结果...');
        
        for (const mapping of this.translationMappings) {
            const [record] = await query(
                'SELECT id, name, slug, updated_at FROM categories WHERE id = ?',
                [mapping.id]
            );
            
            if (record.slug === mapping.newSlug) {
                console.log(`✅ ID ${mapping.id}: 成功更新为 "${mapping.newSlug}"`);
            } else {
                console.log(`❌ ID ${mapping.id}: 更新失败，当前为 "${record.slug}"`);
            }
        }
        
        // 检查是否还有中文slug
        const chineseSlugCategories = await query(
            'SELECT id, name, slug FROM categories WHERE slug REGEXP "[\\u4e00-\\u9fff]"'
        );
        
        if (chineseSlugCategories.length > 0) {
            console.log('\n⚠️ 仍存在包含中文的slug:');
            console.table(chineseSlugCategories);
        } else {
            console.log('\n✅ 所有slug已成功翻译为英文');
        }
    }
}

// 执行翻译
const translator = new CategorySlugTranslator();
translator.run().catch(console.error); 