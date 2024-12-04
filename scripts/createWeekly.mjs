import fs from 'fs';
import path from 'path';

function createDemoFiles(projectRoot, demoPath, title) {
  const demoDir = path.join(projectRoot, 'demos', demoPath);
  
  // Create demo directory if it doesn't exist
  if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
  }
  
  // Create demo files
  const files = ['index.html', 'index.css', 'index.js'];
  files.forEach(file => {
    const filePath = path.join(demoDir, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '');
    }
  });

  // Create meta.json with default values
  const metaPath = path.join(demoDir, 'meta.json');
  if (!fs.existsSync(metaPath)) {
    const metaContent = {
      height: 300,
      dependencies: []
    };
    fs.writeFileSync(metaPath, JSON.stringify(metaContent, null, 2));
  }
  
  return path.relative(projectRoot, demoDir);
}

function parseTitleAndPath(title) {
  const parts = title.split('/');
  return {
    displayTitle: parts[parts.length - 1],
    fullPath: title
  };
}

export function createNewWeeklyFile(projectRoot, month, title, tpl = 'common') {
  // 如果没有提供月份，使用当前月份
  if (!month) {
    const now = new Date();
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const { displayTitle, fullPath } = parseTitleAndPath(title);
  const sectionDir = path.join(projectRoot, 'sections', month);
  const templatePath = path.join(projectRoot, 'templates', `${tpl}.mdx`);

  // 检查模板文件是否存在
  if (!fs.existsSync(templatePath)) {
    console.error(`Error: Template '${tpl}' not found.`);
    process.exit(1);
  }

  // 确保目标目录存在
  if (!fs.existsSync(sectionDir)) {
    fs.mkdirSync(sectionDir, { recursive: true });
  }

  // 获取下一个序号
  const nextNumber = getNextNumber(sectionDir);

  // 生成新文件名 - 使用完整路径作为文件名
  const fileName = `${nextNumber.toString().padStart(3, '0')}.${displayTitle}.mdx`;
  const newFilePath = path.join(sectionDir, fileName);

  // 读取模板文件内容
  let content = fs.readFileSync(templatePath, 'utf8');

  // 获取当前日期，格式为 YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  
  // 替换日期和标题占位符
  content = content.replace(/date:\s*\d{4}-\d{2}-\d{2}/, `date: ${today}`);
  content = content.replace(/{{title}}/g, displayTitle);
  content = content.replace(/{{date}}/g, today);

  // 如果是 demo 模板，创建 demo 文件并替换 demoPath
  if (tpl === 'demo') {
    const relativeDemoPath = createDemoFiles(projectRoot, fullPath, displayTitle);
    content = content.replace(/{{demoPath}}/g, fullPath);
  }

  // 写入新文件
  fs.writeFileSync(newFilePath, content);

  console.log(`Created new weekly file: ${newFilePath}`);
  console.log(`Using template: ${tpl}`);
  if (tpl === 'demo') {
    console.log(`Created demo files in: demos/${fullPath}`);
  }
}

function getNextNumber(dir) {
  const files = fs.readdirSync(dir);
  let maxNumber = 0;

  files.forEach(file => {
    const match = file.match(/^(\d+)\./);
    if (match) {
      const number = parseInt(match[1], 10);
      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  });

  return maxNumber + 1;
}
