// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: 'https://f1fd4111ba88cbf5e60ce740cccd251f@o4507597779107840.ingest.us.sentry.io/4507598140932096',

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 0.1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    replaysOnErrorSampleRate: 0.1,

    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.01,

    enabled: process.env.NODE_ENV === 'production',

    // You can remove this option if you're not planning to use the Sentry Session Replay feature:
    integrations: [
        Sentry.replayIntegration({
            // Additional Replay configuration goes in here, for example:
            maskAllText: true,
            blockAllMedia: true
        })
    ]
});
