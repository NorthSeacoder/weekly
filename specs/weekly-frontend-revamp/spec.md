# Feature Specification: 周刊前端视觉改造

**Workspace**: `weekly-frontend-revamp`  
**Created**: 2026-05-25  
**Status**: Draft  
**Input**: 去除截图依赖，建立统一封面模板 + 纯文本内容卡片，配合 Admin 自动化方案

---

## User Scenarios & Testing

### User Story 1 - 周刊列表页统一封面 (Priority: P1)

作为周刊读者，我希望在列表页看到风格统一的封面卡片，以便快速浏览各期周刊。

**Why this priority**: 列表页是首屏入口，封面不统一是当前最大视觉痛点。

**Acceptance Scenarios**:

1. **[US1-1] 新期次渲染模板封面**
   **Given** 数据库中某期 `weekly_issues.cover` 为 JSON 模板配置  
   **When** 用户访问首页或 `/weekly` 列表页  
   **Then** 该期显示 SVG 渐变封面，包含期数标题和日期范围

2. **[US1-2] 旧期次渲染模板封面（回填后）**
   **Given** 旧期 cover 已通过迁移脚本回填为 default 模板 JSON  
   **When** 用户访问列表页  
   **Then** 所有历史期次显示统一的蓝紫渐变封面

3. **[US1-3] 封面响应式适配**
   **Given** 用户使用移动端设备  
   **When** 访问列表页  
   **Then** 封面卡片自适应为单列布局，SVG 保持清晰

**Edge Cases**:

- **[US1-4]** cover 字段为 NULL 时，自动生成 default 模板配置（基于 issue_number + start_date/end_date）
- **[US1-5]** cover JSON 解析失败时，降级为 default 模板而非显示空白

### User Story 2 - 详情页纯文本内容卡片 (Priority: P1)

作为周刊读者，我希望在详情页看到结构清晰的纯文本内容卡片（标题 + 摘要 + 标签），无需等待截图加载。

**Why this priority**: 详情页是核心阅读体验，去截图后需要新的信息承载方式。

**Acceptance Scenarios**:

1. **[US2-1] 内容卡片展示 AI 摘要**
   **Given** 某条内容的 `summary` 字段有值（由 Admin AI 评分流程写入）  
   **When** 用户查看该期周刊详情页  
   **Then** 卡片显示标题、摘要文本、分类标签、来源域名

2. **[US2-2] 内容卡片展示核心观点**
   **Given** 某条内容的 `ai_metadata.key_points` 有值  
   **When** 用户查看详情页  
   **Then** 卡片在摘要下方展示最多 3 条核心观点

3. **[US2-3] Featured 内容高亮**
   **Given** `weekly_content_items.featured = true`  
   **When** 用户查看详情页  
   **Then** 该卡片左侧显示高亮条 + "精选"标签

4. **[US2-4] 按分类分组展示**
   **Given** 一期周刊包含多个分类的内容  
   **When** 用户查看详情页  
   **Then** 内容按固定分类顺序分组，每组有分类标题

**Edge Cases**:

- **[US2-5]** summary 为空时，显示 content 的 description 字段兜底
- **[US2-6]** ai_metadata 为 NULL 或解析失败时，不显示核心观点区域（静默降级）
- **[US2-7]** 某分类下无内容时，该分类组不渲染

### User Story 3 - OG Image 静态生成 (Priority: P2)

作为周刊作者，我希望每期周刊在社交媒体分享时自动显示美观的预览图，无需手动制作。

**Why this priority**: 提升社交传播效果，但不阻塞核心阅读体验。

**Acceptance Scenarios**:

1. **[US3-1] 构建时生成 OG 图片**
   **Given** 项目执行 `pnpm build`  
   **When** 构建完成  
   **Then** `dist/og/weekly/[issueNumber].png` 存在，尺寸 1200x630

2. **[US3-2] HTML meta 标签正确引用**
   **Given** 用户访问某期周刊详情页  
   **When** 查看页面源码  
   **Then** `og:image` 和 `twitter:image` 指向 `/og/weekly/[issueNumber].png`

**Edge Cases**:

- **[US3-3]** 构建时 cover 配置缺失，使用 default 模板生成 OG 图片

### User Story 4 - 旧数据 Cover 统一迁移 (Priority: P2)

作为项目维护者，我希望通过一次性脚本将 700+ 期旧周刊的 cover 字段统一为 JSON 模板配置。

**Why this priority**: 确保列表页视觉一致性，消除旧 URL 截图的不稳定性。

**Acceptance Scenarios**:

1. **[US4-1] 脚本批量回填**
   **Given** 数据库中存在 cover 为 URL 字符串或 NULL 的旧期次  
   **When** 执行迁移脚本  
   **Then** 所有旧期次 cover 更新为 `{"type":"template","template":"default","title":"第 N 期","subtitle":"YYYY.MM.DD - YYYY.MM.DD","issueNumber":N}`

2. **[US4-2] 脚本幂等**
   **Given** 脚本已执行过一次  
   **When** 再次执行  
   **Then** 已是 JSON 模板的记录不被覆盖，无副作用

**Edge Cases**:

- **[US4-3]** start_date 或 end_date 为 NULL 时，subtitle 省略日期范围

---

## Requirements

### Functional Requirements

- **FR-001**: 系统必须提供 `WeeklyCover.astro` 组件，接受模板配置渲染 SVG 封面
- **FR-002**: 系统必须提供 `ContentCard.astro` 组件，展示纯文本内容卡片
- **FR-003**: `parseCover()` 工具函数必须兼容 JSON 模板配置和 NULL（降级为 default）
- **FR-004**: 详情页必须按固定分类顺序渲染内容分组
- **FR-005**: 构建时必须为每期周刊生成 1200x630 的 OG Image PNG
- **FR-006**: 迁移脚本必须将所有旧 cover 数据统一为 default 模板 JSON
- **FR-007**: RSS 输出必须使用 `summary` 字段作为内容描述

### Non-Functional Requirements

- **NFR-001**: 列表页 Lighthouse Performance 评分 ≥ 95（桌面端）
- **NFR-002**: 详情页首屏渲染无外部图片请求（纯 HTML + SVG）
- **NFR-003**: 封面 SVG 在任意分辨率下保持矢量清晰
- **NFR-004**: 迁移脚本执行时间 < 30s（700+ 条记录）

### Key Entities

- **WeeklyCoverConfig**: `{type, template, title, subtitle?, issueNumber, stats?}` — 封面模板配置
- **ContentCard Props**: `{title, summary, aiKeyPoints?, sourceUrl, category, tags, featured?}` — 内容卡片数据
- **Admin 数据源字段映射**:
  - `weekly_issues.cover` (VARCHAR 500) → JSON 字符串，由 `parseCover()` 解析
  - `contents.summary` → AI 摘要（Admin 评分流程写入）
  - `contents.ai_metadata` (JSON) → `{key_points: string[], dimensions: {...}, ...}`
  - `weekly_content_items.featured` → 精选标记
  - `weekly_content_items.sort_order` → 组内排序
  - `categories.sort_order` → 分类间排序

---

## Business Metrics

- **BM-001**: 列表页封面加载时间降低 80%+（SVG vs 截图 PNG）
- **BM-002**: 详情页首屏 LCP < 1.5s（去除截图后）
- **BM-003**: 社交分享点击率提升（有 OG Image vs 无预览图）

---

## Out of Scope

- 博客模块改造（已拆分为独立项目）
- 文件系统数据源（`sections/*.mdx`）的改造（仅作备份，不再维护）
- Admin 端 schema 变更（已完成）
- AI 评分/摘要生成逻辑（Admin 端职责）
- 封面模板的动态管理后台（当前写死 4 个模板即可）
- 暗色模式适配（后续迭代）

---

## Unclear Questions

无。所有关键歧义已在 clarify 阶段闭环。

---

## Stage Readiness

- 下一步建议：`plan`
- 阻塞项：无
