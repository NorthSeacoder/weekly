/**
 * 修复一致性检查中剩余的问题
 * 基于 detailed-report1.md 中发现的具体问题进行精确修复
 */

import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { initDatabase, query, execute, transaction } from '../lib/database';
import { handleFile } from '../lib/file';

class RemainingIssuesFixer {
  private sectionsDir: string;
  private weeklyContentTypeId: number | null = null;
  private stats = {
    missingTagsFixed: 0,
    similarTagsUnified: 0,
    filesUpdated: 0
  };

  constructor() {
    this.sectionsDir = path.join(process.cwd(), 'sections');
    initDatabase();
  }

  async run(): Promise<void> {
    console.log(chalk.blue('🔧 修复剩余的一致性问题...\n'));

    try {
      await this.initialize();
      
      // 方案1: 修复数据库中缺失的标签（创建并关联）
      await this.fixMissingTagsInDatabase();
      
      // 方案2: 统一文件中的相似标签命名
      await this.unifySimilarTagsInFiles();
      
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
   * 修复数据库中缺失的标签
   */
  private async fixMissingTagsInDatabase(): Promise<void> {
    console.log(chalk.yellow('📋 修复数据库中缺失的标签...'));

    // 从报告中提取出仍然缺失的标签
    const missingTags = [
      'CSS', 'TailwindCSS', 'Git', 'CDN', 'DNS', 'UI', 
      'HackerNews', 'HomeAssistant', 'Three.js', 'three.js'
    ];

    // 检查这些标签是否真的在数据库中缺失
    for (const tagName of missingTags) {
      const existing = await query('SELECT id FROM tags WHERE name = ?', [tagName]);
      
      if (existing.length === 0) {
        // 创建缺失的标签
        const slug = tagName.toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        try {
          await execute(
            'INSERT INTO tags (name, slug, count) VALUES (?, ?, 0)',
            [tagName, slug]
          );
          console.log(chalk.green(`  ✅ 创建标签: ${tagName}`));
          this.stats.missingTagsFixed++;
        } catch (error) {
          console.log(chalk.yellow(`  ⚠️ 创建标签失败: ${tagName} - ${error}`));
        }
      }
    }

    // 重新关联所有内容的标签
    await this.relinkContentTags();
  }

  /**
   * 重新关联内容标签
   */
  private async relinkContentTags(): Promise<void> {
    console.log(chalk.yellow('  🔗 重新关联内容标签...'));
    
    // 获取所有文件
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

        // 重新添加标签关联
        for (const tagName of tags) {
          const tagResult = await query('SELECT id FROM tags WHERE name = ?', [tagName.trim()]);
          if (tagResult.length > 0) {
            try {
              await execute(
                'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)',
                [contentId, tagResult[0].id]
              );
            } catch (error) {
              // 可能是重复关联，跳过
            }
          }
        }
      }
    }

    // 更新标签使用计数
    await execute(`
      UPDATE tags SET count = (
        SELECT COUNT(*) 
        FROM content_tags ct 
        WHERE ct.tag_id = tags.id
      )
    `);
  }

  /**
   * 统一文件中的相似标签命名
   */
  private async unifySimilarTagsInFiles(): Promise<void> {
    console.log(chalk.yellow('\n📝 统一文件中的相似标签命名...'));

    // 标签映射规则
    const tagMappings: Record<string, string> = {
      'TailwindCSS': 'Tailwind CSS',
      'three.js': 'Three.js',
      'HackerNews': 'Hacker News',
      'HomeAssistant': 'Home Assistant',
      'ProductHunt': 'Product Hunt'
    };

    const fileData = await this.scanSectionFiles();
    
    for (const file of fileData) {
      const filePath = file.path;
      const tags = file.metadata.tags || [];
      
      // 检查是否有需要替换的标签
      let hasChanges = false;
      const newTags = tags.map((tag: string) => {
        if (tagMappings[tag]) {
          hasChanges = true;
          console.log(chalk.cyan(`    ${path.relative(process.cwd(), filePath)}: "${tag}" -> "${tagMappings[tag]}"`));
          return tagMappings[tag];
        }
        return tag;
      });

      if (hasChanges) {
        // 更新文件中的标签
        await this.updateFileTagsInFrontmatter(filePath, newTags);
        this.stats.filesUpdated++;
      }
    }

    console.log(chalk.green(`  ✅ 更新了 ${this.stats.filesUpdated} 个文件`));
  }

  /**
   * 更新文件 frontmatter 中的标签
   */
  private async updateFileTagsInFrontmatter(filePath: string, newTags: string[]): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 使用正则表达式替换 frontmatter 中的 tags 字段
      const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
      const match = content.match(frontmatterRegex);
      
      if (match) {
        let frontmatter = match[1];
        
        // 生成新的标签数组字符串
        const tagsArrayStr = `[${newTags.map(tag => `${tag}`).join(', ')}]`;
        
        // 替换 tags 字段
        frontmatter = frontmatter.replace(
          /^tags:\s*\[.*?\]$/m,
          `tags: [${tagsArrayStr}]`
        );
        
        // 重新组装文件内容
        const newContent = content.replace(frontmatterRegex, `---\n${frontmatter}\n---`);
        
        fs.writeFileSync(filePath, newContent, 'utf8');
      }
    } catch (error) {
      console.log(chalk.red(`    ❌ 更新文件失败: ${filePath} - ${error}`));
    }
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
    console.log(chalk.blue('\n📊 修复结果统计'));
    console.log(chalk.blue('='.repeat(50)));
    
    console.log(chalk.green(`✅ 修复缺失标签: ${this.stats.missingTagsFixed} 个`));
    console.log(chalk.green(`✅ 统一相似标签: ${this.stats.similarTagsUnified} 个`));
    console.log(chalk.green(`✅ 更新文件: ${this.stats.filesUpdated} 个`));
    
    const totalFixed = Object.values(this.stats).reduce((sum, count) => sum + count, 0);
    console.log(chalk.cyan(`\n🎉 总计修复: ${totalFixed} 项问题`));
    
    console.log(chalk.yellow('\n💡 建议执行后续操作:'));
    console.log('  1. 重新运行一致性检查验证修复效果');
    console.log('  2. 提交修改的文件到版本控制');
    console.log('  3. 检查网站前端显示是否正常');
    
    console.log(chalk.blue('\n' + '='.repeat(50)));
  }
}

/**
 * 主函数
 */
async function main() {
  const fixer = new RemainingIssuesFixer();
  await fixer.run();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
} 