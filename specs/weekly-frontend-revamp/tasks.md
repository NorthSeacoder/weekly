# Tasks: 周刊前端视觉改造

**Workspace**: `weekly-frontend-revamp` | **Date**: 2026-05-25  
**Input**: `specs/weekly-frontend-revamp/spec.md` + `plan.md`  
**Prerequisites**: spec.md (已完成), plan.md (已完成)

---

## 执行原则

- 按依赖顺序：类型 → 工具函数 → 组件 → 数据层 → 页面集成 → 构建扩展 → 迁移
- 每个 Phase 结束有明确的验证点
- Phase 1-3 可在无数据库连接的情况下开发（mock 数据）
- Phase 4+ 需要数据库环境

---

## Phase 1: 类型与工具函数

**目标**: 建立类型基础和 cover 解析能力

- [ ] T001 [US1] 扩展 WeeklyCoverConfig 类型定义
  - scope: `types/weekly.ts` — 新增 `WeeklyCoverConfig` 接口和模板枚举
  - verify: `pnpm build` 无类型错误

- [ ] T002 [US2] 扩展 AiMetadata 类型，新增 key_points
  - scope: `types/ai.ts` — `AiMetadata` 接口新增 `key_points?: string[]`
  - verify: `pnpm build` 无类型错误

- [ ] T003 [US2] Section 类型新增 featured 字段
  - scope: `types/weekly.ts` — `Section` 新增 `featured?: boolean`
  - verify: `pnpm build` 无类型错误

- [ ] T004 [US1] 实现 parseCover 工具函数
  - scope: 新增 `src/utils/contents/cover.ts`
  - 逻辑: null/undefined → default 配置; JSON 合法 → 解析; 其他 → default 降级
  - verify: 编写 3 个测试用例（null、合法 JSON、非法字符串），手动或脚本验证

- [ ] T005 [US2] 新增分类顺序常量
  - scope: 新增 `src/constants/categories.ts` — 导出 `CATEGORY_SORT_ORDER` fallback 数组
  - verify: 文件存在，导出类型正确

---

## Phase 2: UI 组件

**目标**: 完成两个核心新组件，可独立预览

- [ ] T006 [US1] 实现 WeeklyCover.astro 组件
  - scope: 新增 `src/components/widgets/WeeklyCover.astro`
  - Props: `config: WeeklyCoverConfig`, `variant: 'card' | 'hero'`
  - 渲染: SVG 渐变背景 + 标题 + 副标题 + 装饰元素
  - verify: `pnpm dev` 创建临时测试页，传入 mock config 预览 card/hero 两种尺寸

- [ ] T007 [US2] 实现 ContentCard.astro 组件
  - scope: 新增 `src/components/common/ContentCard.astro`
  - Props: `section: Section`, `featured?: boolean`
  - 渲染: 分类标签 + 标题链接 + 摘要 + key_points + tags + 元信息 + featured 高亮
  - verify: `pnpm dev` 创建临时测试页，传入 mock section 数据预览正常/featured/无摘要三种状态

---

## Phase 3: 数据层改造

**目标**: content-service 输出适配新组件消费

- [ ] T008 [US1] 简化 getWeeklyPostSummaries 的 cover 逻辑
  - scope: `lib/content-service.ts` — `getWeeklyPostSummaries()` 方法
  - 变更: 移除 `cover_image_url` 子查询，cover 直接取 `issue.cover` 原始值
  - verify: `pnpm dev` 首页正常加载，cover 字段为原始 JSON 字符串或 null

- [ ] T009 [US2] getWeeklyPostBySlugWithSections 暴露 featured + 简化 cover
  - scope: `lib/content-service.ts` — `getWeeklyPostBySlugWithSections()` 方法
  - 变更: 
    - 移除 `computedCover` fallback 逻辑
    - Section 返回值新增 `featured` (来自 `wci.featured`)
    - 解析 `ai_metadata` 确保 `key_points` 可访问
  - verify: `pnpm dev` 详情页数据包含 featured 标记和 key_points

- [ ] T010 [US2] 新增 getCategories 方法
  - scope: `lib/content-service.ts` — 新增静态方法
  - 返回: `{id, name, slug, sort_order}[]`，按 sort_order 升序
  - verify: 方法可调用，返回分类列表

- [ ] T011 [US1/US2] 同步简化 getWeeklyPosts / getLatestWeeklyPostsWithSections
  - scope: `lib/content-service.ts` — 其余 WeeklyService 方法
  - 变更: 统一移除 `computedCover` 和 `cover_image_url` 逻辑
  - verify: `pnpm build` 成功，无运行时错误

---

## Phase 4: 页面集成

**目标**: 列表页和详情页使用新组件渲染

- [ ] T012 [US1] 改造 LatestWeeklyList.astro
  - scope: `src/components/pages/LatestWeeklyList.astro`
  - 变更: 引入 WeeklyCover + parseCover，替代原有 cover img 渲染
  - verify: `pnpm dev` 首页封面显示为 SVG 渐变模板

- [ ] T013 [US1] 改造 AllWeeklyList.astro
  - scope: `src/components/pages/AllWeeklyList.astro`
  - 变更: 年份分组列表中每个卡片使用 WeeklyCover variant="card"
  - verify: `pnpm dev` `/weekly` 页面所有卡片显示统一封面

- [ ] T014 [US2] 改造 SinglePost.astro 详情页
  - scope: `src/components/pages/SinglePost.astro`
  - 变更:
    - 头部添加 WeeklyCover variant="hero"
    - sections 按 category 分组（使用 getCategories sort_order）
    - 每条 section 用 ContentCard 渲染
    - 移除旧的 image_url / structuredContent 渲染逻辑
  - verify: `pnpm dev` 详情页显示分组卡片，featured 有高亮，key_points 正常展示

- [ ] T015 [US1] Layout.astro 添加 og:image meta 标签
  - scope: `src/layouts/Layout.astro` 或 `src/layouts/PageLayout.astro`
  - 变更: 周刊详情页 head 中添加 `og:image` 和 `twitter:image` 指向 `/og/weekly/[issueNumber].png`
  - verify: 查看页面源码，meta 标签正确

---

## Phase 5: OG Image + RSS

**目标**: 社交分享预览图和 RSS 输出优化

- [ ] T016 [US3] 安装 satori + @resvg/resvg-js 依赖
  - scope: `package.json`
  - 新增: `satori`, `@resvg/resvg-js`
  - 新增: `src/assets/fonts/Inter-Bold.woff` 字体文件
  - verify: `pnpm install` 成功，依赖可 import

- [ ] T017 [US3] 实现 OG Image 静态生成端点
  - scope: 新增 `src/pages/og/weekly/[issueNumber].png.ts`
  - 逻辑: getStaticPaths 遍历所有期次 → satori 渲染封面 JSX → resvg 转 PNG → Response
  - verify: `pnpm build` 后 `dist/og/weekly/` 目录存在 PNG 文件，抽样检查尺寸 1200x630

- [ ] T018 [US2] RSS 输出使用 summary 替代 structuredContent
  - scope: `src/pages/rss.xml.ts`
  - 变更: `description` 使用 `post.desc || section summaries`，`content` 保留 structuredContent 兜底
  - verify: `pnpm build` 后检查 `dist/rss.xml` 内容描述为文本摘要

---

## Phase 6: 迁移与验收

**目标**: 旧数据统一 + 全量验证

- [ ] T019 [US4] 实现 cover 迁移脚本
  - scope: 新增 `scripts/migrate-cover-to-template.ts`
  - 功能: 查询 cover 非 JSON 的记录 → 生成 default 模板 JSON → 批量 UPDATE
  - 支持: `--dry-run` 模式、幂等、事务、start_date 为 NULL 时省略 subtitle
  - verify: `--dry-run` 输出变更预览，确认逻辑正确

- [ ] T020 [US4] 执行迁移脚本
  - scope: 数据库
  - 前置: T019 dry-run 验证通过
  - verify: 查询 `SELECT COUNT(*) FROM weekly_issues WHERE cover NOT LIKE '{%}'` 结果为 0

- [ ] T021 全量构建验证
  - scope: 整个项目
  - 验证清单:
    - `pnpm build` 成功无错误
    - 首页封面渲染正确
    - `/weekly` 列表页所有卡片统一
    - 详情页（抽样 3 期）分组卡片正常
    - OG 图片存在且尺寸正确
    - RSS 输出包含文本摘要
    - Lighthouse Desktop Performance ≥ 95
  - verify: 以上全部通过

- [ ] T022 清理临时测试页
  - scope: Phase 2 创建的临时预览页面
  - verify: 无多余测试文件残留

---

## 依赖与顺序

```text
T001─T003 (类型) ──→ T004─T005 (工具) ──→ T006─T007 (组件) ──→ T008─T011 (数据层)
                                                                       ↓
                                              T012─T015 (页面集成) ←────┘
                                                       ↓
                                              T016─T018 (OG + RSS)
                                                       ↓
                                              T019─T022 (迁移 + 验收)
```

**关键路径**: T001 → T004 → T006 → T008 → T012 → T014 → T021

**可并行**:
- T006 (WeeklyCover) 和 T007 (ContentCard) 互不依赖
- T016-T017 (OG) 和 T018 (RSS) 互不依赖
- T019 (迁移脚本) 可与 Phase 4-5 并行开发

---

## 覆盖检查

| 场景 / 需求 | 对应任务 |
|-------------|----------|
| US1-1 新期次模板封面 | T004, T006, T008, T012 |
| US1-2 旧期次统一封面 | T019, T020 |
| US1-3 响应式适配 | T006 (SVG viewBox 天然响应式) |
| US1-4 cover NULL 降级 | T004 |
| US1-5 JSON 解析失败降级 | T004 |
| US2-1 AI 摘要展示 | T002, T007, T009, T014 |
| US2-2 核心观点展示 | T002, T007, T009, T014 |
| US2-3 Featured 高亮 | T003, T007, T009, T014 |
| US2-4 分类分组 | T005, T010, T014 |
| US2-5 摘要为空兜底 | T007 |
| US2-6 ai_metadata NULL 降级 | T007 |
| US2-7 空分类不渲染 | T014 |
| US3-1 OG 构建生成 | T016, T017 |
| US3-2 meta 标签引用 | T015 |
| US3-3 OG 配置缺失降级 | T017 |
| US4-1 脚本批量回填 | T019, T020 |
| US4-2 脚本幂等 | T019 |
| US4-3 日期为 NULL | T019 |
| NFR-001 Lighthouse ≥ 95 | T021 |
| NFR-002 无外部图片请求 | T014 (移除 image_url 渲染) |
| FR-007 RSS 使用 summary | T018 |

---

## Notes

- Phase 2 的临时测试页用于组件独立开发验证，Phase 6 结束后清理
- 迁移脚本（T019-T020）建议在 Phase 4 页面集成验证通过后再执行，确保新组件能正确消费 JSON 配置
- 如果 OG 构建时间过长（>5min），可将 T017 改为仅生成最近 50 期，旧期次按需生成

---

## Stage Readiness

- 推荐下一步：`execute-plan`（任务较多，22 个任务分 6 个 Phase，需要控节奏）
- 阻塞项：无
