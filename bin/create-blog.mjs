#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function createNewBlogFile(title) {
    // 获取当前年份作为目录名
    const year = new Date().getFullYear();
    const blogDir = path.join(projectRoot, 'blogs', year.toString());
    
    // 确保目录存在
    if (!fs.existsSync(blogDir)) {
        fs.mkdirSync(blogDir, { recursive: true });
    }
    
    // 获取目录中的文件数量，用于生成新的文件名
    const files = fs.readdirSync(blogDir);
    const nextNumber = (files.length + 1).toString().padStart(2, '0');
    
    // 生成 slug
    const slug = title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '') // 移除特殊字符
        .replace(/\s+/g, '-') // 空格替换为连字符
        .replace(/-+/g, '-'); // 多个连字符替换为单个
    
    // 读取博客模板
    const templatePath = path.join(projectRoot, 'templates', 'blog.mdx');
    let content = fs.readFileSync(templatePath, 'utf8');
    
    // 替换模板中的占位符
    const today = new Date().toISOString().split('T')[0];
    content = content
        .replace(/{{title}}/g, title)
        .replace(/{{date}}/g, today)
        .replace(/{{slug}}/g, slug);
    
    // 生成新文件名 (使用 slug 作为文件名的一部分)
    const fileName = `${nextNumber}-${slug}.mdx`;
    const filePath = path.join(blogDir, fileName);
    
    try {
        // 写入文件
        fs.writeFileSync(filePath, content);
        console.log('\x1b[32m%s\x1b[0m', `✓ Created new blog post: ${filePath}`);
        
        // 输出一些有用的信息
        console.log('\nBlog post details:');
        console.log('Title:', title);
        console.log('Slug:', slug);
        console.log('Date:', today);
        console.log('\nYou can now edit your blog post at:');
        console.log('\x1b[36m%s\x1b[0m', filePath);
    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', '✗ Error creating blog post:');
        console.error(error);
        process.exit(1);
    }
}

function validateTitle(title) {
    if (!title) {
        console.error('\x1b[31m%s\x1b[0m', '✗ Error: Title is required');
        console.error('Usage: create-blog <title>');
        process.exit(1);
    }
    
    if (title.length < 2) {
        console.error('\x1b[31m%s\x1b[0m', '✗ Error: Title is too short');
        process.exit(1);
    }
    
    if (title.length > 100) {
        console.error('\x1b[31m%s\x1b[0m', '✗ Error: Title is too long (max 100 characters)');
        process.exit(1);
    }
}

// 主函数
function main() {
    // 从命令行参数获取标题
    const title = process.argv.slice(2).join(' ');
    
    // 验证标题
    validateTitle(title);
    
    // 创建博客文件
    createNewBlogFile(title);
}

// 运行主函数
main();