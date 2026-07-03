import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const fallbackReport = {
  product: "AI Workspace Doctor",
  version: "0.1.0",
  score: 0,
  status: "loading",
  facts: {
    platform: "",
    osRelease: "",
    locale: "",
    timezone: "",
    shell: "",
    env: {},
    privacy: {},
    targetProfile: {
      language: "en-US",
      timezone: "America/Los_Angeles",
      locale: "en_US.UTF-8"
    }
  },
  issues: []
};

const defaultIpChecklist = [
  { title: "选择美国出口", detail: "使用你自己购买或授权的美国 VPS、企业 VPN、远程开发机或代理服务。目标国家选择 United States，城市优先 Los Angeles、San Jose、Seattle、New York 等稳定机房。" },
  { title: "开启 TUN / System Proxy", detail: "在网络工具中打开 TUN、全局路由或系统代理，确保桌面应用、终端、WebSocket 和子进程都走同一出口。" },
  { title: "验证 IPv4 / IPv6", detail: "点击“检测网络”，同时检查 IPv4 和 IPv6。只要 IPv6 仍显示 CN，就说明可能存在直连泄漏。" },
  { title: "检查 DNS 一致性", detail: "使用随隧道转发的 DNS 或可信公共 DNS，避免 DNS 所在地区与 IP 出口不一致。" },
  { title: "清理 CLI 残留", detail: "一键部署会清理 npm/git 里的旧 proxy，并安装 en_US.UTF-8 + America/Los_Angeles 的 shell profile。" },
  { title: "处理系统级时区", detail: "macOS 系统时区需要管理员密码。需要全设备一致时，在终端运行：sudo systemsetup -settimezone America/Los_Angeles。" },
  { title: "设备地区与语言", detail: "需要全设备一致时，将系统地区、首选语言、浏览器语言统一为 United States / English (US)。系统 UI 变更需要用户在系统设置中确认。" },
  { title: "远程工作区方案", detail: "如果本机网络不可控，使用美国远程开发机或 VPS 作为稳定工作区，把代码、终端、浏览器都放在同一个远程环境。" },
  { title: "账号与支付信息", detail: "账号、手机号、支付方式属于外部服务资料，本应用只做清单提醒，不自动代填或代改。用户应使用自己真实、合法、可验证的信息。" }
];

async function browserScan() {
  return {
    ...fallbackReport,
    score: 86,
    status: "browser preview",
    facts: {
      ...fallbackReport.facts,
      platform: navigator.platform,
      locale: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      shell: "Desktop scanner is available in Electron mode",
      env: {
        LANG: "Electron required",
        LC_ALL: "Electron required",
        TZ: "Browser timezone only"
      },
      privacy: {
        username: "Electron required",
        hostname: "Electron required",
        cwd: "Electron required",
        gitName: "Electron required",
        gitEmail: "Electron required"
      }
    },
    issues: [
      {
        severity: "info",
        title: "Web preview is running without desktop permissions",
        detected: "browser only",
        recommendation: "Start the Electron prototype to run full local environment checks.",
        repairable: false
      }
    ]
  };
}

function severityLabel(severity) {
  if (severity === "high") return "高";
  if (severity === "warning") return "注意";
  return "提示";
}

function App() {
  const [report, setReport] = useState(fallbackReport);
  const [repair, setRepair] = useState(null);
  const [deployment, setDeployment] = useState(null);
  const [deploymentPreview, setDeploymentPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const desktopApi = window.doctor;

  async function rescan(network = false) {
    setBusy(true);
    try {
      const nextReport = desktopApi
        ? await desktopApi.scan({ network })
        : await browserScan();
      setReport(nextReport);
    } finally {
      setBusy(false);
    }
  }

  async function generateProfile() {
    setBusy(true);
    try {
      const result = desktopApi
        ? await desktopApi.writeFixes()
        : { note: "Electron mode required to write profile files.", files: [] };
      setRepair(result);
    } finally {
      setBusy(false);
    }
  }

  async function previewDeployment() {
    setBusy(true);
    try {
      const result = desktopApi
        ? await desktopApi.previewDeployment()
        : { actions: ["Electron mode required."], adminRequired: [], ipOperationChecklist: [] };
      setDeploymentPreview(result);
    } finally {
      setBusy(false);
    }
  }

  async function applyDeployment() {
    const ok = window.confirm("将备份并修改当前 shell 配置，清理 npm/git 旧 proxy，并安装美国 AI 工作 Profile。确认后会立即执行。");
    if (!ok) return;
    setBusy(true);
    try {
      const result = desktopApi
        ? await desktopApi.applyDeployment()
        : { actions: [], failures: ["Electron mode required."], ipOperationChecklist: [] };
      setDeployment(result);
      await rescan(true);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    rescan(false);
  }, []);

  const topIssues = useMemo(() => report.issues.slice(0, 5), [report]);
  const statusText = report.status === "healthy" ? "健康" : report.status === "needs attention" ? "需要关注" : report.status;

  return (
    <main className="app-shell">
      <section className="toolbar">
        <div>
          <p className="eyebrow">VoiceShell AI Workspace</p>
          <h1>AI Workspace Doctor</h1>
        </div>
        <div className="actions">
          <button onClick={() => rescan(false)} disabled={busy}>重新检测</button>
          <button onClick={() => rescan(true)} disabled={busy}>检测网络</button>
          <button className="primary" onClick={previewDeployment} disabled={busy}>预览一键部署</button>
        </div>
      </section>

      <section className="summary-grid">
        <div className="score-panel">
          <div className="score-ring" aria-label={`Score ${report.score}`}>
            <span>{report.score}</span>
          </div>
          <div>
            <p className="label">环境分数</p>
            <h2>{statusText}</h2>
            <p className="muted">本地扫描，不上传报告。所有修复动作都先生成可审阅文件。</p>
          </div>
        </div>

        <div className="facts-panel">
          <p className="label">当前环境</p>
          <dl>
            <div><dt>系统</dt><dd>{report.facts.platform} {report.facts.osRelease}</dd></div>
            <div><dt>语言</dt><dd>{report.facts.locale || "unknown"}</dd></div>
            <div><dt>时区</dt><dd>{report.facts.timezone || "unknown"}</dd></div>
            <div><dt>Shell</dt><dd>{report.facts.shell || "unknown"}</dd></div>
            {report.facts.network?.ipDetails?.ok ? (
              <>
                <div><dt>IPv4</dt><dd>{report.facts.network.ipDetails.ipv4?.ip || report.facts.network.publicIp?.ipv4 || "unknown"}</dd></div>
                <div><dt>IPv4出口</dt><dd>{report.facts.network.ipDetails.ipv4?.country || "unknown"} · {report.facts.network.ipDetails.ipv4?.city || report.facts.network.ipDetails.ipv4?.region || "unknown"}</dd></div>
                <div><dt>IPv6</dt><dd>{report.facts.network.ipDetails.ipv6?.ip || report.facts.network.publicIp?.ipv6 || "unknown"}</dd></div>
                <div><dt>IPv6出口</dt><dd>{report.facts.network.ipDetails.ipv6?.country || "unknown"} · {report.facts.network.ipDetails.ipv6?.city || report.facts.network.ipDetails.ipv6?.region || "unknown"}</dd></div>
                <div><dt>组织</dt><dd>{report.facts.network.ipDetails.ipv4?.org || report.facts.network.ipDetails.ipv6?.org || "unknown"}</dd></div>
              </>
            ) : null}
          </dl>
        </div>
      </section>

      <section className="deployment-panel">
        <div className="panel-head">
          <div>
            <p className="label">美国环境一键部署</p>
            <h2>确认后一次完成可自动修改的项目</h2>
          </div>
          <button className="primary" onClick={applyDeployment} disabled={busy}>确认并一键部署</button>
        </div>
        <div className="deploy-grid">
          <div>
            <p className="muted">目标：{report.facts.targetProfile?.language || "en-US"} / {report.facts.targetProfile?.timezone || "America/Los_Angeles"} / {report.facts.targetProfile?.locale || "en_US.UTF-8"}</p>
            <div className="step-list">
              {(deploymentPreview?.actions || [
                "写入 AI 工作 Profile",
                "备份并接入 shell 启动文件",
                "清理 npm/git 旧 proxy 残留",
                "生成 rollback.sh 和部署报告"
              ]).map((item, index) => <p key={index}><span>{index + 1}</span>{item}</p>)}
            </div>
          </div>
          <div className="manual-box">
            <h3>需要用户确认/管理员权限的项目</h3>
            {(deploymentPreview?.adminRequired || [
              "macOS 系统时区需要管理员密码",
              "TUN/System Proxy 需要在你的网络工具中开启"
            ]).map((item, index) => <p key={index}>{item}</p>)}
          </div>
        </div>
        {deployment ? (
          <div className="result-box">
            <strong>部署完成：</strong>{deployment.actions.length} 个动作，{deployment.failures.length} 个失败。
            <code>{deployment.profileDir}/deployment-report.json</code>
            <code>{deployment.profileDir}/rollback.sh</code>
          </div>
        ) : null}
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="label">检测结果</p>
              <h2>问题与建议</h2>
            </div>
            <span className="count">{report.issues.length}</span>
          </div>
          <div className="issue-list">
            {topIssues.length === 0 ? (
              <p className="empty">暂时没有发现需要处理的问题。</p>
            ) : topIssues.map((issue, index) => (
              <article className={`issue ${issue.severity}`} key={`${issue.id || issue.title}-${index}`}>
                <div>
                  <span className="badge">{severityLabel(issue.severity)}</span>
                  <h3>{issue.title}</h3>
                </div>
                <p><strong>检测：</strong>{issue.detected}</p>
                <p><strong>建议：</strong>{issue.recommendation}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="label">一键处理</p>
              <h2>修复 Profile</h2>
            </div>
          </div>
          <p className="muted">生成 macOS/Linux、Windows PowerShell 和 Git 隐私模板。不会自动写入 shell 启动文件。</p>
          {repair ? (
            <div className="repair-box">
              <p>{repair.note}</p>
              {repair.files.map((file) => (
                <code key={file.path}>{file.path}</code>
              ))}
            </div>
          ) : (
            <button className="wide" onClick={generateProfile} disabled={busy}>生成可审阅配置</button>
          )}
        </div>
      </section>

      <section className="ip-panel">
        <div className="panel-head">
          <div>
            <p className="label">IP 操作台</p>
            <h2>用户应该怎么设置</h2>
          </div>
          <button onClick={() => rescan(true)} disabled={busy}>重新检测 IP</button>
        </div>
        <div className="ip-grid">
          {(deploymentPreview?.ipOperationChecklist || defaultIpChecklist).map((item, index) => (
            <article key={index} className="ip-step">
              <span>{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
