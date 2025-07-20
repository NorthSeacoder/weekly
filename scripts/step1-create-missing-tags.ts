/**
 * 第一步：重新创建缺失的基础标签
 * 专门处理标签不匹配问题
 */

import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { initDatabase, query, execute } from '../lib/database';
import { handleFile } from '../lib/file';

class Step1CreateMissingTags {
  private sectionsDir: string;
  private stats = {
    tagsCreated: 0,
    filesScanned: 0,
    uniqueTagsFound: 0
  };

  constructor() {
    this.sectionsDir = path.join(process.cwd(), 'sections');
    initDatabase();
  }

  async run(): Promise<void> {
    console.log(chalk.blue('🏷️ 第一步：重新创建缺失的基础标签...\n'));

    try {
      await this.createMissingTags();
      this.showResults();
    } catch (error) {
      console.error(chalk.red('❌ 创建标签过程中出现错误:'), error);
      process.exit(1);
    }
  }

  /**
   * 创建所有缺失的标签
   */
  private async createMissingTags(): Promise<void> {
    console.log(chalk.yellow('📁 扫描所有文件中的标签...'));

    const fileData = await this.scanSectionFiles();
    const allFileTags = new Set<string>();

    // 收集所有文件中的标签
    for (const file of fileData) {
      const tags = file.metadata.tags || [];
      if (Array.isArray(tags)) {
        tags.forEach((tag: any) => {
          if (tag && typeof tag === 'string' && tag.trim()) {
            allFileTags.add(tag.trim());
          }
        });
      }
      this.stats.filesScanned++;
    }

    this.stats.uniqueTagsFound = allFileTags.size;
    console.log(`  扫描了 ${this.stats.filesScanned} 个文件`);
    console.log(`  发现 ${this.stats.uniqueTagsFound} 个唯一标签`);

    // 获取数据库中现有的标签
    const existingTags = await query(`SELECT name FROM tags`);
    const existingTagNames = new Set(existingTags.map((t: any) => t.name));
    
    console.log(`  数据库中现有 ${existingTagNames.size} 个标签`);

    // 找出缺失的标签
    const missingTags = Array.from(allFileTags).filter(tag => !existingTagNames.has(tag));
    console.log(`  需要创建 ${missingTags.length} 个缺失标签`);

    if (missingTags.length > 0) {
      console.log(chalk.yellow('\n🔨 开始创建缺失标签...'));
      
      // 按标签名称排序，优先创建常用标签
      const priorityTags = ['JavaScript', 'CSS', 'React', 'TypeScript', 'Next.js', 'Vue', 'Node.js', 'HTML', 'Python'];
      const sortedMissingTags = missingTags.sort((a, b) => {
        const aPriority = priorityTags.indexOf(a);
        const bPriority = priorityTags.indexOf(b);
        
        if (aPriority !== -1 && bPriority !== -1) {
          return aPriority - bPriority;
        } else if (aPriority !== -1) {
          return -1;
        } else if (bPriority !== -1) {
          return 1;
        } else {
          return a.localeCompare(b);
        }
      });

      for (const tagName of sortedMissingTags) {
        await this.createTag(tagName);
      }
    } else {
      console.log(chalk.green('  ✅ 所有标签都已存在！'));
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
    console.log(chalk.blue('\n📊 第一步完成 - 创建标签结果统计'));
    console.log(chalk.blue('='.repeat(50)));
    
    console.log(chalk.cyan(`📁 扫描文件: ${this.stats.filesScanned} 个`));
    console.log(chalk.cyan(`🏷️ 发现唯一标签: ${this.stats.uniqueTagsFound} 个`));
    console.log(chalk.green(`✅ 创建标签: ${this.stats.tagsCreated} 个`));
    
    if (this.stats.tagsCreated > 0) {
      console.log(chalk.yellow('\n💡 下一步操作:'));
      console.log('  运行第二步：npm run step2:link');
      console.log('  重新关联所有内容的标签');
    } else {
      console.log(chalk.green('\n🎉 所有标签都已存在，可以直接进行下一步！'));
    }
    
    console.log(chalk.blue('\n' + '='.repeat(50)));
  }
}

/**
 * 主函数
 */
async function main() {
  const step1 = new Step1CreateMissingTags();
  await step1.run();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
} 