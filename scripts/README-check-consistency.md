# 数据一致性检查脚本使用指南

## 概述

`check-content-tag-consistency.ts` 是一个专门用于检查 `sections/` 目录中的 MDX 文件与 MySQL 数据库中内容标签一致性的工具。该脚本支持三个检查级别，能够识别各种数据不一致问题并提供修复建议。

## 功能特性

- **多级别检查**：支持基础、标签、完整性三个检查级别
- **智能标签匹配**：使用编辑距离算法识别相似标签
- **详细报告**：生成彩色终端报告和可导出的文件报告
- **问题分类**：按严重程度分类显示问题（错误、警告、信息）
- **修复建议**：为每个问题提供具体的修复建议

## 安装依赖

脚本需要以下依赖（已在 package.json 中配置）：

- `chalk`: 终端颜色输出
- `gray-matter`: MDX frontmatter 解析
- `mysql2`: MySQL 数据库连接

## 使用方法

### 基础用法

```bash
# 使用默认基础检查级别
npm run check:consistency

# 或者直接运行脚本
npx tsx scripts/check-content-tag-consistency.ts
```

### 指定检查级别

```bash
# 基础检查：验证文件与数据库记录的基本对应关系
npm run check:consistency:basic
# 或
npm run check:consistency -- --level basic

# 标签检查：深度对比标签一致性
npm run check:consistency:tags
# 或
npm run check:consistency -- --level tags

# 完整性检查：全面的数据完整性验证
npm run check:consistency:full
# 或
npm run check:consistency -- --level full
```

### 高级选项

```bash
# 显示修复建议
npm run check:consistency -- --suggest-fixes

# 详细模式（显示所有信息级别的问题）
npm run check:consistency -- --verbose

# 导出报告到 JSON 文件
npm run check:consistency -- --export report.json

# 导出报告到 Markdown 文件
npm run check:consistency -- --export report.md

# 组合使用多个选项
npm run check:consistency -- --level full --suggest-fixes --verbose --export detailed-report.md
```

## 检查级别说明

### 1. 基础检查 (basic)

**检查内容：**
- **多策略文件匹配**：使用三种策略确认文件与数据库记录的对应关系
  - 标题完全匹配（标准化处理后）
  - 路径推断匹配（基于年月、文件编号、slug等）
  - 内容相似度匹配（针对标题相似的情况）
- **基本元数据验证**：检查日期一致性、来源信息等
- **统计信息**：提供详细的匹配策略统计

**匹配策略详解：**

1. **标题完全匹配**：对标题进行标准化处理（去除多余空格、统一标点符号等）后进行完全匹配
2. **路径推断匹配**：
   - 基于文件路径结构 `sections/2025-05/024.example.mdx` 
   - 匹配年月信息与数据库记录的创建时间
   - 匹配文件名与数据库的 slug 字段
   - 综合评分超过0.8即认为匹配
3. **内容相似匹配**：
   - 仅在标题相似度>0.85时启用
   - 结合标题和内容特征进行相似度计算
   - 综合评分超过0.8即认为匹配

**适用场景：**
- 快速验证数据同步状态
- 发现明显的数据丢失问题
- 日常维护检查
- 验证文件结构和命名规范

### 2. 标签检查 (tags)

**检查内容：**
- 包含基础检查的所有功能
- 深度对比文件中的标签与数据库标签
- 识别缺失、多余和相似的标签
- 检测标签拼写变体

**适用场景：**
- 标签管理和维护
- 发现标签不一致问题
- 标签规范化处理

### 3. 完整性检查 (full)

**检查内容：**
- 包含标签检查的所有功能
- 验证标签使用计数准确性
- 检查孤立的标签记录
- 识别重复或相似的标签
- 验证内容分类一致性

**适用场景：**
- 全面的数据质量审核
- 数据库清理和优化
- 系统维护和故障排查

## 输出示例

### 终端输出

```
🔍 开始内容标签一致性检查...

📋 执行基础检查...
  📁 发现 1520 个文件
  💾 数据库中有 1485 条记录
  ✅ 成功匹配 1485 项
  ⚠️ 发现 35 个问题

📊 检查报告
==================================================

📈 总体统计:
  检查级别: BASIC
  扫描文件: 1520 个
  数据库记录: 1485 条
  成功匹配: 1485 项
  发现问题: 35 个

❌ 错误问题 (35 个):
  1. 文件存在但数据库中缺少对应记录
     文件: sections/2025-05/089.example.mdx
     建议: 运行数据同步命令, 检查文件标题格式

💡 操作建议:
  • 优先处理错误问题，这些可能影响网站正常运行
  • 运行同步命令: npm run migrate:mysql

==================================================
```

### 导出的 JSON 报告

```json
{
  "timestamp": "2025-01-29T07:00:00.000Z",
  "level": "tags",
  "summary": {
    "totalFiles": 1520,
    "totalDbRecords": 1485,
    "matchedItems": 1485,
    "issues": 42
  },
  "issues": [
    {
      "type": "missing_db",
      "severity": "error",
      "description": "文件存在但数据库中缺少对应记录",
      "file": "sections/2025-05/089.example.mdx",
      "suggestions": ["运行数据同步命令", "检查文件标题格式"]
    },
    {
      "type": "tag_mismatch",
      "severity": "error",
      "description": "文件中的标签在数据库中缺失: AI工具, 效率提升",
      "file": "sections/2025-05/024.midscenejs-ai-ui-automation.mdx",
      "suggestions": ["同步标签到数据库", "检查标签拼写"]
    }
  ],
  "statistics": {
    "errorCount": 35,
    "warningCount": 5,
    "infoCount": 2,
    "issueTypes": {
      "missing_db": 35,
      "tag_mismatch": 7
    }
  }
}
```

## 问题类型说明

| 问题类型 | 严重程度 | 描述 | 建议处理 |
|---------|---------|------|---------|
| `missing_file` | 警告 | 数据库记录存在但找不到对应文件 | 检查文件是否被删除，确认文件名称 |
| `missing_db` | 错误 | 文件存在但数据库中缺少对应记录 | 运行数据同步命令 |
| `tag_mismatch` | 错误/警告 | 标签不匹配（缺失或多余） | 同步标签数据，检查标签规范 |
| `similar_tag` | 信息 | 发现相似但不完全匹配的标签 | 检查拼写错误，统一标签命名 |
| `metadata_diff` | 警告 | 元数据差异（分类、计数等） | 同步元数据，检查数据完整性 |

## 常见问题处理

### 1. 发现大量 missing_db 错误

**原因：** 文件系统与数据库不同步

**解决：**
```bash
# 运行数据迁移同步
npm run migrate:mysql

# 检查迁移结果
npm run check:consistency
```

### 2. 标签不匹配问题

**原因：** 标签数据不一致或拼写错误

**解决：**
```bash
# 详细检查标签问题
npm run check:consistency:tags --suggest-fixes

# 导出详细报告进行分析
npm run check:consistency:tags --export tag-issues.md
```

### 3. 分类不一致

**原因：** 分类映射关系错误

**解决：**
```bash
# 检查分类数据
npm run db:add-categories

# 运行完整性检查
npm run check:consistency:full
```

## 最佳实践

1. **定期检查**：建议每周运行一次基础检查
2. **数据同步后验证**：每次运行数据迁移后进行检查
3. **导出报告**：保存检查报告用于问题跟踪
4. **渐进式修复**：先处理错误级别问题，再处理警告
5. **标签规范化**：定期运行完整性检查清理重复标签

## 技术原理

### 编辑距离算法

脚本使用 Levenshtein 距离算法计算标签相似度：

- **相似度阈值**：0.8（可在代码中调整）
- **支持中文**：优化了中文字符的匹配逻辑
- **用途**：识别拼写错误和标签变体

### 数据匹配策略

1. **基于标题匹配**：使用内容标题作为主要匹配键
2. **容错处理**：忽略大小写和空格差异
3. **批量处理**：优化查询性能，减少数据库调用

## 故障排除

### 数据库连接问题

确保环境变量配置正确：

```bash
# 检查环境变量
echo $DB_HOST $DB_PORT $DB_USER $DB_NAME

# 测试数据库连接
npm run db:check
```

### 权限问题

确保有文件读取和数据库查询权限：

```bash
# 检查文件权限
ls -la sections/

# 检查数据库权限
npm run db:status
```

## 扩展开发

脚本采用模块化设计，可以轻松扩展：

1. **添加新检查类型**：在 `CheckResult['issues']` 中添加新的问题类型
2. **自定义相似度算法**：修改 `calculateSimilarity()` 方法
3. **扩展导出格式**：在 `exportReport()` 中添加新格式支持
4. **增加修复功能**：实现自动修复逻辑（谨慎使用）

## 参考链接

- [MySQL 数据库文档](../database/README.md)
- [数据迁移指南](../MIGRATION_GUIDE.md)
- [项目架构说明](../README.md) 