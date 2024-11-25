/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // 添加排除配置
  webpack: (config, { isServer }) => {
    // 排除 extension 目录
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [...(config.watchOptions?.ignored || []), '**/extension/**']
    };
    return config;
  }
};

module.exports = nextConfig; 