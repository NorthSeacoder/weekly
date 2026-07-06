# Findings

## Dependency Upgrade 2026-06-01
- 项目是 Astro 5 静态周刊站，核心链路为 `astro build`、MDX 内容、Tailwind 样式、搜索 modal、RSS、OG 图片生成。
- 工作区已有大量未提交改动；`package.json` 里 `@resvg/resvg-js` 与 `satori` 是已有 diff 新增依赖，不能视为可删除旧包。
- `pnpm` 版本为 11.1.3，提示 `package.json` 的 `pnpm.overrides` 已不再读取，应迁移到 `pnpm-workspace.yaml` 或对应新配置位置。
- `astro.config.ts` 已有改动：Sentry 集成变成只有 DSN 存在时才启用，这是合理的构建稳定性优化。
- `@sentry/replay` 在源码中没有直接导入；`sentry.client.config.js` 使用的是 `@sentry/astro` 暴露的 `replayIntegration()`，因此 `@sentry/replay` 很可能是冗余依赖。
- `node-cache` 只在 `lib/cache.ts` 使用，功能是进程内永不过期缓存 + in-flight 去重；可用原生 `Map` 替代，减少运行时依赖。
- `lodash.merge` 只在 `src/components/common/Metadata.astro` 与 `integration/utils/configBuilder.ts` 使用；可替代为更现代的小型 deep merge 包，或保留以降低风险。
- `unpic` 用于远程图片 URL 转换；若继续需要 CDN 图片优化，先保留更稳妥。
- `@astrojs/tailwind` 与 Tailwind 3 是当前样式体系核心；Tailwind 4/Vite 插件迁移会牵涉配置、PostCSS 与大量 `@apply`，不适合作为无确认的顺手替换。
- 用户要求不保守后，Tailwind 已迁移到 v4：Astro 配置改用 `@tailwindcss/vite`，CSS 入口改为 `@import "tailwindcss"` + `@config` 复用旧 TS 配置。
- Astro 6 移除了旧内容配置路径，`src/content/config.ts` 已迁移为 `src/content.config.ts`，源码引用同步更新。
- 旧 `postcss.config.js` 会加载已移除的 `autoprefixer`，Tailwind 4 Vite 插件不需要该配置，已删除。
- Tailwind 4 不允许在 `@apply` 中应用自定义组件类（如 `linear-badge`），已将相关类展开为原子 utility。
- `@astrolib/seo` 未声明支持 Astro 6，已替换为项目内原生 meta 输出；构建通过。
- `pnpm build` 通过；构建日志仍会出现数据库连接 `EPERM 100.113.231.101:3306`，这是当前沙箱网络限制，代码兜底后仍能完成静态构建。
- `astro check` 仍失败，错误集中在历史 archive、缺失 React/react-icons、数据库泛型、若干严格类型问题；不属于本次依赖迁移的构建阻塞。

## Initial
- 当前仓库是单包 `Astro` 站点，不是大型 monorepo。
- 目前可见模块集中在 `src/pages`、`src/components`、`src/utils`、`src/content`。
- 需要重点关注内容处理与静态页面生成链路，而不是先入为主地往通用构建流程里塞工具。

## Local Codebase
- `package.json` 显示项目核心是 `Astro 5` + `Tailwind`，内容来源同时包含 `MySQL`、`sections/*.mdx`、若干 `scripts/*.ts` 数据整理脚本。
- `src/utils/remark.ts` 使用 `unified + remark + rehype` 做 Markdown 到 HTML 的轻量转换，当前能力偏“内容编译/格式化”。
- `src/utils/contents/unified-content.ts` 只是统一包装 `WeeklyService`，主要职责是从数据库提取周刊及 section 数据。
- `src/pages/weekly/[...slug].astro` 与 `src/components/pages/SinglePost.astro` 表明详情页渲染的主体是数据库中的结构化 `sections`，并不是直接把原始 Markdown 交给页面端解析。
- `src/pages/search.json.ts` 只生成标题/描述/标签/日期的搜索索引，数据源是周刊 summary，而非全文内容。
- `src/pages/rss.xml.ts` 会把结构化 section 内容转成文本拼接到 RSS，属于内容导出链路。
- 结论倾向：若 `pretext` 的强项是“文本预处理/编译/转换”，它更可能落在导入、清洗、导出阶段，而不是列表页、UI 组件或数据库查询层。

## Pretext
- 官方仓库将 `pretext` 定义为“Pure JavaScript/TypeScript library for multiline text measurement & layout”，核心是用浏览器字体引擎 + canvas 测量来绕开 DOM 测量与 reflow。
- 核心 API 分成两类：
  - `prepare()` + `layout()`：预处理文本后，在不同宽度下快速计算段落高度和行数。
  - `prepareWithSegments()` + `layoutWithLines()` / `walkLineRanges()` / `layoutNextLine()`：拿到逐行布局结果，适合手工排版、动态换行、shrink-wrap、多列绕排。
- 官方 demo 聚焦在 `accordion`、`masonry`、`bubbles`、`editorial layout` 这类“文本布局驱动 UI”的场景，而不是 Markdown 解析、搜索、RSS、数据库内容处理。
- 当前 caveat 很明确：它还不是完整字体渲染引擎；目前目标场景是浏览器端文本布局；服务端支持仍是 “soon, server-side”；字体声明需要与 CSS 完整同步，且文档明确提到 `system-ui` 在 macOS 上不安全。

## Mapping
- `lib/content-service.ts`、`lib/structured-content.ts`、`scripts/create-weekly-item.ts` 这一类数据获取/解析/导入模块不适合接 `pretext`，因为它不解决内容存储、转换或结构化解析问题。
- `src/components/ui/StatCard.astro`、`src/components/pages/LatestWeeklyList.astro`、`src/components/pages/AllWeeklyList.astro` 当前只是静态卡片列表 + `line-clamp`，没有任何运行时文本测量瓶颈。
- `src/components/common/SearchModal.astro` 是目前最像 `pretext` 试验点的地方，但现状只是中等规模列表搜索，没有虚拟滚动、没有动态气泡/自动宽度布局、没有明显 reflow 热点，因此收益仍偏弱。
- `src/components/pages/SinglePost.astro` 在大屏使用 CSS columns 呈现高低不一的 section 卡片，表面上接近 masonry；但卡片高度受到图片、标签、评分徽标、边框、摘要共同影响，文本并不是唯一变量，所以 `pretext` 不能单独解决整体卡片布局问题。
