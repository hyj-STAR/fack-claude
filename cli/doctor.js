#!/usr/bin/env node
import { scanEnvironment } from "../src/core/scanner.js";
import { previewFixes, writeFixes } from "../src/core/scanner.js";

const args = process.argv.slice(2);
const command = args[0] || "scan";
const wantsJson = args.includes("--json");
const wantsNetwork = args.includes("--network");
const dryRun = args.includes("--dry-run") || !args.includes("--write");

function printReport(report) {
  console.log(`AI Workspace Doctor ${report.version}`);
  console.log(`Score: ${report.score}/100 (${report.status})`);
  console.log("");
  console.log("System");
  console.log(`  Platform: ${report.facts.platform} ${report.facts.osRelease}`);
  console.log(`  Locale: ${report.facts.locale || "unknown"}`);
  console.log(`  Timezone: ${report.facts.timezone || "unknown"}`);
  console.log(`  Shell: ${report.facts.shell || "unknown"}`);
  if (report.facts.network?.publicIp) {
    const publicIp = report.facts.network.publicIp;
    console.log(`  Public IP check: ${publicIp.ok ? "ok" : `failed (${publicIp.error})`}`);
  }
  console.log("");
  console.log("Issues");
  if (!report.issues.length) {
    console.log("  No issues detected.");
    return;
  }
  for (const issue of report.issues) {
    const marker = issue.severity.toUpperCase().padEnd(7);
    console.log(`  [${marker}] ${issue.title}`);
    console.log(`          Detected: ${issue.detected}`);
    console.log(`          Suggest:  ${issue.recommendation}`);
  }
}

async function main() {
  if (command === "scan") {
    const report = await scanEnvironment({ network: wantsNetwork });
    if (wantsJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report);
    }
    return;
  }

  if (command === "fix") {
    const result = dryRun ? previewFixes() : writeFixes();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(`Usage:
  ai-doctor scan [--json] [--network]
  ai-doctor fix [--dry-run|--write]
`);
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exitCode = 2;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
