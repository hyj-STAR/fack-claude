const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");

const isDev = process.env.AI_WORKSPACE_DOCTOR_DEV === "1";

async function scanner() {
  return import("../src/core/scanner.js");
}

function profilesDir() {
  return path.join(app.getPath("userData"), "profiles");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    title: "FACK",
    backgroundColor: "#f5f7f4",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    win.loadURL("http://127.0.0.1:5178");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

ipcMain.handle("doctor:scan", async (_event, options = {}) => {
  const api = await scanner();
  return api.scanEnvironment({ ...options, profileDir: profilesDir() });
});

ipcMain.handle("doctor:preview-fixes", async () => {
  const api = await scanner();
  return api.previewFixes({ profileDir: profilesDir() });
});

ipcMain.handle("doctor:write-fixes", async () => {
  const api = await scanner();
  return api.writeFixes({ profileDir: profilesDir() });
});

ipcMain.handle("doctor:preview-deployment", async () => {
  const api = await scanner();
  return api.previewDeployment({ profileDir: profilesDir() });
});

ipcMain.handle("doctor:apply-deployment", async () => {
  const api = await scanner();
  return api.applyDeployment({ profileDir: profilesDir() });
});

ipcMain.handle("doctor:apply-proxy", async (_event, options = {}) => {
  const api = await scanner();
  return api.applyProxy({ ...options, profileDir: profilesDir() });
});

ipcMain.handle("doctor:clear-proxy", async () => {
  const api = await scanner();
  return api.clearProxy({ profileDir: profilesDir() });
});

ipcMain.handle("doctor:open-external", async (_event, url) => {
  if (typeof url === "string" && /^https:\/\//.test(url)) await shell.openExternal(url);
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
