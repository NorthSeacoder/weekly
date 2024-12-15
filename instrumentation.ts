import * as Sentry from '@sentry/nextjs';

export async function register() {
    try {
        if (process.env.NEXT_RUNTIME === 'nodejs') {
            Sentry.init({
                dsn: 'https://f1fd4111ba88cbf5e60ce740cccd251f@o4507597779107840.ingest.us.sentry.io/4507598140932096',

                // 移除不支持的集成
                integrations: [],

                tracesSampleRate: 0.1,
                environment: process.env.NODE_ENV,
                debug: false,
                enabled: process.env.NODE_ENV === 'production'
            });
        }

        if (process.env.NEXT_RUNTIME === 'edge') {
            // Edge Runtime Sentry 配置
            Sentry.init({
                dsn: 'https://f1fd4111ba88cbf5e60ce740cccd251f@o4507597779107840.ingest.us.sentry.io/4507598140932096',

                // 降低采样率
                tracesSampleRate: 0.1,

                // 关闭调试
                debug: false,

                enabled: process.env.NODE_ENV === 'production'
            });
        }
    } catch (error) {
        console.warn('Sentry instrumentation failed:', error);
        // 防止开发环境报错中断
        if (process.env.NODE_ENV === 'production') {
            throw error;
        }
    }
}
