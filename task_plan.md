# Task Plan: 依赖整体升级

## Goal
检查当前项目依赖状态，先完成一轮整体升级，并验证升级后项目仍可正常构建。

## Current Phase
Phase 5

## Phases

### Phase 1: 现状盘点
- [x] 理解用户意图
- [x] 确认项目结构与包管理器
- [x] 记录当前仓库状态
- **Status:** complete

### Phase 2: 升级策略确认
- [x] 识别可升级依赖与潜在高风险项
- [x] 选择升级命令与范围
- [x] 记录关键决策
- **Status:** complete

### Phase 3: 执行升级
- [x] 更新依赖与锁文件
- [x] 处理升级引入的配置或代码变更
- [x] 记录实际修改文件
- **Status:** complete

### Phase 4: 验证
- [x] 运行至少一轮构建/检查
- [x] 记录验证结果
- [x] 修复阻塞问题
- **Status:** complete

### Phase 5: 交付
- [x] 汇总升级内容
- [x] 标注风险与后续建议
- [x] 向用户交付结果
- **Status:** complete

## Key Questions
1. 当前依赖里哪些是可直接升级的常规项，哪些可能涉及破坏性变更？
2. 项目是否存在升级后需要同步调整的 Astro/Tailwind/TypeScript 相关配置？

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 使用 `pnpm` 作为升级与锁文件维护入口 | 仓库存在 `pnpm-lock.yaml` 与 `pnpm-workspace.yaml` |
| 先做整体盘点再执行升级 | 避免直接升级后才发现高风险主依赖或工作区异常 |
| 直接升级到最新版本，再用构建结果倒逼修兼容 | 用户要求先整体升级，项目现有自动化以构建验证为主 |
| 为 `@langchain/openai` 补充 `@langchain/core` peer | 升级后出现缺失 peer，补齐依赖树更稳妥 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `ERR_PNPM_UNEXPECTED_STORE` | 1 | 改为使用现有全局 pnpm store 并提权执行升级 |
| `ERR_SQLITE_ERROR unable to open database file` | 1 | 识别为沙箱无法访问全局 store 索引，改走提权命令 |
| `js-yaml` 无默认导出 | 1 | 将默认导入改为命名导入 `load` |
| Astro 7 编译不接受顶层 `return` | 1 | 将内联脚本包进 IIFE，保留幂等保护逻辑 |

## Notes
- 当前工作区初始为 clean。
- `pnpm build` 在升级与兼容修复后已通过。
- `conventional-changelog-cli` 目前仍是 deprecated 状态，但已升级到它的最新可用版本。
