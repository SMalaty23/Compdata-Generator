# FCE Creator

**Football Competition Editor for FC 26.** A native desktop app for creating, editing, and managing competition data — leagues, cups, international tournaments, schedules, and club championships — directly from the game's compdata files.

Built with Tauri 2 (Rust + JS), runs natively on Windows.

---

## What it does

FCE Creator reads and writes the raw `.txt` files inside FC 26's `compdata` folder, giving you a visual editor on top of file formats that are otherwise painful to edit by hand. Instead of hand-crafting `compobj.txt`, `settings.txt`, `schedule.txt`, etc., you work in tabs designed around the kind of competition you're building.

It also loads database tables (`teams.txt`, `leagues.txt`, `leagueteamlinks.txt`, `teamnationlinks.txt`) — encoded as UTF-16LE — so generators can pull real team and league data when building competitions.

---

## Features

- **League Generator** — Build domestic leagues with full schedule, standings, and advancement logic.
- **Cup Generator** — Knockout, group-stage, and hybrid cup formats with bracket visualization.
- **International Generator** — Continental and world competitions with international window awareness.
- **Club Championship Generator** — FIFA-style global club tournaments.
- **Schedule Viewer** — Year-long calendar canvas showing every competition's footprint, with international window overlays and a "find free window" helper.
- **Tools tab** — Utility helpers for inspecting and validating compdata.
- **Native file I/O** — Open and save folders directly. Ctrl+S quick-saves changed files back to the source folder.
- **Undo / redo** across edits.
- **ZIP export** for sharing competition packages.

---

## Download

Grab the latest installer from the [Releases](../../releases) page.

- `FCE-Creator_x.y.z_x64-setup.exe` — Windows installer (NSIS, per-machine)
- `FCE-Creator_x.y.z_x64_en-US.msi` — alternative MSI installer

No external dependencies — Tauri bundles everything.

---

## Quick start

1. **Launch FCE Creator.**
2. **Load your compdata folder.** Click the *Compdata* drop zone (or press `Ctrl+O`) and select your FC 26 compdata folder. The app reads every recognized `.txt` file in it.
3. *(Optional)* **Load your database folder** if you want generators to use real team/league data. Click the *Database* drop zone.
4. **Pick a tab** for the kind of competition you want to build or edit:
   - *League* for domestic leagues
   - *Cup* for knockout/group-stage cups
   - *International* for continental tournaments
   - *Club Championship* for global club competitions
   - *Schedule* to visualize the full calendar
5. **Make your edits.** Use the previews and validation panels to check your work.
6. **Save.** Press `Ctrl+S` to write changed files back to the original compdata folder, or use the export buttons for ZIP/folder export.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+S` | Save changed files back to source folder |
| `Ctrl+Shift+S` | Save all files (pick folder) |
| `Ctrl+O` | Open compdata folder |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |

---

## Supported files

**Compdata (UTF-8, CRLF):**
`compobj`, `settings`, `schedule`, `standings`, `advancement`, `tasks`, `objectives`, `initteams`, `compids`, `weather`

**Database (UTF-16LE):**
`teams`, `leagues`, `leagueteamlinks`, `teamnationlinks`

Files are written back with CRLF line endings to match the game's expected format.

---

## Building from source

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) 18+ (for the Tauri CLI)
- Windows: Microsoft C++ Build Tools and WebView2 (usually already installed on Windows 10/11)

See the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) if anything's missing.

### Build

```bash
git clone https://github.com/YOUR_USERNAME/fce-creator.git
cd fce-creator/fce-app
npm install
npx tauri dev    # run in dev mode with hot-reload
npx tauri build  # produce a release build + installer in src-tauri/target/release/
```

The release build will land in `fce-app/src-tauri/target/release/bundle/`.

---

## Tech stack

- **Frontend:** Vanilla HTML / CSS / JS — no framework, no bundler.
- **Backend:** Rust via [Tauri 2](https://tauri.app/) for native file dialogs, file I/O, and ZIP export.
- **Encoding:** UTF-8 (CRLF) for compdata, UTF-16LE for database files — handled in `main.rs`.

The frontend lives in `fce-app/src/`; the Rust backend lives in `fce-app/src-tauri/src/main.rs`. The bridge between them is `fce-app/src/js/tauri-bridge.js`.

---

## Project layout

```
fce-app/
├── src/                       # Frontend
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── core.js            # State, hierarchy parser, undo/redo
│       ├── ui.js              # UI helpers, toast, page routing
│       ├── league.js          # League generator
│       ├── cup.js             # Cup generator
│       ├── international.js   # International generator
│       ├── clubchamp.js       # Club Championship generator
│       ├── schedule.js        # Schedule viewer
│       ├── tools.js           # Utility tools
│       └── tauri-bridge.js    # Native file I/O bridge
└── src-tauri/                 # Rust backend
    ├── src/main.rs            # Tauri commands: open_folder, save_files, save_zip
    ├── Cargo.toml
    └── tauri.conf.json
```

---

## Contributing

Issues and pull requests welcome. If you're reporting a bug, please include:
- The FC 26 game version you're working against
- A minimal compdata folder that reproduces the issue (or the specific file that breaks)
- The exact steps to reproduce

---

## Disclaimer

FCE Creator is a community modding tool. Not affiliated with EA Sports or FIFA. Use at your own risk — back up your compdata folder before making changes.
