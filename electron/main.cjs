const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

const isDev = process.env.AI_WORKSPACE_DOCTOR_DEV === "1";

async function scanner() {
  return import("../src/core/scanner.js");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    title: "AI Workspace Doctor",
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
  return api.scanEnvironment(options);
});

ipcMain.handle("doctor:preview-fixes", async () => {
  const api = await scanner();
  return api.previewFixes({ profileDir: path.join(app.getPath("userData"), "profiles") });
});

ipcMain.handle("doctor:write-fixes", async () => {
  const api = await scanner();
  return api.writeFixes({ profileDir: path.join(app.getPath("userData"), "profiles") });
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
