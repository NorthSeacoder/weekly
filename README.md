# Weekly

一个基于 **Astro** 的个人周刊系统，用于分享和记录每周发现的有趣内容。

## 核心功能

### 内容管理

- **周刊内容**: 支持发布周刊内容，使用 MySQL 数据库存储
- **结构化内容**: 支持多种内容分类（工具、文章、教程、言论等）

### 订阅功能

- **RSS 订阅**: 通过 `@astrojs/rss` 提供 RSS 订阅，访问 `/rss.xml`
- **邮件订阅**: 集成 [Quail.ink](https://quail.ink) 邮件订阅服务

### 用户体验

- **响应式设计**: 支持响应式设计，在不同设备上提供良好的浏览体验
- **深色/浅色主题**: 支持主题切换

### 数据分析

- **Umami 分析**: 集成 Umami 提供轻量级网站分析
- **Sentry 错误追踪**: 集成 Sentry 错误追踪

## 快速开始

1. **安装依赖:**

   ```bash
   pnpm install
   ```

2. **配置环境变量:**

   ```bash
   cp .env.example .env
   ```

   配置数据库连接和其他服务密钥。

3. **启动开发服务器:**

   ```bash
   pnpm dev
   ```

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 预览构建结果 |
| `pnpm weekly:add` | 创建周刊条目 |
| `pnpm publish:quail` | 发布到 Quail 邮件订阅 |
| `pnpm migrate:mysql` | 数据库迁移 |
| `pnpm db:check` | 检查数据库状态 |

## 项目结构

```
weekly/
├── public/              # 静态资源
├── sections/            # 周刊 MDX 内容（历史文件）
├── lib/                 # 核心数据服务
│   ├── content-service.ts  # 内容服务
│   ├── database.ts         # 数据库连接
│   └── cache.ts            # 缓存服务
├── src/
│   ├── pages/           # 页面路由
│   │   ├── index.astro     # 首页
│   │   ├── weekly/         # 周刊页面
│   │   └── rss.xml.ts      # RSS 订阅端点
│   ├── components/      # UI 组件
│   ├── layouts/         # 布局模板
│   └── utils/           # 工具函数
├── scripts/             # 工具脚本
├── database/            # 数据库 Schema
├── integration/         # Astro 集成
└── types/               # TypeScript 类型
```

## 技术栈

- **框架**: [Astro](https://astro.build/) 5.x
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **内容**: MDX + MySQL
- **RSS**: [@astrojs/rss](https://docs.astro.build/en/guides/rss/)
- **邮件订阅**: [Quail.ink](https://quail.ink)
- **统计分析**: [Umami](https://umami.is/)
- **错误追踪**: [Sentry](https://sentry.io/)

## 订阅方式

- **RSS**: https://weekly.mengpeng.tech/rss.xml
- **邮件**: 通过 Quail.ink 订阅

## 许可证

MIT License
