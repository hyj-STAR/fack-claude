import { execFileSync } from "node:child_process";
import { homedir, hostname, platform, release, userInfo } from "node:os";
import { basename, join } from "node:path";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

export const APP_DIR = join(homedir(), ".ai-workspace-doctor");
export const PROFILE_DIR = join(APP_DIR, "profiles");
export const PRODUCT_VERSION = "0.1.0";
export const US_PROFILE = {
  name: "United States AI Work Profile",
  locale: "en_US.UTF-8",
  language: "en-US",
  timezone: "America/Los_Angeles",
  noProxy: "localhost,127.0.0.1,::1",
  npmRegistry: "https://registry.npmjs.org/"
};

function resolveProfileDir(options = {}) {
  return options.profileDir || PROFILE_DIR;
}

function proxyStatePath(profileDir) {
  return join(profileDir, "proxy.json");
}

export function readProxyState(profileDir) {
  try {
    const parsed = JSON.parse(readFileSync(proxyStatePath(profileDir), "utf8"));
    if (parsed && typeof parsed.proxyUrl === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeProxyState(profileDir, state) {
  mkdirSync(profileDir, { recursive: true });
  writeFileSync(proxyStatePath(profileDir), JSON.stringify(state, null, 2), "utf8");
}

export function normalizeProxyUrl(input) {
  const value = String(input || "").trim();
  if (!value) return "";
  if (/^(https?|socks5h?):\/\//i.test(value)) return value;
  return `http://${value}`;
}

function isValidProxyUrl(value) {
  try {
    const url = new URL(value);
    return Boolean(url.hostname);
  } catch {
    return false;
  }
}

function primaryNetworkService() {
  if (platform() !== "darwin") return "";
  const list = commandOutput("networksetup", ["-listallnetworkservices"]);
  if (!list) return "";
  const services = list
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("*")); // "*" prefix marks a disabled service
  return services.find((name) => /wi-?fi/i.test(name)) || services[0] || "";
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
    const [v4, v6] = await Promise.allSettled([
      fetch("https://api.ipify.org?format=json", { signal: controller.signal }).then((r) => r.ok ? r.json() : { error: `IPv4 HTTP ${r.status}` }),
      fetch("https://api64.ipify.org?format=json", { signal: controller.signal }).then((r) => r.ok ? r.json() : { error: `IPv6 HTTP ${r.status}` })
    ]);
    return {
      ok: true,
      ipv4: v4.status === "fulfilled" ? v4.value.ip || "" : "",
      ipv6: v6.status === "fulfilled" ? v6.value.ip || "" : "",
      errors: [
        v4.status === "fulfilled" ? v4.value.error : v4.reason?.message,
        v6.status === "fulfilled" ? v6.value.error : v6.reason?.message
      ].filter(Boolean)
    };
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function getIpDetails() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const [v4, v6] = await Promise.allSettled([
      fetch("https://ipinfo.io/json", { signal: controller.signal }).then((r) => r.ok ? r.json() : { error: `ipinfo.io HTTP ${r.status}` }),
      fetch("https://ifconfig.co/json", { signal: controller.signal }).then((r) => r.ok ? r.json() : { error: `ifconfig.co HTTP ${r.status}` })
    ]);
    const v4Body = v4.status === "fulfilled" ? v4.value : {};
    const v6Body = v6.status === "fulfilled" ? v6.value : {};
    return {
      ok: true,
      ipv4: v4Body.error ? { ok: false, error: v4Body.error } : {
        ok: true,
        ip: v4Body.ip || "",
        country: v4Body.country || "",
        region: v4Body.region || "",
        city: v4Body.city || "",
        org: v4Body.org || "",
        timezone: v4Body.timezone || "",
        source: "ipinfo.io"
      },
      ipv6: v6Body.error ? { ok: false, error: v6Body.error } : {
        ok: true,
        ip: v6Body.ip || "",
        country: v6Body.country_iso || v6Body.country || "",
        region: v6Body.region_name || v6Body.region || "",
        city: v6Body.city || "",
        org: v6Body.asn_org || v6Body.org || "",
        timezone: v6Body.time_zone || v6Body.timezone || "",
        source: "ifconfig.co"
      },
      errors: [
        v4.status === "rejected" ? v4.reason?.message : "",
        v6.status === "rejected" ? v6.reason?.message : ""
      ].filter(Boolean)
    };
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!res.ok) return { __error: `HTTP ${res.status}` };
    return await res.json();
  } catch (error) {
    return { __error: error.name === "AbortError" ? "timeout" : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url, ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return { __error: `HTTP ${res.status}` };
    return { text: (await res.text()).trim() };
  } catch (error) {
    return { __error: error.name === "AbortError" ? "timeout" : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeStatus(name, url, ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "manual" });
    return { name, url, status: res.status, latency: Date.now() - start, reachable: true, blocked: res.status === 403 };
  } catch (error) {
    return { name, url, status: 0, latency: Date.now() - start, reachable: false, blocked: false, error: error.name === "AbortError" ? "timeout" : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

function isUsCountry(country) {
  return ["US", "USA", "United States"].includes(String(country || "").trim());
}

function parseTrace(text) {
  const out = {};
  for (const line of String(text || "").split("\n")) {
    const idx = line.indexOf("=");
    if (idx > 0) out[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return out;
}

// Comprehensive network evaluation: exit-IP consistency (split detection), IP quality
// flags (proxy/hosting), Cloudflare datacenter, IPv6 leak, AI-service reachability,
// and geo/timezone consistency — condensed into a purity score.
export async function runProbes(facts = {}) {
  const ms = 6500;
  const [ipify, ipinfo, ipapi, cf, icanhaz, v6] = await Promise.all([
    fetchJson("https://api.ipify.org?format=json", ms),
    fetchJson("https://ipinfo.io/json", ms),
    fetchJson("http://ip-api.com/json/?fields=status,country,city,isp,org,as,proxy,hosting,mobile,query", ms),
    fetchText("https://www.cloudflare.com/cdn-cgi/trace", ms),
    fetchText("https://icanhazip.com", ms),
    fetchJson("https://api64.ipify.org?format=json", ms)
  ]);
  const trace = cf.text ? parseTrace(cf.text) : {};

  const sources = [
    { source: "ipify", ip: ipify.ip || "", geo: "" },
    { source: "ipinfo.io", ip: ipinfo.ip || "", geo: ipinfo.country ? `${ipinfo.country} · ${ipinfo.city || ""}` : "" },
    { source: "ip-api.com", ip: ipapi.query || "", geo: ipapi.country ? `${ipapi.country} · ${ipapi.city || ""}` : "" },
    { source: "cloudflare", ip: trace.ip || "", geo: trace.loc || "" },
    { source: "icanhazip", ip: icanhaz.text || "", geo: "" }
  ].filter((s) => s.ip);
  const uniqueIps = [...new Set(sources.map((s) => s.ip))];

  const reachability = await Promise.all([
    probeStatus("OpenAI API", "https://api.openai.com/v1/models", ms),
    probeStatus("ChatGPT", "https://chatgpt.com/", ms),
    probeStatus("Claude", "https://claude.ai/", ms),
    probeStatus("Anthropic API", "https://api.anthropic.com/v1/models", ms),
    probeStatus("Gemini", "https://generativelanguage.googleapis.com/", ms)
  ]);

  const exitCountry = ipinfo.country || ipapi.country || "";
  const exitIsUs = isUsCountry(exitCountry);
  const cfLoc = trace.loc || "";
  const cfIsUs = isUsCountry(cfLoc);
  const v6Ip = v6.ip && v6.ip.includes(":") ? v6.ip : "";
  const systemTz = facts.timezone || "";
  const tzIsUs = /America\//.test(systemTz);
  const localeIsUs = /en[-_]US/i.test(facts.locale || "");

  const quality = ipapi.status === "success"
    ? { ok: true, proxy: !!ipapi.proxy, hosting: !!ipapi.hosting, mobile: !!ipapi.mobile, isp: ipapi.isp || "", org: ipapi.org || "", as: ipapi.as || "" }
    : { ok: false };

  let purity = 100;
  const flags = [];
  // 1) Cloudflare-facing exit — what most AI sites (OpenAI/Claude) actually see. Headline check.
  if (cfLoc && !cfIsUs) { purity -= 35; flags.push({ key: "cf", label: "AI 站看到的出口非美国", tone: "bad", value: `${cfLoc} · ${trace.colo || ""}` }); }
  else if (cfIsUs) flags.push({ key: "cf", label: "AI 站看到美国出口", tone: "good", value: `${cfLoc} · ${trace.colo || ""}` });
  // 2) API-facing exit (ipinfo/ip-api over the proxied path)
  if (!exitIsUs && exitCountry) { purity -= 20; flags.push({ key: "exit", label: "API 出口非美国", tone: "bad", value: exitCountry }); }
  else if (exitIsUs) flags.push({ key: "exit", label: "API 出口美国", tone: "good", value: exitCountry });
  // 3) Split — different services see different exits (a direct-leak path exists)
  if (uniqueIps.length > 1) { purity -= 20; flags.push({ key: "split", label: "出口 IP 分裂", tone: "bad", value: `${uniqueIps.length} 个出口` }); }
  else if (uniqueIps.length === 1) flags.push({ key: "split", label: "出口一致", tone: "good", value: uniqueIps[0] });
  // 4) IPv6 leak — v6 present but Cloudflare (which saw it) exits non-US
  if (v6Ip && cfLoc && !cfIsUs) { purity -= 20; flags.push({ key: "v6", label: "IPv6 直连泄漏", tone: "bad", value: `${v6Ip.slice(0, 18)}… → ${cfLoc}` }); }
  else flags.push({ key: "v6", label: v6Ip ? "IPv6 随隧道" : "无 IPv6", tone: "good", value: v6Ip ? v6Ip.slice(0, 18) + "…" : "—" });
  // 5) IP quality — datacenter/proxy flags raise ban risk
  if (quality.ok && (quality.proxy || quality.hosting)) { purity -= 25; flags.push({ key: "quality", label: quality.hosting ? "机房 IP" : "代理特征", tone: "bad", value: quality.as }); }
  else if (quality.ok) flags.push({ key: "quality", label: "住宅/干净 IP", tone: "good", value: quality.isp });
  // 6) Timezone / locale consistency with a US exit
  if (systemTz && !tzIsUs) { purity -= 10; flags.push({ key: "tz", label: "系统时区非美国", tone: "warn", value: systemTz }); }
  else if (tzIsUs) flags.push({ key: "tz", label: "时区一致", tone: "good", value: systemTz });
  if (!localeIsUs) { purity -= 5; flags.push({ key: "locale", label: "语言非 en-US", tone: "warn", value: facts.locale || "—" }); }
  const unreachable = reachability.filter((r) => !r.reachable).length;
  if (unreachable) purity -= unreachable * 5;

  return {
    ok: true,
    purity: Math.max(0, Math.min(100, purity)),
    flags,
    exitConsistency: { consistent: uniqueIps.length <= 1, uniqueCount: uniqueIps.length, sources },
    quality,
    cloudflare: { ip: trace.ip || "", colo: trace.colo || "", loc: trace.loc || "", warp: trace.warp || "", tls: trace.tls || "", http: trace.http || "" },
    ipv6: { ip: v6Ip, leak: Boolean(v6Ip && cfLoc && !cfIsUs) },
    reachability,
    consistency: { exitCountry, systemTimezone: systemTz, systemLocale: facts.locale || "", tzMatch: tzIsUs, localeMatch: localeIsUs }
  };
}

function commandOutput(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

function npmConfig(key) {
  return commandOutput("npm", ["config", "get", key]);
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
      ALL_PROXY: env.ALL_PROXY || env.all_proxy ? "[set]" : "",
      NO_PROXY: env.NO_PROXY || env.no_proxy ? "[set]" : ""
    },
    targetProfile: US_PROFILE,
    managedProxy: options.profileDir ? (readProxyState(options.profileDir)?.proxyUrl || "") : "",
    configResidue: {
      npmProxy: npmConfig("proxy"),
      npmHttpsProxy: npmConfig("https-proxy"),
      npmRegistry: npmConfig("registry"),
      gitHttpProxy: gitConfig("http.proxy"),
      gitHttpsProxy: gitConfig("https.proxy"),
      gitHttpSslVerify: gitConfig("http.sslVerify")
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
    facts.network = { publicIp: await getPublicIp(), ipDetails: await getIpDetails() };
    facts.network.probes = await runProbes(facts);
    if (!facts.network.publicIp.ok) {
      addIssue(issues, "warning", "public-ip-check-failed", "Public IP check failed", facts.network.publicIp.error, "Check network connectivity or skip network checks.");
    }
    const ipv4Country = facts.network.ipDetails.ipv4?.country;
    const ipv6Country = facts.network.ipDetails.ipv6?.country;
    if (facts.network.ipDetails.ok && ipv4Country && !["US", "United States"].includes(ipv4Country)) {
      addIssue(issues, "warning", "ipv4-country-not-us", "IPv4出口不是美国", ipv4Country, "选择美国出口节点，开启 TUN/System Proxy 后重新检测。");
    }
    if (facts.network.ipDetails.ok && ipv6Country && !["US", "United States"].includes(ipv6Country)) {
      addIssue(issues, "warning", "ipv6-country-not-us", "IPv6出口不是美国，可能存在直连泄漏", ipv6Country, "在网络工具中接管 IPv6 流量，或关闭本机 IPv6 后重新检测。");
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

function shellProfile(proxyUrl = "") {
  const proxyBlock = proxyUrl
    ? `# Managed US exit proxy (applied from AI Workspace Doctor).
export HTTP_PROXY=${proxyUrl}
export HTTPS_PROXY=${proxyUrl}
export ALL_PROXY=${proxyUrl}
export http_proxy=${proxyUrl}
export https_proxy=${proxyUrl}
export all_proxy=${proxyUrl}
`
    : `# No exit proxy configured. Apply a US exit from the app to fill this in.
# export HTTP_PROXY=http://127.0.0.1:7890
# export HTTPS_PROXY=http://127.0.0.1:7890
`;
  return `# AI Workspace Doctor profile
# Review before use. To apply in the current shell:
#   source ~/.ai-workspace-doctor/profiles/ai-work-profile.sh

export LANG=${US_PROFILE.locale}
export LC_ALL=${US_PROFILE.locale}
export LC_CTYPE=${US_PROFILE.locale}
export TZ=${US_PROFILE.timezone}
export NO_PROXY=${US_PROFILE.noProxy}

${proxyBlock}`;
}

function powershellProfile(proxyUrl = "") {
  const proxyBlock = proxyUrl
    ? `# Managed US exit proxy (applied from AI Workspace Doctor).
$env:HTTP_PROXY = "${proxyUrl}"
$env:HTTPS_PROXY = "${proxyUrl}"
$env:ALL_PROXY = "${proxyUrl}"
`
    : `# No exit proxy configured. Apply a US exit from the app to fill this in.
# $env:HTTP_PROXY = "http://127.0.0.1:7890"
# $env:HTTPS_PROXY = "http://127.0.0.1:7890"
`;
  return `# AI Workspace Doctor profile
# Review before use. To apply in the current PowerShell session:
#   . "$HOME\\.ai-workspace-doctor\\profiles\\ai-work-profile.ps1"

$env:LANG = "${US_PROFILE.locale}"
$env:LC_ALL = "${US_PROFILE.locale}"
$env:LC_CTYPE = "${US_PROFILE.locale}"
$env:TZ = "${US_PROFILE.timezone}"
$env:NO_PROXY = "${US_PROFILE.noProxy}"

${proxyBlock}`;
}

function gitTemplate() {
  return `# Optional Git privacy template.
# Review and run manually inside a repository, not globally, unless you really want it global.

git config user.name "Your English Name"
git config user.email "you@example.com"
`;
}

function resolveProxyUrl(options, profileDir) {
  if (options.proxyUrl != null) return normalizeProxyUrl(options.proxyUrl);
  return readProxyState(profileDir)?.proxyUrl || "";
}

export function previewFixes(options = {}) {
  const profileDir = resolveProfileDir(options);
  const proxyUrl = resolveProxyUrl(options, profileDir);
  const files = [
    { path: join(profileDir, "ai-work-profile.sh"), content: shellProfile(proxyUrl) },
    { path: join(profileDir, "ai-work-profile.ps1"), content: powershellProfile(proxyUrl) },
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
  const proxyUrl = resolveProxyUrl(options, profileDir);
  mkdirSync(profileDir, { recursive: true });
  writeFileSync(join(profileDir, "ai-work-profile.sh"), shellProfile(proxyUrl), "utf8");
  writeFileSync(join(profileDir, "ai-work-profile.ps1"), powershellProfile(proxyUrl), "utf8");
  writeFileSync(join(profileDir, "git-privacy-template.sh"), gitTemplate(), "utf8");
  return { ...previewFixes({ profileDir, proxyUrl }), mode: "write" };
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function shellRcPath() {
  const shell = process.env.SHELL || "";
  const shellName = basename(shell);
  if (shellName.includes("zsh")) return join(homedir(), ".zshrc");
  if (shellName.includes("bash")) return join(homedir(), ".bashrc");
  return join(homedir(), ".profile");
}

function backupFile(file, backupDir, actions) {
  if (!existsSync(file)) return "";
  mkdirSync(backupDir, { recursive: true });
  const backup = join(backupDir, basename(file));
  copyFileSync(file, backup);
  actions.push(`Backed up ${file} -> ${backup}`);
  return backup;
}

function execOptional(command, args, actions, failures) {
  try {
    execFileSync(command, args, { stdio: "ignore" });
    actions.push(`Ran: ${command} ${args.join(" ")}`);
    return true;
  } catch (error) {
    failures.push(`Failed: ${command} ${args.join(" ")} (${error.message})`);
    return false;
  }
}

function hasConfigValue(value) {
  return Boolean(value && value !== "null" && value !== "undefined");
}

export function previewDeployment(options = {}) {
  const profileDir = resolveProfileDir(options);
  const rcPath = shellRcPath();
  return {
    target: US_PROFILE,
    mode: "preview",
    profileDir,
    rcPath,
    actions: [
      `Write ${join(profileDir, "ai-work-profile.sh")}`,
      `Write ${join(profileDir, "ai-work-profile.ps1")}`,
      `Backup and update ${rcPath}`,
      "Unset global npm proxy and https-proxy if present",
      `Set npm registry to ${US_PROFILE.npmRegistry}`,
      "Unset global Git http.proxy and https.proxy if present",
      "Generate rollback.sh and deployment-report.json"
    ],
    adminRequired: [
      `macOS system timezone requires admin permission: sudo systemsetup -settimezone ${US_PROFILE.timezone}`,
      "Full-device network routing requires the user to enable TUN/System Proxy in their own network tool."
    ],
    ipOperationChecklist: ipOperationChecklist()
  };
}

export function applyDeployment(options = {}) {
  const profileDir = resolveProfileDir(options);
  const deployId = timestamp();
  const backupDir = join(profileDir, "backups", deployId);
  const actions = [];
  const failures = [];

  writeFixes({ profileDir });
  actions.push(`Wrote profile files to ${profileDir}`);

  const rcPath = shellRcPath();
  const rcBackup = backupFile(rcPath, backupDir, actions);
  const sourceLine = `source "${join(profileDir, "ai-work-profile.sh")}"`;
  const markerStart = "# >>> AI Workspace Doctor >>>";
  const markerEnd = "# <<< AI Workspace Doctor <<<";
  const block = `\n${markerStart}\n${sourceLine}\n${markerEnd}\n`;
  const currentRc = existsSync(rcPath) ? readFileSync(rcPath, "utf8") : "";
  if (!currentRc.includes(markerStart)) {
    appendFileSync(rcPath, block, "utf8");
    actions.push(`Installed AI profile source block into ${rcPath}`);
  } else {
    actions.push(`AI profile source block already exists in ${rcPath}`);
  }

  if (hasConfigValue(npmConfig("proxy"))) execOptional("npm", ["config", "delete", "proxy"], actions, failures);
  else actions.push("Skipped npm proxy cleanup: no value set");
  if (hasConfigValue(npmConfig("https-proxy"))) execOptional("npm", ["config", "delete", "https-proxy"], actions, failures);
  else actions.push("Skipped npm https-proxy cleanup: no value set");
  execOptional("npm", ["config", "set", "registry", US_PROFILE.npmRegistry], actions, failures);
  if (hasConfigValue(gitConfig("http.proxy"))) execOptional("git", ["config", "--global", "--unset", "http.proxy"], actions, failures);
  else actions.push("Skipped Git http.proxy cleanup: no value set");
  if (hasConfigValue(gitConfig("https.proxy"))) execOptional("git", ["config", "--global", "--unset", "https.proxy"], actions, failures);
  else actions.push("Skipped Git https.proxy cleanup: no value set");

  const rollback = `#!/usr/bin/env bash
set -euo pipefail

RC_PATH="${rcPath}"
RC_BACKUP="${rcBackup}"

if [ -n "$RC_BACKUP" ] && [ -f "$RC_BACKUP" ]; then
  cp "$RC_BACKUP" "$RC_PATH"
  echo "Restored $RC_PATH from $RC_BACKUP"
else
  python3 - "$RC_PATH" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
text = p.read_text() if p.exists() else ""
start = "# >>> AI Workspace Doctor >>>"
end = "# <<< AI Workspace Doctor <<<"
if start in text and end in text:
    before = text.split(start)[0]
    after = text.split(end, 1)[1]
    p.write_text(before + after)
PY
fi

echo "Review npm and git proxy settings manually if needed."
`;
  writeFileSync(join(profileDir, "rollback.sh"), rollback, "utf8");

  const report = {
    mode: "applied",
    deployId,
    target: US_PROFILE,
    profileDir,
    backupDir,
    rcPath,
    actions,
    failures,
    adminRequired: previewDeployment({ profileDir }).adminRequired,
    ipOperationChecklist: ipOperationChecklist()
  };
  writeFileSync(join(profileDir, "deployment-report.json"), JSON.stringify(report, null, 2), "utf8");
  return report;
}

export function applyProxy(options = {}) {
  const profileDir = resolveProfileDir(options);
  const proxyUrl = normalizeProxyUrl(options.proxyUrl);
  const actions = [];
  const failures = [];

  if (!isValidProxyUrl(proxyUrl)) {
    return {
      ok: false,
      error: "代理地址无效。请使用 host:port，或 http://host:port / https://host:port / socks5://host:port。",
      actions,
      failures
    };
  }

  writeProxyState(profileDir, { proxyUrl, updatedAt: new Date().toISOString() });
  writeFixes({ profileDir, proxyUrl });
  actions.push(`已写入出口代理到 profile：${proxyUrl}`);

  execOptional("npm", ["config", "set", "proxy", proxyUrl], actions, failures);
  execOptional("npm", ["config", "set", "https-proxy", proxyUrl], actions, failures);
  execOptional("git", ["config", "--global", "http.proxy", proxyUrl], actions, failures);
  execOptional("git", ["config", "--global", "https.proxy", proxyUrl], actions, failures);

  const service = primaryNetworkService();
  if (service) {
    try {
      const url = new URL(proxyUrl);
      const host = url.hostname;
      const port = url.port || (url.protocol === "https:" ? "443" : "80");
      if (/^socks/i.test(url.protocol)) {
        execOptional("networksetup", ["-setsocksfirewallproxy", service, host, port], actions, failures);
        execOptional("networksetup", ["-setsocksfirewallproxystate", service, "on"], actions, failures);
      } else {
        execOptional("networksetup", ["-setwebproxy", service, host, port], actions, failures);
        execOptional("networksetup", ["-setwebproxystate", service, "on"], actions, failures);
        execOptional("networksetup", ["-setsecurewebproxy", service, host, port], actions, failures);
        execOptional("networksetup", ["-setsecurewebproxystate", service, "on"], actions, failures);
      }
    } catch (error) {
      failures.push(`macOS 系统代理设置失败：${error.message}`);
    }
  }

  return {
    ok: true,
    proxyUrl,
    networkService: service,
    actions,
    failures,
    note: "已把 CLI 工具链（shell profile / npm / git）切到你的美国出口。系统级代理可能需要管理员权限，失败项见上。点击“重新检测”确认公网 IP 已变为美国。"
  };
}

export function clearProxy(options = {}) {
  const profileDir = resolveProfileDir(options);
  const actions = [];
  const failures = [];

  writeProxyState(profileDir, { proxyUrl: "", updatedAt: new Date().toISOString() });
  writeFixes({ profileDir, proxyUrl: "" });
  actions.push("已从 profile 移除出口代理");

  if (hasConfigValue(npmConfig("proxy"))) execOptional("npm", ["config", "delete", "proxy"], actions, failures);
  if (hasConfigValue(npmConfig("https-proxy"))) execOptional("npm", ["config", "delete", "https-proxy"], actions, failures);
  if (hasConfigValue(gitConfig("http.proxy"))) execOptional("git", ["config", "--global", "--unset", "http.proxy"], actions, failures);
  if (hasConfigValue(gitConfig("https.proxy"))) execOptional("git", ["config", "--global", "--unset", "https.proxy"], actions, failures);

  const service = primaryNetworkService();
  if (service) {
    execOptional("networksetup", ["-setwebproxystate", service, "off"], actions, failures);
    execOptional("networksetup", ["-setsecurewebproxystate", service, "off"], actions, failures);
    execOptional("networksetup", ["-setsocksfirewallproxystate", service, "off"], actions, failures);
  }

  return { ok: true, networkService: service, actions, failures };
}

export function ipOperationChecklist() {
  return [
    {
      title: "选择美国出口",
      detail: "使用你自己购买或授权的美国 VPS、企业 VPN、远程开发机或代理服务。目标国家选择 United States，城市优先 Los Angeles、San Jose、Seattle、New York 等稳定机房。"
    },
    {
      title: "开启 TUN / System Proxy",
      detail: "在 Clash、Surge、Shadowrocket、v2rayN、Tailscale 或企业 VPN 中打开 TUN、全局路由或系统代理，确保桌面应用、终端、WebSocket 和子进程都走同一出口。"
    },
    {
      title: "验证公网 IP",
      detail: "点击本应用的“检测网络”，确认国家为 United States，并记录城市、ASN/组织和时区。"
    },
    {
      title: "检查 DNS 一致性",
      detail: "如果你的网络工具提供 DNS 设置，使用随隧道转发的 DNS 或可信公共 DNS。避免本地 DNS 与出口国家不一致。"
    },
    {
      title: "清理 CLI 残留",
      detail: "一键部署会清理 npm/git 里的旧 proxy，并安装 en_US.UTF-8 + America/Los_Angeles 的 shell profile。"
    },
    {
      title: "处理系统级时区",
      detail: "macOS 系统时区需要管理员密码。需要全设备一致时，在终端运行：sudo systemsetup -settimezone America/Los_Angeles。"
    },
    {
      title: "设备地区与语言",
      detail: "需要全设备一致时，将系统地区、首选语言、浏览器语言统一为 United States / English (US)。本应用先处理 CLI profile，系统 UI 变更需要用户在系统设置中确认。"
    },
    {
      title: "远程工作区方案",
      detail: "如果本机网络不可控，使用美国远程开发机或 VPS 作为稳定工作区；把代码、终端、浏览器都放在同一个远程环境里操作。"
    },
    {
      title: "账号与支付信息",
      detail: "账号、手机号、支付方式属于外部服务资料，本应用只做清单提醒，不自动代填或代改。用户应使用自己真实、合法、可验证的信息。"
    }
  ];
}
