# Weekly

一个基于 Next.js 的个人周刊系统,用于分享和记录每周发现的有趣内容。支持 MDX 内容编写、标签分类、评论系统等功能。

## 核心功能

### 内容管理

-   MDX 内容编写与渲染
-   自动生成目录和导航
-   支持标签分类和筛选
-   支持按月份组织内容
-   支持博客和周刊两种内容类型

### 用户交互

-   集成 Giscus 评论系统
-   RSS 订阅支持
-   响应式设计
-   支持深色/浅色主题切换

### 数据分析

-   百度统计集成
-   Google Analytics 支持
-   Umami 分析集成
-   Sentry 错误追踪

### 自动化工具

-   AI 辅助内容生成
-   自动化部署流程
-   图片优化处理
-   内容同步工具

## 快速开始

1. 安装依赖:

```bash
pnpm install
```

2. 复制环境变量配置:

```bash
cp .env.example .env
```

3. 配置环境变量:

-   设置站点基本信息
-   配置统计分析服务
-   设置 Giscus 评论系统
-   配置 AI 服务密钥

4. 启动开发服务器:

```bash
pnpm dev
```

## 内容分类

周刊内容支持多种专题分类:

-   `blogs`: 博客文章和技术教程
-   `web`: Web 开发相关内容和最新技术
-   `ui`: UI/UX 设计和组件开发
-   `interview`: 面试题解析和经验分享
-   `prompt`: AI 提示词工程和优化
-   `git`: Git 使用技巧和工作流程

## 工具集成

### 1. 周刊创建工具 (create-weekly)

快速创建结构化的周刊内容:

# 基本用法

```bash
pnpm create-weekly <标题>
```

# 高级用法

```bash
pnpm create-weekly <YYYY-MM> <标题> <模板名>
```

参数说明:

-   YYYY-MM: 发布月份(可选)
-   标题: 周刊标题(必填)
-   模板名: 可选(common|interview|web|ui|prompt|blogs)

示例:

```bash
pnpm create-weekly "第 1 期 - 前端周刊"
pnpm create-weekly 2024-03 "第 2 期 - 面试专题" interview
pnpm create-weekly "第 3 期 - Web 开发" web
```

### 2. 博客创建工具 (create-blog)

创建规范化的博客文章:

```bash
pnpm create-blog "文章标题"
```

功能特点:

-   自动生成合适的文件名
-   添加必要的 frontmatter
-   设置默认模板
-   自动分类存储

### 3. 图片处理工具 (convertImages)

批量处理和优化图片资源:

```bash
ts-node scripts/convertImages.ts <目录路径>
```

功能特性:

-   支持多种图片格式转换
-   智能压缩算法
-   保持图片质量
-   自动重命名规范化
-   支持批量处理

### 4. 内容部署工具 (upload)

自动化内容部署流程:

```bash
ts-node scripts/upload.ts
```

功能特性:

-   增量内容更新
-   自动备份
-   部署状态检查
-   错误重试机制

## 项目结构

weekly/
├── app/ # Next.js 应用目录
│ ├── api/ # API 路由
│ ├── blogs/ # 博客页面
│ ├── tag/ # 标签页面
│ └── weekly/ # 周刊页面
├── sections/ # 周刊内容目录
│ ├── 2024-08/ # 按月份组织
│ └── 2024-07/ # 历史内容
├── scripts/ # 工具脚本
│ ├── convertImages.ts
│ └── upload.ts
├── bin/ # 命令行工具
│ ├── create-weekly.mjs
│ └── create-blog.mjs
└── components/ # React 组件

## 自动化部署

项目采用 GitHub Actions 实现 CI/CD:

1. 代码提交触发构建
2. 自动运行测试
3. 构建生产版本
4. 部署到服务器
5. 部署状态通知

## 开发计划

### 已完成

-   [x] Sentry 错误追踪
-   [x] 标签系统
-   [x] 统计分析集成

### 进行中

-   [ ] 404 页面优化
-   [ ] 周刊导航改进
-   [ ] CSS Demo 支持
-   [ ] RSS 订阅功能
-   [ ] AI 内容生成

## 许可证

MIT License
