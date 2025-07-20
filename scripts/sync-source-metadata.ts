/**
 * 同步来源信息脚本
 * 将文件中的source信息同步到数据库
 */

import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { initDatabase, query, execute } from '../lib/database';
import { handleFile } from '../lib/file';

async function syncSourceMetadata() {
  console.log(chalk.blue('📝 同步来源信息到数据库...\n'));

  try {
    initDatabase();

    // 获取周刊内容类型ID
    const contentTypes = await query(`SELECT id FROM content_types WHERE slug = 'weekly'`);
    if (contentTypes.length === 0) {
      throw new Error('未找到周刊内容类型');
    }
    const weeklyContentTypeId = contentTypes[0].id;

    // 扫描所有MDX文件
    const sectionsDir = path.join(process.cwd(), 'sections');
    const files = scanMdxFiles(sectionsDir);

    let updatedCount = 0;
    let processedCount = 0;

    for (const filePath of files) {
      try {
        const fileResult = handleFile(filePath);
        if (!fileResult) continue;

        const metadata = fileResult.metadata as any;
        const title = metadata.title;
        const source = metadata.source;
        if (!source || !source.trim()) continue;

        // 查找对应的数据库记录
        const content = await query(`
          SELECT id, source FROM contents 
          WHERE title = ? AND content_type_id = ?
        `, [title, weeklyContentTypeId]);

        if (content.length > 0) {
          const currentSource = content[0].source;
          
          // 只更新空的或不同的source
          if (!currentSource || currentSource.trim() === '' || currentSource !== source.trim()) {
            await execute(`
              UPDATE contents 
              SET source = ? 
              WHERE id = ?
            `, [source.trim(), content[0].id]);

            updatedCount++;
            console.log(chalk.green(`  ✅ 更新来源: ${title}`));
          }
        }

        processedCount++;
        if (processedCount % 100 === 0) {
          console.log(chalk.cyan(`    处理进度: ${processedCount}/${files.length}`));
        }

      } catch (error) {
        console.log(chalk.yellow(`    ⚠️ 处理文件失败: ${filePath} - ${error}`));
      }
    }

    console.log(chalk.blue('\n📊 同步结果统计'));
    console.log(chalk.blue('='.repeat(40)));
    console.log(chalk.green(`✅ 处理文件: ${processedCount} 个`));
    console.log(chalk.green(`✅ 更新记录: ${updatedCount} 条`));
    console.log(chalk.cyan(`\n🎉 来源信息同步完成！`));

  } catch (error) {
    console.error(chalk.red('❌ 同步过程中出现错误:'), error);
  }
}

/**
 * 扫描MDX文件
 */
function scanMdxFiles(dir: string): string[] {
  const files: string[] = [];

  const scanDirectory = (currentDir: string): void => {
    if (!fs.existsSync(currentDir)) return;

    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }
  };

  scanDirectory(dir);
  return files;
}

if (require.main === module) {
  syncSourceMetadata().catch(console.error);
} 