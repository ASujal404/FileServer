# Electron Desktop Packaging Guide

This guide details how to build standalone production distribution binaries for **Windows (.exe)** and **Linux (AppImage)** using Electron Builder.

---

## 1. Building Windows Executable (.exe)

```bash
# Navigate to client directory
cd client

# Build production React distribution and package Windows executable
npm run electron:build -- --win
```

### Output Location:
- Installer: `client/dist-electron/NetworkFileServer-Setup-1.0.0.exe`

---

## 2. Building Linux AppImage

```bash
# Navigate to client directory
cd client

# Build production React distribution and package Linux AppImage
npm run electron:build -- --linux
```

### Output Location:
- Package: `client/dist-electron/NetworkFileServer-1.0.0.AppImage`

---

## Configuration Reference (`electron-builder.json`)

```json
{
  "appId": "com.fileserver.desktop",
  "productName": "Network File Server",
  "directories": {
    "output": "dist-electron"
  },
  "win": {
    "target": ["nsis"]
  },
  "linux": {
    "target": ["AppImage"]
  }
}
```
