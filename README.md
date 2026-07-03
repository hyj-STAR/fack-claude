# FACK

**本地环境体检工具。** 检测你的出口 IP、时区、语言、代理残留会不会让 AI 平台把你当成「中国用户」而封号，并一键修复。纯本地扫描，报告不上传。

> 它不承诺绕过任何平台管控，也**不保证不被封号**。只帮你看清并规范化你自己的本地环境，流量走你**自己的**美国出口。

## 下载

- 安装包（macOS）：https://github.com/hyj-STAR/fack-claude/releases
- 源码：https://github.com/hyj-STAR/fack-claude

## 能做什么

**1. 出口评测（对标 ip.net.coffee）**
- 多服务出口一致性检测（IP 分裂 / 直连泄漏）
- Cloudflare 数据中心 + 出口国家（AI 站实际看到的出口）
- IPv6 直连泄漏
- IP 质量：住宅 / 机房 / 代理特征
- OpenAI、ChatGPT、Claude、Anthropic、Gemini 可达性 + 延迟
- 综合「纯净度」评分

**2. 一键接管出口**
- 把你自己的美国代理一键写入 shell profile / npm / git（macOS 尽力设系统代理），再自动复检。

**3. 一键部署**
- en_US.UTF-8 + 洛杉矶时区，清理 npm / git 旧 proxy，自动生成 rollback.sh 可回滚。

## 开发

```bash
npm install
npm run dev        # Electron + Vite
npm run build:web
npm run pack:mac   # 打包 macOS dmg
```

## 授权

**非商用（Non-Commercial）。** 个人非商用可自由使用与修改；**商用需授权**。详见 [LICENSE](./LICENSE)，联系 support@voiceshell.ai。
