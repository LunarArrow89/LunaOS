const { app, BrowserWindow, shell, session, ipcMain } = require("electron");
const path = require("path");

// Allow the bundled rain ambience to autoplay in the desktop app.
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

function isSafeWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

ipcMain.handle("lunaos:open-external", async (_event, value) => {
  if (isSafeWebUrl(value)) await shell.openExternal(value);
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 760,
    minHeight: 560,
    title: "LunaOS",
    backgroundColor: "#f8f3e9",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true
    }
  });

  win.loadFile(path.join(__dirname, "..", "index.html"));

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeWebUrl(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("file://")) return;
    if (isSafeWebUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    } else {
      event.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = new Set(["media", "geolocation", "notifications", "clipboard-read", "clipboard-sanitized-write"]);
    callback(allowed.has(permission));
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
