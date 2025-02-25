# Weekly

一个基于 **Astro** 的个人周刊系统，用于分享和记录每周发现的有趣内容。支持 MDX 内容编写、标签分类等功能。

## 核心功能

### 内容管理

-   **博客和周刊两种内容类型**: 支持发布博客文章和周刊内容，满足不同的内容发布需求。
-   **Astro Content Collections**: 使用 Astro Content Collections 管理周刊和博客内容，提供类型安全和结构化的内容管理 (`src/content/config.ts`).

### 用户交互

-   **RSS 订阅支持**: 提供 RSS 订阅功能，方便用户订阅最新的周刊内容。
-   **响应式设计**: 支持响应式设计，在不同设备上提供良好的浏览体验。
-   **深色/浅色主题切换**: 支持深色和浅色主题切换，满足不同用户的偏好。

### 数据分析

-   **Umami 分析集成**: 集成 Umami 分析 (`src/components/common/Analytics.astro`)，提供轻量级的网站分析方案。
-   **Sentry 错误追踪**: 集成 Sentry 错误追踪 (根据之前的对话和代码推断).

### 自动化工具

-   **AI 辅助内容生成**: 提供 AI 辅助内容生成工具，提高内容创作效率 (例如 `scripts/generateDraft.ts`)。
-   **自动化部署流程**: 使用 GitHub Actions 实现自动化部署，简化部署流程。
-   **图片优化处理**: 提供图片优化处理工具 (例如 `scripts/convertImages.ts`)，减小图片体积，提升网站性能。
-   **周刊/博客快速创建工具**: 提供命令行工具 (`create-weekly.mjs`, `create-blog.mjs`) 快速创建内容模板 (如果存在于仓库中，根据之前的 `README-next.md` 推断).

## 快速开始

1.  **安装依赖:**

    ```bash
    pnpm install
    ```

2.  **复制环境变量配置:**

    ```bash
    cp .env.example .env
    ```

3.  **配置环境变量:**

    -   设置站点基本信息
    -   配置 Umami 统计分析 (如果使用)
    -   配置 Sentry DSN (如果使用)
    -   配置 AI 服务密钥 (OpenAI API Key, 如果使用 AI 工具)

4.  **启动开发服务器:**

    ```bash
    pnpm dev
    ```

## 内容分类

周刊内容支持多种专题分类，通过 `category` 字段进行设置 (示例，根据之前的 `README-next.md` 推断，可能需要根据实际情况调整):

-   `blogs`: 博客文章和技术教程
-   `web`: Web 开发相关内容和最新技术
-   `ui`: UI/UX 设计和组件开发
-   `interview`: 面试题解析和经验分享
-   `prompt`: AI 提示词工程和优化
-   `git`: Git 使用技巧和工作流程
-   `开源`: 开源项目推荐

## 工具集成 (部分工具，根据代码库和之前的 `README-next.md` 推断)

### 1. 周刊创建工具 (create-weekly)

快速创建结构化的周刊内容 (如果存在):

```bash
pnpm create-weekly <标题>
```

### 2. 博客创建工具 (create-blog)

创建规范化的博客文章:

```bash
pnpm create-blog "文章标题"
```

### 3. 图片处理工具 (convertImages)

批量处理和优化图片资源:

```bash
ts-node scripts/convertImages.ts <目录路径>
```

### 4. AI 草稿生成工具 (generateDraft)

使用 AI 辅助生成周刊内容草稿:

```bash
ts-node scripts/generateDraft.ts < URL 列表文件路径 > <月份>
```

## 项目结构

```

weekly/
├── public/           # 静态资源
├── sections/         #  周刊 mdx 内容
├── blogs/            # 博客 mdx 内容
├── integration/    # Astro 集成
├── src/              # 源代码
│   ├── content/        # 内容集成
│   ├── layouts/        # 布局组件
│   ├── pages/          # 页面文件
│   ├── components/     # React 组件
│   ├── styles/         # 全局样式
│   ├── utils/          # 工具函数
│   └── env.d.ts        # TypeScript 环境变量声明
├── scripts/          # 工具脚本 (convertImages.ts, generateDraft.ts)
├── bin/              # 命令行工具 (create-weekly.mjs, create-blog.mjs)
├── .env.example      # 环境变量示例
├── astro.config.ts  # Astro 配置文件
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── README.md
```

## 技术栈

-   **框架**: [Astro](https://astro.build/)
-   **样式**: [Tailwind CSS](https://tailwindcss.com/)
-   **内容**: [MDX](https://mdxjs.com/)
-   **图标**: [astro-icon](https://github.com/egoist/astro-icon)
-   **统计分析**: [Umami](https://umami.is/) (可选)
-   **错误追踪**: [Sentry](https://sentry.io/) (可选)

## 自动化部署

项目采用 GitHub Actions 实现 CI/CD .

## 开发计划

### 进行中

-   [ ] table 处理
-   [ ] 邮件订阅
-   [ ] 配置 cursorrules
-   [ ] 逻辑统一,去除旧配置及冗余代码
-   [ ] 整体样式优化(配色/tailwindcss 配置)
-   [ ] 公众号/x 推送 (待调研)
-   [ ] 404 页面优化
-   [ ] 标签分类和筛选
-   [ ] 按月份组织内容
-   [ ] 自动化部署流程完善 (GitHub Actions 配置)

## 许可证

MIT License
