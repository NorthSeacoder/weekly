declare namespace NodeJS {
    interface ProcessEnv {
        // Site Configuration
        NEXT_PUBLIC_SITE_URL: string;
        NEXT_PUBLIC_AUTHOR_NAME: string;

        // Analytics
        NEXT_PUBLIC_BAIDU_TONGJI?: string;
        NEXT_PUBLIC_GOOGLE_ID?: string;
        NEXT_PUBLIC_UMAMI?: string;

        // Giscus Configuration
        NEXT_PUBLIC_REPO: string;
        NEXT_PUBLIC_REPOID: string;
        NEXT_PUBLIC_CATEGORY: string;
        NEXT_PUBLIC_CATEGORY_ID: string;
        NEXT_PUBLIC_MAPPING: string;
        NEXT_PUBLIC_INPUT_POSITION: string;
        NEXT_PUBLIC_THEME: string;
        NEXT_PUBLIC_LANG: string;

        // Quail API
        QUAIL_API_KEY: string;
    }
}
