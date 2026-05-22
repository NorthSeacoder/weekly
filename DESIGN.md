---
name: Weekly
description: 面向中文技术读者的克制型周刊阅读系统
colors:
  primary: "#4a90f4"
  primary-hover: "#337ef2"
  primary-soft: "#78aff7"
  accent-warm: "#fbc35f"
  foreground: "#11151a"
  muted-foreground: "#5f6e87"
  background: "#ffffff"
  surface: "#f7fafe"
  surface-elevated: "#f1f5fa"
  border: "#d9e0e7"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "LXGW WenKai, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  hero-badge:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    padding: "0.375rem 0.75rem"
---

# Design System: Weekly

## 1. Overview

**Creative North Star: "安静的技术阅览室"**

这套系统要像一间专为技术读者准备的阅览室，安静、明亮、有秩序，但不冷漠。它不是展示产品能力的营销容器，而是一个帮助读者迅速进入内容、维持阅读节奏、持续建立信任的编辑型界面。所有视觉判断都应服务于一个目标：让读者感觉内容已经被认真筛过一轮，因此值得停下来看。

从实现层面看，这个系统已经形成了明确的性格：浅底、冷静蓝主色、少量暖色点染、较轻的阴影、偏理性的标题字族，以及把正文可读性放在前面的间距和字号策略。它拒绝典型 SaaS 模板站的促销气味，也拒绝把首页做成素材广场、卡片墙或“科技感”装饰试验场。

**Key Characteristics:**
- 内容区优先，首页必须尽快导向周刊与最新内容。
- 主色承担识别和关键操作，暖黄只作为低频提示与温度补偿。
- 字体层级明确，标题偏利落，正文偏亲和，避免整站都像工具后台。
- 动效只用来辅助进入和强调，不制造戏剧性表演。
- 深浅主题都存在，但默认感受应始终偏明净、克制、可信。

## 2. Colors

配色是冷静蓝主导、暖黄点到为止的编辑式方案，强调清晰、通透和稳定，而不是高饱和刺激。

### Primary
- **静读蓝** (`#4a90f4`): 用于主按钮、链接焦点、关键强调词和小范围状态提示。它承担“这是值得点击或继续读下去”的信号，不应该铺满大面积背景。
- **推进蓝** (`#337ef2`): 主按钮悬停色和交互加深色，作用是给操作一个更明确的反馈，而不是制造跳脱感。
- **雾化蓝** (`#78aff7`): 用于较轻的辅助强调、图标底色、柔和的局部高亮，维持同一色相中的层次递进。

### Secondary
- **阅览室暖光** (`#fbc35f`): 只在少量提示、轻徽标记、局部情绪升温时出现。它不是第二主色，不用于大面积背景，不与蓝色做高频对冲。

### Neutral
- **纸白** (`#ffffff`): 页面基础背景色，提供最直接的阅读入口。
- **冷雾底** (`#f7fafe`): 用于徽标、次级容器、轻分区和卡片背景，制造轻微的区块差异，但不形成强卡片感。
- **抬升底** (`#f1f5fa`): 用于需要更清楚分层的表面，尤其是次级模块或悬停容器。
- **正文墨** (`#11151a`): 主标题和正文主色，接近黑但保留冷调，保证阅读密度和长期耐看。
- **注释灰蓝** (`#5f6e87`): 用于副标题、说明、次级信息和非激活文本。
- **边界灰** (`#d9e0e7`): 用于细边框、输入框、徽标轮廓和模块分割，优先表达秩序而不是存在感。

### Named Rules
**The Quiet Accent Rule.** 主蓝色在任一屏幕中应保持稀缺，承担“方向”和“操作”的意义。暖黄色进一步稀缺，只在少数需要温度的地方出现。

## 3. Typography

**Display Font:** Inter (fallback: `-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`)
**Body Font:** LXGW WenKai + Inter (fallback: 系统无衬线)
**Label/Mono Font:** Inter；代码和技术片段可退回 JetBrains Mono / Fira Code

**Character:** 标题体系偏精确和利落，正文体系则更亲和、可久读。两者的组合让页面既保留技术内容的清晰边界，又不落入工具后台的生硬感。

### Hierarchy
- **Display** (700, `clamp(2.25rem, 5vw, 4.5rem)`, 1.1): 用于首页 Hero 标题和极少数大章节标题，要求短、准、醒目。
- **Headline** (700, `2.25rem`, 1.2): 用于核心区块标题和重要页面标题，承担信息结构切换。
- **Title** (600, `1.5rem`, 1.3): 用于卡片标题、列表节标题、次级页面结构。
- **Body** (400, `1rem`, 1.6): 正文与说明文字默认样式，单列阅读应尽量保持在 65 至 75 个字符的舒适范围内。
- **Label** (500, `0.875rem`, 1.5): 用于按钮、标签、状态说明和细部引导，保持清楚但不喧宾夺主。

### Named Rules
**The Read-Then-Act Rule.** 先让标题和正文建立可信度，再让按钮和标签承担行动引导。不要让界面从第一眼就像在催促点击。

## 4. Elevation

这套系统是轻微阴影与色面分层的混合模式。默认状态优先依赖浅色面、细边框和间距节奏来建立层次，阴影只在需要可点击性或模块抬升时出现。因此它不是完全扁平，也不追求明显悬浮，而是一种接近纸张叠放的轻微深度。

### Shadow Vocabulary
- **Quiet Lift** (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`): 用于按钮、轻交互元素和默认可点击表面，几乎只表达“可操作”。
- **Reading Card Lift** (`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`): 用于 Hero 图像容器、重点列表模块和悬停状态，表达轻度抬升。
- **Deep Lift** (`box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`): 仅用于需要更强存在感的少量视觉锚点，不能成为常态。

### Named Rules
**The Light-Hand Rule.** 阴影只在状态变化或结构重点处出现。不要把所有容器都做成浮起来的卡片。

## 5. Components

组件手感应是“轻盈而有判断力”。交互明确，但不夸张；形状和边框帮助定位语义，而不是制造风格噪音。

### Buttons
- **Shape:** 中小圆角，默认 `0.5rem`，看起来利落且稳定，不追求药丸形亲和感。
- **Primary:** 静读蓝底、白字、无明显边框，常用内边距约 `0.5rem 1rem`，默认高度 `2.25rem`，大号按钮可增至 `2.5rem` 至 `3rem`。
- **Hover / Focus:** 悬停时颜色加深并轻微增加阴影，聚焦时使用 `2px` 主色 ring 和可见 offset，强调可访问性而不是炫技。
- **Secondary / Ghost / Tertiary:** 次级按钮使用浅底和细边界；ghost 与 tertiary 更接近文字操作，优先通过背景轻染和文字加深来表达状态。

### Chips
- **Style:** Hero 中的 tagline badge 是当前最明确的 chip 语法，采用浅底、细边框、小字号和单个主色圆点。
- **State:** 默认是信息标记而不是过滤器，因此不需要做强烈选中态。

### Cards / Containers
- **Corner Style:** 容器普遍使用 `0.5rem` 至 `0.75rem` 圆角，传达整洁和克制。
- **Background:** 优先用 `paper white`、`cold mist` 和 `raised surface` 三层中性色建立区分。
- **Shadow Strategy:** 默认弱阴影或无阴影，悬停和关键内容区才使用 Reading Card Lift。
- **Border:** 以 `#d9e0e7` 这类低存在感边框为主，帮助界面收边。
- **Internal Padding:** 多使用 `1rem`、`1.5rem`、`2rem` 这三级，避免处处同值导致节奏单调。

### Inputs / Fields
- **Style:** 输入框应保持浅底、清晰描边和中小圆角，语气与按钮体系一致，不做厚重内阴影。
- **Focus:** 以 ring 与边框变化为主，确保键盘用户可见。
- **Error / Disabled:** 错误态依赖颜色加深和文字说明共同表达，禁用态通过透明度和指针状态弱化，但仍需维持可读性。

### Navigation
- **Style:** 导航应维持轻量、稳定和可快速扫读的风格。吸顶头部可以存在，但不应压过正文；激活态更适合通过字重、色值和短线索表达，而不是厚重底板。
- **Mobile Treatment:** 小屏优先保证周刊入口、搜索和目录可达，少用多层折叠菜单制造认知负担。

### Signature Component
- **Hero Word Reveal:** 首页逐字标题和下划线揭示是当前最有辨识度的签名式细节。它可以保留，但必须受 `prefers-reduced-motion` 约束，并维持短时、轻量、一次性出现。

## 6. Do's and Don'ts

### Do:
- **Do** 让首页尽快导向周刊列表和最新内容，把主要注意力留给标题、摘要和内容入口。
- **Do** 把主蓝色保留给交互和重点词，让它持续具有方向意义。
- **Do** 使用轻边框、浅色面和适量留白去建立编辑秩序，而不是一味堆卡片。
- **Do** 保持标题清楚、正文舒展、注释克制，形成读者能快速扫读又愿意深读的节奏。
- **Do** 保留 `prefers-reduced-motion`、高对比聚焦态和不依赖颜色单独传递信息的可访问性策略。

### Don't:
- **Don't** 做成典型 SaaS 模板站，不要出现浓重的营销页腔调。
- **Don't** 依赖夸张渐变、悬浮卡片堆叠或“科技感”装饰来制造存在感。
- **Don't** 把内容站做成促销页，也不要让首页看起来像素材广场或组件库目录。
- **Don't** 让阴影、动画和高饱和强调同时大量出现，这会破坏“安静的技术阅览室”。
- **Don't** 用大面积暖黄或多色竞争去冲淡主蓝的判断力。
