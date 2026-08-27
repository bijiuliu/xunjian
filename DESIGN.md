# 夜班巡检设计规范

## 产品定位

夜班巡检是一个 Mobile First 的现场记录 PWA：操作应像成熟 iOS App 一样直接、克制、可靠。界面服务于快速填写、核对与回看，不把现场工具做成桌面报表。

## 视觉原则

- 以浅灰页面承托白色卡片，重点操作使用系统感蓝色。
- 优先可读性、触控效率和状态清晰度；装饰不应干扰巡检。
- shadcn/ui New York 是组件结构基线，视觉继续遵循本项目的 iOS 风格，而非照搬默认样式。
- Material Design 3 仅用于交互准则：44px 级触控目标、明确的操作优先级、适当的 Dialog / Bottom Sheet 与表单反馈；不使用其视觉主题。

## Tokens

唯一 token 源在 `src/app/globals.css`。新增界面优先使用语义化 Tailwind 类，例如 `bg-primary`、`text-muted-foreground`、`rounded-card`、`shadow-card`。

| 类别 | Token | 用途 |
| --- | --- | --- |
| 颜色 | `background` / `foreground` | 页面与默认文字 |
| 颜色 | `card` / `border` / `muted` | 卡片、分隔与弱化区域 |
| 颜色 | `primary` / `secondary` | 主操作与次要操作 |
| 状态 | `success` / `warning` / `destructive` | 成功、需注意、危险操作 |
| 圆角 | `radius-small` / `radius-control` / `radius-navigation` / `radius-card` / `radius-sheet` | 内容块、控件、导航、卡片、底部弹层 |
| 阴影 | `shadow-card` / `shadow-floating` / `shadow-primary` | 层级与主操作 |
| 间距 | `space-page` / `space-section` | 页面水平边距与区块间距 |
| 字体 | `text-caption` / `text-body` / `text-title` | 注释、正文、页面标题 |

## 布局与 Safe Area

- 仅以手机为主要体验目标，内容宽度保持现有 `max-w-md`。
- 页面使用 `env(safe-area-inset-top)` 与 `env(safe-area-inset-bottom)`；固定底部操作不得遮挡 Home Indicator。
- 主要页面边距使用 `p-page` 或现有的 16px 等值；同一视图不要混入随意的新间距值。
- 交互控件优先最小 44px 高/宽，图标按钮保留可点击留白。

## 组件规范

### Header 与导航

首页头部保持深色渐变，作为应用身份与主要“新建 / 保存”操作区。一级导航与皮带子导航共用圆角、44px 轨道高度、内描边和阴影语言。轨道使用 4px 内边距，导航项视觉高度为 36px，因此上下左右均精确内缩 4px；再通过透明伪元素只向上下扩展实际命中范围至 44px。一级选中态为蓝色实心，子导航保持浅灰底、白色选中态与蓝色文字，以表达不同层级。两层吸顶时必须保留安全区和层级关系。

当内外边缘视觉上平行时，嵌套圆角遵循几何关系：**内层圆角 = 外层圆角 − 内边距**。两层导航统一为外层 22px、内边距 4px、选中项 18px，并确保内层在外层中四边等距；底部弹层为 26px、内容间距为 16px，因此内部整宽状态块使用 10px。独立按钮、图标与输入控件使用自身组件圆角，不强行套用该公式。

### Button 与图标

按钮优先复用本地 `Button`。主按钮使用 `primary`，危险确认使用 `destructive`，低优先级操作用 secondary 或 ghost。所有功能图标使用 Lucide React；常规尺寸为 16–20px，图标按钮保持完整触控区域。

### Card、输入与状态

卡片使用 `Card` 与 `CardContent`，白色背景、统一圆角和轻阴影。输入错误必须在字段附近清楚说明；Toast 只用于短暂的操作结果。保存校验、删除确认等会阻塞决策的场景使用 Dialog / Bottom Sheet，而不是 Toast。

### Loading、Empty、Error、Success

- Loading：使用 Skeleton 或就地 loading 状态，不阻塞已经可用的内容。
- Empty：使用 Lucide 图标、简短说明和一个明确的下一步。
- Error：在界面内保留错误原因与恢复操作；不只依赖 Toast。
- Success：保存、清空、删除完成可使用一句 Sonner 提示，不重复弹出。

Dialog 面板开始退出后必须立即禁用内部交互，防止移动中的按钮被连续点击误触。保存校验和删除确认弹窗在退出开始后同步取消遮罩的指针事件，允许页面立即恢复操作；保留现有视觉退出动画。

## 动画

Framer Motion 只用于页面/Tab 切换、底部弹层、卡片展开与关键状态反馈。默认时长约 160–220ms；弹层可以使用轻量弹簧。动画不得阻碍连续切换或输入，且必须尊重现有导航状态正确性。

一级板块内容切换使用 `mode="wait"`：旧内容在 180ms 内淡出并上移 6px，新内容再在 180ms 内从下方 8px 淡入。保持与其他组件一致的简洁、均匀过渡。

历史记录列表进入详情采用轻量水平推进：详情从右侧约 18px 淡入，列表向左约 14px 淡出；返回时方向反转。标准时长为 140ms，并在系统启用“减少动态效果”时取消位移动画时长。

历史详情的底部操作栏必须位于水平切页动画容器之外，始终相对视口和 Safe Area 固定；它只做约 10px 的轻微纵向淡入，禁止随详情内容 transform 后再跳回底部。操作栏与历史视图统一使用 140ms 和相同缓动；进入详情时等待列表退场后再与详情内容同步入场，返回时与详情内容同步退场。

## Dark Mode

当前不提供 Dark Mode。新增组件不得假设深色主题已经存在；若未来启用，必须先补齐全部语义 token 和页面验证，不能仅做颜色反转。

## 组件与质量演进

新增通用能力优先扩展本地 shadcn/ui 风格组件（如 Sheet、Dialog、Tabs、Skeleton）。Storybook 用于组件状态基线，Playwright 用于手机端核心流程。引入上述工具或 React Hook Form、Zod、Service Worker 前，需先记录使用位置、收益与更轻量替代方案。
