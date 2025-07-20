/**
 * 第二步：重新关联所有内容的标签
 * 确保所有文件的标签正确关联到数据库
 */

import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { initDatabase, query, execute } from '../lib/database';
import { handleFile } from '../lib/file';

class Step2LinkTags {
  private sectionsDir: string;
  private weeklyContentTypeId: number | null = null;
  private stats = {
    contentsProcessed: 0,
    tagsLinked: 0,
    tagsNotFound: 0,
    contentNotFound: 0
  };

  constructor() {
    this.sectionsDir = path.join(process.cwd(), 'sections');
    initDatabase();
  }

  async run(): Promise<void> {
    console.log(chalk.blue('🔗 第二步：重新关联所有内容的标签...\n'));

    try {
      await this.initialize();
      await this.relinkAllTags();
      await this.updateTagCounts();
      this.showResults();
    } catch (error) {
      console.error(chalk.red('❌ 关联标签过程中出现错误:'), error);
      process.exit(1);
    }
  }

  private async initialize(): Promise<void> {
    const contentTypes = await query(`SELECT id FROM content_types WHERE slug = 'weekly'`);
    if (contentTypes.length === 0) {
      throw new Error('未找到周刊内容类型');
    }
    this.weeklyContentTypeId = contentTypes[0].id;
  }

  /**
   * 重新关联所有标签
   */
  private async relinkAllTags(): Promise<void> {
    console.log(chalk.yellow('🔗 重新关联所有内容的标签...'));
    
    const fileData = await this.scanSectionFiles();
    console.log(`  发现 ${fileData.length} 个文件需要处理`);
    
    for (const file of fileData) {
      const title = file.metadata.title;
      const tags = file.metadata.tags || [];

      if (!title) {
        console.log(chalk.yellow(`    ⚠️ 文件缺少标题: ${file.path}`));
        continue;
      }

      // 查找对应的数据库记录
      const content = await query(`
        SELECT id FROM contents 
        WHERE title = ? AND content_type_id = ?
      `, [title, this.weeklyContentTypeId]);

      if (content.length > 0) {
        const contentId = content[0].id;
        
        // 删除现有标签关联
        await execute('DELETE FROM content_tags WHERE content_id = ?', [contentId]);

        // 添加新的标签关联
        if (Array.isArray(tags)) {
          for (const tag of tags) {
            if (tag && typeof tag === 'string' && tag.trim()) {
              await this.linkContentTag(contentId, tag.trim());
            }
          }
        }

        this.stats.contentsProcessed++;
        
        if (this.stats.contentsProcessed % 100 === 0) {
          console.log(chalk.cyan(`    处理进度: ${this.stats.contentsProcessed}/${fileData.length}`));
        }
      } else {
        this.stats.contentNotFound++;
        console.log(chalk.red(`    ❌ 数据库中未找到内容: ${title}`));
      }
    }

    console.log(chalk.green(`  ✅ 处理了 ${this.stats.contentsProcessed} 个内容的标签关联`));
    
    if (this.stats.contentNotFound > 0) {
      console.log(chalk.yellow(`  ⚠️ ${this.stats.contentNotFound} 个内容在数据库中未找到`));
    }
  }

  /**
   * 关联内容和标签
   */
  private async linkContentTag(contentId: number, tagName: string): Promise<void> {
    try {
      const tagResult = await query('SELECT id FROM tags WHERE name = ?', [tagName]);
      if (tagResult.length > 0) {
        await execute(
          'INSERT IGNORE INTO content_tags (content_id, tag_id) VALUES (?, ?)',
          [contentId, tagResult[0].id]
        );
        this.stats.tagsLinked++;
      } else {
        this.stats.tagsNotFound++;
        console.log(chalk.red(`    ❌ 标签不存在: ${tagName}`));
      }
    } catch (error) {
      console.log(chalk.red(`    ❌ 关联标签失败: ${tagName} - ${error}`));
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

    console.log(chalk.green(`  ✅ 标签计数更新完成`));
  }

  /**
   * 扫描 sections 目录
   */
  private async scanSectionFiles(): Promise<Array<{path: string, metadata: any, content: string}>> {
    const files: Array<{path: string, metadata: any, content: string}> = [];

    const scanDirectory = (dir: string): void => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (item.endsWith('.mdx')) {
          try {
            const fileResult = handleFile(fullPath);
            if (fileResult) {
              files.push({
                path: fullPath,
                metadata: fileResult.metadata as any,
                content: fileResult.content
              });
            }
          } catch (error) {
            console.warn(chalk.yellow(`⚠️ 解析文件失败: ${fullPath}`));
          }
        }
      }
    };

    scanDirectory(this.sectionsDir);
    return files;
  }

  private showResults(): void {
    console.log(chalk.blue('\n📊 第二步完成 - 标签关联结果统计'));
    console.log(chalk.blue('='.repeat(50)));
    
    console.log(chalk.green(`✅ 处理内容: ${this.stats.contentsProcessed} 个`));
    console.log(chalk.green(`✅ 关联标签: ${this.stats.tagsLinked} 次`));
    
    if (this.stats.tagsNotFound > 0) {
      console.log(chalk.red(`❌ 标签未找到: ${this.stats.tagsNotFound} 个`));
    }
    
    if (this.stats.contentNotFound > 0) {
      console.log(chalk.red(`❌ 内容未找到: ${this.stats.contentNotFound} 个`));
    }
    
    if (this.stats.tagsNotFound > 0) {
      console.log(chalk.yellow('\n💡 如果还有标签未找到，请重新运行第一步：npm run step1:tags'));
    } else {
      console.log(chalk.yellow('\n💡 下一步操作:'));
      console.log('  运行第三步：npm run step3:sources');
      console.log('  同步所有来源信息');
    }
    
    console.log(chalk.blue('\n' + '='.repeat(50)));
  }
}

/**
 * 主函数
 */
async function main() {
  const step2 = new Step2LinkTags();
  await step2.run();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
} 