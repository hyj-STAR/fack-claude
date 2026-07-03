const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("doctor", {
  scan: (options) => ipcRenderer.invoke("doctor:scan", options),
  previewFixes: () => ipcRenderer.invoke("doctor:preview-fixes"),
  writeFixes: () => ipcRenderer.invoke("doctor:write-fixes"),
  previewDeployment: () => ipcRenderer.invoke("doctor:preview-deployment"),
  applyDeployment: () => ipcRenderer.invoke("doctor:apply-deployment")
});
