/**
 * 第四步：修复重复标签和大小写问题
 * 处理CSS/css、Git/git等重复标签，以及相似标签合并
 */

import { config } from 'dotenv';
config();

import chalk from 'chalk';
import { initDatabase, query, execute } from '../lib/database';

class Step4FixDuplicates {
  private stats = {
    duplicatesFixed: 0,
    similarTagsFixed: 0,
    categoriesFixed: 0,
    tagsDeleted: 0
  };

  constructor() {
    initDatabase();
  }

  async run(): Promise<void> {
    console.log(chalk.blue('🔧 第四步：修复重复标签和大小写问题...\n'));

    try {
      // 步骤1: 修复大小写重复标签
      await this.fixCaseDuplicates();
      
      // 步骤2: 修复相似标签
      await this.fixSimilarTags();
      
      // 步骤3: 修复分类大小写
      await this.fixCategoryCase();
      
      // 步骤4: 更新标签计数
      await this.updateTagCounts();
      
      this.showResults();
    } catch (error) {
      console.error(chalk.red('❌ 修复过程中出现错误:'), error);
      process.exit(1);
    }
  }

  /**
   * 修复大小写重复标签
   */
  private async fixCaseDuplicates(): Promise<void> {
    console.log(chalk.yellow('🔤 修复大小写重复标签...'));

    // 定义大小写映射：小写 -> 正确大写
    const caseMappings: Record<string, string> = {
      'css': 'CSS',
      'git': 'Git',
      'html': 'HTML',
      'sql': 'SQL',
      'api': 'API',
      'ui': 'UI',
      'ux': 'UX',
      'seo': 'SEO',
      'npm': 'NPM',
      'cli': 'CLI'
    };

    for (const [lowerCase, correctCase] of Object.entries(caseMappings)) {
      await this.mergeTags(lowerCase, correctCase, `大小写修复: ${lowerCase} → ${correctCase}`);
    }
  }

  /**
   * 修复相似标签
   */
  private async fixSimilarTags(): Promise<void> {
    console.log(chalk.yellow('\n🎯 修复相似标签...'));

    // 定义相似标签映射：相似标签 -> 标准标签
    const similarMappings: Record<string, string> = {
      'HackerNews': 'Hacker News',
      'HomeAssistant': 'Home Assistant',
      'JavaScript库': 'JavaScript',
      'TailwindCSS': 'Tailwind CSS',
      'React.js': 'React',
      'Vue.js': 'Vue',
      'Node.js': 'Node',
      'Next.js': 'NextJS', // 统一为NextJS
      'TypeScript库': 'TypeScript',
      'CSS框架': 'CSS',
      'Web开发': 'Web开发', // 保持不变，但检查是否有类似的
      '前端': '前端开发',
      '后端': '后端开发',
      'JavaScript框架': 'JavaScript',
      'React组件': 'React',
      'Vue组件': 'Vue'
    };

    for (const [similarTag, standardTag] of Object.entries(similarMappings)) {
      await this.mergeTags(similarTag, standardTag, `相似标签合并: ${similarTag} → ${standardTag}`);
    }
  }

  /**
   * 修复分类大小写
   */
  private async fixCategoryCase(): Promise<void> {
    console.log(chalk.yellow('\n📂 修复分类大小写...'));

    // 定义分类映射
    const categoryMappings: Record<string, string> = {
      'Prompt': 'prompt',
      'AI': 'ai',
      'Bug': 'bugs',
      '访谈': 'interviews'
    };

    for (const [wrongCase, correctCase] of Object.entries(categoryMappings)) {
      try {
        // 查找错误分类的ID
        const wrongCategory = await query('SELECT id FROM categories WHERE name = ?', [wrongCase]);
        const correctCategory = await query('SELECT id FROM categories WHERE name = ? OR slug = ?', [correctCase, correctCase]);

        if (wrongCategory.length > 0 && correctCategory.length > 0) {
          const wrongCategoryId = wrongCategory[0].id;
          const correctCategoryId = correctCategory[0].id;

          // 更新使用错误分类的内容
          const result = await execute(`
            UPDATE contents 
            SET category_id = ? 
            WHERE category_id = ?
          `, [correctCategoryId, wrongCategoryId]);

          if (result.affectedRows > 0) {
            this.stats.categoriesFixed += result.affectedRows;
            console.log(chalk.green(`    ✅ 修复分类: ${wrongCase} → ${correctCase} (${result.affectedRows}条记录)`));

            // 删除错误的分类（如果没有其他引用）
            await execute('DELETE FROM categories WHERE id = ?', [wrongCategoryId]);
          }
        }
      } catch (error) {
        console.log(chalk.red(`    ❌ 修复分类失败: ${wrongCase} - ${error}`));
      }
    }
  }

  /**
   * 合并两个标签
   */
  private async mergeTags(sourceTag: string, targetTag: string, description: string): Promise<void> {
    try {
      // 查找源标签和目标标签
      const sourceTagResult = await query('SELECT id, count FROM tags WHERE name = ?', [sourceTag]);
      const targetTagResult = await query('SELECT id, count FROM tags WHERE name = ?', [targetTag]);

      if (sourceTagResult.length > 0) {
        const sourceTagId = sourceTagResult[0].id;
        const sourceCount = sourceTagResult[0].count || 0;

        if (targetTagResult.length > 0) {
          // 目标标签存在，合并关联
          const targetTagId = targetTagResult[0].id;

          // 将源标签的关联转移到目标标签
          await execute(`
            UPDATE IGNORE content_tags 
            SET tag_id = ? 
            WHERE tag_id = ?
          `, [targetTagId, sourceTagId]);

          // 删除重复的关联（如果有）
          await execute('DELETE FROM content_tags WHERE tag_id = ?', [sourceTagId]);

          // 删除源标签
          await execute('DELETE FROM tags WHERE id = ?', [sourceTagId]);

          this.stats.duplicatesFixed++;
          this.stats.tagsDeleted++;
          console.log(chalk.green(`    ✅ ${description} (${sourceCount}次使用)`));

        } else {
          // 目标标签不存在，重命名源标签
          await execute('UPDATE tags SET name = ? WHERE id = ?', [targetTag, sourceTagId]);
          this.stats.duplicatesFixed++;
          console.log(chalk.green(`    ✅ ${description} (重命名)`));
        }
      }
    } catch (error) {
      console.log(chalk.red(`    ❌ 合并标签失败: ${sourceTag} → ${targetTag} - ${error}`));
    }
  }

  /**
   * 更新标签计数
   */
  private async updateTagCounts(): Promise<void> {
    console.log(chalk.yellow('\n🔢 更新标签使用计数...'));

    await execute(`
      UPDATE tags SET count = (
        SELECT COUNT(*) 
        FROM content_tags ct 
        WHERE ct.tag_id = tags.id
      )
    `);

    // 删除未使用的标签
    const unusedTags = await execute('DELETE FROM tags WHERE count = 0');
    if (unusedTags.affectedRows > 0) {
      this.stats.tagsDeleted += unusedTags.affectedRows;
      console.log(chalk.cyan(`    🗑️ 删除了 ${unusedTags.affectedRows} 个未使用的标签`));
    }

    console.log(chalk.green(`  ✅ 标签计数更新完成`));
  }

  private showResults(): void {
    console.log(chalk.blue('\n📊 第四步完成 - 重复标签修复结果统计'));
    console.log(chalk.blue('='.repeat(50)));
    
    console.log(chalk.green(`✅ 修复重复标签: ${this.stats.duplicatesFixed} 对`));
    console.log(chalk.green(`✅ 修复相似标签: ${this.stats.similarTagsFixed} 对`));
    console.log(chalk.green(`✅ 修复分类: ${this.stats.categoriesFixed} 条`));
    console.log(chalk.cyan(`🗑️ 删除标签: ${this.stats.tagsDeleted} 个`));
    
    const totalFixed = this.stats.duplicatesFixed + this.stats.similarTagsFixed + this.stats.categoriesFixed;
    
    if (totalFixed > 0) {
      console.log(chalk.cyan(`\n🎉 总计修复: ${totalFixed} 项`));
      
      console.log(chalk.yellow('\n💡 建议执行后续操作:'));
      console.log('  运行最终检查：npm run check:consistency:full');
      console.log('  验证所有问题是否已解决');
    } else {
      console.log(chalk.green('\n🎉 没有发现需要修复的重复标签！'));
    }
    
    console.log(chalk.blue('\n' + '='.repeat(50)));
  }
}

/**
 * 主函数
 */
async function main() {
  const step4 = new Step4FixDuplicates();
  await step4.run();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
} 