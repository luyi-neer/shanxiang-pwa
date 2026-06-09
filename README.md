# 山象 - 中国百座山峰天气助手

面向户外爱好者的山岳天气 PWA，覆盖中国 100 座热门山峰，提供实时天气、7日预报、灾害预警和星空预测。

## 功能

- **山峰列表** — 按省份/难度筛选，支持海拔和难度排序，收藏置顶
- **实时天气** — 和风天气 API 提供实时温度、风力、湿度、生活指数
- **7日预报** — 逐小时天气卡片（动态图标+渐变背景），点击日期展开详情
- **灾害预警** — 查询山峰所在区域气象预警（蓝/黄/橙/红四级）
- **星空预测** — 月相、云量、银河可见性、Bortle 光污染等级、综合评分
- **下拉刷新** — 触摸下拉刷新列表数据
- **左滑返回** — 详情页左边缘右滑返回首页

## 技术栈

- 纯 HTML/CSS/JS，无框架依赖
- PWA + Service Worker 离线缓存
- Capacitor 打包 Android APK（远程加载 H5，无需重新打包更新）
- [Open-Meteo](https://open-meteo.com/) — 7日预报 + 逐小时数据
- [和风天气](https://dev.qweather.com/) — 实时天气 + 生活指数 + 灾害预警
- 纯 JS 天文计算（儒略日、恒星时、银河方位）

## 项目结构

```
shanxiang-pwa/
├── www/                  # 部署目录（GitHub Pages）
│   ├── index.html
│   ├── sw.js             # Service Worker
│   ├── css/style.css
│   └── js/
│       ├── peaks.js      # 100座山峰数据
│       ├── astro.js      # 天文计算模块
│       ├── api.js        # API 封装
│       └── app.js        # 主应用逻辑
├── js/                   # 源码（同步到 www/）
├── css/
├── android/              # Capacitor Android 工程
└── capacitor.config.json
```

## 本地开发

```bash
# 启动本地服务
npx serve www

# 打包 Android APK
cd android
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
./gradlew assembleDebug
# 产物: android/app/build/outputs/apk/debug/app-debug.apk
```

## 部署

H5 托管在 GitHub Pages，APP 通过 `capacitor.config.json` 的 `server.url` 远程加载，更新只需推送代码。

```bash
# 修改 js/ 或 css/ 后同步到 www/
cp js/app.js www/js/app.js
cp css/style.css www/css/style.css
# 更新 www/sw.js 中缓存版本号
git push origin main
```

## License

MIT
