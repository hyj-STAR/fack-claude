import { spawn } from "node:child_process";

const vite = spawn("npm", ["run", "dev:web"], {
  stdio: "inherit",
  shell: true
});

await new Promise((resolve) => setTimeout(resolve, 1800));

const electron = spawn("npm", ["run", "start"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    AI_WORKSPACE_DOCTOR_DEV: "1"
  }
});

function shutdown() {
  vite.kill("SIGTERM");
  electron.kill("SIGTERM");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
electron.on("exit", () => {
  vite.kill("SIGTERM");
  process.exit(0);
});
