import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import {defineConfig} from 'wxt';

export default defineConfig({
    manifest: {
        name: 'AI Page Summarizer',
        description: '使用 AI 总结页面内容并生成标签',
        version: '1.0',
        permissions: ['activeTab', 'scripting', 'storage', 'notifications'],
        host_permissions: ['<all_urls>']
    },
    modules: ['@wxt-dev/module-react'],
    vite: () => ({
        css: {
            postcss: {
                plugins: [tailwindcss, autoprefixer]
            }
        },
        build: {
            sourcemap: false,
            minify: false
        },
        server: {
            hmr: {
                overlay: false
            }
        }
    })
});
