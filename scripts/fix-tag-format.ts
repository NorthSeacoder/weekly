/**
 * 标签格式修复脚本
 * 将文件中的 tags: [[tag1, tag2, tag3]] 格式修复为 tags: [tag1, tag2, tag3]
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

class TagFormatFixer {
  private sectionsDir: string;
  private stats = {
    filesScanned: 0,
    filesFixed: 0,
    tagsFixed: 0
  };

  constructor() {
    this.sectionsDir = path.join(process.cwd(), 'sections');
  }

  async run(): Promise<void> {
    console.log(chalk.blue('🔧 修复文件中的标签格式...\n'));

    try {
      await this.scanAndFixFiles();
      this.showResults();
    } catch (error) {
      console.error(chalk.red('❌ 修复过程中出现错误:'), error);
      process.exit(1);
    }
  }

  /**
   * 扫描并修复所有文件
   */
  private async scanAndFixFiles(): Promise<void> {
    console.log(chalk.yellow('📁 扫描sections文件夹...'));
    
    const files = this.scanMdxFiles(this.sectionsDir);
    console.log(`  发现 ${files.length} 个MDX文件`);

    for (const filePath of files) {
      await this.fixFileTagFormat(filePath);
      this.stats.filesScanned++;
      
      if (this.stats.filesScanned % 100 === 0) {
        console.log(`    扫描进度: ${this.stats.filesScanned}/${files.length}`);
      }
    }
  }

  /**
   * 修复单个文件的标签格式
   */
  private async fixFileTagFormat(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 检查是否包含双重数组格式的标签
      const doubleArrayPattern = /tags:\s*\[\[([^\]]+)\]\]/g;
      
      if (doubleArrayPattern.test(content)) {
        // 重置正则表达式的lastIndex
        doubleArrayPattern.lastIndex = 0;
        
        // 替换双重数组格式为单一数组格式
        const fixedContent = content.replace(doubleArrayPattern, (match, tagList) => {
          this.stats.tagsFixed++;
          return `tags: [${tagList}]`;
        });

        // 写回文件
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        this.stats.filesFixed++;
        
        const relativePath = path.relative(process.cwd(), filePath);
        console.log(chalk.green(`  ✅ 修复: ${relativePath}`));
      }
    } catch (error) {
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(chalk.red(`  ❌ 处理失败: ${relativePath} - ${error}`));
    }
  }

  /**
   * 扫描MDX文件
   */
  private scanMdxFiles(dir: string): string[] {
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

  /**
   * 显示修复结果
   */
  private showResults(): void {
    console.log(chalk.blue('\n📊 标签格式修复结果统计'));
    console.log(chalk.blue('='.repeat(50)));
    
    console.log(chalk.cyan(`📁 扫描文件: ${this.stats.filesScanned} 个`));
    console.log(chalk.green(`✅ 修复文件: ${this.stats.filesFixed} 个`));
    console.log(chalk.green(`🏷️ 修复标签: ${this.stats.tagsFixed} 处`));
    
    if (this.stats.filesFixed > 0) {
      console.log(chalk.yellow('\n💡 建议执行后续操作:'));
      console.log('  1. 重新同步数据库标签: npm run fix:tags');
      console.log('  2. 运行一致性检查验证: npm run check:consistency:full');
      console.log('  3. 检查文件格式是否正确');
    } else {
      console.log(chalk.green('\n🎉 所有文件的标签格式都已正确！'));
    }
    
    console.log(chalk.blue('\n' + '='.repeat(50)));
  }
}

/**
 * 主函数
 */
async function main() {
  const fixer = new TagFormatFixer();
  await fixer.run();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
} 