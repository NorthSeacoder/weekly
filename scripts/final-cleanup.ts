/**
 * 最终清理脚本
 * 解决所有剩余问题：缺失标签、来源信息同步、相似标签处理
 */

import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { initDatabase, query, execute } from '../lib/database';
import { handleFile } from '../lib/file';

class FinalCleanup {
  private sectionsDir: string;
  private weeklyContentTypeId: number | null = null;
  private stats = {
    tagsCreated: 0,
    tagsLinked: 0,
    sourcesUpdated: 0,
    similarTagsFixed: 0,
    contentsProcessed: 0
  };

  constructor() {
    this.sectionsDir = path.join(process.cwd(), 'sections');
    initDatabase();
  }

  async run(): Promise<void> {
    console.log(chalk.blue('🧹 最终清理 - 解决所有剩余问题...\n'));

    try {
      await this.initialize();
      
      // 步骤1: 创建所有缺失的标签
      await this.createMissingTags();
      
      // 步骤2: 重新关联所有标签
      await this.relinkAllTags();
      
      // 步骤3: 同步所有来源信息
      await this.syncAllSources();
      
      // 步骤4: 处理相似标签
      await this.handleSimilarTags();
      
      // 步骤5: 更新标签计数
      await this.updateTagCounts();
      
      this.showResults();

    } catch (error) {
      console.error(chalk.red('❌ 清理过程中出现错误:'), error);
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
   * 创建所有缺失的标签
   */
  private async createMissingTags(): Promise<void> {
    console.log(chalk.yellow('🏷️ 创建缺失标签...'));

    const fileData = await this.scanSectionFiles();
    const allFileTags = new Set<string>();

    // 收集所有文件中的标签
    for (const file of fileData) {
      const tags = file.metadata.tags || [];
      tags.forEach((tag: any) => {
        if (tag && typeof tag === 'string' && tag.trim()) {
          allFileTags.add(tag.trim());
        }
      });
    }

    console.log(`  发现 ${allFileTags.size} 个唯一标签`);

    // 获取数据库中现有的标签
    const existingTags = await query(`SELECT name FROM tags`);
    const existingTagNames = new Set(existingTags.map((t: any) => t.name));

    // 找出缺失的标签
    const missingTags = Array.from(allFileTags).filter(tag => !existingTagNames.has(tag));
    console.log(`  需要创建 ${missingTags.length} 个缺失标签`);

    // 创建缺失的标签
    for (const tagName of missingTags) {
      await this.createTag(tagName);
    }
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
      this.stats.tagsCreated++;
      console.log(chalk.green(`    ✅ 创建标签: ${tagName}`));
    } catch (error) {
      if (error.toString().includes('Duplicate entry')) {
        console.log(chalk.yellow(`    ⚠️ 标签已存在: ${tagName}`));
      } else {
        console.log(chalk.red(`    ❌ 创建标签失败: ${tagName} - ${error}`));
      }
    }
  }

  /**
   * 重新关联所有标签
   */
  private async relinkAllTags(): Promise<void> {
    console.log(chalk.yellow('\n🔗 重新关联所有标签...'));
    
    const fileData = await this.scanSectionFiles();
    
    for (const file of fileData) {
      const title = file.metadata.title;
      const tags = file.metadata.tags || [];

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
        for (const tag of tags) {
          if (tag && typeof tag === 'string' && tag.trim()) {
            await this.linkContentTag(contentId, tag.trim());
          }
        }

        this.stats.contentsProcessed++;
        
        if (this.stats.contentsProcessed % 100 === 0) {
          console.log(`    处理进度: ${this.stats.contentsProcessed}/${fileData.length}`);
        }
      }
    }

    console.log(chalk.green(`  ✅ 处理了 ${this.stats.contentsProcessed} 个内容的标签关联`));
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
      }
    } catch (error) {
      console.log(chalk.red(`    ❌ 关联标签失败: ${tagName} - ${error}`));
    }
  }

  /**
   * 同步所有来源信息
   */
  private async syncAllSources(): Promise<void> {
    console.log(chalk.yellow('\n📝 同步所有来源信息...'));
    
    const fileData = await this.scanSectionFiles();
    
    for (const file of fileData) {
      const title = file.metadata.title;
      const source = file.metadata.source;

      if (source && source.trim()) {
        try {
          const result = await execute(`
            UPDATE contents 
            SET source = ? 
            WHERE title = ? 
            AND content_type_id = ? 
            AND (source IS NULL OR source = '' OR source != ?)
          `, [source.trim(), title, this.weeklyContentTypeId, source.trim()]);

          if (result.affectedRows > 0) {
            this.stats.sourcesUpdated++;
          }
        } catch (error) {
          console.log(chalk.red(`    ❌ 更新来源失败: ${title} - ${error}`));
        }
      }
    }

    console.log(chalk.green(`  ✅ 更新了 ${this.stats.sourcesUpdated} 条记录的来源信息`));
  }

  /**
   * 处理相似标签
   */
  private async handleSimilarTags(): Promise<void> {
    console.log(chalk.yellow('\n🎯 处理相似标签...'));

    // 定义相似标签映射规则
    const similarTagMappings: Record<string, string> = {
      'CSS3': 'CSS',
      'HTML5': 'HTML',
      'Javascript': 'JavaScript',
      'Typescript': 'TypeScript',
      'React.js': 'React',
      'Vue.js': 'Vue',
      'Node.js': 'Node',
      'Next.js': 'NextJS',
      'CSS 框架': 'CSS',
      'JS 库': 'JavaScript',
      'Web 开发': 'Web开发',
      '前端': '前端开发',
      '后端': '后端开发'
    };

    for (const [similarTag, standardTag] of Object.entries(similarTagMappings)) {
      try {
        // 查找相似标签
        const similarTagResult = await query('SELECT id FROM tags WHERE name = ?', [similarTag]);
        const standardTagResult = await query('SELECT id FROM tags WHERE name = ?', [standardTag]);

        if (similarTagResult.length > 0 && standardTagResult.length > 0) {
          const similarTagId = similarTagResult[0].id;
          const standardTagId = standardTagResult[0].id;

          // 将相似标签的关联转移到标准标签
          await execute(`
            UPDATE IGNORE content_tags 
            SET tag_id = ? 
            WHERE tag_id = ?
          `, [standardTagId, similarTagId]);

          // 删除相似标签
          await execute('DELETE FROM content_tags WHERE tag_id = ?', [similarTagId]);
          await execute('DELETE FROM tags WHERE id = ?', [similarTagId]);

          this.stats.similarTagsFixed++;
          console.log(chalk.green(`    ✅ 合并相似标签: ${similarTag} → ${standardTag}`));
        }
      } catch (error) {
        console.log(chalk.red(`    ❌ 处理相似标签失败: ${similarTag} - ${error}`));
      }
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
   * 生成标签slug
   */
  private generateTagSlug(tagName: string): string {
    return tagName.toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
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
    console.log(chalk.blue('\n📊 最终清理结果统计'));
    console.log(chalk.blue('='.repeat(50)));
    
    console.log(chalk.green(`✅ 创建标签: ${this.stats.tagsCreated} 个`));
    console.log(chalk.green(`✅ 关联标签: ${this.stats.tagsLinked} 次`));
    console.log(chalk.green(`✅ 处理内容: ${this.stats.contentsProcessed} 个`));
    console.log(chalk.green(`✅ 更新来源: ${this.stats.sourcesUpdated} 条`));
    console.log(chalk.green(`✅ 修复相似标签: ${this.stats.similarTagsFixed} 对`));
    
    const totalFixed = Object.values(this.stats).reduce((sum, count) => sum + count, 0);
    console.log(chalk.cyan(`\n🎉 总计处理: ${totalFixed} 项`));
    
    console.log(chalk.yellow('\n💡 建议执行后续操作:'));
    console.log('  1. 运行一致性检查验证修复效果');
    console.log('  2. 检查数据库中的标签和来源信息');
    console.log('  3. 验证网站前端显示是否正常');
    
    console.log(chalk.blue('\n' + '='.repeat(50)));
  }
}

/**
 * 主函数
 */
async function main() {
  const cleanup = new FinalCleanup();
  await cleanup.run();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
} 