import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import {defineConfig} from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    extensionApi: 'chrome',
    manifest: {
        name: 'AI Page Summarizer',
        description: '使用 AI 总结页面内容并生成标签',
        version: '1.0',
        permissions: ['activeTab', 'scripting', 'storage'],
        host_permissions: ['<all_urls>']
    },
    modules: ['@wxt-dev/module-react'],
    vite: () => ({
        // 修改为函数返回配置
        css: {
            postcss: {
                plugins: [tailwindcss, autoprefixer]
            }
        }
    })
});
