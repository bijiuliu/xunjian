# 夜班巡检

面向手机端的夜班巡检记录工具，包含：

- 8#冲渣区域
- SZ101、SZ201、SZ201-N 皮带区域
- 9#冲渣区域
- 本地历史记录、巡检汇总与 JSON 备份恢复
- 邮箱账号、私有头像和可排序导航
- localStorage 本地优先缓存与 Supabase 跨设备同步

应用始终先把巡检数据保存在当前浏览器。配置 Supabase 后，登录用户的数据会同时同步到云端；未配置时仍可纯本地使用。

## 代码结构

```text
src/app/                         # App Router 入口、布局和全局样式
src/components/ui/               # 本地基础 UI 组件
src/features/inspection/         # 巡检视图、流程、规则、存储和云同步
src/features/inspection/sync/    # 云端同步、持久化离线队列和冲突保护
src/features/auth/               # 登录、注册、验证、密码恢复和会话撤销
src/features/account/            # 账号面板、头像和导航偏好
src/lib/supabase/                # 浏览器 Supabase 客户端
supabase/migrations/             # 数据表、RPC、Storage、RLS 和 Realtime 迁移
tests/                           # 纯业务规则测试
```

更详细的依赖关系和数据流见 [`ARCHITECTURE.md`](./ARCHITECTURE.md)，当前业务规则与交接基线见 [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md)。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 质量检查

```powershell
npm run lint
npx tsc --noEmit
npm test
$env:PAGES_BASE_PATH='/xunjian'
npm run build
```

## GitHub Pages 部署

站点地址：[https://bijiuliu.github.io/xunjian/](https://bijiuliu.github.io/xunjian/)。

推送到 `main` 分支后，GitHub Actions 会自动执行 `npm ci`、构建静态导出并发布到 GitHub Pages。该构建会自动注入 `/xunjian` 基础路径；本地校验 Pages 构建时使用：

```powershell
$env:PAGES_BASE_PATH='/xunjian'
npm run build
```

未配置 Supabase 时，巡检草稿和历史记录仍只保存在使用者浏览器的 `localStorage` 中；重新部署不会迁移或清空终端用户已有的数据。配置后，应用要求邮箱账号登录，并在保留本地缓存的同时同步到 Supabase。

## Supabase 账号与同步

1. 在 Supabase 新建项目，按文件名顺序执行 `supabase/migrations/` 下的全部迁移：
   - `202608280001_create_inspection_sync.sql`：创建巡检记录、草稿及初始同步结构。
   - `20260829150903_user_preferences_and_private_avatars.sql`：创建用户偏好、私有头像桶及 RLS 策略。
   - `20260830040000_session_revocation_realtime.sql`：增加跨设备会话撤销字段并为用户偏好启用 Realtime。
   - `20260831101013_protect_drafts_and_add_recorded_at.sql`：增加 `recorded_at`，并创建只接受较新草稿的 RPC。
   - `20260901043209_revoke_rls_auto_enable_api_execution.sql`：撤销 API 角色对内部 `SECURITY DEFINER` 事件触发函数的直接执行权。
   - `20260906170915_reliable_inspection_sync.sql`：创建事务型整体恢复 RPC，并为巡检记录和草稿启用 Realtime。
2. 在 Authentication → Providers → Email 中保持邮箱注册开启。需要验证邮箱时，同时配置正确的 Site URL；本地开发可加入 `http://localhost:3000` 作为 Redirect URL。
3. 将 `.env.example` 复制为 `.env.local`，填写项目 URL 和 publishable key。旧项目只有 anon key 时，也可将 anon key 填入 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。
4. GitHub Pages 部署需在仓库 Settings → Secrets and variables → Actions 中创建同名的两个 secret：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

浏览器端不得配置或使用 `service_role` key。数据访问由迁移中的 Row Level Security 策略限制为当前账号。`user_preferences` 加入 Realtime publication 后仍受现有 RLS 约束，客户端只能订阅和更新自己的偏好记录。

首次登录会把当前浏览器中的旧版巡检记录归入该账号，并按记录 UUID 与云端合并。以后在保存、删除、导入恢复、恢复联网和页面重新回到前台时同步。历史记录的保存、删除、合并导入和覆盖恢复会先写入按账号隔离的持久化操作队列，再尝试访问网络；失败项保留在浏览器中，并按 1、3、10、30 秒退避重试，恢复联网或回到前台时也会立即补查。

历史记录通过 UUID 合并，删除通过云端 `deleted_at` 墓碑传播。普通保存和合并导入只允许新增，不能复活墓碑；只有用户明确选择“覆盖恢复”时，才通过 `replace_inspection_records` 数据库事务恢复目标记录并软删除其余活动记录。队列中的每项操作拥有稳定 ID，同步成功后只确认对应项，因此同步进行期间新增的操作不会丢失。同步请求返回前如果本地记录又发生变化，客户端会拒绝旧结果并重新同步。

草稿的每次真实编辑都会生成严格递增的 `updatedAt`：较新版本胜出，相同版本采用已确认的云端副本，旧版无时间戳草稿不能覆盖已有云端草稿。数据库 RPC 会再次拒绝过期写入，客户端收到拒绝后重新获取云端最新版本。新建空白记录也会保存为空白版本化草稿，因此清空操作能够同步到其他设备。在线账号同时订阅巡检记录和草稿的 Realtime 变更；Realtime 只负责触发重新拉取，恢复联网和页面回到前台时仍会完整补查。

首页同步状态会区分“同步中”“离线（含待同步数量）”“同步失败（含待同步数量）”和最近同步时间。该数量来自当前账号的本地操作队列，不包含尚在防抖等待中的草稿编辑。

首页右上角头像打开账号面板。头像存放在私有 Supabase Storage bucket 中，客户端缓存短期签名 URL，并在图片实际加载成功后才替换当前显示；失败后会在启动、恢复联网或回到前台时重试。邮箱状态、修改密码、导航拖动排序和退出登录均集中在此。导航第一项作为启动页面，偏好本地缓存并同步到 `user_preferences`，换设备登录后自动恢复。导航顺序和头像路径按字段分别提交，并通过更新时间条件和本地修订号防止旧请求覆盖另一设备或后续操作的新值。

登录与注册使用统一的移动端表单布局，密码输入支持显隐，注册和重置密码都需要二次确认。注册后可重发验证邮件；登录未验证邮箱时也会提供重发入口。

登录页支持“忘记密码”：用户提交邮箱后，Supabase 会发送重置邮件；打开邮件链接会回到应用并显示设置新密码界面。要让生产环境的验证和重置链接正确返回 GitHub Pages，请在 Authentication → URL Configuration 中将 Site URL 设为 `https://bijiuliu.github.io/xunjian/`，并把该完整地址加入 Redirect URLs。本地调试时再额外加入 `http://localhost:3000/`。

账号内修改密码和邮件找回重设密码后，应用保留当前设备登录并撤销其他设备会话。在线设备通过 `user_preferences` 的 Realtime 变更及时退出；离线或后台设备会在恢复联网或页面回到前台时检查撤销标记并退出。


## 图标资源规范

- 登录、注册和找回密码页使用内嵌的 4096×4096 透明品牌图标，不发起外部图片请求；重置密码成功页继续使用钥匙图标。
- PWA、Apple Touch Icon 与 favicon 使用本项目自己的不透明白色直角底图标，不能用透明登录图标代替。
- Safari 兼容入口固定为仓库子路径下的 `favicon.ico` 与 `apple-touch-icon.png`；Next.js 文件约定图标已停用，所有页面由根布局统一声明同一组图标。
- Safari 收藏入口显式引用带版本的实体文件名，不能只给通用文件名添加查询参数；通用文件仅作为浏览器自动探测的兜底。
- PWA 图标固定使用 `public/icons/xunjian-pwa-{192,512,1024}.png`；Web App Manifest 保持独立 `id`、`start_url` 与 `scope`。
- 禁止引用其他仓库或以忽略 `basePath` 的根路径加载资源；替换图标后运行 `node scripts/check-icons.mjs`。
