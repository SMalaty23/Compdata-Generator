// ── Tauri Bridge ───────────────────────────────────────────────────
// Connects the FCE Creator frontend to native Rust file I/O.
// Works with Tauri 2. Waits for DOM + Tauri global to be ready.
// ───────────────────────────────────────────────────────────────────

function __initTauriBridge() {
    // Tauri 2 exposes window.__TAURI__ with .core.invoke (not .tauri.invoke like v1)
    if (typeof window.__TAURI__ === 'undefined') {
        console.log('[Tauri] window.__TAURI__ not found — browser mode');
        return;
    }
    
    // Tauri 2: invoke is at window.__TAURI__.core.invoke
    // Tauri 1 legacy: window.__TAURI__.tauri.invoke
    const tauriCore = window.__TAURI__.core || window.__TAURI__.tauri;
    if (!tauriCore || typeof tauriCore.invoke !== 'function') {
        console.error('[Tauri] __TAURI__ found but invoke() unavailable. Keys:', Object.keys(window.__TAURI__));
        return;
    }
    const invoke = tauriCore.invoke;
    
    console.log('[Tauri] Bridge loaded — native file I/O active');
    const ALL_FILES = ['compobj', 'settings', 'schedule', 'standings', 'advancement', 'tasks', 'objectives', 'initteams', 'compids', 'weather'];
    const DATABASE_FILES = ['teams', 'leagues', 'leagueteamlinks', 'teamnationlinks'];

    // Track last opened paths for quick re-save
    let lastCompdataPath = null;
    let lastDatabasePath = null;

    // ── Load compdata strings into the app ─────────────────────────
    function loadCompdataFromStrings(files) {
        for (const [filename, content] of Object.entries(files)) {
            const name = filename.replace('.txt', '').toLowerCase();
            if (!ALL_FILES.includes(name)) continue;

            data[name] = content.split('\n').map(l => l.trim()).filter(l => l);
            data.original[name] = [...data[name]];

            const fileItem = document.getElementById('file-' + name);
            if (fileItem) fileItem.classList.add('loaded');

            const statusEl = document.getElementById('status-' + name);
            if (statusEl) statusEl.textContent = data[name].length + ' lines';

            const countEl = document.getElementById('count-' + name);
            if (countEl) countEl.textContent = data[name].length;
        }

        if (data.compobj && data.compobj.length > 0) {
            if (typeof parseHierarchy === 'function') parseHierarchy();
            if (typeof findNextId === 'function') findNextId();
            if (typeof populateDropdowns === 'function') populateDropdowns();
            if (typeof showPreview === 'function') showPreview('compobj');
            if (typeof saveState === 'function') saveState('Loaded files');
        }
    }

    // ── Load database strings into the app ─────────────────────────
    function loadDatabaseFromStrings(files) {
        for (const [filename, content] of Object.entries(files)) {
            const name = filename.replace('.txt', '').toLowerCase();
            if (!DATABASE_FILES.includes(name)) continue;

            data[name] = content.split('\n').map(l => l.trim()).filter(l => l);
            data.original[name] = [...data[name]];
            if (typeof parseDatabase === 'function') parseDatabase(name);

            const fileItem = document.getElementById('file-' + name);
            if (fileItem) fileItem.classList.add('loaded');

            const statusEl = document.getElementById('status-' + name);
            if (statusEl) statusEl.textContent = data[name].length + ' lines';
        }
    }

    // ── Get files to save ──────────────────────────────────────────
    function getFilesToSave(onlyChanged) {
        const filesToSave = {};
        ALL_FILES.forEach(f => {
            if (!data[f] || data[f].length === 0) return;
            if (onlyChanged) {
                const orig = data.original[f] || [];
                if (data[f].length === orig.length && JSON.stringify(data[f]) === JSON.stringify(orig)) return;
            }
            filesToSave[f + '.txt'] = data[f].join('\r\n') + '\r\n';
        });
        return filesToSave;
    }

    // ── Override drop-zone clicks to use native folder dialog ──────
    const compdataDropZone = document.getElementById('drop-zone-compdata');
    const dbDropZone = document.getElementById('drop-zone-db');

    if (compdataDropZone) {
        const openFn = async () => {
            try {
                const result = await invoke('open_folder', { folderType: 'compdata' });
                lastCompdataPath = result.folder_path;
                loadCompdataFromStrings(result.files);
                toast('Loaded compdata from: ' + result.folder_path.split(/[\\/]/).pop());
            } catch (err) {
                if (err !== 'Cancelled') toast('Error: ' + err, 'error');
            }
        };
        window.__tauriOpenCompdata = openFn;
        compdataDropZone.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openFn();
        };
        const p = compdataDropZone.querySelector('p');
        if (p) p.textContent = '📁 Click to open compdata folder';
    }

    if (dbDropZone) {
        const openFn = async () => {
            try {
                const result = await invoke('open_folder', { folderType: 'database' });
                lastDatabasePath = result.folder_path;
                loadDatabaseFromStrings(result.files);
                toast('Loaded database from: ' + result.folder_path.split(/[\\/]/).pop());
            } catch (err) {
                if (err !== 'Cancelled') toast('Error: ' + err, 'error');
            }
        };
        window.__tauriOpenDatabase = openFn;
        dbDropZone.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openFn();
        };
        const p = dbDropZone.querySelector('p');
        if (p) p.textContent = '🗄️ Click to open database folder';
    }

    // ── Override export functions to use native Save ────────────────
    window.exportFile = async function (fileType) {
        if (!data[fileType] || data[fileType].length === 0) {
            toast('No data to export', 'error');
            return;
        }
        const files = {};
        files[fileType + '.txt'] = data[fileType].join('\r\n') + '\r\n';

        try {
            const result = await invoke('save_files', { files });
            if (result.success) toast('Saved ' + fileType + '.txt');
        } catch (err) {
            toast('Error: ' + err, 'error');
        }
    };

    window.exportAll = async function () {
        const files = getFilesToSave(true);
        if (Object.keys(files).length === 0) {
            toast('No changes to export', 'error');
            return;
        }

        // If we have a last compdata path, save directly there
        if (lastCompdataPath) {
            try {
                const result = await invoke('save_files_to', {
                    files,
                    folderPath: lastCompdataPath
                });
                if (result.success) toast('Saved ' + result.saved.length + ' files to ' + lastCompdataPath.split(/[\\/]/).pop());
            } catch (err) {
                toast('Error: ' + err, 'error');
            }
        } else {
            try {
                const result = await invoke('save_files', { files });
                if (result.success) toast('Saved ' + result.saved.length + ' files');
            } catch (err) {
                toast('Error: ' + err, 'error');
            }
        }
    };

    window.exportZip = async function () {
        const files = getFilesToSave(true);
        if (Object.keys(files).length === 0) {
            toast('No changes to export', 'error');
            return;
        }
        try {
            const result = await invoke('save_zip', {
                files,
                defaultName: 'compdata_export.zip'
            });
            if (result.success) toast('Exported ZIP');
        } catch (err) {
            toast('Error: ' + err, 'error');
        }
    };

    window.exportZipAll = async function () {
        const files = getFilesToSave(false);
        if (Object.keys(files).length === 0) {
            toast('No data to export', 'error');
            return;
        }
        try {
            const result = await invoke('save_zip', {
                files,
                defaultName: 'compdata_full.zip'
            });
            if (result.success) toast('Exported ZIP');
        } catch (err) {
            toast('Error: ' + err, 'error');
        }
    };

    // ── Keyboard shortcuts ─────────────────────────────────────────
    document.addEventListener('keydown', async (e) => {
        // Ctrl+S: Quick save changed files back to source folder
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            window.exportAll();
        }
        // Ctrl+Shift+S: Save all files (pick folder)
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            const files = getFilesToSave(false);
            if (Object.keys(files).length === 0) {
                toast('No data to export', 'error');
                return;
            }
            try {
                const result = await invoke('save_files', { files });
                if (result.success) toast('Saved all ' + result.saved.length + ' files');
            } catch (err) {
                toast('Error: ' + err, 'error');
            }
        }
        // Ctrl+O: Open compdata folder
        if (e.ctrlKey && !e.shiftKey && e.key === 'o') {
            e.preventDefault();
            if (compdataDropZone) compdataDropZone.click();
        }
        // Ctrl+Z: Undo
        if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
            if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                if (typeof undo === 'function') undo();
            }
        }
        // Ctrl+Y: Redo
        if (e.ctrlKey && e.key === 'y') {
            if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                if (typeof redo === 'function') redo();
            }
        }
    });

    // ── Add save indicator to the title bar ────────────────────────
    const titleEl = document.querySelector('.logo');
    if (titleEl) {
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '💾 Save';
        saveBtn.style.cssText = 'margin-left:12px;padding:4px 10px;background:#238636;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:0.7rem';
        saveBtn.onclick = () => window.exportAll();
        titleEl.appendChild(saveBtn);
    }

    console.log('[Tauri] Bridge ready — Ctrl+S to save, Ctrl+O to open, Ctrl+Z/Y for undo/redo');
}

// Wait until both DOM and Tauri global are ready before initializing.
// Tauri 2 injects __TAURI__ before the page loads, but we still need the DOM.
function __waitAndInitTauri() {
    if (typeof window.__TAURI__ !== 'undefined') {
        __initTauriBridge();
    } else {
        // Tauri not detected yet — retry a few times then give up (browser mode)
        let tries = 0;
        const interval = setInterval(() => {
            tries++;
            if (typeof window.__TAURI__ !== 'undefined') {
                clearInterval(interval);
                __initTauriBridge();
            } else if (tries >= 20) {
                clearInterval(interval);
                console.log('[Tauri] Giving up detection after 20 tries — running in browser mode');
            }
        }, 50);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __waitAndInitTauri);
} else {
    __waitAndInitTauri();
}