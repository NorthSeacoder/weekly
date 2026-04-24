import {defineConfig} from 'astro/config';
import sitemap from '@astrojs/sitemap';
import weekly from './integration';
import icon from 'astro-icon';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sentry from '@sentry/astro';
// import {readingTimeRemarkPlugin} from './src/utils/frontmatter';

function parseRate(value: string | undefined, fallback: number) {
    const num = value ? Number(value) : NaN;
    return Number.isFinite(num) ? num : fallback;
}

export default defineConfig({
    site: 'https://weekly.mengpeng.tech',
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
            dsn: process.env.PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
            tracesSampleRate:
                process.env.NODE_ENV === 'development'
                    ? 1.0
                    : parseRate(process.env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.1),
            
            // 可选:添加浏览器跟踪集成
            sourceMapsUploadOptions: {
                project: 'weekly', // 在 Sentry 中设置的项目名称
                org: 'nsea',
                authToken: process.env.SENTRY_AUTH_TOKEN // 用于上传 source maps 的 token
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
