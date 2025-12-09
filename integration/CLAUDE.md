# integration/ - Astro 自定义集成

[← 返回根目录](../CLAUDE.md)

> 最后更新: 2025-12-09T10:40:52+0800

## 目录概述

`integration/` 包含项目的 Astro 自定义集成插件，用于扩展 Astro 的构建流程和配置。

## 文件清单

| 文件 | 说明 |
|------|------|
| `index.ts` | 集成入口，导出 weekly 集成 |
| `utils/configBuilder.ts` | 配置构建器 |
| `utils/loadConfig.ts` | 配置加载器 |

## 核心功能

### weekly 集成 (index.ts)

这是一个 Astro 集成插件，主要功能：

1. **加载站点配置**: 从 `src/config.yaml` 读取配置
2. **虚拟模块**: 创建 `weekly:config` 虚拟模块，供组件使用
3. **Sitemap 处理**: 构建完成后更新 `robots.txt`

```typescript
export default ({ config: _themeConfig = 'src/config.yaml' } = {}): AstroIntegration => {
  return {
    name: 'weekly-integration',
    hooks: {
      'astro:config:setup': async ({ updateConfig, addWatchFile }) => {
        // 加载配置
        const rawJsonConfig = await loadConfig(_themeConfig);
        const { SITE, I18N, METADATA, APP_BLOG, UI, ANALYTICS } = configBuilder(rawJsonConfig);

        // 创建虚拟模块
        updateConfig({
          vite: {
            plugins: [{
              name: 'vite-plugin-weekly-config',
              resolveId(id) {
                if (id === 'weekly:config') return '\0weekly:config';
              },
              load(id) {
                if (id === '\0weekly:config') {
                  return `
                    export const SITE = ${JSON.stringify(SITE)};
                    export const METADATA = ${JSON.stringify(METADATA)};
                    // ...
                  `;
                }
              }
            }]
          }
        });
      },
      'astro:build:done': async () => {
        // 更新 robots.txt 添加 sitemap
      }
    }
  };
};
```

### 配置结构

通过 `weekly:config` 虚拟模块导出的配置：

| 配置项 | 说明 |
|--------|------|
| `SITE` | 站点基本信息（名称、URL、base路径） |
| `I18N` | 国际化配置 |
| `METADATA` | SEO元数据（标题、描述、OpenGraph等） |
| `APP_BLOG` | 博客/周刊功能配置 |
| `UI` | UI主题配置 |
| `ANALYTICS` | 分析工具配置 |

## 使用方式

### 在 astro.config.ts 中注册

```typescript
import weekly from './integration';

export default defineConfig({
  integrations: [
    weekly(),  // 使用默认配置
    // 或
    weekly({ config: 'src/custom-config.yaml' })
  ]
});
```

### 在组件中使用配置

```typescript
// 在 .astro 或 .ts 文件中
import { SITE, METADATA } from 'weekly:config';

console.log(SITE.name);  // "'What I Don't Know' Weekly"
console.log(METADATA.description);
```

## 配置文件格式

`src/config.yaml` 示例：

```yaml
site:
  name: "'What I Don't Know' Weekly"
  site: 'https://weekly.mengpeng.tech'
  base: '/'
  trailingSlash: false

metadata:
  title:
    default: Weekly
    template: '%s — Weekly'
  description: "每周记录一下在各个地方遇到的我不知道的知识"
  robots:
    index: true
    follow: true

apps:
  blog:
    isEnabled: true
    postsPerPage: 6
    weekly:
      isEnabled: true
      pathname: 'weekly'
    blog:
      isEnabled: true
      pathname: 'blog'

ui:
  theme: 'system'
```

## 开发注意事项

1. **热重载**: 配置文件变更会触发热重载（通过 `addWatchFile`）
2. **虚拟模块**: `weekly:config` 是虚拟模块，不存在实际文件
3. **类型声明**: 需要在 `src/env.d.ts` 中声明模块类型
