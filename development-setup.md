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

## 生产环境建议

1. **使用数据库模式**：生产环境建议使用数据库以获得更好的性能
2. **定期备份**：设置数据库定期备份
3. **监控数据源**：监控数据库连接状态
4. **缓存策略**：合理配置缓存时间 