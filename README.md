# المكتبة الشاملة الإباضية

Desktop app for the Ibadi Shamela library — browse, search, and read 2,700+ books offline. Works on Windows, macOS, and Linux.

## Quick Start

### Download

Download the latest installer for your system from the **Releases** page on GitHub.

| Platform | File |
|----------|------|
| Windows | `Shamela-Setup-1.0.0.exe` |
| macOS | `Shamela-1.0.0.dmg` |
| Linux | `Shamela-1.0.0.AppImage` |

### Install

**Windows:** Double-click the `.exe` file and follow the installer steps.

**macOS:** Open the `.dmg` file, drag the app to your Applications folder. If macOS says the app is from an unidentified developer, go to **System Settings → Privacy & Security** and click **Open Anyway**.

**Linux:** Make the `.AppImage` executable (`chmod +x Shamela-*.AppImage`) and double-click it.

### First Launch

1. Open the app
2. The library loads automatically — no setup needed
3. Browse books by category, search by title/author, or open the reader

## System Requirements

| | Minimum |
|--|---------|
| **OS** | Windows 10+, macOS 11+, Ubuntu 20.04+ |
| **RAM** | 2 GB |
| **Storage** | 3 GB free (includes the 2.1 GB library database) |
| **Internet** | Only needed for the initial update check (optional) |

## Features

- **2,700+ books** — Complete Ibadi Islamic library
- **Full-text search** — Instant search across 688,000+ pages
- **PDF viewer** — Read PDF-only books
- **Offline** — Everything runs locally, no internet needed
- **Arabic RTL** — Full right-to-left interface
- **Dark theme** — Easy on the eyes

## Building from Source

For developers who want to build themselves:

```bash
# Install dependencies
npm install

# Build the app
npm run build

# Package for your platform
npm run package:win    # Windows
npm run package:mac    # macOS
npm run package:linux  # Linux
```

The packaged app will be in the `dist-app/` folder.

## Tech Stack

React 19 + TypeScript + Tailwind CSS + Electron 33 + SQLite

## Credits

Original library data from [eshamila.net](https://eshamila.net). Modern desktop app rebuilt from scratch for cross-platform support.
