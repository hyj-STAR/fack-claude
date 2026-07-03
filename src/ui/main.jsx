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
    managedProxy: "",
    targetProfile: {
      language: "en-US",
      timezone: "America/Los_Angeles",
      locale: "en_US.UTF-8"
    }
  },
  issues: []
};

const defaultIpChecklist = [
  { title: "选择美国出口", detail: "使用你自己购买或授权的美国 VPS、企业 VPN、远程开发机或代理服务，目标国家 United States，城市优先 Los Angeles、San Jose、Seattle、New York 等稳定机房。" },
  { title: "开启 TUN / System Proxy", detail: "在网络工具中打开 TUN、全局路由或系统代理，确保桌面应用、终端、WebSocket 和子进程都走同一出口。" },
  { title: "验证 IPv4 / IPv6", detail: "点击“重新检测”，同时检查 IPv4 和 IPv6。只要 IPv6 仍显示 CN，就说明可能存在直连泄漏。" },
  { title: "检查 DNS 一致性", detail: "使用随隧道转发的 DNS 或可信公共 DNS，避免 DNS 所在地区与 IP 出口不一致。" }
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
      shell: "桌面扫描在 Electron 模式下可用",
      env: { LANG: "Electron required", LC_ALL: "Electron required", TZ: "Browser timezone only" },
      privacy: { username: "Electron required", hostname: "Electron required" }
    },
    issues: [
      {
        severity: "info",
        title: "网页预览模式，无桌面权限",
        detected: "browser only",
        recommendation: "启动 Electron 桌面版以运行完整的本地环境检测与一键操作。",
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

function isUsCountry(country) {
  return ["US", "USA", "United States"].includes(String(country || "").trim());
}

function flagEmoji(country) {
  const value = String(country || "").trim();
  const map = { "United States": "US", USA: "US", China: "CN" };
  const code = value.length === 2 ? value.toUpperCase() : (map[value] || "");
  if (code.length !== 2) return "🌐";
  return String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

function ScoreGauge({ score, tone }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.max(0, Math.min(100, score)) / 100 * circumference;
  return (
    <div className={`gauge ${tone}`}>
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <circle className="gauge-track" cx="64" cy="64" r={radius} />
        <circle
          className="gauge-value"
          cx="64"
          cy="64"
          r={radius}
          transform="rotate(-90 64 64)"
          style={{ strokeDasharray: `${dash} ${circumference}` }}
        />
      </svg>
      <div className="gauge-center">
        <span className="gauge-score">{score}</span>
        <span className="gauge-of">/ 100</span>
      </div>
    </div>
  );
}

function AdSlot({ slot, size, label }) {
  return (
    <div className="ad-slot" data-ad-slot={slot}>
      <span className="ad-tag">广告位 · Ad slot</span>
      <span className="ad-size">{label} · {size}</span>
    </div>
  );
}

function App() {
  const [report, setReport] = useState(fallbackReport);
  const [repair, setRepair] = useState(null);
  const [deployment, setDeployment] = useState(null);
  const [deploymentPreview, setDeploymentPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [proxyInput, setProxyInput] = useState("");
  const [proxyTouched, setProxyTouched] = useState(false);
  const [proxyResult, setProxyResult] = useState(null);
  const [proxyBusy, setProxyBusy] = useState(false);
  const desktopApi = window.doctor;

  async function rescan(network = true) {
    setBusy(true);
    try {
      const nextReport = desktopApi ? await desktopApi.scan({ network }) : await browserScan();
      setReport(nextReport);
      if (nextReport.facts?.managedProxy && !proxyTouched) {
        setProxyInput(nextReport.facts.managedProxy);
      }
    } finally {
      setBusy(false);
    }
  }

  async function generateProfile() {
    setBusy(true);
    try {
      const result = desktopApi
        ? await desktopApi.writeFixes()
        : { note: "Electron 模式下才能写入 profile 文件。", files: [] };
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
        : { actions: ["需要 Electron 模式。"], adminRequired: [], ipOperationChecklist: [] };
      setDeploymentPreview(result);
    } finally {
      setBusy(false);
    }
  }

  async function applyDeployment() {
    const ok = window.confirm("将备份并修改当前 shell 配置，清理 npm/git 旧 proxy，并安装美国 AI 工作 Profile。确认后立即执行。");
    if (!ok) return;
    setBusy(true);
    try {
      const result = desktopApi
        ? await desktopApi.applyDeployment()
        : { actions: [], failures: ["需要 Electron 模式。"], ipOperationChecklist: [] };
      setDeployment(result);
      await rescan(true);
    } finally {
      setBusy(false);
    }
  }

  async function applyProxy() {
    if (!proxyInput.trim()) return;
    setProxyBusy(true);
    try {
      const result = desktopApi
        ? await desktopApi.applyProxy({ proxyUrl: proxyInput.trim() })
        : { ok: false, error: "需要 Electron 模式。", actions: [], failures: [] };
      setProxyResult(result);
      if (result.ok) await rescan(true);
    } finally {
      setProxyBusy(false);
    }
  }

  async function clearProxy() {
    setProxyBusy(true);
    try {
      const result = desktopApi
        ? await desktopApi.clearProxy()
        : { ok: false, error: "需要 Electron 模式。", actions: [], failures: [] };
      setProxyResult(result);
      if (result.ok) {
        setProxyInput("");
        setProxyTouched(false);
        await rescan(true);
      }
    } finally {
      setProxyBusy(false);
    }
  }

  useEffect(() => {
    rescan(true);
  }, []);

  const topIssues = useMemo(() => report.issues.slice(0, 6), [report]);
  const net = report.facts.network;
  const ipDetails = net?.ipDetails;
  const v4 = ipDetails?.ipv4;
  const v6 = ipDetails?.ipv6;
  const managedProxy = report.facts.managedProxy || "";
  const probes = net?.probes;
  const scanning = busy && !ipDetails;

  const exitCountry = v4?.country || "";
  const exitIsUs = isUsCountry(exitCountry);
  let exitTone = "pending";
  if (ipDetails) exitTone = exitIsUs ? "good" : "bad";

  const scoreTone = report.score >= 85 ? "good" : report.score >= 60 ? "warn" : "bad";
  const statusText =
    report.status === "healthy" ? "健康" :
    report.status === "needs attention" ? "需要关注" :
    report.status === "high risk" ? "高风险" :
    report.status === "loading" ? "检测中" : report.status;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">◎</span>
          <div>
            <p className="eyebrow">VoiceShell</p>
            <h1>FACK CLAUDE</h1>
          </div>
        </div>
        <div className="actions">
          <button className="primary" onClick={() => rescan(true)} disabled={busy}>{busy ? "检测中…" : "重新检测"}</button>
        </div>
      </header>

      <AdSlot slot="top-leaderboard" size="970×90" label="顶部横幅" />

      <section className="hero">
        <div className="card score-card">
          <p className="label">环境分数</p>
          <ScoreGauge score={report.score} tone={scoreTone} />
          <h2 className={`status-line ${scoreTone}`}>{statusText}</h2>
          <div className="mini-facts">
            <span>{report.facts.platform || "—"} {report.facts.osRelease}</span>
            <span>{report.facts.locale || "locale 未知"}</span>
            <span>{report.facts.timezone || "时区未知"}</span>
          </div>
        </div>

        <div className={`card ip-card ${exitTone}`}>
          <div className="ip-head">
            <div>
              <p className="label">当前网络出口 · IP</p>
              <h2 className="ip-title">
                {scanning ? "检测中…" : ipDetails ? (
                  <>
                    <span className="flag">{flagEmoji(exitCountry)}</span>
                    <span>{exitIsUs ? "美国出口" : (exitCountry || "未知出口")}</span>
                    <span className={`verdict ${exitTone}`}>{exitIsUs ? "✓ 一致" : "✗ 非美国"}</span>
                  </>
                ) : "点击“重新检测”获取 IP"}
              </h2>
            </div>
            <button onClick={() => rescan(true)} disabled={busy}>刷新 IP</button>
          </div>
          <dl className="ip-grid">
            <div><dt>IPv4</dt><dd>{v4?.ip || net?.publicIp?.ipv4 || "—"}</dd></div>
            <div><dt>IPv4 出口</dt><dd>{v4?.country ? `${v4.country} · ${v4.city || v4.region || "—"}` : "—"}</dd></div>
            <div><dt>IPv6</dt><dd>{v6?.ip || net?.publicIp?.ipv6 || "无 / 未泄漏"}</dd></div>
            <div><dt>IPv6 出口</dt><dd>{v6?.country ? `${v6.country} · ${v6.city || v6.region || "—"}` : "—"}</dd></div>
            <div><dt>组织 / ASN</dt><dd>{v4?.org || v6?.org || "—"}</dd></div>
            <div><dt>出口时区</dt><dd>{v4?.timezone || v6?.timezone || "—"}</dd></div>
          </dl>
          {ipDetails && !exitIsUs ? (
            <p className="ip-hint">出口不是美国。在下方填入你自己的美国代理，点“一键应用出口”，再刷新确认。</p>
          ) : null}
        </div>
      </section>

      {probes ? (
        <section className="card probe-card">
          <div className="panel-head">
            <div>
              <p className="label">网络评测 · Network probes</p>
              <h2>AI 工作纯净度</h2>
            </div>
            <div className={`purity ${probes.purity >= 80 ? "good" : probes.purity >= 50 ? "warn" : "bad"}`}>
              {probes.purity}<small>/100</small>
            </div>
          </div>
          <div className="flag-grid">
            {probes.flags.map((f, i) => (
              <div key={i} className={`flag ${f.tone}`}>
                <span className="flag-dot" />
                <div><b>{f.label}</b><em title={f.value}>{f.value}</em></div>
              </div>
            ))}
          </div>
          <div className="probe-cols">
            <div className="probe-block">
              <p className="label">出口一致性 · 各服务看到的 IP</p>
              <table className="probe-table"><tbody>
                {probes.exitConsistency.sources.map((s, i) => (
                  <tr key={i}>
                    <td>{s.source}</td>
                    <td className="mono">{s.ip}</td>
                    <td>{s.geo || "—"}</td>
                  </tr>
                ))}
              </tbody></table>
              <p className="label cf-label">Cloudflare 边缘</p>
              <div className="cf-line">
                <span>数据中心 <b>{probes.cloudflare.colo || "—"}</b></span>
                <span>出口 <b>{probes.cloudflare.loc || "—"}</b></span>
                <span>WARP {probes.cloudflare.warp || "—"}</span>
                <span>{probes.cloudflare.tls || "—"}</span>
              </div>
            </div>
            <div className="probe-block">
              <p className="label">AI 服务可达性 · 状态 / 延迟</p>
              <div className="reach-grid">
                {probes.reachability.map((r, i) => (
                  <div key={i} className={`reach ${r.reachable ? (r.blocked ? "warn" : "good") : "bad"}`}>
                    <b>{r.name}</b>
                    <span>{r.reachable ? `${r.status} · ${r.latency}ms` : "不可达"}</span>
                  </div>
                ))}
              </div>
              {probes.quality.ok ? (
                <>
                  <p className="label cf-label">IP 质量</p>
                  <div className="cf-line">
                    <span>{probes.quality.proxy || probes.quality.hosting ? "⚠ 机房/代理特征" : "✓ 住宅/干净"}</span>
                    <span>{probes.quality.as}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="card proxy-card">
        <div className="panel-head">
          <div>
            <p className="label">一键接管出口</p>
            <h2>把所有 CLI / 工具链切到你的美国出口</h2>
          </div>
          {managedProxy ? <span className="chip on">当前：{managedProxy}</span> : <span className="chip">未接管</span>}
        </div>
        <div className="proxy-row">
          <input
            className="proxy-input"
            value={proxyInput}
            onChange={(event) => { setProxyInput(event.target.value); setProxyTouched(true); }}
            placeholder="http://host:port 或 socks5://host:port（你自己的美国出口）"
            spellCheck={false}
          />
          <button className="primary" onClick={applyProxy} disabled={proxyBusy || !proxyInput.trim()}>
            {proxyBusy ? "处理中…" : "一键应用出口"}
          </button>
          <button onClick={clearProxy} disabled={proxyBusy}>一键还原</button>
        </div>
        {proxyResult ? (
          proxyResult.ok ? (
            <div className="result-box good">
              <strong>完成：</strong>{proxyResult.actions?.length || 0} 项成功
              {proxyResult.failures?.length ? `，${proxyResult.failures.length} 项需权限/失败（系统代理可能需要管理员）。` : "。"}
              {proxyResult.note ? <p className="muted">{proxyResult.note}</p> : null}
            </div>
          ) : (
            <div className="result-box bad"><strong>未应用：</strong>{proxyResult.error}</div>
          )
        ) : null}
      </section>

      <section className="card deploy-card">
        <div className="panel-head">
          <div>
            <p className="label">美国环境</p>
            <h2>en-US · 洛杉矶时区 · UTF-8</h2>
          </div>
          <button className="primary" onClick={applyDeployment} disabled={busy}>一键部署</button>
        </div>
        {deployment ? (
          <div className="result-box good">完成 {deployment.actions.length} 项，失败 {deployment.failures.length} 项。</div>
        ) : null}
      </section>

      <section className="content-grid">
        <div className="card">
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
                <div className="issue-top">
                  <span className={`badge ${issue.severity}`}>{severityLabel(issue.severity)}</span>
                  <h3>{issue.title}</h3>
                </div>
                <p>{issue.detected}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="side-col">
          <div className="card">
            <div className="panel-head">
              <div>
                <p className="label">一键处理</p>
                <h2>修复 Profile</h2>
              </div>
            </div>
            {repair ? (
              <div className="repair-box">
                <p className="muted">{repair.note}</p>
                {repair.files.map((file) => <code key={file.path}>{file.path}</code>)}
              </div>
            ) : (
              <button className="wide primary" onClick={generateProfile} disabled={busy}>生成可审阅配置</button>
            )}
          </div>
          <AdSlot slot="side-rectangle" size="300×250" label="侧边矩形" />
        </div>
      </section>

      <footer className="disclaimer">走你自己的美国出口并复检，不保证不封号。</footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
