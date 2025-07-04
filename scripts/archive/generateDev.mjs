import {execSync} from 'child_process';
import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';

const contentDir = path.join(process.cwd(), 'sections');

// 修改数据存储方式
let contentCache = null;
let tagGroupCache = null;

// 获取文件的最后 Git 更新时间
function getGitLastUpdatedTime(filePath) {
    try {
        const output = execSync(`git log -1 --pretty="format:%ci" ${filePath}`).toString().trim();
        return new Date(output).toISOString();
    } catch (error) {
        return new Date().toISOString();
    }
}

function handleFile(filePath, content) {
    if (path.extname(filePath) === '.mdx') {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContent);
        content.push({
            metadata: {
                ...data,
                tags: data.tags.sort(),
                contentId: path.basename(filePath, '.mdx').replace('.', '-'),
                lastUpdated: getGitLastUpdatedTime(filePath)
            },
            content: fileContent
        });
    }
}

function handleDir(dirPath, content) {
    const items = fs.readdirSync(dirPath);
    items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            handleDir(fullPath, content);
        } else {
            handleFile(fullPath, content);
        }
    });
}

function generateTagGroup(content) {
    const tagMap = new Map();
    
    content.forEach(item => {
        item.metadata.tags.forEach(tag => {
            if (!tagMap.has(tag)) {
                tagMap.set(tag, 0);
            }
            tagMap.set(tag, tagMap.get(tag) + 1);
        });
    });
    
    return Array.from(tagMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({ tag, count }));
}

export function getContent() {
    if (!contentCache) {
        const content = [];
        handleDir(contentDir, content);
        contentCache = content;
        tagGroupCache = generateTagGroup(content);
    }
    return { content: contentCache, tagGroup: tagGroupCache };
}

// 提供清除缓存的方法
export function clearCache() {
    contentCache = null;
    tagGroupCache = null;
} 