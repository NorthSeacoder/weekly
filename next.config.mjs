import createMDX from '@next/mdx';
import {withSentryConfig} from '@sentry/nextjs';
import path from 'path';
import remarkGfm from 'remark-gfm';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Configure `pageExtensions`` to include MDX files
    pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
    // Optionally, add any other Next.js config below
    output: 'export',
    trailingSlash: true,
    images: {
        unoptimized: true,
        domains: [
            'api.microlink.io' // Microlink Image Preview
        ]
    },
    webpack: (config, {isServer}) => {
        config.ignoreWarnings = [{module: /@opentelemetry/}, {module: /@sentry/}];
        config.watchOptions = {
            ...config.watchOptions,
            ignored: /extension\/.*/
        };
        return config;
    },
    experimental: {
        serverComponentsExternalPackages: ['undici']
    }
};

const withMDX = createMDX({
    // Add markdown plugins here, as desired
    options: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: []
    }
});

// Wrap MDX and Next.js config with each other
const withSentry = withSentryConfig(
    withMDX(nextConfig),
    {
        org: 'nsea',
        project: 'weekly',
        sourcemaps: true,
        hideSourceMaps: false,
        widenClientFileUpload: true,
        disableLogger: false,
        automaticVercelMonitors: true,
        authToken: process.env.NEXT_PUBLIC_SENTRY_AUTH_TOKEN
    },
    {
        errorHandler: true,
        tracesSampleRate: 0.1,
        silent: false
    }
);
export default withSentry;
// export default MillionLint.next({rsc:true})(withSentry)
