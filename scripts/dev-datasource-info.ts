#!/usr/bin/env tsx

// 加载环境变量
import { config } from 'dotenv';
config();

import { getDataSourceConfig, useDatabase, useFilesystem } from '../lib/data-source-config';

async function testDatabaseConnection() {
    if (!useDatabase()) {
        return { success: false, message: '未使用数据库数据源' };
    }

    try {
        const { initDatabase, query, closeDatabase } = await import('../lib/database');
        initDatabase();
        
        // 简单的连接测试
        await query('SELECT 1 as test');
        
        // 获取基本统计信息
        const [contentCount] = await query('SELECT COUNT(*) as count FROM contents');
        const [categoryCount] = await query('SELECT COUNT(*) as count FROM categories');
        const [tagCount] = await query('SELECT COUNT(*) as count FROM tags');
        
        await closeDatabase();
        
        return { 
            success: true, 
            stats: {
                contents: contentCount.count,
                categories: categoryCount.count,
                tags: tagCount.count
            }
        };
    } catch (error) {
        return { 
            success: false, 
            message: `数据库连接失败: ${error instanceof Error ? error.message : '未知错误'}` 
        };
    }
}

function getFileSystemStats() {
    if (!useFilesystem()) {
        return { success: false, message: '未使用文件系统数据源' };
    }

    try {
        const fs = require('fs');
        const path = require('path');
        
        // 统计文件数量
        const blogsDir = path.join(process.cwd(), 'blogs');
        const sectionsDir = path.join(process.cwd(), 'sections');
        
        let blogCount = 0;
        let weeklyCount = 0;
        
        if (fs.existsSync(blogsDir)) {
            const countFiles = (dir: string): number => {
                let count = 0;
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        count += countFiles(fullPath);
                    } else if (item.endsWith('.mdx')) {
                        count++;
                    }
                }
                return count;
            };
            
            blogCount = countFiles(blogsDir);
        }
        
        if (fs.existsSync(sectionsDir)) {
            const countFiles = (dir: string): number => {
                let count = 0;
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        count += countFiles(fullPath);
                    } else if (item.endsWith('.mdx')) {
                        count++;
                    }
                }
                return count;
            };
            
            weeklyCount = countFiles(sectionsDir);
        }
        
        return { 
            success: true, 
            stats: {
                blogs: blogCount,
                weekly: weeklyCount,
                total: blogCount + weeklyCount
            }
        };
    } catch (error) {
        return { 
            success: false, 
            message: `文件系统统计失败: ${error instanceof Error ? error.message : '未知错误'}` 
        };
    }
}

async function displayDataSourceInfo() {
    const config = getDataSourceConfig();
    const emoji = config.source === 'database' ? '🗄️' : '📁';
    
    console.log('\n' + '='.repeat(60));
    console.log(`${emoji} 当前数据源: ${config.source.toUpperCase()}`);
    console.log('='.repeat(60));
    
    if (config.source === 'database') {
        console.log('📊 数据库配置:');
        console.log(`  🏠 主机: ${config.database?.host}:${config.database?.port}`);
        console.log(`  💾 数据库: ${config.database?.database}`);
        console.log(`  👤 用户: ${config.database?.user}`);
        console.log(`  🔤 字符集: ${config.database?.charset}`);
        
        console.log('\n🔍 连接测试中...');
        const testResult = await testDatabaseConnection();
        
        if (testResult.success && testResult.stats) {
            console.log('✅ 数据库连接成功');
            console.log('📈 数据统计:');
            console.log(`  📝 内容总数: ${testResult.stats.contents}`);
            console.log(`  📂 分类数量: ${testResult.stats.categories}`);
            console.log(`  🏷️  标签数量: ${testResult.stats.tags}`);
        } else {
            console.log('❌ 数据库连接失败');
            console.log(`   ${testResult.message}`);
        }
        
        console.log('\n💡 提示: 使用 npm run dev:file 切换到文件系统数据源');
    } else {
        console.log('📂 文件系统配置:');
        console.log('  📝 博客文件: blogs/ 目录');
        console.log('  📅 周刊文件: sections/ 目录');
        
        console.log('\n🔍 统计文件中...');
        const stats = getFileSystemStats();
        
        if (stats.success && stats.stats) {
            console.log('✅ 文件系统读取成功');
            console.log('📈 文件统计:');
            console.log(`  📝 博客文件: ${stats.stats.blogs} 个`);
            console.log(`  📅 周刊文件: ${stats.stats.weekly} 个`);
            console.log(`  📊 文件总数: ${stats.stats.total} 个`);
        } else {
            console.log('❌ 文件系统统计失败');
            console.log(`   ${stats.message}`);
        }
        
        console.log('\n💡 提示: 使用 npm run dev:db 切换到数据库数据源');
    }
    
    console.log('='.repeat(60) + '\n');

    // 如果使用数据库，关闭连接池以避免脚本保持运行状态
    if (config.source === 'database') {
        try {
            const { closeDatabase } = await import('../lib/database');
            await closeDatabase();
        } catch (e) {
            console.warn('⚠️ 关闭数据库连接池失败', e);
        }
    }
}

// 如果直接运行此脚本，显示信息
if (require.main === module) {
    displayDataSourceInfo().catch(console.error);
}

export { displayDataSourceInfo }; 