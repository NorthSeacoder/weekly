#!/usr/bin/env tsx

import { config } from 'dotenv';
config();

import { initDatabase, query } from '../lib/database';

async function checkContentsTable() {
    initDatabase();
    
    console.log('🔍 检查 contents 表结构...');
    
    // 查看表结构
    const structure = await query('DESCRIBE contents');
    console.log('\n📋 表结构:');
    structure.forEach((row: any) => {
        console.log(`  - ${row.Field}: ${row.Type} ${row.Null === 'YES' ? '(可空)' : '(非空)'} ${row.Key ? `[${row.Key}]` : ''}`);
    });
    
    // 查看前几条数据
    const sampleData = await query('SELECT * FROM contents LIMIT 3');
    console.log('\n📊 示例数据:');
    sampleData.forEach((row: any, index: number) => {
        console.log(`\n记录 ${index + 1}:`);
        Object.keys(row).forEach(key => {
            let value = row[key];
            if (typeof value === 'string' && value.length > 100) {
                value = value.substring(0, 100) + '...';
            }
            console.log(`  ${key}: ${value}`);
        });
    });
    
    // 检查content_type_id的分布
    const typeDistribution = await query(`
        SELECT content_type_id, COUNT(*) as count
        FROM contents 
        GROUP BY content_type_id 
        ORDER BY content_type_id
    `);
    
    console.log('\n📊 content_type_id 分布:');
    typeDistribution.forEach((row: any) => {
        console.log(`  - Type ID ${row.content_type_id}: ${row.count} 个内容`);
    });
}

checkContentsTable().catch(console.error); 