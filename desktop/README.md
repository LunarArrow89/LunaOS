# LunaOS Desktop

LunaOS Desktop packages the existing LunaOS interface in an Electron desktop window. Its Luna Browser uses Chromium's native webview in the desktop app, so it does not rely on an iframe for normal browsing.

## Build locally

Install Node.js 22 or newer, then run:

```sh
npm install
npm start
```

To build an installer for your current operating system:

```sh
npm run dist
```

## Download a built app

GitHub Actions builds Linux, Windows, and macOS installers. Open the repository's **Actions** tab, select **Build LunaOS Desktop App**, open a successful run, and download the artifact for your operating system. On a Chromebook, the Linux `.deb` package is intended for the Linux development environment if it is enabled on your device.

## Notes

- The regular GitHub Pages website remains available and keeps its iframe-based browser fallback.
- The desktop app is separate from the hosted website; installing the app does not change Chrome itself.
- CEF is a native C/C++ framework. This version uses Electron's bundled Chromium engine to provide the same essential desktop-browser capability with a simpler cross-platform build setup.
