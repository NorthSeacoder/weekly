#!/usr/bin/env node

import path from 'path';
import {fileURLToPath} from 'url';
import {createNewWeeklyFile} from '../scripts/createWeekly.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 从命令行参数获取月份、标题和模板
const args = process.argv.slice(2);
let month, title, tpl = 'common'; // 默认模板为 common

if (args.length === 1) {
  // 只提供了标题
  title = args[0];
} else if (args.length === 2) {
  // 可能是 (月份, 标题) 或 (标题, 模板)
  if (args[0].match(/^\d{4}-\d{2}$/)) {
    [month, title] = args;
  } else {
    [title, tpl] = args;
  }
} else if (args.length === 3) {
  // 提供了月份、标题和模板
  [month, title, tpl] = args;
} else {
  console.error('Usage: create-weekly [YYYY-MM] <title> [template]');
  process.exit(1);
}

if (!title) {
  console.error('Error: Title is required');
  console.error('Usage: create-weekly [YYYY-MM] <title> [template]');
  process.exit(1);
}

createNewWeeklyFile(projectRoot, month, title, tpl);
