import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';
import typographyPlugin from '@tailwindcss/typography';

export default {
    content: ['./src/**/*.{astro,html,js,jsx,json,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                primary: 'var(--aw-color-primary)',
                secondary: 'var(--aw-color-secondary)',
                accent: 'var(--aw-color-accent)',
                default: 'var(--aw-color-text-default)',
                muted: 'var(--aw-color-text-muted)',
                dark: 'var(--aw-color-bg-page-dark)',
                'dark-lighter': 'var(--aw-color-bg-page-dark-lighter)'
            },
            fontFamily: {
                sans: ['var(--aw-font-sans, ui-sans-serif)', ...defaultTheme.fontFamily.sans],
                serif: ['var(--aw-font-serif, ui-serif)', ...defaultTheme.fontFamily.serif],
                heading: ['var(--aw-font-heading, ui-sans-serif)', ...defaultTheme.fontFamily.sans]
            },

            animation: {
                fade: 'fadeInUp 1s both',
                'star-movement-bottom': 'star-movement-bottom linear infinite alternate',
                'star-movement-top': 'star-movement-top linear infinite alternate'
            },

            keyframes: {
                fadeInUp: {
                    '0%': {opacity: 0, transform: 'translateY(2rem)'},
                    '100%': {opacity: 1, transform: 'translateY(0)'}
                },
                'star-movement-bottom': {
                    '0%': {transform: 'translate(0%, 0%)', opacity: '1'},
                    '100%': {transform: 'translate(-100%, 0%)', opacity: '0'}
                },
                'star-movement-top': {
                    '0%': {transform: 'translate(0%, 0%)', opacity: '1'},
                    '100%': {transform: 'translate(100%, 0%)', opacity: '0'}
                }
            }
        }
    },
    plugins: [
        typographyPlugin,
        plugin(({addVariant}) => {
            addVariant('intersect', '&:not([no-intersect])');
        })
    ],
    darkMode: 'class'
};
