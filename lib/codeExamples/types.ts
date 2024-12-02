export type CSSType = 'css' | 'scss' | 'less';

export interface CodeExample {
    title: string;
    html?: string;
    css?: string;
    compiledCss?: string;
    cssType?: CSSType;
    js?: string;
    description?: string;
    height?: number;
    dependencies?: string[];
}
