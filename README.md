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

巡检草稿和历史记录仍只保存在使用者浏览器的 `localStorage` 中；重新部署不会迁移或清空终端用户已有的数据。
