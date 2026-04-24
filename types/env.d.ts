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

        // Database
        DB_HOST?: string;
        DB_PORT?: string;
        DB_USER?: string;
        DB_PASSWORD?: string;
        DB_NAME?: string;
        DB_LOG_SLOW_QUERIES_MS?: string;

        // Monitoring (Sentry)
        PUBLIC_SENTRY_DSN?: string;
        SENTRY_DSN?: string;
        SENTRY_AUTH_TOKEN?: string;
        PUBLIC_SENTRY_TRACES_SAMPLE_RATE?: string;
        PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE?: string;
        PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE?: string;
        PUBLIC_WEB_VITALS_SAMPLE_RATE?: string;

    }
}
declare module "*.mdx" {
    const content: string; // Markdown 文件的默认导出是字符串内容
    export default content;
  }
