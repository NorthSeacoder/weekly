# Findings

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
