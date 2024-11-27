import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';

// 获取文件的最后更新时间
export function getLastUpdatedTime(filePath: string) {
    try {
        const stats = fs.statSync(filePath);
        return stats.mtime.toISOString();
    } catch (error) {
        return new Date().toISOString();
    }
}

export function handleFile(filePath: string) {
    if (path.extname(filePath) === '.mdx') {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const {data} = matter(fileContent);
        return {
            metadata: {
                ...data,
                tags: data?.tags?.sort() ?? [],
                contentId: path.basename(filePath, '.mdx').replace('.', '-'),
                lastUpdated: getLastUpdatedTime(filePath)
            },
            content: fileContent
        };
    }
    return null;
}

export function handleDir(dirPath: string) {
    const content: any[] = [];
    const items = fs.readdirSync(dirPath);

    items.forEach((item) => {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            content.push(...handleDir(fullPath));
        } else {
            const fileContent = handleFile(fullPath);
            if (fileContent) {
                content.push(fileContent);
            }
        }
    });

    return content;
}
