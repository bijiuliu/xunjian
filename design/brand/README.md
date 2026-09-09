# 夜班巡检品牌图标

`night-inspection-master.svg` 是图形的唯一设计母版。它使用透明背景、sRGB 色值和无描边的 Bézier 路径。

## 固定规范

- 深蓝：`#0f1f37`
- 青色渐变：`#3deb9f` → `#18d8b9` → `#08c1cd` → `#00a0e3`
- 相邻斜边保持平行，白色通道保持均匀
- 不添加预制圆角、描边、发光或图形阴影
- 不使用 JPEG 作为生产图标源

## 生产资源

- `src/app/icon.svg`：白底浏览器/应用图标
- `src/app/apple-icon.png`：180×180 Apple Web Clip 图标
- `src/app/favicon.ico`：16/32/48/64 小尺寸视觉版
- `src/assets/night-inspection-logo.svg`：登录页透明品牌标志
- `public/icons/night-inspection-192-v2.png`：PWA 普通图标
- `public/icons/night-inspection-512-v2.png`：PWA 普通图标
- `public/icons/night-inspection-maskable-512-v2.png`：PWA Maskable 图标

修改品牌图形后，必须同步重新导出所有生产资源，并在 16、32、56、180、192 和 512 像素下检查边缘与识别度。

favicon 使用 `648 648 2800 2800` 的正方形视觉裁切范围，以提高 16px 下的主体占比。Maskable 图标必须保持不透明背景，并确保全部品牌图形位于画布中心、半径为画布边长 40% 的安全圆内。
