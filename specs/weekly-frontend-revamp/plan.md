# Implementation Plan: 周刊前端视觉改造

**Workspace**: `weekly-frontend-revamp` | **Date**: 2026-05-25 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/weekly-frontend-revamp/spec.md`

---

## Summary

去除截图依赖，用 SVG 模板封面 + 纯文本内容卡片替代当前的截图驱动展示。改造涉及 4 个模块层：类型定义、数据服务、UI 组件、构建时 OG 生成。核心策略是**渐进替换**——`parseCover()` 兼容层确保新旧数据共存，迁移脚本一次性统一旧数据。

---

## Architecture Overview

```
┌─ Build Time ─────────────────────────────────────────────────┐
│  OG Image Generator (satori + resvg)                         │
│  → dist/og/weekly/[issueNumber].png                          │
└──────────────────────────────────────────────────────────────┘

┌─ Pages ──────────────────────────────────────────────────────┐
│  index.astro → LatestWeeklyList.astro (改造)                  │
│  weekly/index.astro → AllWeeklyList.astro (改造)              │
│  weekly/[...slug].astro → SinglePost.astro (改造)             │
└──────────────────────────────────────────────────────────────┘
         ↓ 消费
┌─ Components (新增) ─────────────────────────────────────────┐
│  WeeklyCover.astro    — SVG 模板封面                          │
│  ContentCard.astro    — 纯文本内容卡片                        │
└──────────────────────────────────────────────────────────────┘
         ↓ 数据
┌─ Data Layer ─────────────────────────────────────────────────┐
│  unified-content.ts   — 接口不变                              │
│  content-service.ts   — cover 逻辑简化 + ai_metadata 解析     │
│  parseCover()         — JSON/NULL → WeeklyCoverConfig         │
└──────────────────────────────────────────────────────────────┘
         ↓ 读取
┌─ Database (Admin 已完成) ────────────────────────────────────┐
│  weekly_issues.cover  VARCHAR(500) — JSON 模板配置             │
│  contents.summary     TEXT — AI 摘要                          │
│  contents.ai_metadata JSON — {key_points, dimensions, ...}    │
│  weekly_content_items.featured / sort_order / section          │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### Decision 1: 封面渲染方案 — Astro 组件 + 内联 SVG

- **背景**: 需要替代截图，在列表页和详情页展示统一封面
- **选项**:
  - A: Astro 组件内联 SVG — 构建时生成，零运行时成本，矢量清晰
  - B: 前端 Canvas — 需 JS 加载，SEO 不友好
  - C: Cloudflare Workers — 增加外部依赖
- **结论**: 选 A。Astro SSG 天然契合，SVG 无分辨率问题
- **影响**: 封面样式调整需重新构建（可接受，周刊发布频率低）
- **来源**: Astro 组件模型，无需外部文档验证

### Decision 2: OG Image 生成 — satori + @resvg/resvg-js

- **背景**: 社交分享需要 1200x630 PNG 预览图
- **选项**:
  - A: `satori` + `@resvg/resvg-js` — JSX → SVG → PNG，纯 Node.js，构建时生成
  - B: `@vercel/og` — 封装了 satori，但绑定 Vercel 运行时
  - C: Puppeteer 截图 — 重，需要浏览器环境
- **结论**: 选 A。不绑定平台，构建时静态生成到 `public/og/`
- **影响**: 构建时间增加（预估 700 张 × ~200ms ≈ 2.5min），可通过增量构建优化
- **来源**: https://github.com/vercel/satori

### Decision 3: 分类顺序 — 常量文件 + categories.sort_order 兜底

- **背景**: 详情页按分类分组展示，需要固定顺序
- **选项**:
  - A: 纯写死常量
  - B: 读取 `categories.sort_order` 数据库字段
- **结论**: 选 B（数据库 sort_order），常量文件作为 fallback
- **影响**: Admin 后台可调整顺序，无需改前端代码
- **来源**: Admin Prisma schema `categories.sort_order Int @default(0)`

### Decision 4: AiMetadata 类型扩展

- **背景**: Admin 评分流程写入 `ai_metadata.key_points`，但当前 `types/ai.ts` 的 `AiMetadata` 接口未包含此字段
- **结论**: 扩展 `AiMetadata` 接口，新增 `key_points?: string[]`
- **影响**: 向后兼容，旧数据无此字段时为 undefined

---

## Module Design

### Module: parseCover 工具函数

**职责**: 将 `weekly_issues.cover` 字段（VARCHAR 字符串）解析为结构化配置

**改动概述**: 新增 `src/utils/contents/cover.ts`

**关键接口**:

```text
parseCover(raw: string | null | undefined, issue: {issueNumber: number, startDate: Date, endDate: Date})
  → WeeklyCoverConfig

逻辑:
  1. raw 为 null/undefined → 生成 default 模板配置
  2. raw 可 JSON.parse 且 type === 'template' → 返回解析结果
  3. JSON.parse 失败 → 视为旧 URL（迁移后不应出现），降级为 default 模板
```

**注意事项**:
- 迁移脚本执行后，分支 3 理论上不会触发，但保留作为防御
- 不再 fallback 到 `cover_image_url`（截图），迁移后所有期次都有 JSON 配置

---

### Module: WeeklyCover.astro

**职责**: 渲染 SVG 渐变封面

**改动概述**: 新增 `src/components/widgets/WeeklyCover.astro`

**关键接口**:

```text
Props:
  config: WeeklyCoverConfig
  variant: 'card' | 'hero'  (card=列表卡片 600x315, hero=详情页头图 1200x630)

输出: 内联 SVG，包含渐变背景 + 期数标题 + 日期副标题 + 装饰元素
```

**注意事项**:
- SVG `id` 需要唯一（用 issueNumber 区分），避免同页多个封面 gradient 冲突
- 不需要 `og` variant — OG 图片由独立的 satori 流程生成 PNG

---

### Module: ContentCard.astro

**职责**: 渲染纯文本内容卡片（替代截图卡片）

**改动概述**: 新增 `src/components/common/ContentCard.astro`

**关键接口**:

```text
Props:
  section: Section (现有类型，已包含 summary/ai_metadata/source_url/category/tags)
  featured?: boolean (来自 weekly_content_items.featured)

渲染:
  - 分类标签 (彩色 badge)
  - 标题 (链接到 source_url)
  - 摘要 (section.summary)
  - 核心观点 (section.ai_metadata.key_points，最多 3 条)
  - 标签 (section.tags，最多 4 个)
  - 元信息 (来源域名 + 阅读时间)
  - Featured 高亮 (左侧色条 + 精选标签)
```

**注意事项**:
- 复用现有 `Section` 类型，不引入新的 Props 接口
- `ai_metadata` 需要类型断言（当前类型为 `AiMetadata | unknown | null`）
- 摘要兜底链: `section.summary ?? section.description ?? ''`

---

### Module: content-service.ts 改造

**职责**: 简化 cover 计算逻辑，暴露 featured/sort_order 信息

**改动概述**: 修改现有 `WeeklyService` 方法

**关键变更**:

```text
1. getWeeklyPostSummaries():
   - 移除 cover_image_url 子查询（不再需要截图 fallback）
   - cover 直接取 issue.cover 原始值，由前端 parseCover() 处理

2. getWeeklyPostBySlugWithSections() / getWeeklyPosts():
   - 移除 computedCover 逻辑（不再 fallback 到 section.image_url）
   - 新增 featured 字段到 Section 返回值
   - 新增 sort_order 到排序逻辑
   - 解析 ai_metadata JSON，提取 key_points

3. 新增: getCategories() 
   - 返回 categories 列表（含 sort_order），供详情页分组排序
```

**注意事项**:
- `image_url` 和 `screenshot_api` 字段保留在 Section 类型中（不删除），但前端不再渲染
- 向后兼容：如果 `ai_metadata` 为 null，`key_points` 为 undefined

---

### Module: OG Image 静态生成

**职责**: 构建时为每期周刊生成 PNG 预览图

**改动概述**: 新增 `src/pages/og/weekly/[issueNumber].png.ts`

**关键接口**:

```text
Astro 静态端点:
  getStaticPaths() → 所有 issue_number
  GET() → 用 satori 渲染 JSX → SVG → @resvg/resvg-js 转 PNG → Response

依赖:
  - satori (JSX → SVG)
  - @resvg/resvg-js (SVG → PNG)
  - Inter 字体文件 (构建时加载)
```

**注意事项**:
- Astro 静态端点在 `output: 'static'` 模式下构建时执行
- 字体文件放 `src/assets/fonts/Inter-Bold.woff`，构建时读取
- 700+ 张图片构建时间可接受（并行生成）

---

### Module: 列表页改造 (LatestWeeklyList + AllWeeklyList)

**职责**: 用 WeeklyCover 替代截图 img

**改动概述**: 修改现有组件

**关键变更**:

```text
LatestWeeklyList.astro:
  - featuredWeekly 区域: 用 WeeklyCover variant="hero" 替代 cover img
  - latestWeeklyGrid: 用 WeeklyCover variant="card" 替代 cover img

AllWeeklyList.astro:
  - 年份分组列表: 每个卡片用 WeeklyCover variant="card"
```

---

### Module: 详情页改造 (SinglePost.astro)

**职责**: 用 ContentCard 替代截图式 section 渲染

**改动概述**: 改造 `SinglePost.astro` 的 sections 渲染区域

**关键变更**:

```text
1. 头部: 添加 WeeklyCover variant="hero"
2. sections 渲染:
   - 按 category 分组（使用 categories.sort_order 排序）
   - 每组渲染分类标题 + ContentCard 列表
   - 替代当前的 structuredContent 渲染方式
3. 移除: image_url 相关的 img 渲染逻辑
```

---

### Module: 迁移脚本

**职责**: 一次性将旧 cover 数据统一为 default 模板 JSON

**改动概述**: 新增 `scripts/migrate-cover-to-template.ts`

**关键逻辑**:

```text
1. 查询所有 weekly_issues（cover 为 NULL 或非 JSON 格式）
2. 对每条记录生成:
   {"type":"template","template":"default","title":"第 N 期","subtitle":"YYYY.MM.DD - YYYY.MM.DD","issueNumber":N}
3. 批量 UPDATE（每 50 条一批，事务保护）
4. 幂等: 已是合法 JSON 模板的记录跳过
5. start_date/end_date 为 NULL 时省略 subtitle
```

---

## Data Model

不需要独立 `data-model.md`。原因：
- 数据库 schema 由 Admin 端管理，Weekly 只读消费
- 本次改动不涉及 schema 变更，只涉及类型定义扩展

**类型变更汇总**:

```typescript
// types/ai.ts — 扩展 AiMetadata
interface AiMetadata {
  // ...existing fields
  key_points?: string[];  // 新增
}

// types/weekly.ts — 新增 WeeklyCoverConfig
interface WeeklyCoverConfig {
  type: 'template';
  template: 'default' | 'gradient-blue' | 'gradient-purple' | 'gradient-orange';
  title: string;
  subtitle?: string;
  issueNumber: number;
}

// Section — 新增 featured
type Section = {
  // ...existing fields
  featured?: boolean;  // 新增，来自 weekly_content_items.featured
}
```

---

## Project Structure

```text
src/
├── components/
│   ├── common/
│   │   └── ContentCard.astro          ← 新增
│   ├── widgets/
│   │   └── WeeklyCover.astro          ← 新增
│   └── pages/
│       ├── LatestWeeklyList.astro     ← 改造
│       ├── AllWeeklyList.astro        ← 改造
│       └── SinglePost.astro           ← 改造
├── pages/
│   └── og/
│       └── weekly/
│           └── [issueNumber].png.ts   ← 新增 (OG Image)
├── utils/
│   └── contents/
│       └── cover.ts                   ← 新增 (parseCover)
├── constants/
│   └── categories.ts                  ← 新增 (分类顺序 fallback)
├── assets/
│   └── fonts/
│       └── Inter-Bold.woff            ← 新增 (OG 字体)
├── layouts/
│   └── Layout.astro                   ← 改造 (og:image meta)
types/
├── ai.ts                              ← 改造 (key_points)
└── weekly.ts                          ← 改造 (WeeklyCoverConfig, Section.featured)
lib/
└── content-service.ts                 ← 改造 (简化 cover, 暴露 featured)
scripts/
└── migrate-cover-to-template.ts       ← 新增
```

---

## Risks and Tradeoffs

| 风险 | 影响 | 缓解 |
|------|------|------|
| OG 构建时间增加 ~2.5min | CI/CD 变慢 | 可后续加增量构建（只生成新期次），MVP 先全量 |
| SVG 字体渲染差异 | 不同浏览器文字位置微偏 | 使用 system-ui fallback，关键文字用 `text-anchor: middle` |
| 详情页视觉单调 | 去截图后长列表疲劳 | featured 高亮 + 分类色彩 + key_points 层次感 |
| 迁移脚本执行风险 | 误覆盖已有 JSON 配置 | 幂等设计 + dry-run 模式 + 事务回滚 |
| SinglePost 改造范围大 | 可能影响现有渲染逻辑 | 分步改造：先加 ContentCard，再移除旧逻辑 |

---

## Verification Strategy

| 阶段 | 验证方式 |
|------|---------|
| 组件开发 | `pnpm dev` 本地预览，手动检查封面/卡片渲染 |
| 数据层 | 单元测试 parseCover()，mock 数据验证 content-service 返回 |
| 迁移脚本 | dry-run 模式输出变更预览，小批量验证后全量执行 |
| OG Image | 构建后检查 `dist/og/weekly/*.png` 文件存在且尺寸正确 |
| 列表页 | 浏览器对比改造前后截图，确认视觉一致性 |
| 详情页 | 抽样 3-5 期（新期 + 旧期 + 空摘要期），验证各场景渲染 |
| 性能 | Lighthouse Desktop Performance ≥ 95 |
| RSS | 验证 `/rss.xml` 输出包含 summary 文本 |

---

## Stage Readiness

- 是否需要 `data-model.md`：不需要（Weekly 只读消费 Admin schema，无独立 DDL）
- 下一步建议：`tasks`
- 阻塞项：无

---

## Sources

| 决策 | 来源 URL | 备注 |
|------|---------|------|
| satori JSX→SVG | https://github.com/vercel/satori | OG Image 生成核心库 |
| @resvg/resvg-js | https://github.com/nicolo-ribaudo/resvg-js | SVG→PNG 转换 |
| Astro 静态端点 | https://docs.astro.build/en/guides/endpoints/ | OG 端点模式 |
| categories.sort_order | Admin Prisma schema 实际字段 | 分类排序依据 |
