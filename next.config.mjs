import createMDX from '@next/mdx';
import {withSentryConfig} from '@sentry/nextjs';
import remarkGfm from 'remark-gfm';

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Configure `pageExtensions`` to include MDX files
    pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
    // Optionally, add any other Next.js config below
    output: 'export',
    trailingSlash: true,
    images: {
        unoptimized: true
    },
    webpack: (config, { isServer }) => {
        config.ignoreWarnings = [
            { module: /@opentelemetry/ },
            { module: /@sentry/ }
        ];
        config.watchOptions = {
            ...config.watchOptions,
            ignored: /extension\/.*/
        };
        return config;
    },
    experimental: {
        serverComponentsExternalPackages: ['undici'],
    },
};

const withMDX = createMDX({
    // Add markdown plugins here, as desired
    options: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: []
    }
});

// Wrap MDX and Next.js config with each other
export default withSentryConfig(
    withMDX(nextConfig),
    {
        org: "nsea",
        project: "weekly",
        
        // 开启源码映射上传
        sourcemaps: true,
        
        // 允许访问源码映射
        hideSourceMaps: false,
        
        // 允许文件上传
        widenClientFileUpload: true,
        
        // 开启日志
        disableLogger: false,
        
        // 开启自动监控
        automaticVercelMonitors: true,

        // 添加 auth token
        authToken: process.env.NEXT_PUBLIC_SENTRY_AUTH_TOKEN
    },
    {
        // 开启错误处理
        errorHandler: true,
        
        // 开启性能监控
        tracesSampleRate: 0.1,
        
        // 关闭静默模式以查看上传日志
        silent: false
    }
);
