import fs from 'fs';
import path from 'path';

export function createNewWeeklyFile(projectRoot, month, title, tpl = 'common') {
  // 如果没有提供月份，使用当前月份
  if (!month) {
    const now = new Date();
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

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

  // 生成新文件名
  const fileName = `${nextNumber.toString().padStart(3, '0')}.${title}.mdx`;
  const newFilePath = path.join(sectionDir, fileName);

  // 读取模板文件内容
  let content = fs.readFileSync(templatePath, 'utf8');

  // 替换日期和标题占位符
  const today = new Date().toISOString().split('T')[0];
  content = content.replace(/date:\s*\d{4}-\d{2}-\d{2}/, `date: ${today}`);
  content = content.replace(/{{title}}/g, title);

  // 写入新文件
  fs.writeFileSync(newFilePath, content);

  console.log(`Created new weekly file: ${newFilePath}`);
  console.log(`Using template: ${tpl}`);
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
