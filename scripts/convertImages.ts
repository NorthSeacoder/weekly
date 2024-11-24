import colors from 'ansi-colors';
import cliProgress from 'cli-progress';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {uploadImage} from './upload';

const SECTIONS_DIR = path.join(process.cwd(), 'sections');
const BACKUP_DIR = path.join(process.cwd(), 'backups', 'sections');
const MAX_CONCURRENT = 10;
const MAX_RETRIES = 3;

/**
 * 重试函数包装器
 */
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i === retries - 1) break;

            const delay = Math.pow(2, i) * 1000; // 指数退避
            console.warn(`重试 ${i + 1}/${retries}, 等待 ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

/**
 * 备份文件
 */
function backupFile(filePath: string) {
    const relativePath = path.relative(SECTIONS_DIR, filePath);
    const backupPath = path.join(BACKUP_DIR, relativePath);

    // 创建备份目录
    fs.mkdirSync(path.dirname(backupPath), {recursive: true});

    // 复制文件
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
}

/**
 * 将 PNG 转换为 WebP
 */
async function convertToWebp(pngPath: string): Promise<Buffer> {
    return withRetry(async () => {
        try {
            return await sharp(pngPath).webp({quality: 80}).toBuffer();
        } catch (error) {
            console.error(`转换图片失败: ${pngPath}`, error);
            throw error;
        }
    });
}

/**
 * 处理单个 MDX 文件
 */
async function processMdxFile(mdxPath: string) {
    try {
        // 备份原文件
        const backupPath = backupFile(mdxPath);
        console.log(`已备份文件: ${path.relative(process.cwd(), backupPath)}`);

        let content = fs.readFileSync(mdxPath, 'utf-8');
        const imgRegex = /!\[.*?\]\((\/sections\/.*?\.png)\)/g;
        const matches = Array.from(content.matchAll(imgRegex));

        if (matches.length === 0) {
            return {
                processed: 0,
                failed: 0
            };
        }

        let processed = 0;
        let failed = 0;

        for (const match of matches) {
            try {
                const imgPath = match[1];
                const fullImgPath = path.join(process.cwd(), 'public', imgPath);

                if (!fs.existsSync(fullImgPath)) {
                    console.warn(`图片不存在: ${fullImgPath}`);
                    failed++;
                    continue;
                }

                await withRetry(async () => {
                    // 转换为 WebP
                    const webpBuffer = await convertToWebp(fullImgPath);

                    // 创建临时文件
                    const tempWebpPath = fullImgPath.replace('.png', '.webp');
                    fs.writeFileSync(tempWebpPath, webpBuffer);

                    // 上传到图床
                    const {markdown} = await uploadImage(tempWebpPath);

                    // 替换 MDX 中的引用
                    content = content.replace(match[0], markdown);

                    // 清理临时文件
                    fs.unlinkSync(tempWebpPath);
                    processed++;
                });
            } catch (error) {
                console.error(`处理图片失败: ${match[1]}`, error);
                failed++;
            }
        }

        // 保存更新后的 MDX 文件
        fs.writeFileSync(mdxPath, content);

        return {
            processed,
            failed
        };
    } catch (error) {
        console.error(`处理文件失败: ${mdxPath}`, error);
        throw error;
    }
}

/**
 * 并发处理文件
 */
async function processFilesInBatch(files: string[], progressBar: cliProgress.SingleBar) {
    const results = [];
    for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
        const batch = files.slice(i, i + MAX_CONCURRENT);
        const batchResults = await Promise.all(
            batch.map(async (file) => {
                try {
                    const result = await processMdxFile(file);
                    progressBar.increment(1);
                    return {file, ...result, success: true};
                } catch (error) {
                    progressBar.increment(1);
                    return {file, processed: 0, failed: 0, success: false, error};
                }
            })
        );
        results.push(...batchResults);
    }
    return results;
}

/**
 * 主函数
 */
async function main() {
    try {
        // 递归获取所有 MDX 文件
        const mdxFiles: string[] = [];
        function findMdxFiles(dir: string) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    findMdxFiles(fullPath);
                } else if (file.endsWith('.mdx')) {
                    mdxFiles.push(fullPath);
                }
            }
        }

        findMdxFiles(SECTIONS_DIR);

        if (mdxFiles.length === 0) {
            console.log('没有找到 MDX 文件');
            return;
        }

        // 创建进度条
        const progressBar = new cliProgress.SingleBar({
            format: 'Progress |' + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Files',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591'
        });

        console.log('开始处理文件...');
        progressBar.start(mdxFiles.length, 0);

        // 处理所有文件
        const results = await processFilesInBatch(mdxFiles, progressBar);

        progressBar.stop();

        // 统计结果
        const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
        const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
        const failedFiles = results.filter((r) => !r.success).length;

        console.log('\n处理完成!');
        console.log(`总文件数: ${mdxFiles.length}`);
        console.log(`成功处理文件: ${mdxFiles.length - failedFiles}`);
        console.log(`处理失败文件: ${failedFiles}`);
        console.log(`成功处理图片: ${totalProcessed}`);
        console.log(`处理失败图片: ${totalFailed}`);

        // 如果有失败的文件,显示详细信息
        if (failedFiles > 0) {
            console.log('\n失败文件列表:');
            results
                .filter((r) => !r.success)
                .forEach((r) => {
                    console.log(`- ${path.relative(process.cwd(), r.file)}`);
                    if (r.error) console.log(`  错误: ${r.error.message}`);
                });
        }
    } catch (error) {
        console.error('处理过程中发生错误:', error);
    }
}

main().catch(console.error);
