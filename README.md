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
node --test --experimental-strip-types tests/draft-version.test.mjs
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

1. 在 Supabase 新建项目，按文件名顺序执行 `supabase/migrations/` 下的迁移。第一份创建巡检同步表，第二份创建用户偏好表、私有头像桶及 RLS 策略，第三份增加跨设备会话撤销字段并启用 Realtime，第四份增加历史记录的 `recorded_at` 并创建只接受较新草稿的 RPC，第五份撤销 API 角色对内部 `SECURITY DEFINER` 事件触发函数的直接执行权。
2. 在 Authentication → Providers → Email 中保持邮箱注册开启。需要验证邮箱时，同时配置正确的 Site URL；本地开发可加入 `http://localhost:3000` 作为 Redirect URL。
3. 将 `.env.example` 复制为 `.env.local`，填写项目 URL 和 publishable key。旧项目只有 anon key 时，也可将 anon key 填入 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。
4. GitHub Pages 部署需在仓库 Settings → Secrets and variables → Actions 中创建同名的两个 secret：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

浏览器端不得配置或使用 `service_role` key。数据访问由迁移中的 Row Level Security 策略限制为当前账号。`user_preferences` 加入 Realtime publication 后仍受现有 RLS 约束，客户端只能订阅和更新自己的偏好记录。

首次登录会把当前浏览器中的旧版巡检记录归入该账号，并按记录 UUID 与云端合并。以后在保存、删除、导入恢复、恢复联网和页面重新回到前台时同步；同步失败时继续保存在本地，联网后可重试。

历史记录通过 UUID 合并，删除通过云端 `deleted_at` 墓碑传播。草稿的每次真实编辑都会生成严格递增的 `updatedAt`：较新版本胜出，相同版本采用已确认的云端副本，旧版无时间戳草稿不能覆盖已有云端草稿。数据库 RPC 会再次拒绝过期写入，客户端收到拒绝后重新获取云端最新版本。新建空白记录也会保存为空白版本化草稿，因此清空操作能够同步到其他设备。

首页右上角头像打开账号面板。头像存放在私有 Supabase Storage bucket 中；邮箱状态、修改密码、导航拖动排序和退出登录均集中在此。导航第一项作为启动页面，偏好本地缓存并同步到 `user_preferences`，换设备登录后自动恢复。

登录与注册使用统一的移动端表单布局，密码输入支持显隐，注册和重置密码都需要二次确认。注册后可重发验证邮件；登录未验证邮箱时也会提供重发入口。

登录页支持“忘记密码”：用户提交邮箱后，Supabase 会发送重置邮件；打开邮件链接会回到应用并显示设置新密码界面。要让生产环境的验证和重置链接正确返回 GitHub Pages，请在 Authentication → URL Configuration 中将 Site URL 设为 `https://bijiuliu.github.io/xunjian/`，并把该完整地址加入 Redirect URLs。本地调试时再额外加入 `http://localhost:3000/`。

账号内修改密码和邮件找回重设密码后，应用保留当前设备登录并撤销其他设备会话。在线设备通过 `user_preferences` 的 Realtime 变更及时退出；离线或后台设备会在恢复联网或页面回到前台时检查撤销标记并退出。
