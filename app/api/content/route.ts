import {execSync} from 'child_process';
import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';

const contentDir = path.join(process.cwd(), 'sections');

// 获取文件的最后 Git 更新时间
function getGitLastUpdatedTime(filePath: string) {
    try {
        const output = execSync(`git log -1 --pretty="format:%ci" ${filePath}`).toString().trim();
        return new Date(output).toISOString();
    } catch (error) {
        return new Date().toISOString();
    }
}

function handleFile(filePath: string) {
    if (path.extname(filePath) === '.mdx') {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const {data} = matter(fileContent);
        return {
            metadata: {
                ...data,
                tags: data.tags.sort(),
                contentId: path.basename(filePath, '.mdx').replace('.', '-'),
                lastUpdated: getGitLastUpdatedTime(filePath)
            },
            content: fileContent
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

    return content;
}

function generateTagGroup(content: any[]) {
    const tagMap = new Map();

    content.forEach((item) => {
        item.metadata.tags.forEach((tag: string) => {
            if (!tagMap.has(tag)) {
                tagMap.set(tag, 0);
            }
            tagMap.set(tag, tagMap.get(tag) + 1);
        });
    });

    return Array.from(tagMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({tag, count}));
}

export async function GET() {
    try {
        const content = handleDir(contentDir);
        const tagGroup = generateTagGroup(content);

        return Response.json({content, tagGroup});
    } catch (error) {
        console.error('Error generating content:', error);
        return Response.json({error: 'Failed to generate content'}, {status: 500});
    }
}
