import {defineConfig} from 'astro/config';
import sitemap from '@astrojs/sitemap';
import weekly from './integration';
import icon from 'astro-icon';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sentry from '@sentry/astro';
// import {readingTimeRemarkPlugin} from './src/utils/frontmatter';

export default defineConfig({
    output: 'static',

    integrations: [
        tailwind({
            applyBaseStyles: false
        }),
        sitemap(),
        mdx(),
        icon({
            include: {
                tabler: ['*']
            }
        }),
        weekly(),
        sentry({
            dsn: process.env.SENTRY_DSN, //
            tracesSampleRate: 1.0, // 跟踪采样率，1.0 表示捕获所有请求
            // 可选:添加浏览器跟踪集成
            sourceMapsUploadOptions: {
                project: 'weekly', // 在 Sentry 中设置的项目名称
                org: 'nsea',
                authToken: process.env.NEXT_PUBLIC_SENTRY_AUTH_TOKEN // 用于上传 source maps 的 token
            }
        })
    ],
    markdown: {
        // remarkPlugins: [readingTimeRemarkPlugin]
    },
    vite: {
        define: {
            'import.meta.env.BUILD_TIME': JSON.stringify(new Date().toISOString())
        }
    }
});
