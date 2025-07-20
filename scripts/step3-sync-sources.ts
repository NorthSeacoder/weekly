/**
 * 第三步：同步所有来源信息到数据库
 * 解决元数据差异问题
 */

import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { initDatabase, query, execute } from '../lib/database';
import { handleFile } from '../lib/file';

class Step3SyncSources {
  private sectionsDir: string;
  private weeklyContentTypeId: number | null = null;
  private stats = {
    filesScanned: 0,
    sourcesUpdated: 0,
    contentNotFound: 0,
    sourcesAlreadyCorrect: 0
  };

  constructor() {
    this.sectionsDir = path.join(process.cwd(), 'sections');
    initDatabase();
  }

  async run(): Promise<void> {
    console.log(chalk.blue('📝 第三步：同步所有来源信息到数据库...\n'));

    try {
      await this.initialize();
      await this.syncAllSources();
      this.showResults();
    } catch (error) {
      console.error(chalk.red('❌ 同步来源过程中出现错误:'), error);
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
   * 同步所有来源信息
   */
  private async syncAllSources(): Promise<void> {
    console.log(chalk.yellow('📝 同步所有来源信息...'));
    
    const fileData = await this.scanSectionFiles();
    console.log(`  发现 ${fileData.length} 个文件需要处理`);
    
    for (const file of fileData) {
      const title = file.metadata.title;
      const source = file.metadata.source;

      if (!title) {
        console.log(chalk.yellow(`    ⚠️ 文件缺少标题: ${file.path}`));
        continue;
      }

      this.stats.filesScanned++;

      // 查找对应的数据库记录
      const content = await query(`
        SELECT id, source FROM contents 
        WHERE title = ? AND content_type_id = ?
      `, [title, this.weeklyContentTypeId]);

      if (content.length > 0) {
        const currentSource = content[0].source;
        
        if (source && source.trim()) {
          // 只更新空的或不同的source
          if (!currentSource || currentSource.trim() === '' || currentSource !== source.trim()) {
            try {
              await execute(`
                UPDATE contents 
                SET source = ? 
                WHERE id = ?
              `, [source.trim(), content[0].id]);

              this.stats.sourcesUpdated++;
              
              if (this.stats.sourcesUpdated <= 10) { // 只显示前10个更新
                console.log(chalk.green(`    ✅ 更新来源: ${title}`));
              }
            } catch (error) {
              console.log(chalk.red(`    ❌ 更新来源失败: ${title} - ${error}`));
            }
          } else {
            this.stats.sourcesAlreadyCorrect++;
          }
        }
      } else {
        this.stats.contentNotFound++;
        console.log(chalk.red(`    ❌ 数据库中未找到内容: ${title}`));
      }

      if (this.stats.filesScanned % 100 === 0) {
        console.log(chalk.cyan(`    处理进度: ${this.stats.filesScanned}/${fileData.length}`));
      }
    }

    console.log(chalk.green(`  ✅ 扫描了 ${this.stats.filesScanned} 个文件`));
    console.log(chalk.green(`  ✅ 更新了 ${this.stats.sourcesUpdated} 条记录的来源信息`));
    
    if (this.stats.sourcesAlreadyCorrect > 0) {
      console.log(chalk.cyan(`  ℹ️ ${this.stats.sourcesAlreadyCorrect} 条记录的来源信息已正确`));
    }
    
    if (this.stats.contentNotFound > 0) {
      console.log(chalk.yellow(`  ⚠️ ${this.stats.contentNotFound} 个内容在数据库中未找到`));
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
    console.log(chalk.blue('\n📊 第三步完成 - 来源信息同步结果统计'));
    console.log(chalk.blue('='.repeat(50)));
    
    console.log(chalk.cyan(`📁 扫描文件: ${this.stats.filesScanned} 个`));
    console.log(chalk.green(`✅ 更新来源: ${this.stats.sourcesUpdated} 条`));
    console.log(chalk.cyan(`ℹ️ 来源已正确: ${this.stats.sourcesAlreadyCorrect} 条`));
    
    if (this.stats.contentNotFound > 0) {
      console.log(chalk.red(`❌ 内容未找到: ${this.stats.contentNotFound} 个`));
    }
    
    console.log(chalk.yellow('\n💡 下一步操作:'));
    console.log('  运行最终检查：npm run check:consistency:basic');
    console.log('  验证所有问题是否已解决');
    
    console.log(chalk.blue('\n' + '='.repeat(50)));
  }
}

/**
 * 主函数
 */
async function main() {
  const step3 = new Step3SyncSources();
  await step3.run();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
} 