const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lunaDesktop", Object.freeze({
  isDesktop: true,
  openExternal(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return ipcRenderer.invoke("lunaos:open-external", parsed.href);
      }
    } catch (_) {}
  }
}));
