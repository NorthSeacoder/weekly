/**
 * 标签分割修复脚本
 * 修复双重数组格式的标签解析问题
 */

import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { initDatabase, query, execute } from '../lib/database';
import { handleFile } from '../lib/file';

class TagSplittingFixer {
  private sectionsDir: string;
  private weeklyContentTypeId: number | null = null;
  private stats = {
    mergedTagsDeleted: 0,
    individualTagsCreated: 0,
    tagsLinked: 0,
    contentsProcessed: 0
  };

  constructor() {
    this.sectionsDir = path.join(process.cwd(), 'sections');
    initDatabase();
  }

  async run(): Promise<void> {
    console.log(chalk.blue('🔧 修复标签分割问题...\n'));

    try {
      await this.initialize();
      
      // 步骤1: 清理错误的合并标签
      await this.cleanupMergedTags();
      
      // 步骤2: 重新解析所有文件并正确处理标签
      await this.reprocessAllTags();
      
      // 步骤3: 更新标签计数
      await this.updateTagCounts();
      
      this.showResults();

    } catch (error) {
      console.error(chalk.red('❌ 修复过程中出现错误:'), error);
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
   * 清理错误的合并标签
   */
  private async cleanupMergedTags(): Promise<void> {
    console.log(chalk.yellow('🧹 清理错误的合并标签...'));

    // 查找包含逗号的标签（这些是被错误合并的标签）
    const mergedTags = await query(`
      SELECT id, name FROM tags 
      WHERE name LIKE '%,%'
    `);

    console.log(`  发现 ${mergedTags.length} 个合并标签需要清理`);

    for (const tag of mergedTags) {
      // 删除标签关联
      await execute('DELETE FROM content_tags WHERE tag_id = ?', [tag.id]);
      
      // 删除标签
      await execute('DELETE FROM tags WHERE id = ?', [tag.id]);
      
      this.stats.mergedTagsDeleted++;
      console.log(chalk.red(`    🗑️ 删除合并标签: ${tag.name}`));
    }
  }

  /**
   * 重新处理所有标签
   */
  private async reprocessAllTags(): Promise<void> {
    console.log(chalk.yellow('\n🔄 重新处理所有文件标签...'));
    
    const fileData = await this.scanSectionFiles();
    const allIndividualTags = new Set<string>();
    
    // 收集所有正确分割的标签
    for (const file of fileData) {
      const tags = this.parseTagsCorrectly(file.metadata.tags);
      tags.forEach(tag => {
        if (tag && tag.trim()) {
          allIndividualTags.add(tag.trim());
        }
      });
    }

    console.log(`  发现 ${allIndividualTags.size} 个独立标签`);

    // 获取数据库中现有的标签
    const existingTags = await query(`SELECT name FROM tags`);
    const existingTagNames = new Set(existingTags.map((t: any) => t.name));

    // 创建缺失的标签
    const missingTags = Array.from(allIndividualTags).filter(tag => !existingTagNames.has(tag));
    console.log(`  需要创建 ${missingTags.length} 个缺失标签`);

    for (const tagName of missingTags) {
      await this.createTag(tagName);
    }

    // 重新关联所有内容的标签
    console.log('\n🔗 重新关联内容标签...');
    
    for (const file of fileData) {
      const title = file.metadata.title;
      const tags = this.parseTagsCorrectly(file.metadata.tags);

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
        for (const tagName of tags) {
          if (tagName && tagName.trim()) {
            await this.linkContentTag(contentId, tagName.trim());
          }
        }

        this.stats.contentsProcessed++;
        
        if (this.stats.contentsProcessed % 100 === 0) {
          console.log(`    处理进度: ${this.stats.contentsProcessed}/${fileData.length}`);
        }
      }
    }
  }

  /**
   * 正确解析标签格式
   * 处理 [[tag1, tag2, tag3]] 格式
   */
  private parseTagsCorrectly(tags: any): string[] {
    if (!tags) return [];
    
    // 如果是数组
    if (Array.isArray(tags)) {
      const result: string[] = [];
      
      for (const item of tags) {
        if (typeof item === 'string') {
          // 处理逗号分割的字符串
          const splitTags = item.split(',').map(t => t.trim()).filter(t => t);
          result.push(...splitTags);
        } else if (Array.isArray(item)) {
          // 处理嵌套数组（如 [[tag1, tag2]]）
          for (const nestedItem of item) {
            if (typeof nestedItem === 'string') {
              const splitTags = nestedItem.split(',').map(t => t.trim()).filter(t => t);
              result.push(...splitTags);
            } else {
              result.push(String(nestedItem).trim());
            }
          }
        } else {
          result.push(String(item).trim());
        }
      }
      
      return result.filter(tag => tag && tag.length > 0);
    }
    
    // 如果是字符串，按逗号分割
    if (typeof tags === 'string') {
      return tags.split(',').map(t => t.trim()).filter(t => t);
    }
    
    return [];
  }

  /**
   * 创建单个标签
   */
  private async createTag(tagName: string): Promise<void> {
    const slug = this.generateTagSlug(tagName);
    
    try {
      await execute(
        'INSERT INTO tags (name, slug, count) VALUES (?, ?, 0)',
        [tagName, slug]
      );
      this.stats.individualTagsCreated++;
      console.log(chalk.green(`    ✅ 创建标签: ${tagName}`));
    } catch (error) {
      if (error.toString().includes('Duplicate entry')) {
        // 标签已存在，尝试用不同的slug
        const uniqueSlug = `${slug}-${Date.now()}`;
        try {
          await execute(
            'INSERT INTO tags (name, slug, count) VALUES (?, ?, 0)',
            [tagName, uniqueSlug]
          );
          this.stats.individualTagsCreated++;
          console.log(chalk.green(`    ✅ 创建标签(唯一slug): ${tagName}`));
        } catch (secondError) {
          console.log(chalk.yellow(`    ⚠️ 跳过重复标签: ${tagName}`));
        }
      } else {
        console.log(chalk.red(`    ❌ 创建标签失败: ${tagName} - ${error}`));
      }
    }
  }

  /**
   * 生成标签slug
   */
  private generateTagSlug(tagName: string): string {
    return tagName.toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
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
        console.log(chalk.yellow(`    ⚠️ 标签不存在: ${tagName}`));
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
                metadata: fileResult.metadata,
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
    console.log(chalk.blue('\n📊 标签分割修复结果统计'));
    console.log(chalk.blue('='.repeat(50)));
    
    console.log(chalk.red(`🗑️ 删除合并标签: ${this.stats.mergedTagsDeleted} 个`));
    console.log(chalk.green(`✅ 创建独立标签: ${this.stats.individualTagsCreated} 个`));
    console.log(chalk.green(`✅ 关联标签: ${this.stats.tagsLinked} 次`));
    console.log(chalk.green(`✅ 处理内容: ${this.stats.contentsProcessed} 个`));
    
    const totalFixed = Object.values(this.stats).reduce((sum, count) => sum + count, 0);
    console.log(chalk.cyan(`\n🎉 总计处理: ${totalFixed} 项`));
    
    console.log(chalk.yellow('\n💡 建议执行后续操作:'));
    console.log('  1. 运行一致性检查验证修复效果');
    console.log('  2. 检查数据库中的标签格式是否正确');
    console.log('  3. 验证网站前端显示是否正常');
    
    console.log(chalk.blue('\n' + '='.repeat(50)));
  }
}

/**
 * 主函数
 */
async function main() {
  const fixer = new TagSplittingFixer();
  await fixer.run();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
} 