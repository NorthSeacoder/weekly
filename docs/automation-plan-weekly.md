# Weekly 项目 - 周刊前端改造方案

> 配合 Admin 后端自动化方案的前端改造计划

## 项目职责

Weekly (Astro) 项目负责:
- 周刊网站前端展示 (列表页 / 详情页)
- 博客内容展示
- 双数据源支持 (文件系统 / MySQL)
- RSS 订阅
- SEO 和静态生成

> **配套方案**: Admin 项目的自动化方案见 `weekly/admin/docs/automation-plan-admin.md`

## 核心目标

**去除截图依赖,建立统一视觉风格**

当前痛点:
- 周刊列表页依赖封面图(取第一条内容截图,不统一)
- 周刊详情页每条内容都需要截图
- Karakeep 截图 API 不稳定
- 手动截图上传耗时耗力

改造目标:
- 列表页: 统一封面模板 + 动态标题(参考 BestBlogs / TLDR)
- 详情页: 纯文本卡片(参考 TLDR, ByteByteGo)
- 视觉一致性 + 加载速度提升

## 改造架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Weekly 前端展示层                          │
├─────────────────────────────────────────────────────────────┤
│  src/pages/                                                  │
│    ├── index.astro          (首页 - 周刊列表)                 │
│    ├── weekly/              (周刊详情页)                      │
│    │   └── [...slug].astro                                   │
│    └── blog/                (博客页面)                        │
│                                                              │
│  src/components/                                             │
│    ├── widgets/                                              │
│    │   └── WeeklyCover.astro  (新增 - 统一封面组件)           │
│    ├── pages/                                                │
│    │   ├── WeeklyList.astro   (改造 - 列表卡片)              │
│    │   └── WeeklyDetail.astro (改造 - 详情卡片)              │
│    └── common/                                               │
│        └── ContentCard.astro  (新增 - 纯文本内容卡片)         │
└─────────────────────────────────────────────────────────────┘
                            ↑
                  消费 Admin 提供的数据
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              数据源层 (双源支持)                              │
├─────────────────────────────────────────────────────────────┤
│  filesystem: sections/YYYY-MM/*.mdx                          │
│  database:   MySQL (与 Admin 共享)                           │
│    • weekly_issues.cover (改为 JSON 配置)                    │
│    • contents.image_url  (改为可选)                          │
│    • contents.ai_summary (新增, 用于详情页摘要)              │
└─────────────────────────────────────────────────────────────┘
```

## 阶段一: 统一封面系统

### 1.1 封面配置数据结构

```typescript
// types/weekly.ts 扩展
export interface WeeklyCoverConfig {
  type: 'template';
  template: 'default' | 'gradient-blue' | 'gradient-purple' | 'gradient-orange';
  title: string;        // "第 N 期"
  subtitle?: string;    // 日期范围 "2026.05.15 - 2026.05.22"
  issueNumber: number;
  stats?: {
    itemCount: number;
    topCategories?: string[];
  };
}

// 兼容旧数据(URL 字符串)和新数据(JSON 配置)
export type CoverField = string | WeeklyCoverConfig;

export function parseCover(cover: string | null): WeeklyCoverConfig | { url: string } | null {
  if (!cover) return null;
  try {
    const parsed = JSON.parse(cover);
    if (parsed.type === 'template') return parsed as WeeklyCoverConfig;
  } catch {
    // 旧数据是 URL 字符串
  }
  return { url: cover };
}
```

### 1.2 封面设计规范

#### 默认模板 (default)
- **背景**: 渐变 `#667eea` → `#764ba2`
- **主标题**: "第 N 期" (Inter Bold, 72px, 白色)
- **副标题**: 日期范围 (Inter Regular, 24px, 白色 80% 透明度)
- **装饰元素**: 右下角简约几何图形 (圆 + 三角)
- **尺寸**: 1200×630 (适配 OG Image / 社交分享)

#### 备选模板
| 模板 | 主色 | 渐变 | 用途 |
|------|------|------|------|
| `gradient-blue` | 蓝 | `#4facfe` → `#00f2fe` | 默认/常规期 |
| `gradient-purple` | 紫 | `#667eea` → `#764ba2` | 重要期/年终 |
| `gradient-orange` | 橙 | `#fa709a` → `#fee140` | 节日特刊 |

#### AI 辅助设计 Prompt

需要新模板时使用:

```
设计一个技术周刊的封面模板,要求:
1. 简约现代风格,适合技术内容
2. 使用渐变背景,主色调为 [颜色]
3. 预留标题区域 (第 N 期) 和日期区域
4. 尺寸 1200x630,适配社交媒体分享
5. 可包含简约的几何装饰元素
6. 整体风格与 weekly.mengpeng.tech 一致
```

### 1.3 实现方案选型

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **A. Astro 组件 (SVG)** | 静态生成, 无运行时成本, 可被搜索引擎抓取 | 调整需重新构建 | ⭐⭐⭐⭐⭐ |
| B. 前端 Canvas | 灵活, 可动态调整 | SEO 不友好, 需 JS 加载 | ⭐⭐⭐ |
| C. Cloudflare Workers | 边缘生成, 可缓存为图片 | 增加外部依赖 | ⭐⭐⭐ |

**推荐方案 A**: 使用 Astro 组件 + SVG 内联渲染

理由:
- Astro 静态生成, 性能最佳
- SVG 矢量, 任意尺寸清晰
- OG Image 可通过 `astro-og-image` 等集成生成 PNG 副本
- 与现有 Astro 架构契合度最高

### 1.4 组件实现

```astro
---
// src/components/widgets/WeeklyCover.astro
import type { WeeklyCoverConfig } from '~/types/weekly';

interface Props {
  config: WeeklyCoverConfig;
  variant?: 'card' | 'hero' | 'og';  // card=列表卡片, hero=详情页头图, og=社交分享
}

const { config, variant = 'card' } = Astro.props;

const TEMPLATES = {
  'default':          { from: '#667eea', to: '#764ba2' },
  'gradient-blue':    { from: '#4facfe', to: '#00f2fe' },
  'gradient-purple':  { from: '#667eea', to: '#764ba2' },
  'gradient-orange':  { from: '#fa709a', to: '#fee140' },
};

const colors = TEMPLATES[config.template] ?? TEMPLATES.default;
const dimensions = {
  card: { w: 600, h: 315 },
  hero: { w: 1200, h: 630 },
  og:   { w: 1200, h: 630 },
};
const { w, h } = dimensions[variant];
---

<svg viewBox={`0 0 ${w} ${h}`} class="weekly-cover" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id={`grad-${config.issueNumber}`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color={colors.from} />
      <stop offset="100%" stop-color={colors.to} />
    </linearGradient>
  </defs>
  <rect width={w} height={h} fill={`url(#grad-${config.issueNumber})`} />

  <!-- 主标题 -->
  <text x={w / 2} y={h / 2 - 20} text-anchor="middle"
        font-family="Inter, system-ui" font-size={w * 0.12} font-weight="700"
        fill="white">
    {config.title}
  </text>

  <!-- 副标题 -->
  {config.subtitle && (
    <text x={w / 2} y={h / 2 + 40} text-anchor="middle"
          font-family="Inter, system-ui" font-size={w * 0.04}
          fill="white" fill-opacity="0.85">
      {config.subtitle}
    </text>
  )}

  <!-- 装饰元素: 右下角几何图形 -->
  <circle cx={w - 80} cy={h - 80} r="40" fill="white" fill-opacity="0.1" />
  <circle cx={w - 40} cy={h - 40} r="20" fill="white" fill-opacity="0.15" />
</svg>

<style>
  .weekly-cover {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 8px;
  }
</style>
```

### 1.5 OG Image 生成

集成 `@astrojs/og` 或 `satori` 生成静态 OG 图片:

```typescript
// src/pages/og/weekly/[issueNumber].png.ts
import { ImageResponse } from '@vercel/og';
import { getWeeklyByIssueNumber } from '~/lib/content-service';

export async function GET({ params }) {
  const issue = await getWeeklyByIssueNumber(Number(params.issueNumber));
  const cover = parseCover(issue.cover);

  return new ImageResponse(
    /* JSX 渲染同 WeeklyCover.astro 的 og variant */,
    { width: 1200, height: 630 }
  );
}
```

## 阶段二: 列表页改造

### 2.1 当前实现问题

```astro
<!-- 当前: 依赖 issue.coverImage 截图 -->
<img src={issue.coverImage} alt={issue.title} />
```

问题:
- 截图失败时显示破图
- 不同期数封面风格不统一
- 加载图片资源拖慢首屏

### 2.2 改造后实现

```astro
---
// src/components/pages/WeeklyList.astro
import WeeklyCover from '~/components/widgets/WeeklyCover.astro';
import { parseCover } from '~/utils/contents/cover';

interface Props {
  issues: WeeklyIssue[];
}
const { issues } = Astro.props;
---

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {issues.map((issue) => {
    const cover = parseCover(issue.cover) ?? {
      type: 'template',
      template: 'default',
      title: `第 ${issue.issueNumber} 期`,
      subtitle: formatDateRange(issue.startDate, issue.endDate),
      issueNumber: issue.issueNumber,
    };

    return (
      <a href={`/weekly/${issue.slug}`} class="group block">
        <div class="overflow-hidden rounded-lg border bg-white shadow-sm transition hover:shadow-md">
          {cover.type === 'template' ? (
            <WeeklyCover config={cover} variant="card" />
          ) : (
            <img src={cover.url} alt={issue.title} loading="lazy" class="aspect-[600/315] w-full object-cover" />
          )}
          <div class="p-4">
            <h3 class="font-semibold group-hover:text-blue-600">{issue.title}</h3>
            <p class="mt-1 text-sm text-gray-500">
              {issue.itemCount} 条内容 · {formatDate(issue.publishedAt)}
            </p>
          </div>
        </div>
      </a>
    );
  })}
</div>
```

## 阶段三: 详情页改造

### 3.1 当前实现问题

每条内容卡片都依赖 `image_url` (截图)。

### 3.2 改造方向: 纯文本卡片

参考 [TLDR](https://tldr.tech/) 和 [ByteByteGo](https://blog.bytebytego.com/) 的设计:

```astro
---
// src/components/common/ContentCard.astro
interface Props {
  content: {
    title: string;
    summary: string;        // AI 生成摘要(优先) 或人工摘要
    aiSummary?: string;     // Admin 端 Hermes 生成
    aiKeyPoints?: string[]; // 核心观点
    sourceUrl: string;
    category: { name: string; slug: string };
    tags: string[];
    publishedAt: Date;
    readingTime?: number;
    featured?: boolean;
  };
}

const { content } = Astro.props;
const summary = content.aiSummary ?? content.summary;
---

<article class:list={[
  'rounded-lg border bg-white p-5 transition hover:shadow-md',
  content.featured && 'border-l-4 border-l-amber-500'
]}>
  <!-- 分类标签 -->
  <div class="mb-3 flex items-center gap-2">
    <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
      {content.category.name}
    </span>
    {content.featured && (
      <span class="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        ⭐ 精选
      </span>
    )}
  </div>

  <!-- 标题 -->
  <h3 class="mb-2 text-lg font-semibold leading-snug">
    <a href={content.sourceUrl} target="_blank" rel="noopener" class="hover:text-blue-600">
      {content.title}
    </a>
  </h3>

  <!-- AI 摘要 -->
  <p class="mb-3 text-sm leading-relaxed text-gray-600">
    {summary}
  </p>

  <!-- 核心观点 (可选) -->
  {content.aiKeyPoints && content.aiKeyPoints.length > 0 && (
    <ul class="mb-3 space-y-1">
      {content.aiKeyPoints.slice(0, 3).map((point) => (
        <li class="flex items-start gap-2 text-sm text-gray-700">
          <span class="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
          {point}
        </li>
      ))}
    </ul>
  )}

  <!-- 标签 -->
  {content.tags.length > 0 && (
    <div class="mb-3 flex flex-wrap gap-1.5">
      {content.tags.slice(0, 4).map((tag) => (
        <span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          #{tag}
        </span>
      ))}
    </div>
  )}

  <!-- 元信息 -->
  <div class="flex items-center justify-between border-t pt-3 text-xs text-gray-500">
    <div class="flex items-center gap-3">
      <span>{getDomain(content.sourceUrl)}</span>
      <span>{formatDate(content.publishedAt)}</span>
      {content.readingTime && <span>{content.readingTime} 分钟阅读</span>}
    </div>
    <a href={content.sourceUrl} target="_blank" rel="noopener"
       class="font-medium text-blue-600 hover:underline">
      阅读原文 →
    </a>
  </div>
</article>
```

### 3.3 详情页布局

```astro
---
// src/pages/weekly/[...slug].astro
import WeeklyCover from '~/components/widgets/WeeklyCover.astro';
import ContentCard from '~/components/common/ContentCard.astro';

const { issue, contentsByCategory } = Astro.props;
const cover = parseCover(issue.cover);
---

<Layout title={issue.title}>
  <!-- 头图 -->
  {cover?.type === 'template' && (
    <div class="mx-auto max-w-4xl">
      <WeeklyCover config={cover} variant="hero" />
    </div>
  )}

  <!-- 周刊信息 -->
  <header class="mx-auto max-w-3xl py-8">
    <h1 class="text-3xl font-bold">{issue.title}</h1>
    <p class="mt-2 text-gray-500">
      {formatDateRange(issue.startDate, issue.endDate)} · {issue.itemCount} 条内容
    </p>
    {issue.summary && <p class="mt-4 text-gray-700">{issue.summary}</p>}
  </header>

  <!-- 按分类分组 -->
  <main class="mx-auto max-w-3xl space-y-12 pb-16">
    {Object.entries(contentsByCategory).map(([category, contents]) => (
      <section>
        <h2 class="mb-4 text-xl font-bold">{category}</h2>
        <div class="space-y-4">
          {contents.map((content) => <ContentCard content={content} />)}
        </div>
      </section>
    ))}
  </main>
</Layout>
```

## 阶段四: 数据源适配

### 4.1 数据库 Schema 兼容

Admin 端会变更:

```sql
-- weekly_issues.cover: 由 VARCHAR(URL) 改为 TEXT(JSON)
ALTER TABLE weekly_issues MODIFY COLUMN cover TEXT;

-- contents.image_url: 改为可选 (前端不再强依赖)
ALTER TABLE contents MODIFY COLUMN image_url VARCHAR(500) NULL;

-- contents 新增字段
ALTER TABLE contents
  ADD COLUMN ai_summary TEXT,
  ADD COLUMN ai_key_points JSON,
  ADD COLUMN ai_dimensions JSON;
```

Weekly 前端读取时需兼容:

```typescript
// lib/content-service.ts 改造
export async function getWeeklyIssues(): Promise<WeeklyIssue[]> {
  const rows = await db.query('SELECT * FROM weekly_issues ORDER BY issue_number DESC');
  return rows.map((row) => ({
    ...row,
    cover: row.cover, // 保持原始字符串, 由前端 parseCover 处理
  }));
}

export async function getContentsByIssue(issueId: number) {
  const rows = await db.query(`
    SELECT
      c.*,
      c.ai_summary,
      c.ai_key_points,
      cat.name AS category_name,
      cat.slug AS category_slug
    FROM weekly_content_items wci
    JOIN contents c ON c.id = wci.content_id
    LEFT JOIN categories cat ON cat.id = c.category_id
    WHERE wci.weekly_issue_id = ?
    ORDER BY wci.sort_order ASC
  `, [issueId]);

  return rows.map((row) => ({
    ...row,
    aiKeyPoints: row.ai_key_points ? JSON.parse(row.ai_key_points) : null,
  }));
}
```

### 4.2 文件系统数据源兼容

`sections/YYYY-MM/*.mdx` 的 frontmatter 扩展:

```yaml
---
title: 第 N 期
issueNumber: N
startDate: 2026-05-15
endDate: 2026-05-22
cover:
  type: template
  template: default
  title: 第 N 期
  subtitle: 2026.05.15 - 2026.05.22
  issueNumber: N
---
```

## 阶段五: 性能与 SEO

### 5.1 静态生成优势

去除截图依赖后:
- 列表页所有封面在构建时生成 SVG, **无需运行时 IO**
- 详情页所有内容卡片为纯 HTML, **首屏渲染极快**
- Lighthouse 评分预期: 90+ → 100

### 5.2 OG Image SEO

为每期周刊生成静态 PNG (1200×630), 用于:
- Twitter Card / Open Graph
- 社交分享预览
- 搜索引擎缩略图

```astro
<!-- Layout 头部 -->
<meta property="og:image" content={`/og/weekly/${issue.issueNumber}.png`} />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content={`/og/weekly/${issue.issueNumber}.png`} />
```

### 5.3 RSS 改造

`src/pages/rss.xml.ts` 中, 内容描述使用 `aiSummary` 替代截图:

```typescript
items: contents.map((c) => ({
  title: c.title,
  link: c.sourceUrl,
  description: c.aiSummary ?? c.summary,
  pubDate: c.publishedAt,
  categories: [c.category.name],
}))
```

## 实施路线图

### Phase 1: 封面系统 (3-4 天)
- [ ] 设计封面模板规范文档 (`docs/cover-design.md`)
- [ ] 实现 `WeeklyCover.astro` 组件
- [ ] 实现 `parseCover` 工具函数, 兼容旧数据
- [ ] OG Image 静态生成集成
- [ ] 视觉评审

### Phase 2: 列表页改造 (1-2 天)
- [ ] 改造首页 `index.astro`
- [ ] 改造 `/weekly` 列表页
- [ ] 视觉一致性测试

### Phase 3: 详情页改造 (3-4 天)
- [ ] 实现 `ContentCard.astro` 组件
- [ ] 改造 `/weekly/[slug]` 详情页
- [ ] 移除 `image_url` 强依赖
- [ ] AI 摘要和核心观点的展示逻辑

### Phase 4: 数据源对齐 (1-2 天)
- [ ] `lib/content-service.ts` 适配新字段
- [ ] frontmatter schema 更新
- [ ] 双数据源回归测试

### Phase 5: 性能与 SEO (1-2 天)
- [ ] OG Image 生成测试
- [ ] RSS 输出验证
- [ ] Lighthouse 评分验证
- [ ] 上线灰度

**总计: 1.5-2 周**

## 与 Admin 项目的协作点

| 协作项 | Admin 提供 | Weekly 消费 |
|-------|-----------|------------|
| 封面配置 | `weekly_issues.cover` (JSON) | `parseCover()` 渲染 |
| AI 摘要 | `contents.ai_summary` | `ContentCard` 展示 |
| 核心观点 | `contents.ai_key_points` (JSON) | `ContentCard` 列表 |
| AI 评分 | `contents.original_score` | (可选) 列表排序参考 |
| 截图(可选) | `contents.image_url` | 兼容显示, 不强依赖 |

**关键约定**: Admin 端在 Hermes 评分技能中生成 `ai_summary` 和 `ai_key_points`, Weekly 端优先消费这些字段, 老数据兜底使用 `summary`。

## 风险和应对

### 风险 1: 旧周刊数据兼容性
- **场景**: 历史 700+ 期周刊, `cover` 字段是 URL 字符串
- **应对**:
  - `parseCover` 同时识别 URL 和 JSON
  - 旧数据保持 URL 显示, 不强制迁移
  - 如需统一风格, 可批量脚本生成默认 JSON 配置

### 风险 2: 详情页视觉单调
- **场景**: 去掉截图后, 长列表可能视觉疲劳
- **应对**:
  - Featured 卡片左侧高亮条
  - 分类标签使用色彩区分
  - 核心观点提供层次感
  - 必要时为 Featured 内容保留截图

### 风险 3: AI 摘要质量不稳定
- **场景**: Hermes 生成的摘要质量参差
- **应对**:
  - 兜底逻辑: `aiSummary ?? summary`
  - Admin 后台支持人工修订
  - 用户反馈通道, 标注差摘要供 Hermes 学习

## 参考资料

- [TLDR Newsletter](https://tldr.tech/) - 纯文本卡片设计参考
- [ByteByteGo](https://blog.bytebytego.com/) - 技术周刊视觉参考
- [BestBlogs.dev](https://www.bestblogs.dev/) - 内容评分系统参考
- Admin 配套方案: `weekly/admin/docs/automation-plan-admin.md`
- 项目现有文档:
  - `CLAUDE.md` - 项目架构
  - `docs/audit-fe-ux-ui-arch-prioritized-tasks.md` - 历史审计
  - `DESIGN.md` - 设计规范

## 下一步行动

1. ✅ 方案评审通过
2. 进入 SDD 开发流程:
   - 详细设计封面组件 API
   - 设计内容卡片视觉规范
   - 设计数据源适配层
3. 与 Admin 项目同步 schema 变更时间点

---

**文档版本**: v1.0 (Weekly 拆分版)
**创建日期**: 2026-05-22
**作者**: Claude + 用户
**状态**: 待进入 SDD 流程
