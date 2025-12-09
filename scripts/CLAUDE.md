# scripts/ - 工具脚本

[← 返回根目录](../CLAUDE.md)

> 最后更新: 2025-12-09T10:40:52+0800

## 目录概述

`scripts/` 包含项目的各种工具脚本，用于数据迁移、数据库维护、内容管理等任务。

## 脚本清单

### 数据迁移

| 脚本 | 命令 | 说明 |
|------|------|------|
| `migrate-to-mysql.ts` | `pnpm migrate:mysql` | 将文件系统内容迁移到MySQL |
| `sync-files-to-db.ts` | `pnpm sync:files` | 同步文件到数据库 |

### 数据库维护

| 脚本 | 命令 | 说明 |
|------|------|------|
| `check-database-tables.ts` | `pnpm db:check` | 检查数据库表状态 |
| `fix-database-issues.ts` | `pnpm db:fix` | 修复数据库问题 |
| `fix-garbled-data.ts` | `pnpm db:fix-garbled` | 修复乱码数据 |
| `fix-content-type-references.ts` | `pnpm db:fix-refs` | 修复内容类型引用 |
| `add-missing-categories.ts` | `pnpm db:add-categories` | 添加缺失分类 |

### 内容管理

| 脚本 | 命令 | 说明 |
|------|------|------|
| `create-weekly-item.ts` | `pnpm weekly:add` | 创建周刊条目 |
| `analyze-unnamed-articles.ts` | `pnpm db:analyze-unnamed` | 分析未命名文章 |

### 开发工具

| 脚本 | 命令 | 说明 |
|------|------|------|
| `dev-datasource-info.ts` | `pnpm dev:status` | 显示当前数据源状态 |
| `compare-data-sources.ts` | `pnpm dev:compare` | 比较文件系统和数据库数据 |

### 资源处理

| 脚本 | 命令 | 说明 |
|------|------|------|
| `convertImages.ts` | `pnpm convertImages` | 图片格式转换 |
| `upload.ts` | `pnpm upload` | 上传资源 |

## 核心脚本详解

### migrate-to-mysql.ts

将 `sections/` 和 `blogs/` 目录的 MDX 内容迁移到 MySQL 数据库。

**功能**:
- 解析 MDX frontmatter
- 创建内容记录
- 处理标签关联
- 生成周刊期号

**使用**:
```bash
# 检查迁移（不执行）
pnpm migrate:check

# 执行迁移
pnpm migrate:mysql

# 清理后重新迁移
pnpm migrate:clean
```

### create-weekly-item.ts

交互式创建周刊条目。

**功能**:
- 选择分类
- 输入标题、来源、标签
- 生成 MDX 文件
- 可选：同时写入数据库

**使用**:
```bash
# 交互式创建
pnpm weekly:add

# 从文件创建
pnpm weekly:add-file
```

### check-database-tables.ts

检查和修复数据库表问题。

**功能**:
- 检查表字符集
- 检查空内容
- 修复字符集问题
- 修复空内容

**使用**:
```bash
# 仅检查
pnpm db:check

# 修复字符集
pnpm db:fix-charset

# 修复空内容
pnpm db:fix-empty

# 修复所有问题
pnpm db:fix-all
```

## 脚本开发规范

### 环境变量

脚本通过 `dotenv` 加载环境变量：

```typescript
import { config } from 'dotenv';
config();

const dbHost = process.env.DB_HOST;
```

### 命令行参数

使用 `process.argv` 或 `minimist` 解析参数：

```typescript
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isClean = args.includes('--clean');
```

### 日志输出

使用 `ansi-colors` 和 `cli-progress` 提供友好输出：

```typescript
import colors from 'ansi-colors';
import cliProgress from 'cli-progress';

console.log(colors.green('✓ 操作成功'));
console.log(colors.red('✗ 操作失败'));
console.log(colors.yellow('⚠ 警告信息'));
```

### 数据库操作

使用 `lib/database.ts` 提供的函数：

```typescript
import { query, execute, transaction } from '../lib/database';

// 查询
const rows = await query('SELECT * FROM contents WHERE id = ?', [id]);

// 事务
await transaction(async (conn) => {
    await conn.query('INSERT INTO ...');
    await conn.query('UPDATE ...');
});
```

## 归档脚本

`scripts/archive/` 包含已废弃但保留参考的旧脚本。

## 开发注意事项

1. **备份**: 执行数据库修改前先备份
2. **dry-run**: 大多数脚本支持 `--dry-run` 预览模式
3. **日志**: 重要操作会输出详细日志
4. **事务**: 批量操作使用事务确保一致性
