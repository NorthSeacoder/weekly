import {defineConfig} from 'astro/config';
import sitemap from '@astrojs/sitemap';
import weekly from './integration';
import icon from 'astro-icon';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import { readingTimeRemarkPlugin } from './src/utils/frontmatter';

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
                tabler: ['*'],
            }
        }),
        weekly()
    ],
    markdown: {
        remarkPlugins: [readingTimeRemarkPlugin],
    },
    vite: {
        define: {
          'import.meta.env.BUILD_TIME': JSON.stringify(new Date().toISOString())
        }
      }
});
