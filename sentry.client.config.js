function parseRate(value, fallback) {
    const num = value != null && value !== '' ? Number(value) : NaN;
    return Number.isFinite(num) ? num : fallback;
}

function initWebVitalsReporting(Sentry) {
    const sampleRate = parseRate(import.meta.env.PUBLIC_WEB_VITALS_SAMPLE_RATE, 0);
    if (sampleRate <= 0 || Math.random() > sampleRate) return;

    let lcp;
    let cls = 0;

    try {
        const lcpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}

    try {
        const clsObserver = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) cls += entry.value;
            }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {}

    const report = () => {
        Sentry.captureEvent({
            message: 'web-vitals',
            level: 'info',
            tags: { source: 'client', kind: 'web-vitals' },
            extra: {
                lcp_ms: lcp != null ? Math.round(lcp) : null,
                cls: Number.isFinite(cls) ? Number(cls.toFixed(4)) : null,
                href: typeof location !== 'undefined' ? location.href : null
            }
        });
    };

    window.addEventListener('pagehide', report, { once: true });
}

const dsn = import.meta.env.PUBLIC_SENTRY_DSN ?? import.meta.env.SENTRY_DSN;

if (dsn) {
    import('@sentry/astro').then((Sentry) => {
        Sentry.init({
            dsn,
            tracesSampleRate:
                import.meta.env.DEV
                    ? 1.0
                    : parseRate(import.meta.env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.1),
            replaysSessionSampleRate: parseRate(import.meta.env.PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE, 0),
            replaysOnErrorSampleRate: parseRate(import.meta.env.PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE, 1.0),
            integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.replayIntegration({
                    maskAllText: false,
                    blockAllMedia: false
                }),
                Sentry.breadcrumbsIntegration({
                    console: true,
                    dom: true
                }),
                Sentry.dedupeIntegration()
            ]
        });

        initWebVitalsReporting(Sentry);
    });
}
