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

推送到 `main` 分支后，GitHub Actions 会自动构建并部署到 GitHub Pages。
