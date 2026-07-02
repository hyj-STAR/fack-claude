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
    privacy: {}
  },
  issues: []
};

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
          <button className="primary" onClick={generateProfile} disabled={busy}>生成修复 Profile</button>
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
          </dl>
        </div>
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
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
