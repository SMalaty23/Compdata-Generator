# FCE Creator — Desktop App (Tauri)

A native desktop app for creating and editing compdata files for FIFA/EA FC modding.

**Not Electron.** Uses your OS's built-in WebView2 — the .exe is ~5MB, not 150MB.

## Prerequisites

1. **Rust** — https://rustup.rs (run the installer, takes ~2 min)
2. **Node.js** — https://nodejs.org (v18+)
3. **WebView2** — Already installed on Windows 10/11. If not: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

## Quick Start

```bash
# Install Tauri CLI
npm install

# Run in dev mode (hot reload)
npm run dev

# Build a release .exe
npm run build
```

The built .exe appears in `src-tauri/target/release/bundle/`.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+O | Open compdata folder |
| Ctrl+S | Quick save (to source folder) |
| Ctrl+Shift+S | Save all (pick folder) |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |

## How It Works

- Click the drop zone → native OS folder picker opens
- Edit with all the generators as usual
- **Ctrl+S** saves changed files straight back to where you loaded them from
- No more browser downloads, no more zip files
- The app remembers your last folder, so subsequent saves are instant

## Folder Structure

```
fce-app/
├── package.json          # npm scripts
├── src/                  # Frontend (HTML/JS/CSS)
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── core.js
│       ├── ui.js
│       ├── league.js
│       ├── cup.js
│       ├── clubchamp.js
│       ├── international.js
│       ├── schedule.js
│       ├── tools.js
│       └── tauri-bridge.js
└── src-tauri/            # Rust backend
    ├── Cargo.toml
    ├── tauri.conf.json
    └── src/main.rs
```

## Still Works in Browser

Open `src/index.html` in any browser — the Tauri bridge detects it's not in Tauri and does nothing. All the original browser functionality still works.
