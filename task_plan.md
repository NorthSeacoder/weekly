# Task Plan

## Goal
优化周刊网站依赖体系：更新相关依赖，并在有明确收益、迁移成本可控时，用更新且更优秀的竞品替代旧工具。

## Constraints
- 保留用户已有未提交改动，不回滚。
- 优先处理低风险升级；涉及框架大版本、样式系统大迁移、API 迁移的替换先评估再执行。
- 所有 shell 命令按仓库规则使用 `rtk` 前缀。

## Phases
- [completed] 1. 梳理项目依赖、脚本、现有未提交改动边界
- [completed] 2. 查询关键依赖最新版本与替代品状态
- [completed] 3. 执行 Tailwind 4、Astro 6 与相关依赖升级迁移
- [completed] 4. 修复构建/API 兼容问题
- [completed] 5. 运行构建/检查，记录剩余风险

## Decisions
- 当前先不删除 `@resvg/resvg-js` 与 `satori`，它们是工作区已有改动新增的 OG 图片链路依赖。
- 用户明确要求 Tailwind 升级到 4，本轮已切换到 `@tailwindcss/vite` 并移除 `@astrojs/tailwind`。
- `@astrolib/seo` 不声明支持 Astro 6，已替换为本地 `Metadata.astro` 原生 meta 输出。
- `node-cache` 已替换为原生 `Map`，保留永不过期缓存和 in-flight 去重语义。
- `@tailwindcss/typography@0.5.19` 官方仍推荐用于 Tailwind 4，但 peer range 未覆盖 4 stable；已用 `pnpm-workspace.yaml` 的 `peerDependencyRules.allowedVersions` 放行 `tailwindcss: 4.3.0`。

## Errors Encountered
- `rtk pnpm outdated --format json` 和窄范围 `pnpm outdated` 只返回汇总与 GET 警告，未给出可解析版本表。改用针对关键包的 registry 查询。
- `pnpm install` 首次失败：非 TTY 下 pnpm 要清理 `node_modules`，改用 `CI=true pnpm install --no-frozen-lockfile` 成功。
- `astro check` 仍失败，主要为历史类型债和 archive 目录问题；`pnpm build` 已通过。
- 历史类型债已继续处理到 `astro check` 通过；归档/临时文件通过 tsconfig 排除，主应用类型错误已修复。
