import { config } from 'dotenv';
config();

import chalk from 'chalk';
import { initDatabase, query } from '../lib/database';

async function debugUITag() {
  initDatabase();
  
  console.log(chalk.blue('🔍 检查UI相关标签状态...\n'));
  
  // 检查所有可能的UI标签
  const uiTags = await query(`
    SELECT id, name, slug, count 
    FROM tags 
    WHERE name IN ('UI', 'ui') OR slug IN ('ui', 'UI')
    ORDER BY name
  `);
  
  console.log(chalk.yellow('找到的UI相关标签:'));
  uiTags.forEach((tag: any) => {
    console.log(`  ID: ${tag.id}, Name: "${tag.name}", Slug: "${tag.slug}", Count: ${tag.count}`);
  });
  
  // 检查是否有关联的内容
  for (const tag of uiTags) {
    const contentCount = await query('SELECT COUNT(*) as count FROM content_tags WHERE tag_id = ?', [tag.id]);
    console.log(`  标签 "${tag.name}" (ID: ${tag.id}) 关联内容数: ${contentCount[0].count}`);
  }
}

debugUITag().catch(console.error); 