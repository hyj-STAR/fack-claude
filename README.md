# FACK CLAUDE

本地环境体检工具：检测你的出口 IP / 时区 / 语言 / 代理残留是否会让你被 AI 平台当成「中国用户」而封号，并给出一键修复。纯本地扫描，报告不上传。

**它不承诺绕过任何平台管控，也不保证不被封号。** 它只帮你看清并规范化你自己的本地环境，流量走你自己的美国出口。

## 下载 / Download

- 最新安装包：https://github.com/hyj-STAR/ai-workspace-doctor/releases
- 源码：https://github.com/hyj-STAR/ai-workspace-doctor

## 功能

- 出口 IP 评测：多服务出口一致性（IP 分裂检测）、Cloudflare 数据中心、IPv6 直连泄漏、IP 质量（机房/代理特征）、AI 服务可达性、纯净度评分
- 一键接管出口：把你自己的美国代理写入 shell profile / npm / git（macOS 尽力设系统代理）
- 一键部署：en_US.UTF-8 + 洛杉矶时区，清理 npm/git 旧 proxy，自动生成 rollback.sh

## 开发

```bash
npm install
npm run dev          # Electron + Vite
npm run build:web
npm run pack:mac     # 打包 macOS dmg
```

## License

**非商用（Non-Commercial）。** 个人非商用可自由使用与修改；商用需授权。见 [LICENSE](./LICENSE)，联系 support@voiceshell.ai。
