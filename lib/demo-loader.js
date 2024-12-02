const sass = require('sass');
const less = require('less');
const fs = require('fs');
const path = require('path');

module.exports = function demoLoader() {
    const callback = this.async();
    const demoPath = this.resourcePath;
    const basePath = path.dirname(demoPath);

    try {
        // 读取文件内容
        const html = fs.readFileSync(path.join(basePath, 'index.html'), 'utf-8');
        const js = fs.readFileSync(path.join(basePath, 'index.js'), 'utf-8');
        const meta = JSON.parse(fs.readFileSync(path.join(basePath, 'meta.json'), 'utf-8'));

        // 处理 CSS
        let css = '';
        let compiledCss = '';
        let cssType = 'css';

        if (fs.existsSync(path.join(basePath, 'index.scss'))) {
            css = fs.readFileSync(path.join(basePath, 'index.scss'), 'utf-8');
            compiledCss = sass.compile(path.join(basePath, 'index.scss')).css;
            cssType = 'scss';
        } else if (fs.existsSync(path.join(basePath, 'index.less'))) {
            css = fs.readFileSync(path.join(basePath, 'index.less'), 'utf-8');
            less.render(css, (err, output) => {
                if (err) throw err;
                compiledCss = output.css;
            });
            cssType = 'less';
        } else if (fs.existsSync(path.join(basePath, 'index.css'))) {
            css = fs.readFileSync(path.join(basePath, 'index.css'), 'utf-8');
            compiledCss = css;
        }

        callback(null, `
            export default {
                html: ${JSON.stringify(html)},
                css: ${JSON.stringify(css)},
                compiledCss: ${JSON.stringify(compiledCss)},
                cssType: ${JSON.stringify(cssType)},
                js: ${JSON.stringify(js)},
                ...${JSON.stringify(meta)}
            }
        `);
    } catch (err) {
        callback(err);
    }
}; 