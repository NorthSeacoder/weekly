/**
 * 内容标签一致性检查脚本
 * 用于检查 sections/ 目录中的 MDX 文件与数据库中内容标签的一致性
 */

import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { initDatabase, query } from '../lib/database';
import { ContentService, TagService } from '../lib/database-service';
import { handleFile } from '../lib/file';

// 检查级别类型定义
type CheckLevel = 'basic' | 'tags' | 'full';

// 检查结果接口
interface CheckResult {
  level: CheckLevel;
  summary: {
    totalFiles: number;
    totalDbRecords: number;
    matchedItems: number;
    issues: number;
  };
  issues: Array<{
    type: 'missing_file' | 'missing_db' | 'tag_mismatch' | 'similar_tag' | 'metadata_diff';
    severity: 'error' | 'warning' | 'info';
    description: string;
    file?: string;
    dbRecord?: any;
    suggestions?: string[];
  }>;
}

// CLI 参数接口
interface CliArgs {
  level: CheckLevel;
  export?: string;
  suggestFixes: boolean;
  autoFix: boolean;
  verbose: boolean;
}

/**
 * 内容标签一致性检查器类
 */
class ContentTagConsistencyChecker {
  private sectionsDir: string;
  private weeklyContentTypeId: number | null = null;

  constructor() {
    this.sectionsDir = path.join(process.cwd(), 'sections');
    // 初始化数据库连接
    initDatabase();
  }

  /**
   * 主执行方法
   */
  async run(args: CliArgs): Promise<void> {
    console.log(chalk.blue('🔍 开始内容标签一致性检查...\n'));

    try {
      // 获取周刊内容类型ID
      await this.initializeContentTypeId();

      let result: CheckResult;

      // 根据级别执行不同的检查
      switch (args.level) {
        case 'basic':
          result = await this.basicCheck();
          break;
        case 'tags':
          result = await this.tagCheck();
          break;
        case 'full':
          result = await this.integrityCheck();
          break;
        default:
          throw new Error(`不支持的检查级别: ${args.level}`);
      }

      // 生成并显示报告
      this.generateReport(result, args);

      // 导出报告
      if (args.export) {
        this.exportReport(result, args.export);
      }

    } catch (error) {
      console.error(chalk.red('❌ 检查过程中出现错误:'), error);
      process.exit(1);
    }
  }

  /**
   * 初始化周刊内容类型ID
   */
  private async initializeContentTypeId(): Promise<void> {
    const contentTypes = await query(`SELECT id FROM content_types WHERE slug = 'weekly'`);
    if (contentTypes.length === 0) {
      throw new Error('未找到周刊内容类型，请确保数据库已正确初始化');
    }
    this.weeklyContentTypeId = contentTypes[0].id;
  }

  /**
   * 扫描 sections 目录下的所有 MDX 文件
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
            console.warn(chalk.yellow(`⚠️ 解析文件失败: ${fullPath} - ${error}`));
          }
        }
      }
    };

    scanDirectory(this.sectionsDir);
    return files;
  }

  /**
   * 计算两个字符串的相似度（使用编辑距离算法）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    // Levenshtein 距离算法
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    // 初始化矩阵
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [];
      matrix[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // 填充矩阵
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // 删除
          matrix[i][j - 1] + 1,      // 插入
          matrix[i - 1][j - 1] + cost // 替换
        );
      }
    }

    // 计算相似度
    const maxLength = Math.max(len1, len2);
    const distance = matrix[len1][len2];
    return (maxLength - distance) / maxLength;
  }

  /**
   * 基础检查：验证文件与数据库记录的基本对应关系
   */
  private async basicCheck(): Promise<CheckResult> {
    console.log(chalk.yellow('📋 执行基础检查...'));
    
    const result: CheckResult = {
      level: 'basic',
      summary: { totalFiles: 0, totalDbRecords: 0, matchedItems: 0, issues: 0 },
      issues: []
    };

    try {
      // 获取所有文件数据
      const fileData = await this.scanSectionFiles();
      result.summary.totalFiles = fileData.length;

      // 获取数据库中的周刊内容
      const dbContents = await query(`
        SELECT id, title, slug, category_id, created_at, content
        FROM contents 
        WHERE content_type_id = ?
      `, [this.weeklyContentTypeId]);
      result.summary.totalDbRecords = dbContents.length;

      console.log(`  📁 发现 ${fileData.length} 个文件`);
      console.log(`  💾 数据库中有 ${dbContents.length} 条记录`);

      // 使用改进的匹配策略
      const matchResults = this.matchFilesWithDatabase(fileData, dbContents);
      
      result.summary.matchedItems = matchResults.matched.length;

      // 处理未匹配的文件
      for (const file of matchResults.unmatchedFiles) {
        result.issues.push({
          type: 'missing_db',
          severity: 'error',
          description: `文件存在但数据库中缺少对应记录`,
          file: file.path,
          suggestions: [`运行数据同步命令: npm run migrate:mysql`, `检查文件标题格式`, `检查文件路径结构`]
        });
      }

      // 处理未匹配的数据库记录
      for (const record of matchResults.unmatchedDbRecords) {
        result.issues.push({
          type: 'missing_file',
          severity: 'warning',
          description: `数据库记录存在但找不到对应文件`,
          dbRecord: { id: record.id, title: record.title, slug: record.slug },
          suggestions: [`检查文件是否被删除`, `检查文件名称是否正确`, `检查sections目录结构`]
        });
      }

      // 验证匹配项的基本元数据一致性
      for (const match of matchResults.matched) {
        this.validateBasicMetadata(match.file, match.dbRecord, result);
      }

      result.summary.issues = result.issues.length;

      console.log(`  ✅ 成功匹配 ${result.summary.matchedItems} 项`);
      console.log(`  ⚠️  发现 ${result.summary.issues} 个问题`);

      // 显示匹配策略统计
      console.log(`  📊 匹配策略统计:`);
      console.log(`    - 标题完全匹配: ${matchResults.stats.exactTitleMatches} 项`);
      console.log(`    - 路径推断匹配: ${matchResults.stats.pathInferredMatches} 项`);
      console.log(`    - 内容相似匹配: ${matchResults.stats.contentSimilarMatches} 项`);

    } catch (error) {
      console.error(chalk.red('基础检查过程中出现错误:'), error);
      result.issues.push({
        type: 'metadata_diff',
        severity: 'error',
        description: `检查过程出现错误: ${error}`,
        suggestions: [`检查数据库连接`, `检查文件权限`]
      });
    }

    return result;
  }

  /**
   * 改进的文件与数据库记录匹配策略
   */
  private matchFilesWithDatabase(fileData: any[], dbContents: any[]): {
    matched: Array<{file: any, dbRecord: any, matchType: string}>;
    unmatchedFiles: any[];
    unmatchedDbRecords: any[];
    stats: {
      exactTitleMatches: number;
      pathInferredMatches: number;
      contentSimilarMatches: number;
    };
  } {
    const matched: Array<{file: any, dbRecord: any, matchType: string}> = [];
    const unmatchedFiles: any[] = [];
    const unmatchedDbRecords = [...dbContents];
    
    const stats = {
      exactTitleMatches: 0,
      pathInferredMatches: 0,
      contentSimilarMatches: 0
    };

    for (const file of fileData) {
      let matchFound = false;
      let bestMatch: {record: any, score: number, type: string} | null = null;

      // 策略1: 标题完全匹配
      for (let i = 0; i < unmatchedDbRecords.length; i++) {
        const record = unmatchedDbRecords[i];
        if (this.normalizeTitle(file.metadata.title) === this.normalizeTitle(record.title)) {
          matched.push({file, dbRecord: record, matchType: 'exact_title'});
          unmatchedDbRecords.splice(i, 1);
          stats.exactTitleMatches++;
          matchFound = true;
          break;
        }
      }

      if (matchFound) continue;

      // 策略2: 基于文件路径推断匹配
      const filePathInfo = this.extractFilePathInfo(file.path);
      for (let i = 0; i < unmatchedDbRecords.length; i++) {
        const record = unmatchedDbRecords[i];
        const pathMatchScore = this.calculatePathMatchScore(filePathInfo, record);
        
        if (pathMatchScore > 0.8) {
          if (!bestMatch || pathMatchScore > bestMatch.score) {
            bestMatch = {record, score: pathMatchScore, type: 'path_inferred'};
          }
        }
      }

      if (bestMatch && bestMatch.type === 'path_inferred') {
        matched.push({file, dbRecord: bestMatch.record, matchType: 'path_inferred'});
        const index = unmatchedDbRecords.indexOf(bestMatch.record);
        unmatchedDbRecords.splice(index, 1);
        stats.pathInferredMatches++;
        matchFound = true;
      }

      if (matchFound) continue;

      // 策略3: 内容相似度匹配（仅针对标题相似度较高的情况）
      for (let i = 0; i < unmatchedDbRecords.length; i++) {
        const record = unmatchedDbRecords[i];
        const titleSimilarity = this.calculateSimilarity(
          this.normalizeTitle(file.metadata.title),
          this.normalizeTitle(record.title)
        );
        
        if (titleSimilarity > 0.85) {
          const contentSimilarity = this.calculateContentSimilarity(file.content, record.content);
          const combinedScore = (titleSimilarity * 0.7) + (contentSimilarity * 0.3);
          
          if (combinedScore > 0.8) {
            if (!bestMatch || combinedScore > bestMatch.score) {
              bestMatch = {record, score: combinedScore, type: 'content_similar'};
            }
          }
        }
      }

      if (bestMatch && bestMatch.type === 'content_similar') {
        matched.push({file, dbRecord: bestMatch.record, matchType: 'content_similar'});
        const index = unmatchedDbRecords.indexOf(bestMatch.record);
        unmatchedDbRecords.splice(index, 1);
        stats.contentSimilarMatches++;
        matchFound = true;
      }

      if (!matchFound) {
        unmatchedFiles.push(file);
      }
    }

    return { matched, unmatchedFiles, unmatchedDbRecords, stats };
  }

  /**
   * 标准化标题用于匹配
   */
  private normalizeTitle(title: string): string {
    return title.trim()
      .replace(/\s+/g, ' ')
      .replace(/[""'']/g, '"')
      .replace(/[（）]/g, '')
      .replace(/[：:]/g, ':');
  }

  /**
   * 提取文件路径信息
   */
  private extractFilePathInfo(filePath: string): {
    year: string;
    month: string;
    number: string;
    name: string;
  } {
    const relativePath = path.relative(this.sectionsDir, filePath);
    const pathParts = relativePath.split('/');
    
    // 解析路径格式: 2025-05/001.example.mdx
    const yearMonth = pathParts[0] || '';
    const fileName = pathParts[1] || '';
    
    const [year, month] = yearMonth.split('-');
    const fileNameMatch = fileName.match(/^(\d+)\.(.+)\.mdx$/);
    
    return {
      year: year || '',
      month: month || '',
      number: fileNameMatch ? fileNameMatch[1] : '',
      name: fileNameMatch ? fileNameMatch[2] : fileName.replace('.mdx', '')
    };
  }

  /**
   * 计算路径匹配得分
   */
  private calculatePathMatchScore(filePathInfo: any, dbRecord: any): number {
    let score = 0;
    
    // 检查日期相关性
    if (dbRecord.created_at) {
      const dbDate = new Date(dbRecord.created_at);
      const dbYear = dbDate.getFullYear().toString();
      const dbMonth = (dbDate.getMonth() + 1).toString().padStart(2, '0');
      
      if (filePathInfo.year === dbYear) score += 0.3;
      if (filePathInfo.month === dbMonth) score += 0.3;
    }
    
    // 检查文件名与slug的关系
    if (dbRecord.slug && filePathInfo.name) {
      const slugSimilarity = this.calculateSimilarity(
        filePathInfo.name.toLowerCase(),
        dbRecord.slug.toLowerCase()
      );
      score += slugSimilarity * 0.4;
    }
    
    return score;
  }

  /**
   * 计算内容相似度（简化版本）
   */
  private calculateContentSimilarity(content1: string, content2: string): number {
    if (!content1 || !content2) return 0;
    
    // 提取主要内容特征进行比较
    const extractFeatures = (content: string) => {
      return content
        .replace(/\s+/g, ' ')
        .replace(/[^\w\u4e00-\u9fa5]/g, '')
        .toLowerCase()
        .substring(0, 200); // 只比较前200个字符
    };
    
    const features1 = extractFeatures(content1);
    const features2 = extractFeatures(content2);
    
    return this.calculateSimilarity(features1, features2);
  }

  /**
   * 验证基本元数据一致性
   */
  private validateBasicMetadata(file: any, dbRecord: any, result: CheckResult): void {
    // 检查日期一致性
    if (file.metadata.date && dbRecord.created_at) {
      const fileDate = new Date(file.metadata.date);
      const dbDate = new Date(dbRecord.created_at);
      const dateDiff = Math.abs(fileDate.getTime() - dbDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (dateDiff > 7) { // 超过7天差异
        result.issues.push({
          type: 'metadata_diff',
          severity: 'warning',
          description: `日期不一致：文件日期${fileDate.toLocaleDateString()}，数据库日期${dbDate.toLocaleDateString()}`,
          file: file.path,
          suggestions: [`检查日期设置`, `同步元数据`]
        });
      }
    }

    // 检查来源信息
    if (file.metadata.source && !dbRecord.source) {
      result.issues.push({
        type: 'metadata_diff',
        severity: 'info',
        description: `文件包含来源信息但数据库中缺失`,
        file: file.path,
        suggestions: [`同步来源信息到数据库`]
      });
    }
  }

  /**
   * 标签检查：深度对比标签一致性
   */
  private async tagCheck(): Promise<CheckResult> {
    console.log(chalk.yellow('🏷️ 执行标签检查...'));
    
    // 先执行基础检查
    const result = await this.basicCheck();
    result.level = 'tags';

    try {
      // 获取所有文件数据
      const fileData = await this.scanSectionFiles();
      
      // 为每个文件检查标签一致性
      for (const file of fileData) {
        const fileTitle = file.metadata.title;
        const fileTags = file.metadata.tags || [];

        // 查找对应的数据库记录
        const dbContent = await query(`
          SELECT id FROM contents 
          WHERE title = ? AND content_type_id = ?
        `, [fileTitle, this.weeklyContentTypeId]);

        if (dbContent.length === 0) {
          // 这个问题已经在基础检查中发现了，跳过
          continue;
        }

        const contentId = dbContent[0].id;

        // 获取数据库中的标签
        const dbTags = await query(`
          SELECT t.name 
          FROM tags t
          JOIN content_tags ct ON t.id = ct.tag_id
          WHERE ct.content_id = ?
        `, [contentId]);

        const dbTagNames = dbTags.map((tag: any) => tag.name);

        // 对比标签
        const missingInDb = fileTags.filter((tag: string) => !dbTagNames.includes(tag));
        const extraInDb = dbTagNames.filter((tag: string) => !fileTags.includes(tag));

        // 检查缺失的标签
        if (missingInDb.length > 0) {
          result.issues.push({
            type: 'tag_mismatch',
            severity: 'error',
            description: `文件中的标签在数据库中缺失: ${missingInDb.join(', ')}`,
            file: file.path,
            suggestions: [`同步标签到数据库`, `检查标签拼写`]
          });
        }

        // 检查多余的标签
        if (extraInDb.length > 0) {
          result.issues.push({
            type: 'tag_mismatch',
            severity: 'warning',
            description: `数据库中存在文件中没有的标签: ${extraInDb.join(', ')}`,
            file: file.path,
            suggestions: [`从数据库删除多余标签`, `检查文件标签是否完整`]
          });
        }

        // 检查相似但不匹配的标签
        for (const fileTag of missingInDb) {
          for (const dbTag of extraInDb) {
            const similarity = this.calculateSimilarity(fileTag, dbTag);
            if (similarity > 0.8) {
              result.issues.push({
                type: 'similar_tag',
                severity: 'info',
                description: `发现相似标签: 文件中的"${fileTag}"与数据库中的"${dbTag}"相似度${(similarity * 100).toFixed(1)}%`,
                file: file.path,
                suggestions: [`检查是否为拼写错误`, `统一标签命名`]
              });
            }
          }
        }
      }

      // 更新问题统计
      result.summary.issues = result.issues.length;

      console.log(`  🏷️ 标签检查完成，发现 ${result.issues.filter(i => i.type.includes('tag')).length} 个标签相关问题`);

    } catch (error) {
      console.error(chalk.red('标签检查过程中出现错误:'), error);
      result.issues.push({
        type: 'tag_mismatch',
        severity: 'error',
        description: `标签检查过程出现错误: ${error}`,
        suggestions: [`检查数据库连接`, `检查标签表结构`]
      });
    }

    return result;
  }

  /**
   * 完整性检查：全面的数据完整性验证
   */
  private async integrityCheck(): Promise<CheckResult> {
    console.log(chalk.yellow('✅ 执行完整性检查...'));
    
    // 先执行标签检查（包含基础检查）
    const result = await this.tagCheck();
    result.level = 'full';

    try {
      console.log('  �� 检查标签使用计数准确性...');
      
      // 检查标签使用计数
      const tagCountIssues = await query(`
        SELECT t.id, t.name, t.count,
               (SELECT COUNT(*) FROM content_tags ct WHERE ct.tag_id = t.id) as actual_count
        FROM tags t
        WHERE t.count != (SELECT COUNT(*) FROM content_tags ct WHERE ct.tag_id = t.id)
      `);

      for (const tag of tagCountIssues) {
        result.issues.push({
          type: 'metadata_diff',
          severity: 'warning',
          description: `标签"${tag.name}"的使用计数不正确：记录为${tag.count}，实际为${tag.actual_count}`,
          suggestions: [`更新标签使用计数`, `重新计算标签统计`]
        });
      }

      console.log('  🔍 检查孤立的标签记录...');
      
      // 检查孤立的标签（没有被任何内容使用）
      const orphanedTags = await query(`
        SELECT t.id, t.name, t.count
        FROM tags t
        LEFT JOIN content_tags ct ON t.id = ct.tag_id
        WHERE ct.tag_id IS NULL AND t.count > 0
      `);

      for (const tag of orphanedTags) {
        result.issues.push({
          type: 'metadata_diff',
          severity: 'info',
          description: `标签"${tag.name}"没有被任何内容使用，但计数为${tag.count}`,
          suggestions: [`删除未使用的标签`, `检查标签关联关系`]
        });
      }

      console.log('  🔍 检查重复标签...');
      
      // 检查名称相似的重复标签
      const allTags = await query(`SELECT id, name FROM tags ORDER BY name`);
      
      for (let i = 0; i < allTags.length; i++) {
        for (let j = i + 1; j < allTags.length; j++) {
          const tag1 = allTags[i];
          const tag2 = allTags[j];
          const similarity = this.calculateSimilarity(tag1.name, tag2.name);
          
          if (similarity > 0.9 && tag1.name !== tag2.name) {
            result.issues.push({
              type: 'similar_tag',
              severity: 'warning',
              description: `发现疑似重复标签："${tag1.name}"和"${tag2.name}"相似度${(similarity * 100).toFixed(1)}%`,
              suggestions: [`合并重复标签`, `统一标签命名规范`]
            });
          }
        }
      }

      console.log('  🔍 检查内容分类一致性...');
      
      // 检查内容分类一致性
      const fileData = await this.scanSectionFiles();
      for (const file of fileData) {
        const fileCategory = file.metadata.category;
        
        // 查找对应的数据库记录
        const dbContent = await query(`
          SELECT c.id, c.category_id, cat.name as category_name
          FROM contents c
          LEFT JOIN categories cat ON c.category_id = cat.id
          WHERE c.title = ? AND c.content_type_id = ?
        `, [file.metadata.title, this.weeklyContentTypeId]);

        if (dbContent.length > 0) {
          const dbCategory = dbContent[0].category_name;
          if (fileCategory !== dbCategory) {
            result.issues.push({
              type: 'metadata_diff',
              severity: 'warning',
              description: `分类不一致：文件中为"${fileCategory}"，数据库中为"${dbCategory || '无'}"`,
              file: file.path,
              suggestions: [`同步分类信息`, `检查分类映射关系`]
            });
          }
        }
      }

      // 更新问题统计
      result.summary.issues = result.issues.length;

      console.log(`  ✅ 完整性检查完成，总计发现 ${result.summary.issues} 个问题`);

    } catch (error) {
      console.error(chalk.red('完整性检查过程中出现错误:'), error);
      result.issues.push({
        type: 'metadata_diff',
        severity: 'error',
        description: `完整性检查过程出现错误: ${error}`,
        suggestions: [`检查数据库连接`, `检查表结构完整性`]
      });
    }

    return result;
  }

  /**
   * 生成并显示报告
   */
  private generateReport(result: CheckResult, args: CliArgs): void {
    console.log(chalk.blue('\n📊 检查报告'));
    console.log(chalk.blue('='.repeat(50)));
    
    // 显示总体统计
    console.log(chalk.white('\n📈 总体统计:'));
    console.log(`  检查级别: ${chalk.cyan(result.level.toUpperCase())}`);
    console.log(`  扫描文件: ${chalk.green(result.summary.totalFiles)} 个`);
    console.log(`  数据库记录: ${chalk.green(result.summary.totalDbRecords)} 条`);
    console.log(`  成功匹配: ${chalk.green(result.summary.matchedItems)} 项`);
    console.log(`  发现问题: ${result.summary.issues > 0 ? chalk.red(result.summary.issues) : chalk.green(result.summary.issues)} 个`);

    if (result.issues.length === 0) {
      console.log(chalk.green('\n🎉 恭喜！未发现任何一致性问题。'));
      return;
    }

    // 按严重程度分类问题
    const errorIssues = result.issues.filter(i => i.severity === 'error');
    const warningIssues = result.issues.filter(i => i.severity === 'warning');
    const infoIssues = result.issues.filter(i => i.severity === 'info');

    // 显示错误问题
    if (errorIssues.length > 0) {
      console.log(chalk.red(`\n❌ 错误问题 (${errorIssues.length} 个):`));
      errorIssues.forEach((issue, index) => {
        console.log(chalk.red(`  ${index + 1}. ${issue.description}`));
        if (issue.file) {
          console.log(chalk.gray(`     文件: ${issue.file}`));
        }
        if (args.suggestFixes && issue.suggestions) {
          console.log(chalk.yellow(`     建议: ${issue.suggestions.join(', ')}`));
        }
      });
    }

    // 显示警告问题
    if (warningIssues.length > 0) {
      console.log(chalk.yellow(`\n⚠️ 警告问题 (${warningIssues.length} 个):`));
      warningIssues.forEach((issue, index) => {
        console.log(chalk.yellow(`  ${index + 1}. ${issue.description}`));
        if (issue.file) {
          console.log(chalk.gray(`     文件: ${issue.file}`));
        }
        if (args.suggestFixes && issue.suggestions) {
          console.log(chalk.blue(`     建议: ${issue.suggestions.join(', ')}`));
        }
      });
    }

    // 显示信息问题
    if (infoIssues.length > 0 && args.verbose) {
      console.log(chalk.blue(`\nℹ️ 信息提示 (${infoIssues.length} 个):`));
      infoIssues.forEach((issue, index) => {
        console.log(chalk.blue(`  ${index + 1}. ${issue.description}`));
        if (issue.file) {
          console.log(chalk.gray(`     文件: ${issue.file}`));
        }
        if (args.suggestFixes && issue.suggestions) {
          console.log(chalk.cyan(`     建议: ${issue.suggestions.join(', ')}`));
        }
      });
    }

    // 问题类型统计
    const issueTypeStats = new Map<string, number>();
    result.issues.forEach(issue => {
      issueTypeStats.set(issue.type, (issueTypeStats.get(issue.type) || 0) + 1);
    });

    if (args.verbose) {
      console.log(chalk.white('\n📋 问题类型统计:'));
      issueTypeStats.forEach((count, type) => {
        const displayName = {
          'missing_file': '缺失文件',
          'missing_db': '缺失数据库记录',
          'tag_mismatch': '标签不匹配',
          'similar_tag': '相似标签',
          'metadata_diff': '元数据差异'
        }[type] || type;
        console.log(`  ${displayName}: ${chalk.cyan(count)} 个`);
      });
    }

    // 显示操作建议
    console.log(chalk.white('\n💡 操作建议:'));
    if (errorIssues.length > 0) {
      console.log(chalk.red('  • 优先处理错误问题，这些可能影响网站正常运行'));
      console.log(chalk.yellow('  • 运行同步命令: npm run migrate:mysql'));
    }
    if (warningIssues.length > 0) {
      console.log(chalk.yellow('  • 检查并修正警告问题，保持数据一致性'));
    }
    if (infoIssues.length > 0) {
      console.log(chalk.blue('  • 信息提示可以帮助优化标签管理'));
      console.log(chalk.gray('  • 使用 --verbose 查看详细信息'));
    }

    console.log(chalk.blue('\n' + '='.repeat(50)));
  }

  /**
   * 导出报告到文件
   */
  private exportReport(result: CheckResult, filename: string): void {
    console.log(chalk.green(`📤 导出报告到: ${filename}`));
    
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        level: result.level,
        summary: result.summary,
        issues: result.issues.map(issue => ({
          ...issue,
          // 简化文件路径显示
          file: issue.file ? path.relative(process.cwd(), issue.file) : undefined
        })),
        statistics: {
          errorCount: result.issues.filter(i => i.severity === 'error').length,
          warningCount: result.issues.filter(i => i.severity === 'warning').length,
          infoCount: result.issues.filter(i => i.severity === 'info').length,
          issueTypes: this.getIssueTypeStats(result.issues)
        }
      };

      // 根据文件扩展名决定导出格式
      const ext = path.extname(filename).toLowerCase();
      
      if (ext === '.json') {
        fs.writeFileSync(filename, JSON.stringify(exportData, null, 2), 'utf8');
      } else if (ext === '.md') {
        const markdownContent = this.generateMarkdownReport(exportData);
        fs.writeFileSync(filename, markdownContent, 'utf8');
      } else {
        // 默认导出为 JSON
        fs.writeFileSync(filename, JSON.stringify(exportData, null, 2), 'utf8');
      }

      console.log(chalk.green(`✅ 报告已导出到: ${filename}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ 导出报告失败: ${error}`));
    }
  }

  /**
   * 获取问题类型统计
   */
  private getIssueTypeStats(issues: CheckResult['issues']): Record<string, number> {
    const stats: Record<string, number> = {};
    issues.forEach(issue => {
      stats[issue.type] = (stats[issue.type] || 0) + 1;
    });
    return stats;
  }

  /**
   * 生成 Markdown 格式的报告
   */
  private generateMarkdownReport(data: any): string {
    const lines: string[] = [];
    
    lines.push('# 内容标签一致性检查报告\n');
    lines.push(`**生成时间**: ${new Date(data.timestamp).toLocaleString('zh-CN')}\n`);
    lines.push(`**检查级别**: ${data.level.toUpperCase()}\n`);
    
    lines.push('## 总体统计\n');
    lines.push(`- 扫描文件: ${data.summary.totalFiles} 个`);
    lines.push(`- 数据库记录: ${data.summary.totalDbRecords} 条`);
    lines.push(`- 成功匹配: ${data.summary.matchedItems} 项`);
    lines.push(`- 发现问题: ${data.summary.issues} 个\n`);
    
    if (data.statistics.errorCount > 0) {
      lines.push('## 错误问题\n');
      const errors = data.issues.filter((i: any) => i.severity === 'error');
      errors.forEach((issue: any, index: number) => {
        lines.push(`${index + 1}. **${issue.description}**`);
        if (issue.file) lines.push(`   - 文件: \`${issue.file}\``);
        if (issue.suggestions) lines.push(`   - 建议: ${issue.suggestions.join(', ')}`);
        lines.push('');
      });
    }
    
    if (data.statistics.warningCount > 0) {
      lines.push('## 警告问题\n');
      const warnings = data.issues.filter((i: any) => i.severity === 'warning');
      warnings.forEach((issue: any, index: number) => {
        lines.push(`${index + 1}. **${issue.description}**`);
        if (issue.file) lines.push(`   - 文件: \`${issue.file}\``);
        if (issue.suggestions) lines.push(`   - 建议: ${issue.suggestions.join(', ')}`);
        lines.push('');
      });
    }
    
    if (data.statistics.infoCount > 0) {
      lines.push('## 信息提示\n');
      const infos = data.issues.filter((i: any) => i.severity === 'info');
      infos.forEach((issue: any, index: number) => {
        lines.push(`${index + 1}. **${issue.description}**`);
        if (issue.file) lines.push(`   - 文件: \`${issue.file}\``);
        if (issue.suggestions) lines.push(`   - 建议: ${issue.suggestions.join(', ')}`);
        lines.push('');
      });
    }
    
    if (Object.keys(data.statistics.issueTypes).length > 0) {
      lines.push('## 问题类型统计\n');
      Object.entries(data.statistics.issueTypes).forEach(([type, count]) => {
        const displayName = {
          'missing_file': '缺失文件',
          'missing_db': '缺失数据库记录',
          'tag_mismatch': '标签不匹配',
          'similar_tag': '相似标签',
          'metadata_diff': '元数据差异'
        }[type] || type;
        lines.push(`- ${displayName}: ${count} 个`);
      });
    }
    
    return lines.join('\n');
  }
}

/**
 * 解析命令行参数
 */
function parseCliArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    level: 'basic',
    suggestFixes: false,
    autoFix: false,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--level' && i + 1 < args.length) {
      const level = args[i + 1] as CheckLevel;
      if (['basic', 'tags', 'full'].includes(level)) {
        result.level = level;
      }
      i++; // 跳过下一个参数
    } else if (arg === '--export' && i + 1 < args.length) {
      result.export = args[i + 1];
      i++;
    } else if (arg === '--suggest-fixes') {
      result.suggestFixes = true;
    } else if (arg === '--auto-fix') {
      result.autoFix = true;
    } else if (arg === '--verbose') {
      result.verbose = true;
    }
  }

  return result;
}

/**
 * 主函数
 */
async function main() {
  const args = parseCliArgs();
  const checker = new ContentTagConsistencyChecker();
  await checker.run(args);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

export { ContentTagConsistencyChecker, type CheckResult, type CliArgs }; 