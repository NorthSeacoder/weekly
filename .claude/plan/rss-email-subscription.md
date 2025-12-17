# RSS 订阅与邮箱订阅功能重构规划

> 创建时间: 2025-12-13
> 状态: 待确认

## 一、职责划分

| 功能 | 所属项目 | 实现方式 |
|------|----------|----------|
| RSS 订阅 | **Weekly 项目** | `src/pages/rss.xml.ts` (Astro 原生页面) |
| Quail 发布 | **Admin 项目** | API + 管理界面 + 自动触发 |

---

## 二、RSS 实现 (Weekly 项目)

### 2.1 技术方案

使用 `@astrojs/rss` 官方包替代现有的 `feed` 库和独立脚本。

### 2.2 实现步骤

1. **安装依赖**
   ```bash
   pnpm add @astrojs/rss
   ```

2. **创建 RSS 页面端点**
   ```typescript
   // src/pages/rss.xml.ts
   import rss from '@astrojs/rss';
   import type { APIContext } from 'astro';
   import { WeeklyService } from '@/lib/content-service';
   import { structuredContentToText } from '@/lib/structured-content';

   export async function GET(context: APIContext) {
     const posts = await WeeklyService.getWeeklyPosts();
     const latestPosts = posts.slice(0, 12);

     return rss({
       title: '我不知道的周刊',
       description: '前端技术周刊，每周分享有价值的前端技术内容',
       site: context.site!,
       items: latestPosts.map((post) => ({
         title: post.title,
         pubDate: new Date(post.date),
         description: post.desc || post.title,
         link: `/weekly/${post.slug}/`,
         content: post.sections
           ?.map(section => structuredContentToText(section.content))
           .join('\n\n'),
       })),
       customData: `<language>zh-CN</language>`,
       stylesheet: '/pretty-feed-v3.xsl',
     });
   }
   ```

3. **清理旧文件**
   - 删除 `generateRSS.ts`
   - 移除 `package.json` 中的 `generate:rss` 和 `postbuild` 脚本
   - 可选：移除 `feed` 依赖

### 2.3 文件变更

| 操作 | 文件 |
|------|------|
| 新增 | `src/pages/rss.xml.ts` |
| 删除 | `generateRSS.ts` |
| 修改 | `package.json` (移除相关脚本) |

---

## 三、Quail 实现 (Admin 项目)

### 3.1 架构

```
Admin 项目
├── lib/quail.ts                         # Quail 服务类
├── src/pages/api/admin/publish-quail.ts # 发布 API
├── src/pages/api/admin/quail-history.ts # 发布历史 API
└── src/pages/admin/publish.astro        # 发布管理页面
```

### 3.2 服务类设计

```typescript
// lib/quail.ts
export class QuailService {
  private static API_BASE = 'https://api.quail.ink';

  /**
   * 发布周刊到 Quail
   * @param weeklySlug 周刊 slug，不传则发布最新一期
   */
  static async publishWeekly(weeklySlug?: string): Promise<{
    success: boolean;
    postId?: string;
    postUrl?: string;
    error?: string;
  }>;

  /**
   * 获取发布历史（从 Quail 平台查询）
   * 使用 /posts/search API 查询已发布的周刊
   */
  static async getPublishHistory(limit?: number): Promise<Array<{
    title: string;
    slug: string;
    publishedAt: Date;
    postUrl: string;
  }>>;

  /**
   * 检查周刊是否已发布
   */
  static async checkPublishStatus(weeklyTitle: string): Promise<{
    published: boolean;
    post?: QuailPost;
  }>;
}
```

### 3.3 自动发布机制

在 Admin 项目的周刊发布流程中集成自动 Quail 发布：

```typescript
// 周刊发布 API 中
export const POST: APIRoute = async ({ request }) => {
  // 1. 发布周刊到数据库
  const result = await WeeklyService.publishWeekly(weeklySlug);

  // 2. 自动触发 Quail 发布
  if (result.success) {
    try {
      await QuailService.publishWeekly(weeklySlug);
      console.log('Auto-published to Quail');
    } catch (error) {
      // Quail 发布失败不影响主流程，记录日志即可
      console.error('Failed to auto-publish to Quail:', error);
    }
  }

  return result;
};
```

### 3.4 发布历史

**优先使用 Quail 平台记录**：通过 `/posts/search` API 查询已发布的文章列表。

```typescript
// 获取发布历史
static async getPublishHistory(limit = 20) {
  const result = await request('/posts/search', 'POST', {
    list: QUAIL_LIST_ID,
    status: 'published',
    limit
  });
  return result.map(post => ({
    title: post.title,
    slug: post.slug,
    publishedAt: new Date(post.published_at),
    postUrl: `https://quail.ink/weekly/${post.slug}`
  }));
}
```

### 3.5 管理界面功能

```
/admin/publish
├── 手动发布
│   ├── 选择要发布的周刊期号
│   ├── 发布按钮
│   └── 发布状态显示（成功/失败/已发布）
│
└── 发布历史（从 Quail 获取）
    ├── 已发布周刊列表
    ├── 发布时间
    └── Quail 文章链接
```

---

## 四、新旧方案对比

| 方面 | 旧方案 | 新方案 |
|------|--------|--------|
| RSS 触发 | 构建后脚本 | Astro 构建时自动 |
| RSS 依赖 | `feed` 库 | `@astrojs/rss` (官方) |
| RSS 维护 | 独立脚本 | 与项目统一 |
| Quail 触发 | 手动命令行 | **自动触发** + Admin 手动按钮 |
| Quail 历史 | 无 | **从 Quail 平台查询** |

---

## 五、实施步骤

### 阶段 1: RSS 重构 (Weekly 项目) - 可立即执行

| 步骤 | 任务 |
|------|------|
| 1.1 | 安装 `@astrojs/rss` 依赖 |
| 1.2 | 创建 `src/pages/rss.xml.ts` |
| 1.3 | 验证 RSS 输出正确 |
| 1.4 | 删除 `generateRSS.ts` 脚本 |
| 1.5 | 清理 `package.json` 相关脚本 |

### 阶段 2: Quail 重构 (Admin 项目)

| 步骤 | 任务 |
|------|------|
| 2.1 | 创建 `lib/quail.ts` 服务类 |
| 2.2 | 创建发布 API 端点 |
| 2.3 | 创建发布历史 API（调用 Quail 搜索） |
| 2.4 | 创建发布管理页面 |
| 2.5 | 在周刊发布流程中集成自动 Quail 发布 |

---

## 六、验收标准

### RSS (Weekly 项目)
- [ ] `/rss.xml` 可正常访问
- [ ] RSS 内容包含最新 12 篇周刊
- [ ] 样式表正常渲染
- [ ] 构建时自动生成

### Quail (Admin 项目)
- [ ] 周刊发布时自动触发 Quail 发布
- [ ] 管理界面可手动选择周刊发布
- [ ] 可查看发布历史（从 Quail 获取）
- [ ] 发布成功/失败有明确提示

---

## 七、下一步

1. **Weekly 项目**: 确认后立即实施 RSS 重构
2. **Admin 项目**: 后续实施 Quail 管理功能和自动发布
