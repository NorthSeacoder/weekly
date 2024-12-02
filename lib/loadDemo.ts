import fs from 'fs';
import less from 'less';
import path from 'path';
import sass from 'sass';
import {CodeExample, CSSType} from './codeExamples/types';

export async function loadDemo(demoPath: string): Promise<CodeExample> {
    const basePath = path.join(process.cwd(), 'demos', demoPath);

    // 读取文件内容，如果文件不存在返回空字符串
    const readFile = (filename: string) => {
        const filePath = path.join(basePath, filename);
        return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
    };

    // 处理 CSS 文件
    const loadCSS = async () => {
        // 按优先级依次查找 scss、less、css 文件
        const scssPath = path.join(basePath, 'index.scss');
        const lessPath = path.join(basePath, 'index.less');
        const cssPath = path.join(basePath, 'index.css');

        if (fs.existsSync(scssPath)) {
            // 编译 SCSS
            const result = sass.compile(scssPath);
            return {
                source: fs.readFileSync(scssPath, 'utf-8'),
                compiled: result.css,
                type: 'scss'
            };
        }

        if (fs.existsSync(lessPath)) {
            // 编译 LESS
            const source = fs.readFileSync(lessPath, 'utf-8');
            const compiled = await less.render(source, {
                filename: lessPath,
                compress: false
            });
            return {
                source,
                compiled: compiled.css,
                type: 'less'
            };
        }

        if (fs.existsSync(cssPath)) {
            const css = fs.readFileSync(cssPath, 'utf-8');
            return {
                source: css,
                compiled: css,
                type: 'css' as CSSType
            };
        }

        return {
            source: '',
            compiled: '',
            type: 'css' as CSSType
        };
    };

    // 读取 meta.json 获取配置
    const meta = JSON.parse(readFile('meta.json') || '{}');
    const css = await loadCSS();

    return {
        title: meta.title || demoPath,
        description: meta.description,
        height: meta.height,
        dependencies: meta.dependencies,
        html: readFile('index.html'),
        css: css.source, // 原始代码
        compiledCss: css.compiled, // 编译后的代码
        cssType: css.type as CSSType, // 样式类型
        js: readFile('index.js')
    };
}
