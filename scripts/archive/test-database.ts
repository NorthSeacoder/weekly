#!/usr/bin/env tsx

// 加载环境变量
import { config } from 'dotenv';
config();

import { testConnection, dbConfig, query, closePool } from '../lib/database';
import { ContentTypeService, CategoryService, TagService, WeeklyService } from '../lib/database-service';

/**
 * 数据库连接和配置测试脚本
 */
async function main() {
  console.log('🧪 周刊项目数据库连接测试');
  console.log('========================================');

  // 显示配置信息
  console.log('📋 数据库配置:');
  console.log(`   🗄️  数据库: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
  console.log(`   👤 用户: ${dbConfig.user}`);
  console.log(`   🔐 密码: ${dbConfig.password ? '***已设置***' : '❌未设置'}`);
  console.log(`   🌐 字符集: ${dbConfig.charset}`);
  console.log(`   ⏰ 时区: ${dbConfig.timezone}`);
  console.log('');

  try {
    // 测试基础连接
    console.log('🔍 测试1: 基础连接...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('数据库连接失败');
    }

    // 测试表结构
    console.log('🔍 测试2: 验证表结构...');
    const tables = await query<{ Tables_in_weekly_blog: string }>(`SHOW TABLES`);
    console.log(`   📊 发现 ${tables.length} 张表:`);
    tables.forEach(table => {
      console.log(`      - ${table.Tables_in_weekly_blog}`);
    });

    // 测试数据
    console.log('🔍 测试3: 验证数据...');
    
    // 内容类型
    const contentTypes = await ContentTypeService.getAll();
    console.log(`   📝 内容类型: ${contentTypes.length} 条`);
    contentTypes.forEach(type => {
      console.log(`      - ${type.name} (${type.slug})`);
    });

    // 分类
    const categories = await CategoryService.getAll();
    console.log(`   🏷️  分类: ${categories.length} 条`);
    categories.forEach(cat => {
      console.log(`      - ${cat.name} (${cat.slug}) - 排序: ${cat.sort_order}`);
    });

    // 标签
    const tags = await TagService.getAll();
    console.log(`   🔖 标签: ${tags.length} 条`);

    // 测试服务类
    console.log('🔍 测试4: 测试服务类...');
    
    // 测试获取周刊类型
    const weeklyType = await ContentTypeService.getBySlug('weekly');
    console.log(`   📰 周刊类型: ${weeklyType ? '✅ 找到' : '❌ 未找到'}`);

    // 测试获取工具分类
    const toolsCategory = await CategoryService.getBySlug('tools');
    console.log(`   🔧 工具分类: ${toolsCategory ? '✅ 找到' : '❌ 未找到'}`);

    // 测试分页查询
    console.log('🔍 测试5: 测试分页查询...');
    const weeklyIssues = await WeeklyService.getPublished(5, 0);
    console.log(`   📖 周刊期数: ${weeklyIssues.length} 条 (限制5条)`);

    // 连接池状态
    console.log('🔍 测试6: 连接池状态...');
    console.log(`   🏊 连接池限制: ${dbConfig.connectionLimit}`);
    console.log(`   ⏱️  超时设置: ${dbConfig.timeout}ms`);

    console.log('');
    console.log('✅ 所有测试通过！');
    console.log('');
    console.log('🚀 数据库配置完成，项目可以使用以下服务:');
    console.log('   - ContentTypeService: 内容类型管理');
    console.log('   - CategoryService: 分类管理');
    console.log('   - TagService: 标签管理');
    console.log('   - ContentService: 内容管理');
    console.log('   - WeeklyService: 周刊管理');
    console.log('');
    console.log('💡 使用示例:');
    console.log('   import { WeeklyService } from "@/lib/database-service";');
    console.log('   const issues = await WeeklyService.getPublished();');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  } finally {
    // 关闭连接池
    await closePool();
  }
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

export default main; 