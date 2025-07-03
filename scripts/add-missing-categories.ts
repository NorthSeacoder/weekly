#!/usr/bin/env tsx

// 加载环境变量
import { config } from 'dotenv';
config();

import { initDatabase, query, execute } from '../lib/database';

const newCategories = [
    { name: '开源', slug: 'open-source', sort_order: 12, description: '开源项目和资源' },
    { name: '资源', slug: 'resources', sort_order: 13, description: '各类资源分享' },
    { name: '技巧', slug: 'tips', sort_order: 14, description: '实用技巧' },
    { name: '经验', slug: 'experience', sort_order: 15, description: '经验分享' },
    { name: '技术', slug: 'technology', sort_order: 16, description: '技术相关' },
    { name: '博客', slug: 'blogs', sort_order: 17, description: '博客推荐' },
    { name: 'AI', slug: 'ai', sort_order: 18, description: 'AI相关内容' },
    { name: '博主', slug: 'bloggers', sort_order: 19, description: '博主推荐' },
    { name: '教育', slug: 'education', sort_order: 20, description: '教育资源' },
    { name: '开发工具', slug: 'dev-tools', sort_order: 21, description: '开发工具' },
    { name: '讨论', slug: 'discussion', sort_order: 22, description: '技术讨论' },
    { name: '观点', slug: 'opinions', sort_order: 23, description: '观点分享' },
    { name: '读书', slug: 'reading', sort_order: 24, description: '读书相关' },
    { name: '访谈', slug: 'interviews', sort_order: 25, description: '访谈内容' },
    { name: '设计', slug: 'design', sort_order: 26, description: '设计相关' },
    { name: '服务', slug: 'services', sort_order: 27, description: '在线服务' },
    { name: '思考', slug: 'thoughts', sort_order: 28, description: '思考感悟' },
    { name: '应用', slug: 'applications', sort_order: 29, description: '应用推荐' },
    { name: '平台', slug: 'platforms', sort_order: 30, description: '平台介绍' },
    { name: '安全', slug: 'security', sort_order: 31, description: '安全相关' },
    { name: '健康', slug: 'health', sort_order: 32, description: '健康相关' },
    { name: '书籍', slug: 'books', sort_order: 33, description: '书籍推荐' },
    { name: '专栏', slug: 'columns', sort_order: 34, description: '专栏内容' }
];

async function addMissingCategories() {
    console.log('🏷️ 添加缺失的分类...');
    
    try {
        initDatabase();
        
        // 设置正确的字符集
        await execute("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
        
        // 获取现有分类
        const existingCategories = await query('SELECT slug FROM categories');
        const existingSlugs = new Set(existingCategories.map((cat: any) => cat.slug));
        
        let addedCount = 0;
        
        for (const category of newCategories) {
            if (!existingSlugs.has(category.slug)) {
                try {
                    await execute(
                        'INSERT INTO categories (name, slug, sort_order, description) VALUES (?, ?, ?, ?)',
                        [category.name, category.slug, category.sort_order, category.description]
                    );
                    console.log(`  ✅ 添加分类: ${category.name} (${category.slug})`);
                    addedCount++;
                } catch (error) {
                    console.error(`  ❌ 添加分类失败: ${category.name}`, error);
                }
            } else {
                console.log(`  ⏭️ 分类已存在: ${category.name}`);
            }
        }
        
        console.log(`\n✅ 分类添加完成，共添加 ${addedCount} 个新分类`);
        
        // 显示当前所有分类
        const allCategories = await query('SELECT name, slug FROM categories ORDER BY sort_order');
        console.log('\n📊 当前所有分类:');
        allCategories.forEach((cat: any, index: number) => {
            console.log(`  ${index + 1}. ${cat.name} (${cat.slug})`);
        });
        
    } catch (error) {
        console.error('❌ 添加分类时出错:', error);
    }
}

// 主函数
async function main() {
    await addMissingCategories();
}

if (require.main === module) {
    main().catch(console.error);
}

export default addMissingCategories; 