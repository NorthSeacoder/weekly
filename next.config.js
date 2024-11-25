/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // 排除 extension 目录
    config.watchOptions = {
      ...config.watchOptions,
      ignored: /extension\/.*/
    };
    return config;
  }
};

module.exports = nextConfig; 