declare module 'react' {
    interface CSSProperties {
        '--border-angle'?: string;
        [key: `--${string}`]: string | number | undefined;
    }
}
