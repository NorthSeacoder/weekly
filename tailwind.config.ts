import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';
import typographyPlugin from '@tailwindcss/typography';

export default {
    content: ['./src/**/*.{astro,html,js,jsx,json,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                // Brand colors using CSS variables
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                    hover: 'hsl(var(--primary-hover))',
                    soft: 'hsl(var(--primary-soft))',
                    muted: 'hsl(var(--primary-muted))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                    hover: 'hsl(var(--secondary-hover))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                surface: {
                    DEFAULT: 'hsl(var(--surface))',
                    elevated: 'hsl(var(--surface-elevated))',
                    hover: 'hsl(var(--surface-hover))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                    border: 'hsl(var(--card-border))',
                    shadow: 'hsl(var(--card-shadow))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                // Enhanced accent colors
                'accent-warm': 'hsl(var(--accent-warm))',
                'accent-cool': 'hsl(var(--accent-cool))',
                // Status colors
                success: {
                    DEFAULT: 'hsl(var(--success))',
                    foreground: 'hsl(var(--success-foreground))',
                },
                warning: {
                    DEFAULT: 'hsl(var(--warning))',
                    foreground: 'hsl(var(--warning-foreground))',
                },
                error: {
                    DEFAULT: 'hsl(var(--error))',
                    foreground: 'hsl(var(--error-foreground))',
                },
                info: {
                    DEFAULT: 'hsl(var(--info))',
                    foreground: 'hsl(var(--info-foreground))',
                },
                // Legacy colors for backward compatibility
                default: 'hsl(var(--foreground))',
                'dark': 'hsl(var(--background))',
                'dark-lighter': 'hsl(var(--surface))',
                'main': 'hsl(var(--main))',
                'mainHover': 'hsl(var(--mainHover))',
            },
            fontFamily: {
                sans: [
                    'LXGW WenKai',
                    'Inter',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'Segoe UI',
                    'Roboto',
                    ...defaultTheme.fontFamily.sans
                ],
                serif: ['var(--aw-font-serif, ui-serif)', ...defaultTheme.fontFamily.serif],
                heading: [
                    'Inter',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'Segoe UI',
                    'Roboto',
                    ...defaultTheme.fontFamily.sans
                ],
                mono: [
                    'JetBrains Mono',
                    'Fira Code',
                    'Consolas',
                    ...defaultTheme.fontFamily.mono
                ],
            },
            fontSize: {
                'xs': ['var(--text-xs)', '1.4'],
                'sm': ['var(--text-sm)', '1.5'],
                'base': ['var(--text-base)', '1.6'],
                'lg': ['var(--text-lg)', '1.6'],
                'xl': ['var(--text-xl)', '1.5'],
                '2xl': ['var(--text-2xl)', '1.4'],
                '3xl': ['var(--text-3xl)', '1.3'],
                '4xl': ['var(--text-4xl)', '1.2'],
                '5xl': ['var(--text-5xl)', '1.1'],
                '6xl': ['var(--text-6xl)', '1.05'],
                '7xl': ['var(--text-7xl)', '1'],
            },
            spacing: {
                'xs': 'var(--space-xs)',
                'sm': 'var(--space-sm)',
                'md': 'var(--space-md)',
                'lg': 'var(--space-lg)',
                'xl': 'var(--space-xl)',
                '2xl': 'var(--space-2xl)',
                '3xl': 'var(--space-3xl)',
                '4xl': 'var(--space-4xl)',
                '5xl': 'var(--space-5xl)',
            },
            borderRadius: {
                'sm': 'var(--radius-sm)',
                'DEFAULT': 'var(--radius)',
                'lg': 'var(--radius-lg)',
                'xl': 'var(--radius-xl)',
                '2xl': 'var(--radius-2xl)',
                '3xl': 'var(--radius-3xl)',
            },
            boxShadow: {
                'sm': 'var(--shadow-sm)',
                'DEFAULT': 'var(--shadow-md)',
                'md': 'var(--shadow-md)',
                'lg': 'var(--shadow-lg)',
                'xl': 'var(--shadow-xl)',
                '2xl': 'var(--shadow-2xl)',
                '3xl': 'var(--shadow-3xl)',
                'inner': 'var(--shadow-inner)',
                'soft': 'var(--shadow-md)',
                'glow': '0 0 20px hsl(var(--primary) / 0.3)',
                'glow-lg': '0 0 30px hsl(var(--primary) / 0.4)',
                'glow-xl': '0 0 40px hsl(var(--primary) / 0.5)',
            },
            transitionDuration: {
                'fast': 'var(--duration-fast)',
                'normal': 'var(--duration-normal)',
                'slow': 'var(--duration-slow)',
                'slower': 'var(--duration-slower)',
            },
            animation: {
                'fade-in': 'fadeIn var(--duration-normal) ease-out',
                'fade-in-up': 'fadeInUp var(--duration-normal) ease-out',
                'fade-in-down': 'fadeInDown var(--duration-normal) ease-out',
                'slide-in-left': 'slideInLeft var(--duration-normal) ease-out',
                'slide-in-right': 'slideInRight var(--duration-normal) ease-out',
                'scale-in': 'scaleIn var(--duration-normal) ease-out',
                'bounce-in': 'bounceIn var(--duration-slow) ease-out',
                'float': 'float 6s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'shimmer': 'shimmer 2s linear infinite',
                'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'spin-slow': 'spin 3s linear infinite',
                'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeInDown: {
                    '0%': { opacity: '0', transform: 'translateY(-20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInLeft: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                bounceIn: {
                    '0%': { opacity: '0', transform: 'scale(0.3)' },
                    '50%': { opacity: '1', transform: 'scale(1.05)' },
                    '70%': { transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' },
                    '100%': { boxShadow: '0 0 30px hsl(var(--primary) / 0.6)' },
                },
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
                pulseSoft: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.8' },
                },
            },
            backdropBlur: {
                'xs': '2px',
                'sm': '4px',
                'md': '8px',
                'lg': '12px',
                'xl': '16px',
                '2xl': '24px',
                '3xl': '32px',
            },
            typography: {
                DEFAULT: {
                    css: {
                        maxWidth: 'none',
                        color: 'hsl(var(--foreground))',
                        lineHeight: '1.7',
                        '[class~="lead"]': {
                            color: 'hsl(var(--muted-foreground))',
                        },
                        a: {
                            color: 'hsl(var(--primary))',
                            textDecoration: 'underline',
                            fontWeight: '500',
                        },
                        strong: {
                            color: 'hsl(var(--foreground))',
                            fontWeight: '600',
                        },
                        'ol[type="A"]': {
                            '--list-counter-style': 'upper-alpha',
                        },
                        'ol[type="a"]': {
                            '--list-counter-style': 'lower-alpha',
                        },
                        'ol[type="A" s]': {
                            '--list-counter-style': 'upper-alpha',
                        },
                        'ol[type="a" s]': {
                            '--list-counter-style': 'lower-alpha',
                        },
                        'ol[type="I"]': {
                            '--list-counter-style': 'upper-roman',
                        },
                        'ol[type="i"]': {
                            '--list-counter-style': 'lower-roman',
                        },
                        'ol[type="I" s]': {
                            '--list-counter-style': 'upper-roman',
                        },
                        'ol[type="i" s]': {
                            '--list-counter-style': 'lower-roman',
                        },
                        'ol[type="1"]': {
                            '--list-counter-style': 'decimal',
                        },
                        'ol > li': {
                            position: 'relative',
                        },
                        'ol > li::before': {
                            content: 'counter(list-item, var(--list-counter-style, decimal)) "."',
                            position: 'absolute',
                            fontWeight: '400',
                            color: 'hsl(var(--muted-foreground))',
                            left: '-1.5em',
                        },
                        'ul > li': {
                            position: 'relative',
                        },
                        'ul > li::before': {
                            content: '""',
                            position: 'absolute',
                            backgroundColor: 'hsl(var(--muted-foreground))',
                            borderRadius: '50%',
                            width: '0.375em',
                            height: '0.375em',
                            top: 'calc(0.875em - 0.1875em)',
                            left: '-1.5em',
                        },
                        hr: {
                            borderColor: 'hsl(var(--border))',
                            borderTopWidth: 1,
                        },
                        blockquote: {
                            fontWeight: '500',
                            fontStyle: 'italic',
                            color: 'hsl(var(--foreground))',
                            borderLeftWidth: '0.25rem',
                            borderLeftColor: 'hsl(var(--border))',
                            quotes: '"\\201C""\\201D""\\2018""\\2019"',
                        },
                        h1: {
                            color: 'hsl(var(--foreground))',
                            fontWeight: '800',
                            fontSize: '2.25em',
                            marginTop: '0',
                            marginBottom: '0.8888889em',
                            lineHeight: '1.1111111',
                        },
                        h2: {
                            color: 'hsl(var(--foreground))',
                            fontWeight: '700',
                            fontSize: '1.5em',
                            marginTop: '2em',
                            marginBottom: '1em',
                            lineHeight: '1.3333333',
                        },
                        h3: {
                            color: 'hsl(var(--foreground))',
                            fontWeight: '600',
                            fontSize: '1.25em',
                            marginTop: '1.6em',
                            marginBottom: '0.6em',
                            lineHeight: '1.6',
                        },
                        h4: {
                            color: 'hsl(var(--foreground))',
                            fontWeight: '600',
                            marginTop: '1.5em',
                            marginBottom: '0.5em',
                            lineHeight: '1.5',
                        },
                        code: {
                            color: 'hsl(var(--foreground))',
                            fontWeight: '600',
                            fontSize: '0.875em',
                        },
                        'code::before': {
                            content: '"`"',
                        },
                        'code::after': {
                            content: '"`"',
                        },
                        pre: {
                            color: 'hsl(var(--foreground))',
                            backgroundColor: 'hsl(var(--muted))',
                            overflowX: 'auto',
                            fontWeight: '400',
                            fontSize: '0.875em',
                            lineHeight: '1.7142857',
                            marginTop: '1.7142857em',
                            marginBottom: '1.7142857em',
                            borderRadius: '0.375rem',
                            paddingTop: '0.8571429em',
                            paddingRight: '1.1428571em',
                            paddingBottom: '0.8571429em',
                            paddingLeft: '1.1428571em',
                        },
                        'pre code': {
                            backgroundColor: 'transparent',
                            borderWidth: '0',
                            borderRadius: '0',
                            padding: '0',
                            fontWeight: 'inherit',
                            color: 'inherit',
                            fontSize: 'inherit',
                            fontFamily: 'inherit',
                            lineHeight: 'inherit',
                        },
                        'pre code::before': {
                            content: 'none',
                        },
                        'pre code::after': {
                            content: 'none',
                        },
                        table: {
                            width: '100%',
                            tableLayout: 'auto',
                            textAlign: 'left',
                            marginTop: '2em',
                            marginBottom: '2em',
                            fontSize: '0.875em',
                            lineHeight: '1.7142857',
                        },
                        thead: {
                            borderBottomWidth: '1px',
                            borderBottomColor: 'hsl(var(--border))',
                        },
                        'thead th': {
                            color: 'hsl(var(--foreground))',
                            fontWeight: '600',
                            verticalAlign: 'bottom',
                            paddingRight: '0.5714286em',
                            paddingBottom: '0.5714286em',
                            paddingLeft: '0.5714286em',
                        },
                        'tbody tr': {
                            borderBottomWidth: '1px',
                            borderBottomColor: 'hsl(var(--border))',
                        },
                        'tbody tr:last-child': {
                            borderBottomWidth: '0',
                        },
                        'tbody td': {
                            verticalAlign: 'baseline',
                        },
                        tfoot: {
                            borderTopWidth: '1px',
                            borderTopColor: 'hsl(var(--border))',
                        },
                        'tfoot td': {
                            verticalAlign: 'top',
                        },
                    },
                },
            },
        },
    },
    plugins: [
        typographyPlugin,
        plugin(function ({ addComponents, theme }) {
            addComponents({
                '.btn': {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: theme('borderRadius.lg'),
                    fontSize: theme('fontSize.sm'),
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    '&:focus': {
                        outline: '2px solid',
                        outlineColor: theme('colors.ring'),
                        outlineOffset: '2px',
                    },
                },
                '.btn-primary': {
                    backgroundColor: theme('colors.primary.DEFAULT'),
                    color: theme('colors.primary.foreground'),
                    '&:hover': {
                        backgroundColor: theme('colors.primary.hover'),
                    },
                },
                '.btn-secondary': {
                    backgroundColor: theme('colors.secondary.DEFAULT'),
                    color: theme('colors.secondary.foreground'),
                    '&:hover': {
                        backgroundColor: theme('colors.secondary.hover'),
                    },
                },
                '.card': {
                    borderRadius: theme('borderRadius.xl'),
                    border: '1px solid',
                    borderColor: theme('colors.card.border'),
                    backgroundColor: theme('colors.card.DEFAULT'),
                    color: theme('colors.card.foreground'),
                    boxShadow: theme('boxShadow.sm'),
                },
                '.card-content': {
                    padding: theme('spacing.6'),
                },
                '.glass': {
                    backdropFilter: 'blur(16px) saturate(180%)',
                    backgroundColor: 'rgba(255, 255, 255, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.125)',
                    '.dark &': {
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.125)',
                    },
                },
            });
        }),
    ],
};
