# 数据库迁移指南

## 环境变量配置

在项目根目录创建 `.env` 文件，添加以下配置：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=weekly_blog

# 应用配置
NODE_ENV=development
APP_URL=http://localhost:3000

# 缓存配置
CACHE_TTL=3600
```

## 数据库设置

1. **创建数据库**：
```sql
CREATE DATABASE weekly_blog DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. **运行数据库结构**：
```bash
mysql -u root -p weekly_blog < database/schema.sql
```

3. **执行数据迁移**：
```bash
pnpm tsx scripts/migrate-to-mysql.ts
```

## 迁移步骤

### 1. 备份现有数据
建议在迁移前备份 `sections/` 和 `blogs/` 目录。

### 2. 安装依赖
```bash
pnpm install mysql2
```

### 3. 配置数据库
- 确保 MySQL 服务器运行
- 创建数据库和用户
- 配置环境变量

### 4. 运行迁移脚本
```bash
pnpm tsx scripts/migrate-to-mysql.ts
```

### 5. 验证迁移结果
- 检查数据库中的数据
- 测试网站功能
- 对比迁移前后的内容

## 数据库表结构说明

### 核心表
- `content_types`: 内容类型（博客、周刊等）
- `categories`: 分类管理
- `tags`: 标签管理
- `contents`: 主内容表

### 周刊相关
- `weekly_issues`: 周刊期号
- `weekly_content_items`: 周刊内容关联

### 扩展表
- `content_tags`: 内容标签关联
- `content_attributes`: 扩展属性
- `content_relations`: 内容关系

## 数据获取方式变更

迁移后，数据获取方式从文件系统读取变为数据库查询：

### 博客内容
```typescript
// 旧方式
import { getBlogPosts } from '@/src/utils/contents/blog';

// 新方式
import { BlogService } from '@/lib/content-service';
const posts = await BlogService.getBlogPosts();
```

### 周刊内容
```typescript
// 旧方式
import { getWeeklyPosts } from '@/src/utils/contents/weekly';

// 新方式
import { WeeklyService } from '@/lib/content-service';
const posts = await WeeklyService.getWeeklyPosts();
```

## 性能优化

1. **索引优化**：确保查询涉及的字段有合适的索引
2. **缓存策略**：使用现有的 cache 机制
3. **分页查询**：对于大量数据使用分页
4. **全文搜索**：利用 MySQL 的 FULLTEXT 索引

## 扩展性特点

1. **内容类型扩展**：可轻松添加新的内容类型
2. **分类层级**：支持多级分类结构
3. **标签系统**：灵活的标签管理
4. **关系管理**：内容间的关联关系
5. **属性扩展**：通过 content_attributes 表存储额外属性

## 故障排除

### 常见问题

1. **连接失败**：检查数据库配置和服务状态
2. **编码问题**：确保使用 utf8mb4 字符集
3. **权限问题**：确保数据库用户有足够权限
4. **迁移中断**：可重新运行迁移脚本（支持增量更新）

### 回滚方案

如果迁移出现问题，可以：
1. 恢复原有的文件系统读取方式
2. 保留数据库作为备份
3. 逐步解决问题后重新迁移 