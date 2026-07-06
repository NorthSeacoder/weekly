import {defineConfig} from 'astro/config';
import sitemap from '@astrojs/sitemap';
import weekly from './integration';
import icon from 'astro-icon';
import mdx from '@astrojs/mdx';
import sentry from '@sentry/astro';
import tailwindcss from '@tailwindcss/vite';
// import {readingTimeRemarkPlugin} from './src/utils/frontmatter';

function parseRate(value: string | undefined, fallback: number) {
    const num = value ? Number(value) : NaN;
    return Number.isFinite(num) ? num : fallback;
}

const sentryDsn = process.env.PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

export default defineConfig({
    site: 'https://weekly.mengpeng.tech',
    output: 'static',

    integrations: [
        sitemap(),
        mdx(),
        icon({
            include: {
                tabler: ['*']
            }
        }),
        weekly(),
        ...(sentryDsn
            ? [
                  sentry({
                      dsn: sentryDsn,
                      tracesSampleRate:
                          process.env.NODE_ENV === 'development'
                              ? 1.0
                              : parseRate(process.env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.1),

                      sourceMapsUploadOptions: {
                          project: 'weekly',
                          org: 'nsea',
                          authToken: process.env.SENTRY_AUTH_TOKEN
                      }
                  })
              ]
            : [])
    ],
    markdown: {
        // remarkPlugins: [readingTimeRemarkPlugin]
    },
    vite: {
        plugins: [tailwindcss()],
        define: {
            'import.meta.env.BUILD_TIME': JSON.stringify(new Date().toISOString())
        }
    }
});
