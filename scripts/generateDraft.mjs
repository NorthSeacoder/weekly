import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import {fileURLToPath} from 'url';
import {AIProcessor} from './ai.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 加载环境变量
dotenv.config({ path: path.join(projectRoot, '.env') });

console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '已设置' : '未设置');

async function takeScreenshot(url, imagePath) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  const page = await browser.newPage();
  
  try {
    // 设置更长的超时时间（2分钟）
    await page.setDefaultNavigationTimeout(120000);
    
    // 设置用户代理
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // 允许加载必要的资源
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['document', 'stylesheet', 'script', 'font', 'xhr', 'fetch'].includes(resourceType)) {
        request.continue();
      } else {
        request.abort();
      }
    });

    // 等待页面加载
    await page.goto(url, {
      waitUntil: ['domcontentloaded', 'networkidle2'],
      timeout: 120000
    });
    
    // 等待页面内容加载
    await page.waitForFunction(() => {
      const element = document.querySelector('article') || document.querySelector('main') || document.body;
      return element && element.innerText.length > 0;
    }, { timeout: 60000 });
    
    // 使用 setTimeout 替代 waitForTimeout
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await page.setViewport({ width: 1200, height: 800 });
    
    // 等待所有字体加载完成
    await page.evaluate(() => document.fonts.ready);
    
    // 确保所有样式都已应用
    await page.evaluate(() => new Promise(resolve => {
      const sheets = document.styleSheets;
      if (sheets.length) resolve();
      else {
        const observer = new MutationObserver((mutations, obs) => {
          if (document.styleSheets.length) {
            obs.disconnect();
            resolve();
          }
        });
        observer.observe(document.head, {
          childList: true,
          subtree: true
        });
      }
    }));
    
    await page.screenshot({ 
      path: imagePath,
      type: 'webp',  // 指定输出格式为 webp
      quality: 80    // webp 质量，范围 0-100
    });
  } catch (error) {
    console.error(`Screenshot failed for ${url}:`, error);
    // 如果失败，尝试只截取可见区域
    try {
      console.log('Attempting fallback screenshot...');
      await page.screenshot({ 
        path: imagePath,
        type: 'webp',
        quality: 80
      });
    } catch (fallbackError) {
      console.error('Fallback screenshot also failed:', fallbackError);
      throw error;
    }
  } finally {
    await browser.close();
  }
}

async function extractPageContent(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps'
    ]
  });
  
  const page = await browser.newPage();
  
  try {
    // 禁用不必要的资源加载
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['document', 'script'].includes(resourceType)) {
        request.continue();
      } else {
        request.abort();
      }
    });

    // 设置更短的超时时间
    await page.setDefaultNavigationTimeout(30000);
    
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // 使用更快的选择器
    const content = await page.evaluate(() => {
      const selectors = [
        'article',
        'main',
        '[role="main"]',
        '.content',
        '#content',
        'body'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.innerText;
        }
      }
      return document.body.innerText;
    });

    const title = await page.title();
    
    return {
      content: content.slice(0, 5000),
      title: title || 'Untitled',
      url
    };
  } catch (error) {
    console.error(`Content extraction failed for ${url}:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function withRetry(fn, retries = 3, initialDelay = 2000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === retries - 1) break;
      
      const delay = initialDelay * Math.pow(2, i); // 指数退避
      console.log(`Attempt ${i + 1} failed, waiting ${delay}ms before retry...`);
      console.error('Error details:', error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

async function processUrl(url, month) {
  try {
    // 1. 创建必要的目录
    const sectionsDir = path.join(projectRoot, 'sections', month);
    const imageDir = path.join(projectRoot, 'public/sections', month);
    fs.mkdirSync(sectionsDir, { recursive: true });
    fs.mkdirSync(imageDir, { recursive: true });

    // 2. 生成文件名
    const nextNumber = getNextNumber(month);
    const paddedNumber = nextNumber.toString().padStart(3, '0');
    const imageName = `${paddedNumber}.webp`;
    const imagePath = path.join(imageDir, imageName);

    // 3. 截图
    console.log(`Processing URL: ${url}`);
    console.log('Taking screenshot...');
    await withRetry(() => takeScreenshot(url, imagePath), 3, 5000);

    // 4. 提取页面内容
    console.log('Extracting page content...');
    const pageData = await withRetry(() => extractPageContent(url), 3, 5000);
    
    // 5. AI 处理内容
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    
    console.log('Starting AI analysis...');
    const aiProcessor = new AIProcessor(apiKey);
    const analysis = await aiProcessor.analyze(pageData.content);
    
    if (!analysis) {
      throw new Error('AI analysis returned undefined');
    }

    // 6. 生成 MDX 内容
    const mdxData = {
      ...pageData,
      ...analysis,
      date: new Date().toISOString().split('T')[0],
      imagePath: imagePath // 添加图片路径
    };
    
    const mdxContent = aiProcessor.generateMDX(mdxData);

    if (!mdxContent) {
      throw new Error('Failed to generate MDX content');
    }

    // 7. 直接写入到 sections 目录
    const mdxPath = path.join(sectionsDir, `${paddedNumber}.mdx`);
    fs.writeFileSync(mdxPath, mdxContent);

    // 8. 从等待列表中移除已处理的 URL
    removeFromWaitList(url);

    console.log(`Successfully processed ${url}`);
    return true;
  } catch (error) {
    console.error(`Failed to process URL: ${url}`);
    console.error('Error details:', error);
    
    // 将失败的 URL 移到失败列表
    const failedListPath = path.join(projectRoot, 'drafts/failed_list.md');
    fs.appendFileSync(failedListPath, `${url}\n`);
    removeFromWaitList(url);
    
    return false;
  }
}

function getNextNumber(month) {
  const sectionsDir = path.join(projectRoot, 'sections', month);
  if (!fs.existsSync(sectionsDir)) {
    return 1;
  }

  const files = fs.readdirSync(sectionsDir);
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

function removeFromWaitList(url) {
  const waitListPath = path.join(projectRoot, 'drafts/wait_list.md');
  if (fs.existsSync(waitListPath)) {
    let content = fs.readFileSync(waitListPath, 'utf8');
    content = content.replace(url + '\n', '');
    fs.writeFileSync(waitListPath, content);
  }
}

async function main() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const waitListPath = path.join(projectRoot, 'drafts/wait_list.md');
  if (!fs.existsSync(waitListPath)) {
    console.log('No wait_list.md found');
    return;
  }

  const content = fs.readFileSync(waitListPath, 'utf8');
  const urls = content.split('\n').filter(url => url.trim());

  // 并发处理 URL，但限制最大并发数为 3
  const concurrentLimit = 3;
  const chunks = [];
  for (let i = 0; i < urls.length; i += concurrentLimit) {
    const chunk = urls.slice(i, i + concurrentLimit);
    const promises = chunk.map(url => processUrl(url.trim(), month));
    await Promise.all(promises);
  }
}

main().catch(console.error);
