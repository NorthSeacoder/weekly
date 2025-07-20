/**
 * 第五步：最终同步脚本
 * 解决所有剩余问题：标签大小写、分类同步、来源同步
 */

import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { initDatabase, query, execute } from '../lib/database';
import { handleFile } from '../lib/file';

class Step5FinalSync {
  private sectionsDir: string;
  private weeklyContentTypeId: number | null = null;
  private stats = {
    tagsFixed: 0,
    tagsCreated: 0,
    categoriesFixed: 0,
    categoriesCreated: 0,
    sourcesFixed: 0,
    filesProcessed: 0
  };

  constructor() {
    this.sectionsDir = path.join(process.cwd(), 'sections');
    initDatabase();
  }

  async run(): Promise<void> {
    console.log(chalk.blue('🚀 第五步：最终同步 - 解决所有剩余问题...\n'));

    try {
      await this.initialize();
      
      // 步骤1: 修复标签大小写问题
      await this.fixTagCasing();
      
      // 步骤2: 扫描并同步所有数据
      await this.syncAllData();
      
      // 步骤3: 更新标签计数
      await this.updateTagCounts();
      
      this.showResults();
    } catch (error) {
      console.error(chalk.red('❌ 最终同步过程中出现错误:'), error);
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
   * 修复标签大小写问题
   */
  private async fixTagCasing(): Promise<void> {
    console.log(chalk.yellow('🔤 修复标签大小写问题...'));

    // 将小写 git 改为大写 Git
    const gitTagResult = await query('SELECT id FROM tags WHERE name = ?', ['git']);
    if (gitTagResult.length > 0) {
      await execute('UPDATE tags SET name = ? WHERE name = ?', ['Git', 'git']);
      this.stats.tagsFixed++;
      console.log(chalk.green('    ✅ 修复标签: git → Git'));
    }

    // 处理 UI 标签
    const exactUITag = await query('SELECT id, name FROM tags WHERE name = ?', ['UI']);
    if (exactUITag.length === 0) {
      // 检查是否有小写ui标签
      const lowerUITag = await query('SELECT id, name FROM tags WHERE name = ?', ['ui']);
      if (lowerUITag.length > 0) {
        // 修复小写为大写
        await execute('UPDATE tags SET name = ? WHERE name = ?', ['UI', 'ui']);
        this.stats.tagsFixed++;
        console.log(chalk.green('    ✅ 修复标签: ui → UI'));
      } else {
        // 需要创建新的UI标签，使用不同的slug
        const slug = 'ui-tag';
        await execute('INSERT INTO tags (name, slug, count) VALUES (?, ?, 0)', ['UI', slug]);
        this.stats.tagsCreated++;
        console.log(chalk.green('    ✅ 创建标签: UI'));
      }
    } else {
      console.log(chalk.cyan('    ℹ️ UI 标签已存在且正确'));
    }
  }

  /**
   * 同步所有数据
   */
  private async syncAllData(): Promise<void> {
    console.log(chalk.yellow('\n📋 同步所有文件数据...'));
    
    const fileData = await this.scanSectionFiles();
    console.log(`  发现 ${fileData.length} 个文件需要处理`);
    
    for (const file of fileData) {
      const title = file.metadata.title;
      const category = file.metadata.category;
      const source = file.metadata.source;

      if (!title) {
        console.log(chalk.yellow(`    ⚠️ 文件缺少标题: ${file.path}`));
        continue;
      }

      // 查找对应的数据库记录
      const content = await query(`
        SELECT id, category_id, source FROM contents 
        WHERE title = ? AND content_type_id = ?
      `, [title, this.weeklyContentTypeId]);

      if (content.length > 0) {
        const contentId = content[0].id;
        const currentCategoryId = content[0].category_id;
        const currentSource = content[0].source;

        let needsUpdate = false;
        const updates: string[] = [];
        const values: any[] = [];

        // 处理分类
        if (category && category.trim()) {
          const categoryId = await this.ensureCategory(category.trim());
          if (categoryId && categoryId !== currentCategoryId) {
            updates.push('category_id = ?');
            values.push(categoryId);
            needsUpdate = true;
          }
        }

        // 处理来源信息
        if (source && source.trim()) {
          if (!currentSource || currentSource.trim() === '' || currentSource !== source.trim()) {
            updates.push('source = ?');
            values.push(source.trim());
            needsUpdate = true;
          }
        }

        // 更新数据库
        if (needsUpdate) {
          values.push(contentId);
          await execute(`
            UPDATE contents 
            SET ${updates.join(', ')} 
            WHERE id = ?
          `, values);

          if (updates.includes('category_id = ?')) {
            this.stats.categoriesFixed++;
          }
          if (updates.includes('source = ?')) {
            this.stats.sourcesFixed++;
          }
        }

        this.stats.filesProcessed++;
        
        if (this.stats.filesProcessed % 100 === 0) {
          console.log(chalk.cyan(`    处理进度: ${this.stats.filesProcessed}/${fileData.length}`));
        }
      }
    }

    console.log(chalk.green(`  ✅ 处理了 ${this.stats.filesProcessed} 个文件`));
  }

  /**
   * 确保分类存在并返回ID
   */
  private async ensureCategory(categoryName: string): Promise<number | null> {
    try {
      // 定义分类映射
      const categoryMappings: Record<string, string> = {
        'AI': 'ai',
        'Prompt': 'prompt', 
        'prompt': 'prompt',
        '访谈': 'interviews',
        'Bug': 'bugs',
        'bugs': 'bugs'
      };

      const mappedName = categoryMappings[categoryName] || categoryName.toLowerCase();

      // 查找现有分类
      let categoryResult = await query('SELECT id FROM categories WHERE name = ? OR slug = ?', [mappedName, mappedName]);
      
      if (categoryResult.length === 0) {
        // 创建新分类
        const slug = mappedName.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        await execute('INSERT INTO categories (name, slug) VALUES (?, ?)', [mappedName, slug]);
        
        categoryResult = await query('SELECT id FROM categories WHERE name = ? OR slug = ?', [mappedName, mappedName]);
        this.stats.categoriesCreated++;
        console.log(chalk.green(`    ✅ 创建分类: ${categoryName} → ${mappedName}`));
      }

      return categoryResult.length > 0 ? categoryResult[0].id : null;
    } catch (error) {
      console.log(chalk.red(`    ❌ 处理分类失败: ${categoryName} - ${error}`));
      return null;
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
    console.log(chalk.blue('\n📊 第五步完成 - 最终同步结果统计'));
    console.log(chalk.blue('='.repeat(50)));
    
    console.log(chalk.green(`✅ 修复标签: ${this.stats.tagsFixed} 个`));
    console.log(chalk.green(`✅ 创建标签: ${this.stats.tagsCreated} 个`));
    console.log(chalk.green(`✅ 修复分类: ${this.stats.categoriesFixed} 条`));
    console.log(chalk.green(`✅ 创建分类: ${this.stats.categoriesCreated} 个`));
    console.log(chalk.green(`✅ 同步来源: ${this.stats.sourcesFixed} 条`));
    console.log(chalk.cyan(`📁 处理文件: ${this.stats.filesProcessed} 个`));
    
    const totalFixed = this.stats.tagsFixed + this.stats.tagsCreated + 
                      this.stats.categoriesFixed + this.stats.categoriesCreated + 
                      this.stats.sourcesFixed;
    
    if (totalFixed > 0) {
      console.log(chalk.cyan(`\n🎉 总计修复: ${totalFixed} 项`));
      console.log(chalk.yellow('\n💡 建议执行最终验证:'));
      console.log('  运行检查：npm run check:consistency:full');
      console.log('  验证所有问题是否已彻底解决');
    } else {
      console.log(chalk.green('\n🎉 所有数据都已同步！'));
    }
    
    console.log(chalk.blue('\n' + '='.repeat(50)));
  }
}

/**
 * 主函数
 */
async function main() {
  const step5 = new Step5FinalSync();
  await step5.run();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
} 