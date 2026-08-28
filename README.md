# 夜班巡检

面向手机端的夜班巡检记录工具，包含：

- 8#冲渣区域
- SZ101、SZ201、SZ201-N 皮带区域
- 9#冲渣区域
- 本地历史记录与巡检汇总

数据保存在当前浏览器的本地存储中。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
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

1. 在 Supabase 新建项目，打开 SQL Editor，执行 `supabase/migrations/202608280001_create_inspection_sync.sql`。
2. 在 Authentication → Providers → Email 中保持邮箱注册开启。需要验证邮箱时，同时配置正确的 Site URL；本地开发可加入 `http://localhost:3000` 作为 Redirect URL。
3. 将 `.env.example` 复制为 `.env.local`，填写项目 URL 和 publishable key。旧项目只有 anon key 时，也可将 anon key 填入 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。
4. GitHub Pages 部署需在仓库 Settings → Secrets and variables → Actions 中创建同名的两个 secret：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

浏览器端不得配置或使用 `service_role` key。数据访问由迁移中的 Row Level Security 策略限制为当前账号。

首次登录会把当前浏览器中的旧版巡检记录归入该账号，并按记录 UUID 与云端合并。以后在保存、删除、导入恢复、恢复联网和页面重新回到前台时同步；同步失败时继续保存在本地，联网后可重试。
