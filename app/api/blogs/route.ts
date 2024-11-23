import {execSync} from 'child_process';
import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';

const blogsDir = path.join(process.cwd(), 'blogs');

function handleFile(filePath: string) {
    if (path.extname(filePath) === '.mdx') {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const {data, content} = matter(fileContent);

        // 跳过不可见的博客
        if (data.visible === 'invisible') {
            return null;
        }

        return {
            content: fileContent,
            metadata: {
                ...data,
                lastUpdated: getGitLastUpdatedTime(filePath)
            }
        };
    }
    return null;
}

function handleDir(dirPath: string) {
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

    // 按日期排序，最新的在前面
    return content.sort((a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime());
}

function getGitLastUpdatedTime(filePath: string) {
    try {
        const output = execSync(`git log -1 --pretty="format:%ci" ${filePath}`).toString().trim();
        return new Date(output).toISOString();
    } catch (error) {
        return new Date().toISOString();
    }
}

export async function GET() {
    try {
        const content = handleDir(blogsDir);
        return Response.json({content});
    } catch (error) {
        console.error('Error in blogs API:', error);
        return Response.json({
            error: 'Internal Server Error',
            content: []
        });
    }
}
