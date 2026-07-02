import { execFileSync } from "node:child_process";
import { homedir, hostname, platform, release, userInfo } from "node:os";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

export const APP_DIR = join(homedir(), ".ai-workspace-doctor");
export const PROFILE_DIR = join(APP_DIR, "profiles");
export const PRODUCT_VERSION = "0.1.0";

function resolveProfileDir(options = {}) {
  return options.profileDir || PROFILE_DIR;
}

function hasCjk(value) {
  return /[\u3400-\u9fff\uf900-\ufaff]/u.test(String(value || ""));
}

function hasPhoneLikeValue(value) {
  return /(?:\+?\d[\s-]?){7,}/.test(String(value || ""));
}

function classifyPath(value) {
  if (!value) return [];
  const issues = [];
  if (hasCjk(value)) issues.push("contains CJK characters");
  if (hasPhoneLikeValue(value)) issues.push("contains phone-like digits");
  return issues;
}

function gitConfig(key) {
  try {
    return execFileSync("git", ["config", "--global", "--get", key], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

function addIssue(issues, severity, id, title, detected, recommendation, repairable = false) {
  issues.push({ severity, id, title, detected, recommendation, repairable });
}

function scoreFromIssues(issues) {
  const penalty = issues.reduce((sum, issue) => {
    if (issue.severity === "high") return sum + 18;
    if (issue.severity === "warning") return sum + 9;
    if (issue.severity === "info") return sum + 2;
    return sum;
  }, 0);
  return Math.max(0, 100 - penalty);
}

async function getPublicIp() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal
    });
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
    return { ok: true, ...(await response.json()) };
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function scanEnvironment(options = {}) {
  const env = process.env;
  const currentPlatform = platform();
  const currentUser = userInfo().username;
  const currentHostname = hostname();
  const gitName = gitConfig("user.name");
  const gitEmail = gitConfig("user.email");
  const proxyHttp = env.HTTP_PROXY || env.http_proxy || "";
  const proxyHttps = env.HTTPS_PROXY || env.https_proxy || "";
  const cwd = process.cwd();
  const home = homedir();

  const issues = [];
  const facts = {
    generatedAt: new Date().toISOString(),
    platform: currentPlatform,
    osRelease: release(),
    node: process.version,
    shell: env.SHELL || env.ComSpec || "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    locale: Intl.DateTimeFormat().resolvedOptions().locale || "",
    env: {
      LANG: env.LANG || "",
      LC_ALL: env.LC_ALL || "",
      LC_CTYPE: env.LC_CTYPE || "",
      TZ: env.TZ || "",
      HTTP_PROXY: proxyHttp ? "[set]" : "",
      HTTPS_PROXY: proxyHttps ? "[set]" : "",
      NO_PROXY: env.NO_PROXY || env.no_proxy ? "[set]" : ""
    },
    privacy: {
      username: currentUser,
      hostname: currentHostname,
      cwd,
      home,
      gitName: gitName || "[not set]",
      gitEmail: gitEmail || "[not set]"
    }
  };

  if (!env.LANG) {
    addIssue(issues, "warning", "lang-missing", "Terminal LANG is not set", "empty", "Use a UTF-8 locale in an AI work profile.", true);
  } else if (!/utf-?8/i.test(env.LANG)) {
    addIssue(issues, "warning", "lang-not-utf8", "Terminal LANG is not UTF-8", env.LANG, "Use a UTF-8 locale.", true);
  }

  if (env.LC_ALL && !/utf-?8/i.test(env.LC_ALL)) {
    addIssue(issues, "warning", "lc-all-not-utf8", "LC_ALL is not UTF-8", env.LC_ALL, "Use a UTF-8 LC_ALL value.", true);
  }

  if (!env.TZ) {
    addIssue(issues, "info", "tz-missing", "Terminal TZ is not set", "empty", "Optionally set TZ in an AI work profile for repeatable CLI behavior.", true);
  }

  if (proxyHttp && proxyHttps && proxyHttp !== proxyHttps) {
    addIssue(issues, "warning", "proxy-mismatch", "HTTP_PROXY and HTTPS_PROXY differ", "different values", "Use one consistent proxy profile if your workflow requires a proxy.", true);
  }

  for (const [id, label, value] of [
    ["username-privacy", "OS username", currentUser],
    ["hostname-privacy", "Hostname", currentHostname],
    ["cwd-privacy", "Current project path", cwd],
    ["home-privacy", "Home path", home]
  ]) {
    const pathIssues = classifyPath(value);
    if (pathIssues.length) {
      addIssue(issues, "warning", id, `${label} may expose personal information`, pathIssues.join(", "), "Use a neutral workspace/profile name for AI work.", id.includes("path"));
    }
  }

  if (gitName && (hasCjk(gitName) || hasPhoneLikeValue(gitName))) {
    addIssue(issues, "warning", "git-name-privacy", "Global Git user.name may expose personal information", gitName, "Use a professional English display name for public repositories.", true);
  }

  if (gitEmail && /@(qq|163|126|sina)\.com$/i.test(gitEmail)) {
    addIssue(issues, "info", "git-email-privacy", "Global Git user.email looks personal", gitEmail.replace(/^(.{2}).*(@.*)$/, "$1***$2"), "Consider a project-specific or privacy-forward Git email.", true);
  }

  if (!proxyHttp && !proxyHttps) {
    addIssue(issues, "info", "proxy-not-set", "No terminal proxy variables detected", "empty", "No action required unless your AI workflow needs a user-owned proxy profile.", true);
  }

  if (options.network) {
    facts.network = { publicIp: await getPublicIp() };
    if (!facts.network.publicIp.ok) {
      addIssue(issues, "warning", "public-ip-check-failed", "Public IP check failed", facts.network.publicIp.error, "Check network connectivity or skip network checks.");
    }
  }

  return {
    product: "AI Workspace Doctor",
    version: PRODUCT_VERSION,
    score: scoreFromIssues(issues),
    status: issues.some((issue) => issue.severity === "high")
      ? "high risk"
      : issues.some((issue) => issue.severity === "warning")
        ? "needs attention"
        : "healthy",
    facts,
    issues
  };
}

function shellProfile() {
  return `# AI Workspace Doctor profile
# Review before use. To apply in the current shell:
#   source ~/.ai-workspace-doctor/profiles/ai-work-profile.sh

export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export LC_CTYPE=en_US.UTF-8
export TZ=America/Los_Angeles

# Optional: set these only if you use a proxy you control.
# export HTTP_PROXY=http://127.0.0.1:7890
# export HTTPS_PROXY=http://127.0.0.1:7890
# export NO_PROXY=localhost,127.0.0.1
`;
}

function powershellProfile() {
  return `# AI Workspace Doctor profile
# Review before use. To apply in the current PowerShell session:
#   . "$HOME\\.ai-workspace-doctor\\profiles\\ai-work-profile.ps1"

$env:LANG = "en_US.UTF-8"
$env:LC_ALL = "en_US.UTF-8"
$env:LC_CTYPE = "en_US.UTF-8"
$env:TZ = "America/Los_Angeles"

# Optional: set these only if you use a proxy you control.
# $env:HTTP_PROXY = "http://127.0.0.1:7890"
# $env:HTTPS_PROXY = "http://127.0.0.1:7890"
# $env:NO_PROXY = "localhost,127.0.0.1"
`;
}

function gitTemplate() {
  return `# Optional Git privacy template.
# Review and run manually inside a repository, not globally, unless you really want it global.

git config user.name "Your English Name"
git config user.email "you@example.com"
`;
}

export function previewFixes(options = {}) {
  const profileDir = resolveProfileDir(options);
  const files = [
    { path: join(profileDir, "ai-work-profile.sh"), content: shellProfile() },
    { path: join(profileDir, "ai-work-profile.ps1"), content: powershellProfile() },
    { path: join(profileDir, "git-privacy-template.sh"), content: gitTemplate() }
  ];
  return {
    mode: "dry-run",
    directory: profileDir,
    files: files.map((file) => ({
      path: file.path,
      bytes: Buffer.byteLength(file.content, "utf8")
    })),
    note: "These files are reviewable profiles. They are not added to shell startup files automatically."
  };
}

export function writeFixes(options = {}) {
  const profileDir = resolveProfileDir(options);
  mkdirSync(profileDir, { recursive: true });
  writeFileSync(join(profileDir, "ai-work-profile.sh"), shellProfile(), "utf8");
  writeFileSync(join(profileDir, "ai-work-profile.ps1"), powershellProfile(), "utf8");
  writeFileSync(join(profileDir, "git-privacy-template.sh"), gitTemplate(), "utf8");
  return { ...previewFixes({ profileDir }), mode: "write" };
}
