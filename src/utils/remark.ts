import {unified} from 'unified';
import remarkParse from 'remark-parse'; // 解析 Markdown 为 AST
import remarkGemoji from 'remark-gemoji'; // 处理 emoji
import remarkGfm from 'remark-gfm'; // 支持 GFM 格式（包括表格）
import remarkRehype from 'remark-rehype'; // Markdown AST 转为 HTML AST
import rehypeHighlight from 'rehype-highlight'; // 代码高亮
import rehypeStringify from 'rehype-stringify'; // HTML AST 转为字符串
// import rehypeStarryNight from 'rehype-starry-night'

export async function processMarkdown(markdownString) {
    const result = await unified()
        .use(remarkParse) // 解析 Markdown
        .use(remarkGemoji) // 处理 emoji
        .use(remarkGfm) // 支持 GFM 格式（包括表格）
        .use(remarkRehype) // 转为 HTML AST
        .use(rehypeHighlight) // 高亮代码块
        // .use(rehypeStarryNight)
        .use(rehypeStringify) // 输出 HTML 字符串
        .process(markdownString);

    return result.value;
}
