#!/usr/bin/env tsx

// 加载环境变量
import { config } from 'dotenv';
config();

import { initDatabase, query, execute } from '../lib/database';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface UnnamedArticle {
    id: number;
    title: string;
    slug: string;
    content: string;
    created_at: Date;
    updated_at: Date;
    content_type: string;
    category: string;
}

interface FileContent {
    path: string;
    title: string;
    content: string;
    frontmatter: any;
}

class UnnamedArticleAnalyzer {
    private unnamedArticles: UnnamedArticle[] = [];
    private fileContents: FileContent[] = [];

    async analyze() {
        console.log('🔍 分析未命名文章...\n');
        
        try {
            initDatabase();
            
            // 获取未命名文章
            await this.getUnnamedArticles();
            
            // 获取所有文件内容
            await this.getAllFileContents();
            
            // 分析每篇未命名文章
            await this.analyzeEachArticle();
            
        } catch (error) {
            console.error('❌ 分析失败:', error);
        }
    }

    private async getUnnamedArticles() {
        const results = await query(`
            SELECT 
                c.id,
                c.title,
                c.slug,
                c.content,
                c.created_at,
                c.updated_at,
                ct.slug as content_type,
                cat.name as category
            FROM contents c
            LEFT JOIN content_types ct ON c.content_type_id = ct.id
            LEFT JOIN categories cat ON c.category_id = cat.id
            WHERE c.title = '未命名文章'
            ORDER BY c.id
        `);
        
        this.unnamedArticles = results as UnnamedArticle[];
        
        console.log(`找到 ${this.unnamedArticles.length} 篇未命名文章\n`);
    }

    private async getAllFileContents() {
        console.log('📁 收集所有文件内容...');
        
        const blogsDir = path.join(process.cwd(), 'blogs');
        this.collectFilesFromDir(blogsDir);
        
        console.log(`收集到 ${this.fileContents.length} 个文件\n`);
    }

    private collectFilesFromDir(dir: string) {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                this.collectFilesFromDir(fullPath);
            } else if (item.endsWith('.mdx') || item.endsWith('.md')) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const { data, content: fileContent } = matter(content);
                    
                    this.fileContents.push({
                        path: fullPath,
                        title: data.title || item.replace(/\.(mdx?|md)$/, ''),
                        content: fileContent,
                        frontmatter: data
                    });
                } catch (error) {
                    console.warn(`⚠️ 解析文件失败: ${fullPath}`);
                }
            }
        }
    }

    private async analyzeEachArticle() {
        for (const [index, article] of this.unnamedArticles.entries()) {
            console.log(`📄 未命名文章 ${index + 1} (ID: ${article.id}):`);
            console.log(`  分类: ${article.category}`);
            console.log(`  创建时间: ${article.created_at}`);
            console.log(`  更新时间: ${article.updated_at}`);
            console.log(`  内容长度: ${article.content.length} 字符`);
            console.log(`  内容预览: ${article.content.substring(0, 200)}...`);
            
            // 查找匹配的文件
            const matchedFile = this.findMatchingFile(article);
            
            if (matchedFile) {
                console.log(`\n🎯 找到匹配的文件:`);
                console.log(`  文件路径: ${matchedFile.path}`);
                console.log(`  文件标题: ${matchedFile.title}`);
                
                // 检查是否有已命名的重复文章
                const duplicateArticle = await this.findDuplicateArticle(matchedFile.title, article.id);
                
                if (duplicateArticle) {
                    console.log(`\n❌ 发现重复文章:`);
                    console.log(`  已命名文章ID: ${duplicateArticle.id}`);
                    console.log(`  已命名文章标题: ${duplicateArticle.title}`);
                    console.log(`\n🗑️ 建议删除未命名文章 (ID: ${article.id})`);
                    
                    await this.deleteUnnamedArticle(article.id);
                } else {
                    console.log(`\n✅ 未发现重复，建议更新标题为: ${matchedFile.title}`);
                    await this.updateArticleTitle(article.id, matchedFile.title, matchedFile.frontmatter.slug);
                }
            } else {
                console.log(`\n❓ 未找到匹配的文件，可能是孤立数据`);
                console.log(`\n🔍 内容分析:`);
                console.log(`  ${article.content.substring(0, 500)}...`);
            }
            
            console.log('─'.repeat(80));
        }
    }

    private findMatchingFile(article: UnnamedArticle): FileContent | null {
        // 通过内容相似度匹配
        const articleContent = article.content.replace(/\s+/g, ' ').trim();
        
        for (const file of this.fileContents) {
            const fileContent = file.content.replace(/\s+/g, ' ').trim();
            
            // 计算内容相似度
            const similarity = this.calculateSimilarity(articleContent, fileContent);
            
            if (similarity > 0.8) { // 80% 相似度
                return file;
            }
        }
        
        return null;
    }

    private calculateSimilarity(str1: string, str2: string): number {
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0 && len2 === 0) return 1;
        if (len1 === 0 || len2 === 0) return 0;
        
        // 简单的相似度计算：比较前1000字符
        const sample1 = str1.substring(0, 1000);
        const sample2 = str2.substring(0, 1000);
        
        let matches = 0;
        const minLen = Math.min(sample1.length, sample2.length);
        
        for (let i = 0; i < minLen; i++) {
            if (sample1[i] === sample2[i]) {
                matches++;
            }
        }
        
        return matches / Math.max(sample1.length, sample2.length);
    }

    private async findDuplicateArticle(title: string, excludeId: number) {
        const duplicates = await query(`
            SELECT id, title
            FROM contents 
            WHERE title = ? AND id != ?
        `, [title, excludeId]);
        
        return duplicates.length > 0 ? duplicates[0] : null;
    }

    private async deleteUnnamedArticle(articleId: number) {
        try {
            // 删除关联的标签
            await execute('DELETE FROM content_tags WHERE content_id = ?', [articleId]);
            
            // 删除文章
            await execute('DELETE FROM contents WHERE id = ?', [articleId]);
            
            console.log(`✅ 已删除未命名文章 (ID: ${articleId})`);
        } catch (error) {
            console.error(`❌ 删除失败 (ID: ${articleId}):`, error);
        }
    }

    private async updateArticleTitle(articleId: number, newTitle: string, slug?: string) {
        try {
            const updateData: any = { title: newTitle };
            
            if (slug) {
                updateData.slug = slug;
            } else {
                // 生成slug
                updateData.slug = newTitle.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w\-]/g, '');
            }
            
            await execute(
                'UPDATE contents SET title = ?, slug = ? WHERE id = ?',
                [updateData.title, updateData.slug, articleId]
            );
            
            console.log(`✅ 已更新文章标题 (ID: ${articleId}) -> ${newTitle}`);
        } catch (error) {
            console.error(`❌ 更新失败 (ID: ${articleId}):`, error);
        }
    }
}

// 主函数
async function main() {
    const analyzer = new UnnamedArticleAnalyzer();
    await analyzer.analyze();
}

if (require.main === module) {
    main().catch(console.error);
}

export default UnnamedArticleAnalyzer; 