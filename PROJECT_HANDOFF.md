# 夜班巡检项目交接文档

> 更新日期：2026-08-30
> 用途：让新的 Codex 对话快速接手当前代码，避免重新梳理已确认的纸表规则、回退已撤销的交互，或破坏已有浏览器数据。

## 1. 当前状态（60 秒接手）

- 项目目录：`E:\codex\我的项目\夜班巡检`
- 本地开发地址：<http://localhost:3000/>（本次会话的开发服务器已启动；新会话应自行执行 `npm run dev`）
- GitHub 仓库：<https://github.com/bijiuliu/xunjian>
- GitHub Pages 目标地址：<https://bijiuliu.github.io/xunjian/>；`main` 分支推送会触发 `.github/workflows/deploy.yml` 自动构建与发布。发布完成后，应以 Actions 成功状态和该地址实际页面为准。
- 技术栈：Next.js 16.3.2 App Router、React 19、TypeScript、Tailwind CSS 4、本地 shadcn/ui 风格组件、Framer Motion、Lucide、Sonner、localStorage、Supabase Auth/Postgres、PWA manifest。
- 产品形态：仅手机端的 App 风格夜班巡检工具；支持邮箱自行注册、账号登录、邮箱验证、忘记密码、账号头像、本地优先缓存和跨设备云同步。
- 当前密码安全策略：账号内改密和邮件找回重设密码后保留当前设备登录，撤销其他设备会话；在线设备通过 Realtime 及时退出，离线或后台设备在恢复联网或回到前台时退出。
- 主导航默认顺序：`8#冲渣` → `皮带` → `9#冲渣` → `历史记录`；用户可在账号面板拖动排序，第一项为启动页面并跨设备同步；一级导航和皮带子导航会吸顶。
- 设计规范：`DESIGN.md`；唯一的颜色、圆角、阴影和间距 token 在 `src/app/globals.css`。
- 架构规范：`ARCHITECTURE.md`。

当前代码已经完成模块化重构：

```text
src/app/page.tsx                         # App Router 路由入口，保持 Server Component
src/features/inspection/
├─ components/                           # 巡检、泵区、皮带、历史、弹窗视图
├─ hooks/use-inspection-controller.ts    # 状态、流程、Toast 与用户操作编排
├─ model/                                # 类型、配置、字段规则、保存校验（纯 TypeScript）
├─ storage/inspection-storage.ts         # 唯一的 localStorage 访问层
└─ sync/inspection-cloud-sync.ts         # Supabase 同步、软删除与离线队列
src/features/auth/                       # 登录、注册、邮箱验证、密码恢复与会话状态
src/features/account/                    # 账号面板、私有头像与导航偏好同步
src/lib/supabase/client.ts               # 浏览器 Supabase 客户端
supabase/migrations/                     # 数据表与 RLS 策略
```

`src/app/page.tsx` 不再承载巡检业务。新的客户端根组件是 `src/features/inspection/components/night-inspection-app.tsx`。

接手后按顺序阅读：

1. `AGENTS.md`
2. 本文档
3. `ARCHITECTURE.md`
4. `README.md`
5. `src/app/page.tsx`
6. `src/features/inspection/components/night-inspection-app.tsx`
7. `src/features/inspection/hooks/use-inspection-controller.ts`
8. `next.config.ts` 与 `.github/workflows/deploy.yml`

修改任何 Next.js 代码前，必须先阅读本机 `node_modules/next/dist/docs/` 下对应的 Next.js 16 文档，并遵循 `AGENTS.md`。

## 2. 产品目标与范围

本项目将夜班纸质巡检表转为便于手机现场填写、保存和查阅汇总的工具；目标不是桌面表格或云端管理系统。

四个板块：

1. 8#冲渣区域
2. 皮带区域：SZ101、SZ201、SZ201-N
3. 9#冲渣区域
4. 历史记录：查看汇总、管理、多选删除和详情删除

保存时自动生成填写日期和时间；纸表底部的日期、班次、巡检人、巡检时间不做输入项。

以下内容明确不做，不能因旧纸表或旧截图恢复：

- 8#、9#冲渣液压站油位
- 冲渣料斗下料口
- SZ201、SZ201-N 皮带头轮下料口
- 泵房四段管沟排水、炉地下管廊排水、冲渣沟/阀门漏水检查
- 集水坑、消防水池、车库卫生等其他事项
- 皮带情况、高低速联轴器、头轮气管、尾轮下料口等已删除的独立勾选卡片

## 3. 核心业务规则

### 3.1 通用填写规则

- 黑色实心点代表没有对应点位，不代表异常。
- 正常状态是勾，点击可以切换为叉。
- 数值不显示单位；手机输入使用数字键盘，最多两位。
- 未填写保持为空，不自动写入 `0` 或 `1`。
- 新建会清空填写内容和草稿，并将皮带子板块重置为 `SZ101`。

### 3.2 冲渣泵

| 区域 | 设备组 | 可选泵号 |
|---|---|---|
| 8#冲渣 | 冲渣泵 | 101、102、103 |
| 8#冲渣 | 上塔泵 | 501、502、503 |
| 9#冲渣 | 冲渣泵 | 201、202、203 |
| 9#冲渣 | 上塔泵 | 1#、2#、3# |

每组为三台泵、两用一备，只填写两台运行设备。每台填写：南、北、前轴、机身。

同组两张运行泵卡片不能最终保持相同泵号。重复选择时必须交换泵号，而不是禁用选项：

- 当前卡片为空，选择另一张卡片已选泵号：当前取得该泵号，另一张清空。
- 当前已有泵号，再选择另一张的泵号：两张泵号互换。

实现位置：`src/features/inspection/model/field-rules.ts` 的 `selectPump`。不要改回“重复编号不可选”。

每张泵卡片源码中仍保留“盘根引水槽”状态及数据；当前通过 `.pump-status-row` 隐藏。若要删掉而非隐藏，先明确数据兼容范围。

### 3.3 皮带区域

| 皮带 | 当前项目与特殊规则 |
|---|---|
| SZ101 | 电机（单输入）、头轮、头增面轮、尾轮；无液力耦合器、配重类、中间滚筒 |
| SZ201 | 电机/减速机、头轮、配重东/南、配重西/北、配重、中间滚筒、尾轮；无液力耦合器、头增面轮 |
| SZ201-N | 电机/减速机、液力耦合器（单输入，标签“液耦”）、头轮、头增面轮、配重东/南、配重西/北、配重、尾轮；无中间滚筒 |

方向规则：

- SZ101 默认东、西；SZ201 与 SZ201-N 默认南、北。
- 电机/减速机：标签为“电机”“减速机”。
- 配重东/南：标签为“东”“南”；配重西/北：标签为“西”“北”。
- 配重东/南、配重西/北标题前有实心点，“配重”没有。
- 每张皮带项目卡右上角“清空”只能清空当前项目。

设备清单和显示规则的唯一来源是：

- `src/features/inspection/model/config.ts`
- `src/features/inspection/model/field-rules.ts`

## 4. 已完成功能与当前 UI 行为

- 四个一级板块、三个皮带子板块。
- 泵号选择与重复泵号交换。
- 数值输入、局部清空、正常/异常状态切换。
- 保存前完整性检查：分别列出未选择泵号和空白数值；可返回补充或仍然保存。
- localStorage 历史记录、自动日期时间、草稿自动保存与新建清空。
- Sonner 顶部成功提示；提示文本包含被清空的区域或皮带编号。
- 历史列表、详情汇总、批量管理、二次确认、详情删除。
- 汇总顺序：皮带区域 → 8#冲渣 → 9#冲渣。
- PWA manifest、iPhone Safe Area、GitHub Pages 静态导出。
- 登录与注册共用同一套移动端表单布局；密码输入支持显隐，注册和重置密码均要求二次确认。
- 注册后提供邮箱验证状态与 60 秒重发冷却；已注册账号会在邮箱输入框抖动后显示行内提示和忘记密码入口，不使用易被误解为注册成功的完成页。
- 登录未验证邮箱时可直接重发验证邮件；认证错误优先按 Supabase `error.code` 映射，不依赖英文错误文案。
- 登录页忘记密码流程：发送 Supabase 重置邮件，邮件链接返回当前应用，收到 `PASSWORD_RECOVERY` 后设置并确认新密码。
- 修改密码成功后调用 Supabase Auth 的 `signOut({ scope: "others" })` 撤销其他刷新会话，并写入 Realtime 撤销标记；当前设备保持登录，其他设备执行本地登出。
- 首页右上角为用户头像唯一入口；邮箱、修改密码和退出登录只放在账号面板，不在首页重复展示。账号内修改密码必须填写当前密码验证，邮件找回密码流程不受此限制。
- 云同步状态仍只放首页顶部，备份恢复仍只放历史记录；不要在账号面板增加重复入口。
- 导航排序由 `features/account` 管理并同步到 `user_preferences`；必须校验四个 tab 各出现一次，第一项作为启动页面。
- 头像存放于私有 `avatars` bucket 的当前用户目录，使用一小时签名 URL；不要改成公开 bucket。

### 历史记录管理区

- 历史详情底部“返回历史记录 / 删除”操作栏是 `fixed`，相对视口和 Safe Area 定位。
- 历史列表的批量删除区不是 `fixed`，而是列表内的 `sticky` 操作区。
- 管理模式下，删除区与末张卡片保持约 8px 间距。`.history-selection-actions` 仅在 `sticky` 实际吸到视口底部时显示顶部 32px 的滚动边缘渐隐；短列表中删除区正常排在最后一张卡片之后，不使末张卡片渐隐。
- 当前渐隐为约 32px 的纯透明度过渡，不使用整片背景模糊；操作区背景不拦截卡片选择点击，按钮自身正常可点。
- 系统启用“减少透明效果”时，该操作区回退为实色背景。
- 不要恢复左滑删除，除非用户明确提出。

### 视觉与触控约束

- 只做手机端：浅灰页面、白色圆角卡片、蓝色主要操作、适度阴影。
- 首页头部保持深色渐变：`from-slate-950 via-slate-900 to-blue-950`。
- 一级导航：44px 白色圆角轨道、蓝色实心选中态、白字；皮带子导航：42px 浅灰轨道、白底蓝字。
- 导航外层圆角 22px、内边距 4px、选中项圆角 18px；三者必须同步保持同心关系。
- 原生 `<select>` 必须保留，宽 108px、高 44px，焦点过渡 `.18s`。
- “清空”文字维持小号常规字重，触控区域至少 44px；两者不要绑定为同一视觉尺寸。
- 用户若要求只修改框选区域，不得顺手调整周边字号、间距、色彩或历史汇总排版。

### 动画与无障碍

动画应短、自然、克制：

| 位置 | 当前参数 |
|---|---|
| 一级板块内容切换 | Framer Motion `mode="wait"`；退出上移 6px / 180ms，进入从下方 8px / 180ms |
| 历史列表/详情切换 | 单段 180ms，轻量水平推进 |
| 历史详情底部操作栏 | 180ms；进入延迟一个详情进入时长 |
| 一级与皮带导航选中态 | CSS 200ms |
| Button 按压 | CSS 200ms，缩放至 0.97 |
| 原生 Select 焦点 | 180ms |
| Dialog 遮罩 | Framer Motion 默认 tween |
| Dialog 面板 | Spring：`stiffness: 420`、`damping: 34` |

`prefers-reduced-motion` 已压缩 CSS 动画，并让历史详情切换与详情底部操作栏降为 0ms。一级板块切换与两个 Dialog 尚未完全接入减少动态效果，后续统一时需保持交互节奏。

## 5. 数据、存储与兼容性

类型定义：`src/features/inspection/model/types.ts`

```ts
type InspectionRecord = {
  id: string;
  date: string;
  time: string;
  values: Record<string, string>;
};
```

- 历史记录键：`night-inspection`，存储 `InspectionRecord[]`。
- 草稿键：`night-inspection-draft`，当前格式为 `{ values, beltTab, updatedAt? }`。
- 草稿读取必须兼容旧版只保存 `values` 对象的格式。
- 巡检数据的 localStorage 访问只能放在 `src/features/inspection/storage/inspection-storage.ts`；账号偏好缓存只能放在 `src/features/account/storage/`，组件和领域模型不得直接访问 `localStorage`。
- 修改字段 key、记录结构或存储键之前，必须先设计归一化/迁移并验证旧浏览器数据。
- 未配置 Supabase 时，清理浏览器站点数据、换浏览器或换手机会丢失记录；配置并登录后可从云端恢复。
- 第一个登录账号接管未归属账号的旧数据；同一浏览器中的不同账号使用隔离缓存。
- 云端表使用 RLS 按 `auth.uid() = user_id` 隔离；记录采用软删除，草稿按更新时间解决冲突。
- 跨设备会话撤销复用 `user_preferences`：`sessions_revoked_at` 记录撤销时间，`sessions_revoked_by` 记录发起会话 ID；当前会话据此保持登录，其他会话退出。
- 仓库迁移文件为 `supabase/migrations/20260830040000_session_revocation_realtime.sql`；生产 Supabase 已执行并登记为 `20260830110531_session_revocation_realtime`。该迁移只新增两个可空字段并把 `user_preferences` 加入 `supabase_realtime` publication，不改动现有用户、巡检、头像或导航数据。
- 当前只有 manifest，没有可靠 Service Worker 离线缓存；不要宣称“完全离线”。

## 6. 架构与部署约束

依赖方向：

```text
app → features/inspection → components/ui
                          → lib

components → hooks → model
                   → storage → model
```

- `src/app` 只放路由、布局和全局样式。
- `model` 保持纯 TypeScript，不依赖 React、DOM、Framer Motion 或浏览器 API。
- `components/ui` 不能依赖业务模块。
- 巡检专属组件留在 `src/features/inspection/components`，通用控件才可进入 `src/components/ui`。
- 不新增第二套 UI 系统、状态库或完整 UI 库；现有 React state、Hook、Tailwind、Framer Motion 足够。
- `next.config.ts` 使用静态导出：

```ts
output: "export"
basePath: process.env.PAGES_BASE_PATH
allowedDevOrigins: ["127.0.0.1", "localhost"]
```

- GitHub Pages 构建需保持 `PAGES_BASE_PATH='/xunjian'`。
- 对 Git/部署做出操作前，先只读检查 `git status` 与 `git remote -v`；不要假设本机有可用推送链路或 GitHub CLI 登录。

## 7. 当前已知问题与候选工作

### 已知问题

1. 快速连续点击一级导航时，选中标签和内容偶尔错位。根因与带退出等待的 `AnimatePresence mode="wait"` 有关；不能简单删除动画，必须同时保留细腻切换体验。
2. 一级板块切换及保存/删除 Dialog 尚未完整遵从“减少动态效果”。
3. 生产 Supabase 已完成当前全部迁移；新建或更换 Supabase 项目时仍需按文件名顺序执行 `supabase/migrations/`，并配置环境变量和 Authentication URL。仓库本身不包含凭据。
4. PWA manifest 不等于完整离线能力，尚未实现 Service Worker 静态资源缓存。

### 尚未实现

- APK：可用 Capacitor 包装当前静态导出，无需引入 Ionic UI；当前未安装或配置。
- Service Worker 静态资源缓存与真正的完整离线安装体验。

## 8. 开发与验证

启动：

```powershell
npm run dev
```

质量门禁（每次代码改动后都执行）：

```powershell
npm run lint
npx tsc --noEmit
$env:PAGES_BASE_PATH='/xunjian'
npm run build
```

截至 2026-08-30，跨设备会话撤销改动已通过 `npm run lint`、`npx tsc --noEmit` 和 GitHub Pages 生产构建。

涉及交互时至少手工检查：

- 四个一级板块与三个皮带子板块能正常切换；快速切换不出现错位。
- 重复泵号按交换规则处理。
- 数值输入最多两位；卡片清空仅影响当前卡片；顶部提示文案正确。
- 刷新后草稿、泵号、状态和当前皮带子板块能恢复；新建后草稿清空且回到 `SZ101`。
- 保存校验能区分未选泵号与空数值；保存后汇总顺序、日期时间与历史持久化正确。
- 历史列表到详情及返回方向正确；详情底部操作栏始终相对视口稳定。
- 历史管理模式下，删除区为列表内吸底；末张卡片只在靠近删除区时轻微渐隐，删除按钮不遮挡或抢占卡片点击。
- GitHub Pages 构建时 `/xunjian` 子路径资源正确。
- 两台设备登录同一账号，在其中一台修改密码后，当前设备保持登录；另一台在线时及时退出，离线或后台时在恢复联网/回到前台后退出。

## 9. 新对话直接粘贴

```text
继续开发 E:\codex\我的项目\夜班巡检。

先完整阅读：
1. AGENTS.md
2. PROJECT_HANDOFF.md
3. ARCHITECTURE.md
4. README.md
5. src/app/page.tsx
6. src/features/inspection/components/night-inspection-app.tsx
7. src/features/inspection/hooks/use-inspection-controller.ts

不要重新设计、不要回退已完成内容。业务规则、样式和数据兼容以当前源码为最终依据；先说明当前状态，再执行我的新需求。
```
