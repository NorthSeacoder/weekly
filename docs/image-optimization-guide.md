# 图片优化使用指南

## 概述

项目已经配置了完善的图片优化系统，通过 `Image` 组件自动处理图片懒加载、格式转换和尺寸优化。

## 使用方法

### 基础用法

```astro
---
import Image from '~/components/common/Image.astro';
---

<Image
  src="/path/to/image.jpg"
  alt="图片描述"
  width={800}
  height={600}
/>
```

### 组件特性

1. **自动懒加载**: 默认 `loading="lazy"`
2. **异步解码**: 默认 `decoding="async"`
3. **多优化器支持**:
   - 本地图片使用 Astro Assets Optimizer
   - 远程图片使用 Unpic Optimizer
4. **自动格式转换**: 支持 WebP、AVIF 等现代格式

### 最佳实践

#### 1. 始终提供尺寸

```astro
<!-- ✅ 好的做法 -->
<Image src="photo.jpg" alt="风景照片" width={1200} height={800} />

<!-- ❌ 避免这样 -->
<Image src="photo.jpg" alt="风景照片" />
```

#### 2. 首屏图片立即加载

```astro
<!-- 首屏关键图片 -->
<Image
  src="hero.jpg"
  alt="主图"
  width={1920}
  height={1080}
  loading="eager"
/>
```

#### 3. 使用合适的尺寸

```astro
<!-- 缩略图 -->
<Image src="thumb.jpg" alt="缩略图" width={300} height={200} />

<!-- 全宽图片 -->
<Image src="banner.jpg" alt="横幅" width={1920} height={400} />

<!-- 响应式图片 -->
<Image
  src="responsive.jpg"
  alt="响应式"
  width={1200}
  height={800}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

#### 4. 提供有意义的 alt 文本

```astro
<!-- ✅ 好的做法 -->
<Image src="code.jpg" alt="React 组件代码示例" width={800} height={600} />

<!-- ❌ 避免这样 -->
<Image src="code.jpg" alt="图片" width={800} height={600} />
```

## 性能优化建议

### 1. 图片格式选择

- **照片**: JPEG/WebP (有损压缩)
- **图标/插画**: PNG/WebP (无损压缩)
- **矢量图**: SVG (优先使用)

### 2. 尺寸建议

| 用途 | 建议尺寸 | 示例 |
|------|----------|------|
| 缩略图 | 300-400px | 博客卡片 |
| 中等图片 | 600-800px | 文章配图 |
| 全宽图片 | 1200-1600px | 横幅、Hero |
| 高清大图 | 1920-2560px | 高分辨率展示 |

### 3. 压缩建议

- JPEG: 质量 75-85
- PNG: 使用工具如 TinyPNG
- WebP: 质量 80-90

## MDX 中使用图片

在 MDX 文件中，图片会自动优化：

```mdx
![图片描述](/path/to/image.jpg)

<!-- 或使用 HTML -->
<img src="/path/to/image.jpg" alt="图片描述" width="800" height="600" />
```

## 故障排查

### 图片不显示

1. 检查路径是否正确
2. 确认图片在 `public/` 或 `src/assets/` 目录
3. 验证图片格式支持

### 图片加载慢

1. 检查图片尺寸是否过大
2. 启用懒加载
3. 使用现代格式 (WebP/AVIF)

### 构建错误

1. 确保提供 `alt` 属性
2. 检查 width/height 是否为数字
3. 验证远程图片 URL 可访问

## 相关文件

- 组件: `src/components/common/Image.astro`
- 工具: `src/utils/images-optimization.ts`
- 辅助: `src/utils/images.ts`

## 性能指标

优化后的预期性能：

- 首屏加载时间: < 2s
- Lighthouse 性能分数: > 90
- 图片大小减少: 30-50%
- 支持的格式: JPEG, PNG, WebP, AVIF, SVG
