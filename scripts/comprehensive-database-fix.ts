/**
 * 全面的数据库修复脚本
 * 彻底解决所有标签缺失、元数据差异等问题
 */

import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { initDatabase, query, execute, transaction } from '../lib/database';
import { handleFile } from '../lib/file';

class ComprehensiveDatabaseFixer {
  private sectionsDir: string;
  private weeklyContentTypeId: number | null = null;
  private stats = {
    tagsCreated: 0,
    tagsLinked: 0,
    sourcesUpdated: 0,
    contentsProcessed: 0,
    categoriesFixed: 0
  };

  constructor() {
    this.sectionsDir = path.join(process.cwd(), 'sections');
    initDatabase();
  }

  async run(): Promise<void> {
    console.log(chalk.blue('🔧 全面修复数据库问题...\n'));

    try {
      await this.initialize();
      
      // 步骤1: 从所有文件中提取和创建所有缺失标签
      await this.createAllMissingTags();
      
      // 步骤2: 重新同步所有内容的标签关联
      await this.resyncAllContentTags();
      
      // 步骤3: 同步所有来源信息
      await this.syncAllSourceInfo();
      
      // 步骤4: 修复分类不一致
      await this.fixCategoryInconsistencies();
      
      // 步骤5: 更新标签计数
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
   * 从所有文件中提取和创建所有缺失标签
   */
  private async createAllMissingTags(): Promise<void> {
    console.log(chalk.yellow('📋 扫描所有文件并创建缺失标签...'));

    const fileData = await this.scanSectionFiles();
    const allFileTags = new Set<string>();

    // 收集所有文件中的标签
    for (const file of fileData) {
      const tags = file.metadata.tags || [];
      tags.forEach((tag: any) => {
        const tagStr = typeof tag === 'string' ? tag : String(tag);
        if (tagStr && tagStr.trim()) {
          allFileTags.add(tagStr.trim());
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

    if (missingTags.length > 0) {
      // 批量创建缺失的标签
      for (const tagName of missingTags) {
        await this.createTag(tagName);
      }
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
        // 标签已存在，尝试用不同的slug
        const uniqueSlug = `${slug}-${Date.now()}`;
        try {
          await execute(
            'INSERT INTO tags (name, slug, count) VALUES (?, ?, 0)',
            [tagName, uniqueSlug]
          );
          this.stats.tagsCreated++;
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
      .substring(0, 100); // 限制长度
  }

  /**
   * 重新同步所有内容的标签关联
   */
  private async resyncAllContentTags(): Promise<void> {
    console.log(chalk.yellow('\n🔗 重新同步所有内容的标签关联...'));
    
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
          const tagStr = typeof tag === 'string' ? tag : String(tag);
          if (tagStr && tagStr.trim()) {
            await this.linkContentTag(contentId, tagStr.trim());
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
      } else {
        console.log(chalk.yellow(`    ⚠️ 标签不存在: ${tagName}`));
      }
    } catch (error) {
      console.log(chalk.red(`    ❌ 关联标签失败: ${tagName} - ${error}`));
    }
  }

  /**
   * 同步所有来源信息
   */
  private async syncAllSourceInfo(): Promise<void> {
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
   * 修复分类不一致
   */
  private async fixCategoryInconsistencies(): Promise<void> {
    console.log(chalk.yellow('\n📂 修复分类不一致...'));

    const fileData = await this.scanSectionFiles();
    
    // 分类映射规则
    const categoryMappings: Record<string, string> = {
      'Prompt': 'prompt',
      '访谈': 'interviews',
      'AI': 'ai',
      'Bug': 'bugs',
      '工具': 'tools',
      '文章': 'articles',
      '教程': 'tutorials',
      '言论': 'quotes',
      '面试题': 'interviews',
      'repos': 'repos',
      'bigones': 'bigones',
      '网站': 'websites',
      'demo': 'demos',
      '开源': 'open-source',
      '资源': 'resources',
      '技巧': 'tips',
      '经验': 'experience',
      '技术': 'technology',
      '博客': 'blogs',
      '博主': 'bloggers',
      '教育': 'education',
      '开发工具': 'dev-tools',
      '讨论': 'discussion',
      '观点': 'opinions',
      '读书': 'reading',
      '设计': 'design',
      '服务': 'services',
      '思考': 'thoughts',
      '应用': 'applications',
      '平台': 'platforms',
      '安全': 'security',
      '健康': 'health',
      '书籍': 'books',
      '专栏': 'columns'
    };

    for (const file of fileData) {
      const title = file.metadata.title;
      const fileCategory = file.metadata.category;
      
      if (fileCategory) {
        // 直接使用文件中的分类名称查找，或使用映射
        const targetCategorySlug = categoryMappings[fileCategory] || fileCategory;
        
        // 获取目标分类ID
        const categoryResult = await query(
          'SELECT id FROM categories WHERE slug = ? OR name = ?', 
          [targetCategorySlug, fileCategory]
        );

        if (categoryResult.length > 0) {
          const categoryId = categoryResult[0].id;
          
          const result = await execute(`
            UPDATE contents 
            SET category_id = ? 
            WHERE title = ? 
            AND content_type_id = ?
            AND (category_id IS NULL OR category_id != ?)
          `, [categoryId, title, this.weeklyContentTypeId, categoryId]);

          if (result.affectedRows > 0) {
            this.stats.categoriesFixed++;
          }
        } else {
          // 如果分类不存在，创建它
          try {
            const slug = this.generateTagSlug(fileCategory);
            const insertResult = await execute(
              'INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, 999)',
              [fileCategory, slug]
            );
            
            const newCategoryId = insertResult.insertId;
            
            await execute(`
              UPDATE contents 
              SET category_id = ? 
              WHERE title = ? 
              AND content_type_id = ?
            `, [newCategoryId, title, this.weeklyContentTypeId]);

            this.stats.categoriesFixed++;
            console.log(chalk.cyan(`    创建新分类: ${fileCategory}`));
          } catch (error) {
            console.log(chalk.red(`    ❌ 创建分类失败: ${fileCategory} - ${error}`));
          }
        }
      }
    }

    console.log(chalk.green(`  ✅ 修复了 ${this.stats.categoriesFixed} 条记录的分类`));
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
    console.log(chalk.blue('\n📊 全面修复结果统计'));
    console.log(chalk.blue('='.repeat(50)));
    
    console.log(chalk.green(`✅ 创建标签: ${this.stats.tagsCreated} 个`));
    console.log(chalk.green(`✅ 关联标签: ${this.stats.tagsLinked} 次`));
    console.log(chalk.green(`✅ 处理内容: ${this.stats.contentsProcessed} 个`));
    console.log(chalk.green(`✅ 更新来源: ${this.stats.sourcesUpdated} 条`));
    console.log(chalk.green(`✅ 修复分类: ${this.stats.categoriesFixed} 条`));
    
    const totalFixed = Object.values(this.stats).reduce((sum, count) => sum + count, 0);
    console.log(chalk.cyan(`\n🎉 总计修复: ${totalFixed} 项`));
    
    console.log(chalk.yellow('\n💡 建议执行后续操作:'));
    console.log('  1. 重新运行一致性检查验证修复效果');
    console.log('  2. 检查数据库中的标签数量和内容关联');
    console.log('  3. 验证网站前端显示是否正常');
    console.log('  4. 备份优化后的数据库');
    
    console.log(chalk.blue('\n' + '='.repeat(50)));
  }
}

/**
 * 主函数
 */
async function main() {
  const fixer = new ComprehensiveDatabaseFixer();
  await fixer.run();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
} 