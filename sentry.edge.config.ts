// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: 'https://f1fd4111ba88cbf5e60ce740cccd251f@o4507597779107840.ingest.us.sentry.io/4507598140932096',

    // 降低采样率
    tracesSampleRate: 0.1,

    // 关闭调试
    debug: false,

    enabled: process.env.NODE_ENV === 'production'
});
