#!/usr/bin/env tsx

// 加载环境变量
import { config } from 'dotenv';
config();

import { initDatabase, query } from '../lib/database';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

class FileSyncTool {
    constructor() {
        initDatabase();
    }

    async syncNewFiles() {
        console.log('🔄 同步新文件到数据库...\n');

        try {
            // 获取数据库中现有的文件
            const existingContents = await query(`
                SELECT title, slug FROM contents
            `);

            const existingTitles = new Set(existingContents.map((c: any) => c.title));
            const existingSlugs = new Set(existingContents.map((c: any) => c.slug));

            // 扫描文件系统中的新文件
            const newFiles = await this.findNewFiles(existingTitles, existingSlugs);

            if (newFiles.length === 0) {
                console.log('✅ 没有发现新文件');
                return;
            }

            console.log(`📁 发现 ${newFiles.length} 个新文件:`);
            newFiles.forEach((file, index) => {
                console.log(`  ${index + 1}. ${file.title} (${file.path})`);
            });

            console.log('\n🚀 开始同步...');
            
            // 运行增量迁移
            const { spawn } = require('child_process');
            const migrationProcess = spawn('npm', ['run', 'migrate:mysql'], {
                stdio: 'inherit',
                shell: true
            });

            migrationProcess.on('close', (code: number) => {
                if (code === 0) {
                    console.log('\n✅ 文件同步完成！');
                } else {
                    console.error('\n❌ 同步过程中出现错误');
                }
            });

        } catch (error) {
            console.error('❌ 同步失败:', error);
        }
    }

    private async findNewFiles(existingTitles: Set<string>, existingSlugs: Set<string>) {
        const newFiles: Array<{title: string, path: string}> = [];

        // 扫描博客文件
        const blogsDir = path.join(process.cwd(), 'blogs');
        this.scanDirectory(blogsDir, existingTitles, existingSlugs, newFiles);

        // 扫描周刊文件
        const sectionsDir = path.join(process.cwd(), 'sections');
        this.scanDirectory(sectionsDir, existingTitles, existingSlugs, newFiles);

        return newFiles;
    }

    private scanDirectory(
        dir: string, 
        existingTitles: Set<string>, 
        existingSlugs: Set<string>, 
        newFiles: Array<{title: string, path: string}>
    ) {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                this.scanDirectory(fullPath, existingTitles, existingSlugs, newFiles);
            } else if (item.endsWith('.mdx') || item.endsWith('.md')) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const { data } = matter(content);

                    const title = data.title || item.replace(/\.(mdx?|md)$/, '');
                    const slug = data.slug || this.generateSlug(title);

                    // 检查是否为新文件
                    if (!existingTitles.has(title) && !existingSlugs.has(slug)) {
                        newFiles.push({
                            title,
                            path: fullPath
                        });
                    }
                } catch (error) {
                    console.warn(`⚠️ 解析文件失败: ${fullPath}`);
                }
            }
        }
    }

    private generateSlug(title: string): string {
        return title.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-\u4e00-\u9fa5]/g, '')
            .substring(0, 100);
    }
}

// 主函数
async function main() {
    const syncTool = new FileSyncTool();
    await syncTool.syncNewFiles();
}

if (require.main === module) {
    main().catch(console.error);
}

export default FileSyncTool; 