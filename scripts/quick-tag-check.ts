/**
 * 快速标签检查脚本
 * 验证标签修复效果
 */

import { config } from 'dotenv';
config();

import chalk from 'chalk';
import { initDatabase, query } from '../lib/database';

async function quickCheck() {
  console.log(chalk.blue('🔍 快速检查标签状态...\n'));

  try {
    initDatabase();

    // 检查标签总数
    const tagCount = await query('SELECT COUNT(*) as count FROM tags');
    console.log(chalk.green(`📊 标签总数: ${tagCount[0].count}`));

    // 检查是否还有合并标签
    const mergedTags = await query("SELECT COUNT(*) as count FROM tags WHERE name LIKE '%,%'");
    console.log(chalk.cyan(`🔗 合并标签数量: ${mergedTags[0].count}`));

    // 检查标签关联总数
    const tagLinks = await query('SELECT COUNT(*) as count FROM content_tags');
    console.log(chalk.yellow(`🏷️ 标签关联总数: ${tagLinks[0].count}`));

    // 检查内容总数
    const contentCount = await query('SELECT COUNT(*) as count FROM contents WHERE content_type_id = (SELECT id FROM content_types WHERE slug = "weekly")');
    console.log(chalk.magenta(`📄 周刊内容总数: ${contentCount[0].count}`));

    // 检查有标签的内容数量
    const contentWithTags = await query(`
      SELECT COUNT(DISTINCT content_id) as count 
      FROM content_tags ct 
      JOIN contents c ON ct.content_id = c.id 
      WHERE c.content_type_id = (SELECT id FROM content_types WHERE slug = 'weekly')
    `);
    console.log(chalk.blue(`🎯 有标签的内容数量: ${contentWithTags[0].count}`));

    // 检查平均每篇内容的标签数
    const avgTags = await query(`
      SELECT AVG(tag_count) as avg_tags
      FROM (
        SELECT COUNT(*) as tag_count
        FROM content_tags ct 
        JOIN contents c ON ct.content_id = c.id 
        WHERE c.content_type_id = (SELECT id FROM content_types WHERE slug = 'weekly')
        GROUP BY content_id
      ) as tag_counts
    `);
    console.log(chalk.green(`📈 平均每篇标签数: ${parseFloat(avgTags[0].avg_tags).toFixed(2)}`));

    // 显示最常用的前10个标签
    console.log(chalk.yellow('\n🏆 最常用的标签:'));
    const topTags = await query(`
      SELECT name, count 
      FROM tags 
      WHERE count > 0 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    topTags.forEach((tag: any, index: number) => {
      console.log(chalk.cyan(`  ${index + 1}. ${tag.name} (${tag.count}次)`));
    });

    console.log(chalk.blue('\n' + '='.repeat(50)));
    console.log(chalk.green('✅ 快速检查完成！'));
    
    // 判断修复效果
    if (mergedTags[0].count === 0) {
      console.log(chalk.green('🎉 所有合并标签已成功分割！'));
    } else {
      console.log(chalk.red(`⚠️ 仍有 ${mergedTags[0].count} 个合并标签需要处理`));
    }

    if (contentWithTags[0].count === contentCount[0].count) {
      console.log(chalk.green('🎉 所有内容都已关联标签！'));
    } else {
      console.log(chalk.yellow(`⚠️ 有 ${contentCount[0].count - contentWithTags[0].count} 篇内容没有标签`));
    }

  } catch (error) {
    console.error(chalk.red('❌ 检查过程中出现错误:'), error);
  }
}

if (require.main === module) {
  quickCheck().catch(console.error);
} 