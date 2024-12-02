declare module 'virtual:demo' {
    const demo: {
        html: string;
        css: string;
        js: string;
        meta: {
            title: string;
            description?: string;
            height?: number;
            dependencies?: string[];
        };
    };
    export default demo;
}
