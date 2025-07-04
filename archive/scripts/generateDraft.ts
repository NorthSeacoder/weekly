import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import puppeteer, {Browser, Page} from 'puppeteer';
import {fileURLToPath} from 'url';
import {AIProcessor} from '../extension/entrypoints/utils/ai';
import {uploadImage} from './upload';

// 类型定义
interface PageData {
    content: string;
    title: string;
    url: string;
}

interface MDXData extends PageData {
    date: string;
    imageUrl: string;
    tags: string[];
    category: string;
    summary: string;
    baseURL: string;
    [key: string]: any;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 加载环境变量
dotenv.config({path: path.join(projectRoot, '.env')});

console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '已设置' : '未设置');
console.log('LSKY_TOKEN:', process.env.LSKY_TOKEN ? '已设置' : '未设置');

async function takeScreenshot(url: string): Promise<string> {
    const browser: Browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ],
        executablePath:
            process.platform === 'darwin' && process.arch === 'arm64'
                ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
                : undefined
    });

    const page: Page = await browser.newPage();

    try {
        // 设置更长的超时时间（2分钟）
        await page.setDefaultNavigationTimeout(120000);

        // 设置用户代理
        await page.setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        );

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
        await page.waitForFunction(
            () => {
                const element = document.querySelector('article') || document.querySelector('main') || document.body;
                return element && element.innerText.length > 0;
            },
            {timeout: 60000}
        );

        // 使用 setTimeout 替代 waitForTimeout
        await new Promise((resolve) => setTimeout(resolve, 2000));

        await page.setViewport({width: 1200, height: 800});

        // 等待所有字体加载完成
        await page.evaluate(() => document.fonts.ready);

        // 确保所有样式都已应用
        await page.evaluate(
            () =>
                new Promise((resolve) => {
                    const sheets = document.styleSheets;
                    if (sheets.length) resolve(void 0);
                    else {
                        const observer = new MutationObserver((mutations, obs) => {
                            if (document.styleSheets.length) {
                                obs.disconnect();
                                resolve(void 0);
                            }
                        });
                        observer.observe(document.head, {
                            childList: true,
                            subtree: true
                        });
                    }
                })
        );

        // 截图并获取 buffer
        const screenshotBuffer = await page.screenshot({
            type: 'webp',
            quality: 80
        });

        // 创建临时文件
        const tempDir = path.join(projectRoot, 'temp');
        fs.mkdirSync(tempDir, {recursive: true});
        const tempFilePath = path.join(tempDir, `temp_${Date.now()}.webp`);

        // 保存临时文件
        fs.writeFileSync(tempFilePath, screenshotBuffer);

        try {
            // 上传到图床
            const uploadResult = await uploadImage(tempFilePath);
            // 返回图片 URL
            return uploadResult.url;
        } finally {
            // 清理临时文件
            fs.unlinkSync(tempFilePath);
        }
    } catch (error) {
        console.error(`Screenshot failed for ${url}:`, error);
        throw error;
    } finally {
        await browser.close();
    }
}

async function extractPageContent(url: string): Promise<PageData> {
    const browser: Browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps'
        ],
        executablePath:
            process.platform === 'darwin' && process.arch === 'arm64'
                ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
                : undefined
    });

    const page: Page = await browser.newPage();

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

        await page.setDefaultNavigationTimeout(30000);

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        const content = await page.evaluate(() => {
            const selectors = ['article', 'main', '[role="main"]', '.content', '#content', 'body'];

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    return (element as HTMLElement).innerText;
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

async function withRetry<T>(fn: () => Promise<T>, retries: number = 3, initialDelay: number = 2000): Promise<T> {
    let lastError: Error | undefined;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (i === retries - 1) break;

            const delay = initialDelay * Math.pow(2, i);
            console.log(`Attempt ${i + 1} failed, waiting ${delay}ms before retry...`);
            console.error('Error details:', error);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

function removeFromWaitList(url: string): void {
    const waitListPath = path.join(projectRoot, 'drafts/wait_list.md');
    if (fs.existsSync(waitListPath)) {
        let content = fs.readFileSync(waitListPath, 'utf8');
        // 使用换行符分割并过滤掉空行
        const urls = content.split('\n').filter((line) => line.trim());
        // 移除指定的 URL
        const newUrls = urls.filter((line) => line.trim() !== url.trim());
        // 写回文件，确保最后有一个换行符
        fs.writeFileSync(waitListPath, newUrls.join('\n') + '\n');
    }
}

function addToSucceedList(url: string): void {
    const succeedListPath = path.join(projectRoot, 'drafts/succeed_list.md');
    // 确保文件存在
    if (!fs.existsSync(succeedListPath)) {
        fs.writeFileSync(succeedListPath, '');
    }
    // 追加 URL
    fs.appendFileSync(succeedListPath, `${url}\n`);
}

function addToFailedList(url: string): void {
    const failedListPath = path.join(projectRoot, 'drafts/failed_list.md');
    // 确保文件存在
    if (!fs.existsSync(failedListPath)) {
        fs.writeFileSync(failedListPath, '');
    }
    // 追加 URL
    fs.appendFileSync(failedListPath, `${url}\n`);
}

async function processUrl(url: string, month: string): Promise<boolean> {
    try {
        // 1. 创建必要的目录
        const sectionsDir = path.join(projectRoot, 'sections', month);
        fs.mkdirSync(sectionsDir, {recursive: true});

        // 2. 生成文件名
        const nextNumber = getNextNumber(month);
        const paddedNumber = nextNumber.toString().padStart(3, '0');

        // 3. 截图并上传
        console.log(`Processing URL: ${url}`);
        console.log('Taking screenshot and uploading...');
        const imageUrl = await withRetry(() => takeScreenshot(url), 3, 5000);

        // 4. 提取页面内容
        console.log('Extracting page content...');
        const pageData = await withRetry(() => extractPageContent(url), 3, 5000);

        // 5. AI 处理内容
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('Missing OPENAI_API_KEY environment variable');
        }

        console.log('Starting AI analysis...');
        const aiProcessor = new AIProcessor({apiKey});
        const analysis = await aiProcessor.analyze(pageData.content);

        if (!analysis) {
            throw new Error('AI analysis returned undefined');
        }

        // 6. 生成 MDX 内容
        const mdxData: MDXData = {
            ...pageData,
            ...analysis,
            date: new Date().toISOString().split('T')[0],
            imageUrl: imageUrl,
            baseURL: new URL(url).origin
        };

        const mdxContent = aiProcessor.generateMDX(mdxData);

        if (!mdxContent) {
            throw new Error('Failed to generate MDX content');
        }

        // 7. 使用编号和标题生成文件名
        const fileName = `${paddedNumber}.${analysis.title.toLowerCase().replace(/\s+/g, '-')}.mdx`;
        const mdxPath = path.join(sectionsDir, fileName);
        fs.writeFileSync(mdxPath, mdxContent);

        // 8. 更新列表
        removeFromWaitList(url);
        addToSucceedList(url);

        console.log(`Successfully processed ${url}`);
        return true;
    } catch (error) {
        console.error(`Failed to process URL: ${url}`);
        console.error('Error details:', error);

        // 更新失败列表
        addToFailedList(url);
        removeFromWaitList(url);

        return false;
    }
}

function getNextNumber(month: string): number {
    const sectionsDir = path.join(projectRoot, 'sections', month);
    if (!fs.existsSync(sectionsDir)) {
        return 1;
    }

    const files = fs.readdirSync(sectionsDir);
    let maxNumber = 0;

    files.forEach((file) => {
        // 匹配形如 "001-title.mdx" 的文件名
        const match = file.match(/^(\d+)-/);
        if (match) {
            const number = parseInt(match[1], 10);
            if (number > maxNumber) {
                maxNumber = number;
            }
        }
    });

    return maxNumber + 1;
}

async function main(): Promise<void> {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const waitListPath = path.join(projectRoot, 'drafts/wait_list.md');
    if (!fs.existsSync(waitListPath)) {
        console.log('No wait_list.md found');
        return;
    }

    const content = fs.readFileSync(waitListPath, 'utf8');
    const urls = content.split('\n').filter((url) => url.trim());

    // 并发处理 URL，但限制最大并发数为 3
    const concurrentLimit = 3;
    for (let i = 0; i < urls.length; i += concurrentLimit) {
        const chunk = urls.slice(i, i + concurrentLimit);
        const promises = chunk.map((url) => processUrl(url.trim(), month));
        await Promise.all(promises);
    }
}

main().catch(console.error);
