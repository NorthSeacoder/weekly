import {execSync} from 'child_process';
import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';

const sectionsDir = path.join(process.cwd(), 'sections');
const outputFile = path.join(process.cwd(), 'public/data/metadata.json');
// 获取文件的最后 Git 更新时间
function getGitLastUpdatedTime(filePath) {
    try {
        const output = execSync(`git log -1 --pretty="format:%ci" ${filePath}`).toString().trim();
        return new Date(output).toISOString();
    } catch (error) {
        // console.error(`Error getting Git last updated time for file ${filePath}:`, error);
        return new Date().toISOString(); // 如果出错，返回当前时间
    }
}

function handleFile(filePath,content) {
    if (path.extname(filePath) === '.mdx') {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const {data} = matter(fileContent);
        content.push({
            ...data,
            tags: data.tags.sort(),
            contentId: path.basename(filePath, '.mdx').replace('.', '-'),
            lastUpdated: getGitLastUpdatedTime(filePath)
        });
    }
}

function handleDir(dirPath, content) {
    const items = fs.readdirSync(dirPath);

    items.forEach((item) => {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
            handleDir(itemPath, content);
        } else if (stats.isFile()) {
            handleFile(itemPath, content);
        }
    });
}

async function generateMetadata() {
    const files = fs.readdirSync(sectionsDir);
    const content = [];
    handleDir(sectionsDir, content);

    fs.writeFileSync(outputFile, JSON.stringify(content, null, 2));
    console.log('Metadata JSON generated successfully.');
}

generateMetadata();
