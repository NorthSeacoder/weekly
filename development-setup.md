# 开发环境数据源配置指南

## 环境变量配置

在项目根目录创建 `.env` 文件：

```bash
# 数据源选择 (filesystem | database)
DATA_SOURCE=filesystem

# 数据库配置 (当 DATA_SOURCE=database 时需要)
DB_HOST=your_nas_ip
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=weekly_blog

# 开发环境设置
NODE_ENV=development
```

## 数据源切换

项目支持两种数据源：文件系统和数据库。你可以使用以下命令在开发时轻松切换：

### 可用命令

#### 开发服务器
```bash
# 使用文件系统数据源启动开发服务器
npm run dev:file

# 使用数据库数据源启动开发服务器  
npm run dev:db

# 默认开发服务器（使用环境变量中的配置）
npm run dev
```

#### 数据源状态检查
```bash
# 检查当前数据源状态和统计信息
npm run dev:status

# 检查数据库状态（更详细的数据库信息）
npm run db:status
```

### 数据源说明

#### 文件系统数据源 (`filesystem`)
- **优点**: 无需数据库，开发简单，版本控制友好
- **数据位置**: 
  - 博客文章: `blogs/` 目录
  - 周刊内容: `sections/` 目录
- **适用场景**: 本地开发、内容编辑、静态部署

#### 数据库数据源 (`database`)
- **优点**: 性能更好，支持复杂查询，数据关联性强
- **数据位置**: MySQL 数据库 `weekly_blog`
- **适用场景**: 生产环境、数据分析、高性能需求

### 环境变量配置

创建 `.env` 文件配置数据库连接：

```env
# 数据源类型 (filesystem 或 database)
DATA_SOURCE=filesystem

# 数据库配置（仅在 DATA_SOURCE=database 时需要）
DB_HOST=your-database-host
DB_PORT=3306
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=weekly_blog
```

### 开发工作流建议

1. **内容创作**: 使用 `npm run dev:file` 进行内容编辑和预览
2. **功能开发**: 根据需要选择合适的数据源进行开发
3. **性能测试**: 使用 `npm run dev:db` 测试数据库相关功能
4. **部署前检查**: 使用 `npm run dev:status` 确认数据源配置

### 数据库管理命令

```bash
# 检查数据库表状态
npm run db:check

# 修复数据库问题
npm run db:fix

# 迁移数据到数据库
npm run migrate:mysql
```

### 故障排除

如果遇到数据源切换问题：

1. 检查环境变量是否正确设置
2. 使用 `npm run dev:status` 查看当前状态
3. 确认数据库连接配置正确（如使用数据库数据源）
4. 检查文件权限（如使用文件系统数据源）

### 注意事项

- 数据源切换只在开发环境下生效
- 生产环境的数据源由部署配置决定
- 两种数据源的数据结构保持一致，可以无缝切换

## 常用命令

### 数据库管理
```bash
# 检查数据源状态
pnpm run db:status

# 修复数据库问题（乱码、重复等）
pnpm run db:fix

# 清空数据库重新开始
pnpm run db:clear

# 重新迁移数据
pnpm run migrate:mysql
```

### 开发调试
```bash
# 启动开发服务器
pnpm run dev

# 构建项目
pnpm run build

# 预览构建结果
pnpm run preview
```

## 数据源特点对比

### 文件系统模式
**优点：**
- 开发简单，无需数据库
- 版本控制友好
- 离线可用

**缺点：**
- 无法支持复杂查询
- 性能相对较低
- 功能有限

### 数据库模式
**优点：**
- 高性能查询
- 支持全文搜索
- 支持复杂功能（统计、关联等）
- 数据管理更规范

**缺点：**
- 需要数据库环境
- 配置相对复杂
- 需要网络连接

## 故障排除

### 1. 数据库连接问题
```bash
# 检查网络连接
ping your_nas_ip

# 检查端口是否开放
telnet your_nas_ip 3306

# 验证数据库配置
pnpm run db:status
```

### 2. 乱码问题
```bash
# 运行修复脚本
pnpm run db:fix

# 如果问题严重，清空重新迁移
pnpm run db:clear
pnpm run migrate:mysql
```

### 3. 重复数据问题
```bash
# 自动清理重复数据
pnpm run db:fix
```

## 代码中使用统一接口

在代码中，始终使用统一的接口，系统会自动根据配置选择数据源：

```typescript
// 博客内容
import { getBlogPosts } from '@/src/utils/contents/unified-content';

// 周刊内容
import { getWeeklyPosts } from '@/src/utils/contents/unified-content';

// 这些接口会自动根据 DATA_SOURCE 环境变量选择数据源
```

## 可用脚本命令

以下是项目中保留的核心脚本命令及其功能说明：

### 基础开发命令
```bash
# 启动开发服务器
npm run dev

# 使用文件系统数据源启动开发
npm run dev:file

# 使用数据库数据源启动开发  
npm run dev:db

# 构建生产版本
npm run build

# 预览构建结果
npm run preview

# Astro CLI 命令（原生 Astro 功能）
npm run astro
```

### 内容管理命令
```bash
# 生成 RSS 订阅文件
npm run generate:rss

# 创建新的博客文章（使用 bin 脚本）
npm run generate:blog

# 发布内容到 Quail 平台
npm run publish:quail

# 构建后自动执行（自动生成RSS）
npm run postbuild
```

### 工具命令
```bash
# 上传图片到图床服务
npm run upload

# 转换并上传图片，更新 MDX 文件中的图片链接
npm run convertImages

# 同步文件系统的新文件到数据库
npm run sync:files
```

### Blog 迁移命令
```bash
# 将 blogs 文件夹中的内容迁移到 MySQL 数据库（支持更新已存在记录）
npm run migrate:mysql

# 清空数据库后重新迁移
npm run migrate:clean

# 模拟迁移（不实际执行）
npm run migrate:check
```

### 数据源管理命令
```bash
# 显示当前数据源状态
npm run dev:status

# 对比文件系统和数据库两个数据源的差异
npm run dev:compare

# 显示数据库连接状态
npm run db:status

# 检查数据库表结构
npm run db:check
```

### Git 提交规范命令
```bash
# 生成 CHANGELOG
npm run cl

# 使用 commitizen 进行规范化提交
npm run cz
```

### 命令使用说明

1. **astro**: 提供 Astro 框架的原生 CLI 功能，如 `npm run astro add tailwind` 添加集成
2. **postbuild**: 构建完成后自动执行的钩子命令，当前配置为自动生成 RSS 订阅文件
3. **convertImages**: 扫描 `sections` 文件夹中的 MDX 文件，查找本地图片引用（如 `![alt](/images/xxx.png)`），上传到图床并替换为远程链接
4. **sync:files**: 扫描文件系统中新增的 MDX 文件并同步到数据库，支持增量同步
5. **migrate:xxx**: Blog 迁移相关命令，专门用于将 `blogs/` 文件夹中的 MDX 文件迁移到数据库
   - 支持 UPSERT 操作：已存在的记录会被更新，新文件会被插入
   - 自动跳过周刊内容迁移（周刊数据应直接在数据库中管理）
   - 根据文件的 title 或 slug 检测重复记录
6. **dev:file/dev:db**: 分别使用文件系统和数据库作为数据源启动开发环境，便于测试和对比

## 缓存配置

### 当前缓存架构

项目使用 **NodeCache** 作为内存缓存系统：

```typescript
// lib/cache.ts 当前配置
const cache = new NodeCache({
    stdTTL: 0,        // 永不过期
    checkperiod: 0,   // 禁用清理检查  
    useClones: false  // 禁用克隆以提高性能
});
```

### 缓存策略配置建议

#### 开发环境
```env
# .env 文件配置
NODE_ENV=development
CACHE_TTL=0              # 开发环境不过期，便于调试
CACHE_CHECK_PERIOD=0     # 禁用定期清理
```

#### 生产环境
```env
# .env 文件配置  
NODE_ENV=production
CACHE_TTL=3600           # 1小时过期时间
CACHE_CHECK_PERIOD=600   # 10分钟检查一次过期缓存

# 可选：Redis 配置（推荐生产环境）
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

### 不同内容的缓存时间建议

```typescript
// 推荐的缓存配置
const cacheConfig = {
  'blog-posts': 3600,      // 博客文章：1小时
  'weekly-posts': 1800,    // 周刊内容：30分钟  
  'tag-data': 7200,        // 标签数据：2小时
  'static-content': 86400  // 静态内容：24小时
};
```

### Redis 集成方案（可选）

如需要分布式缓存或更好的持久化，可以集成 Redis：

```typescript
// 示例：Redis 缓存适配器
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0')
});

export async function getCachedDataRedis<T>(
  key: string,
  fetchData: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const fresh = await fetchData();
  await redis.setex(key, ttl, JSON.stringify(fresh));
  return fresh;
}
```

### 缓存清理与监控

```bash
# 手动清理缓存的脚本示例
npm run cache:clear

# 缓存统计监控
npm run cache:stats
```

## 生产环境建议

1. **使用数据库模式**：生产环境建议使用数据库以获得更好的性能
2. **定期备份**：设置数据库定期备份
3. **监控数据源**：监控数据库连接状态
4. **缓存策略**：
   - **开发环境**：使用 NodeCache，永不过期便于调试
   - **生产环境**：设置合理的 TTL（1-2小时），或集成 Redis 分布式缓存
   - **缓存键命名**：使用有意义的前缀，如 `blog:posts:*`、`weekly:*`
   - **缓存监控**：监控缓存命中率和性能指标
   - **缓存预热**：在应用启动时预加载常用数据 