import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { execSync } from 'child_process';

const contentDir = path.join(process.cwd(), 'sections');
const contentFile = path.join(process.cwd(), 'public/data', 'content.json');
const tagGroupFile = path.join(process.cwd(), 'public/data', 'tagGroup.json');

// 获取文件的最后 Git 更新时间
function getGitLastUpdatedTime(filePath) {
    try {
        const output = execSync(`git log -1 --pretty="format:%ci" ${filePath}`).toString().trim();
        return new Date(output).toISOString();
    } catch (error) {
        console.error(`Error getting Git last updated time for file ${filePath}:`, error);
        return new Date().toISOString(); // 如果出错，返回当前时间
    }
}

function handleFile(filePath, tags, content) {
    if (path.extname(filePath) === '.mdx') {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data, content: fileContentText } = matter(fileContent);
        data.tags.forEach((tag) => tags.add(tag));
        content.push({
            metadata: {
                ...data,
                tags: data.tags.sort(),
                contentId: path.basename(filePath, '.mdx').replace('.', '-'),
                lastUpdated: getGitLastUpdatedTime(filePath),
            },
            content: fileContentText
        });
    }
}

function handleDir(dirPath, tags, content) {
    const items = fs.readdirSync(dirPath);

    items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
            handleDir(itemPath, tags, content);
        } else if (stats.isFile()) {
            handleFile(itemPath, tags, content);
        }
    });
}
function generateContent() {
    const files = fs.readdirSync(contentDir);
    const tags = new Set();
    const content = [];

    handleDir(contentDir, tags, content);

    const tagsArray = Array.from(tags).sort();
    const tagGroup = tagsArray.map((tag) => {
        const contents = content.filter(({metadata}) => metadata.tags.includes(tag));
        return {
            tag,
            contents
        };
    });
    fs.writeFileSync(contentFile, JSON.stringify(content));
    fs.writeFileSync(tagGroupFile, JSON.stringify(tagGroup));
}

generateContent();
