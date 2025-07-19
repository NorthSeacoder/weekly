// sentry.client.config.js
import * as Sentry from '@sentry/astro';

Sentry.init({
    dsn: import.meta.env.SENTRY_DSN, // 添加DSN配置
    tracesSampleRate: 1.0, // 性能跟踪采样率
    replaysSessionSampleRate: 0.1, // 10% 的会话回放
    replaysOnErrorSampleRate: 1.0, // 错误时 100% 回放
    integrations: [
        Sentry.browserTracingIntegration(), // 浏览器性能跟踪
        Sentry.replayIntegration({
            // 会话回放
            maskAllText: false,
            blockAllMedia: false
        }),
        Sentry.breadcrumbsIntegration({
            console: true, // 捕获 console.log
            dom: true, // 捕获 DOM 事件（如点击）
        }),
        Sentry.dedupeIntegration(), // 去重
    ]
});
