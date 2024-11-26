import createMDX from '@next/mdx';
import {withSentryConfig} from '@sentry/nextjs';
import remarkGfm from 'remark-gfm';

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Configure `pageExtensions`` to include MDX files
    pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
    // Optionally, add any other Next.js config below
    output: 'export',
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
        // Sentry webpack 插件配置
        org: "nsea",
        project: "weekly",
        
        // 关闭源码映射上传，因为是静态导出
        sourcemaps: false,
        
        // 静默模式
        silent: true,
        
        // 禁用文件上传
        widenClientFileUpload: false,
        
        // 隐藏源码映射
        hideSourceMaps: true,
        
        // 禁用日志
        disableLogger: true,
        
        // 关闭自动监控，因为是静态导出
        automaticVercelMonitors: false
    },
    {
        // 运行时配置
        silent: true,
        
        // 关闭错误处理，因为是静态导出
        errorHandler: false,
        
        // 关闭性能监控
        tracesSampleRate: 0
    }
);
