# 代码治理记录（2026-09-09）

范围：基于 `a6eedb5`，保持产品行为、模块方向、数据格式及部署配置；不新增依赖。

## 审计分类

| 分类 | 结论与处理 |
| --- | --- |
| A 明确可删除 | 无加载入口的 `public/pump-guard.js`；无引用的五个模板 SVG；仅模块内部使用的导出标记和账号入口的无消费者重导出。 |
| B 明确重复 | 皮带标题判断；本地状态到草稿的转换；三处云记录载荷映射；备份和云端的 values 校验。 |
| C 复杂度热点 | 巡检控制器的外部同步事件、账号菜单的导航拖动编辑、偏好 hook 的图片处理已有独立职责，可提取。同步并发主体保留集中。 |
| D 边界问题 | 首页通过账号菜单取得头像展示组件；云同步和队列通过备份模块引用记录校验。分别改为独立账号展示组件、model 纯校验。 |
| E 暂不修改 | 草稿版本与 stale RPC、历史队列、修订号、重试、账号字段级提交、头像恢复、会话撤销、RLS/迁移、PWA 图标和部署。 |

审计已覆盖 src、现有 8 个测试文件、全部 6 份迁移、Actions、构建配置、公共资源和全局样式。基线 35 项测试通过，额外的 TypeScript unused locals/parameters 检查通过。没有发现可安全删除的依赖；Button/Card、AuthForm、历史列表和备份局部面板已有合理拆分，无需机械拆分。不同弹层的尺寸、滚动、退出交互和嵌套行为有差别，本次不统一为万能 Sheet。

删除依据：检查静态/动态 import、脚本加载、运行时字符串、CSS、manifest、metadata、Actions、迁移和测试后，六个公共文件没有消费者；旧脚本的禁用泵号逻辑已被 `selectPump` 交换规则取代。图标即使尺寸相似也保留。`pump-status-row` 和 StatusToggle 有明确兼容保留说明，继续保留。全局 CSS 的业务 class 均有消费者，设计 token 不因当前使用频率而裁剪。

## 实际变更

- 删除：`public/pump-guard.js`、`file.svg`、`globe.svg`、`next.svg`、`vercel.svg`、`window.svg`；收窄 ButtonProps、AuthStatus、AuthOperation、CloudSyncResult、ImportUndoSnapshot、三个存储键的内部导出，以及 account 入口的无消费者重导出。没有删除依赖、图标或兼容数据字段，删除文件可从 Git 恢复。
- 合并：皮带清空提示与页面标题共用 getBeltItemTitle；三处存储草稿重建共用 getStoredInspectionDraft；新增/覆盖恢复/RPC 共用云记录业务字段映射；备份/队列/云端复用 model 校验；上传/移除头像共用保留导航 pending 的缓存写入。
- 拆分：navigation-order-editor 封装排序草稿和拖动手势；avatar-visual 供首页和菜单共用；prepare-avatar 封装图片处理；inspection-cloud-mapping 封装纯行转换；use-inspection-sync-events 封装外部事件。均留在原 feature 内，无新增架构层。
- 保留：控制器全部修订号、互斥/补跑、800ms 上传防抖、100ms 等待与退避重试；草稿仲裁、队列执行、墓碑、insert-only、覆盖恢复及 PGRST202 回退；偏好字段级提交、legacy pending、头像签名 URL/preload/recovery；认证与会话撤销；隐藏状态行；所有 PWA 图标、manifest、CSS token 和部署配置。
- 无需修改：AuthForm 与认证流程的现有分工、历史列表及备份局部面板、公共 Button/Card 结构、globals.css、依赖和数据库迁移。没有把不同业务同步强行合并。

## 扩展位置与长期规则

1. 保持 app → features → model/storage/sync 和 components/ui 的方向；业务规则不放通用 lib。
2. 设备、字段和显示规则进入 inspection/model，旧格式读取进入 storage。
3. 巡检控制器集中持有版本和并发状态；外部触发源进入同步事件 hook，历史与备份使用现有专属 hook。
4. 草稿仲裁只改 draft-reconciliation，并同步验证空白草稿、legacy、同毫秒和 stale 返回。
5. 历史操作先本地持久化并入队；保留稳定 ID、逐项确认、墓碑与仅覆盖恢复可复活的语义。
6. 账号按字段提交偏好；图片处理、头像展示和导航编辑各进入自己的现有模块。
7. UI 使用现有 token/Button/Card；仅在职责独立时提取组件，不按行数拆分。
8. 改动后检查 diff 并运行 lint、TypeScript、tests、build；PWA 与部署资源单独核查运行时引用。

未来风险位置：`use-inspection-controller`（同步与 UI 编排）、`inspection-cloud-sync`（查询与队列执行）、`use-user-preferences`（字段并发及头像恢复）、`auth-screen`（认证表单状态）、`night-inspection-app`（页面与弹窗接线）。新增功能先按上述职责分流，不继续默认堆入入口文件。

## 验证

- `npm run lint`：通过，无警告。
- `npx tsc --noEmit`：通过。
- `npm test`：40/40 通过，原有 35 项全部保留，新增 5 项覆盖云映射、载荷校验、草稿重建和头像提交后的 pending 保留/账号隔离。
- `PAGES_BASE_PATH=/xunjian npm run build`：Next.js 16.3.2 静态生产构建通过。
- `git diff --check`：通过；没有依赖、迁移、CSS、Next 配置或 Actions 改动。
- 修改前后 AccountMenu 与三个 BeltArea 状态的 renderToStaticMarkup SHA-256 全部一致；提取的两个同步 effect 与原文一致，依赖、清理和 200ms 后台补查不变。这不替代手势/动画的浏览器验收。
- 导出目录检查：manifest 内容一致，首页使用 `/xunjian/manifest.webmanifest`，favicon、icon、apple-icon 和三个 public/icons 文件齐全，六个废弃资源已不再导出。

本次按 Supabase 技能核对了官方变更摘要和 [Realtime 订阅文档](https://supabase.com/docs/reference/javascript/subscribe)，仅提取原有代码，没有更换 API 或权限策略。

验证边界：没有执行真实邮箱登录/注册/改密、双设备联机冲突、生产 Realtime 或 session revoke 端到端验收，也没有做手机拖动/动画实机验收；不声称这些场景已由上述本地检查完全证明。改动保留现有时序和数据保护；真实联机验收仍是发布前的检查项。本次未提交、推送或部署。

## 品牌图标迁移补充（2026-09-09）

本节记录代码治理审计之后完成的独立品牌资源迁移。上文“PWA 图标和部署暂不修改”“所有 PWA 图标保留”描述的是当时那次代码清理的边界，不代表后续品牌资源永久冻结。

- 新增 `design/brand/night-inspection-master.svg` 作为唯一设计母版，并在 `design/brand/README.md` 固定色值、几何、导出矩阵和验收规则。
- Next.js 应用图标由 `src/app/icon.png` 切换为白底 `src/app/icon.svg`；同步更新 `apple-icon.png` 和包含 16/32/48/64 尺寸的 favicon。
- 登录页用 `src/features/auth/components/auth-screen.tsx` 内的透明内嵌 SVG 组件 `AuthLogo` 替换原盾牌品牌占位；该装饰图形使用 `aria-hidden`，重置密码的功能性钥匙图标继续使用 Lucide。
- manifest 改用带版本文件名的 192/512 普通图标，并新增独立的 512 Maskable 图标。Maskable 全部品牌像素的最大中心半径为 184.15px，小于 512px 画布要求的 204.8px 安全半径。
- 项目原有黑底眼形旧图标已从当前工作区删除；本次新品牌图形的过程版本保存在 `design/brand/archive/`，不参与运行时构建。旧图标仍存在于 Git 历史，本次没有改写仓库历史。
- 迁移未增加依赖，未修改 localStorage、Supabase、巡检规则、Safe Area、Next 配置或部署工作流。
- 验证结果：lint、TypeScript、40 项测试和 Next.js 16.3.2 生产静态构建全部通过；导出目录包含新版 manifest、favicon、icon、apple-icon 和三个 PWA 图标。
