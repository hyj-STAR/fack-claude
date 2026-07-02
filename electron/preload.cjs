const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("doctor", {
  scan: (options) => ipcRenderer.invoke("doctor:scan", options),
  previewFixes: () => ipcRenderer.invoke("doctor:preview-fixes"),
  writeFixes: () => ipcRenderer.invoke("doctor:write-fixes")
});
