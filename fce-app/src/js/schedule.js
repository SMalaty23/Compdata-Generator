// ==================== SCHEDULE VIEWER ====================

let scheduleData = {
    competitions: [],
    selectedDay: null,
    selectedComp: null
};

const INTL_WINDOWS = [
    { start: 257, end: 261, name: 'September' },
    { start: 292, end: 296, name: 'October' },
    { start: 327, end: 331, name: 'November' },
    { start: 451, end: 455, name: 'March' },
    { start: 530, end: 534, name: 'May/June' },
    { start: 622, end: 625, name: 'June' }
];

function parseScheduleData() {
    scheduleData.competitions = [];
    
    if (!data.compobj || data.compobj.length === 0) {
        updateScheduleStats();
        return;
    }
    
    // Build lookup maps in one pass over compobj
    const comps = {};              // compId -> comp object
    const nodeToComp = {};         // any nodeId (stage or group) -> root compId
    const nodeParent = {};         // nodeId -> parentId
    const nodeType = {};           // nodeId -> type (3/4/5)
    
    data.compobj.forEach(line => {
        const parts = line.split(',');
        if (parts.length < 5) return;
        const id = parseInt(parts[0]);
        const typeId = parseInt(parts[1]);
        const code = parts[2];
        const name = parts[3];
        const parent = parseInt(parts[4]);
        
        nodeType[id] = typeId;
        nodeParent[id] = parent;
        
        if (typeId === 3) {
            comps[id] = { id, code, name, parent, type: 'OTHER', stages: [], minDay: 999, maxDay: 0 };
            nodeToComp[id] = id;
        }
    });
    
    // Second pass: walk stages and groups up to their root comp
    data.compobj.forEach(line => {
        const parts = line.split(',');
        if (parts.length < 5) return;
        const id = parseInt(parts[0]);
        const typeId = parseInt(parts[1]);
        if (typeId !== 4 && typeId !== 5) return;
        
        // Walk up until we find a type 3 (comp)
        let cursor = id;
        let safety = 20;
        while (safety-- > 0) {
            const p = nodeParent[cursor];
            if (p === undefined || isNaN(p) || p === 0) break;
            if (nodeType[p] === 3) {
                nodeToComp[id] = p;
                if (typeId === 4 && comps[p]) {
                    comps[p].stages.push(parts[2]);
                }
                break;
            }
            cursor = p;
        }
    });
    
    // Determine comp type from settings (single pass)
    if (data.settings) {
        data.settings.forEach(line => {
            const parts = line.split(',');
            if (parts.length < 3) return;
            const id = parseInt(parts[0]);
            if (!comps[id]) return;
            if (parts[1] === 'comp_type') {
                const val = parts[2];
                if (val === 'LEAGUE') comps[id].type = 'DOMESTIC';
                else if (val === 'CUP') comps[id].type = 'CUP';
                else if (val && val.indexOf('INTER') === 0) comps[id].type = 'INTERNATIONAL';
            }
        });
    }
    
    // Single pass over schedule — use nodeToComp for instant lookup
    if (data.schedule) {
        data.schedule.forEach(line => {
            const parts = line.split(',');
            if (parts.length < 2) return;
            const nodeId = parseInt(parts[0]);
            const day = parseInt(parts[1]);
            if (isNaN(nodeId) || isNaN(day)) return;
            
            const compId = nodeToComp[nodeId];
            if (compId === undefined) return;
            const comp = comps[compId];
            if (!comp) return;
            
            if (day < comp.minDay) comp.minDay = day;
            if (day > comp.maxDay) comp.maxDay = day;
        });
    }
    
    Object.values(comps).forEach(comp => {
        if (comp.minDay < 999 && comp.maxDay > 0) {
            scheduleData.competitions.push(comp);
        }
    });
    
    updateScheduleStats();
}

function renderSchedule() {
    const canvas = document.getElementById('schedule-canvas');
    const container = document.getElementById('schedule-canvas-container');
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    const view = document.getElementById('schedule-view').value;
    
    // Filter competitions
    const showDomestic = document.getElementById('schedule-filter-domestic').checked;
    const showCups = document.getElementById('schedule-filter-cups').checked;
    const showInternational = document.getElementById('schedule-filter-international').checked;
    const showWindows = document.getElementById('schedule-show-windows').checked;
    
    const filtered = scheduleData.competitions.filter(c => {
        if (c.type === 'DOMESTIC' && !showDomestic) return false;
        if (c.type === 'CUP' && !showCups) return false;
        if (c.type === 'INTERNATIONAL' && !showInternational) return false;
        return true;
    });
    
    // Dimensions
    const rowHeight = 24;
    const dayWidth = view === 'month' ? 20 : 2;
    const leftMargin = 150;
    const topMargin = 30;
    const totalDays = view === 'month' ? 31 : 365;
    
    canvas.width = container.clientWidth;
    canvas.height = Math.max(container.clientHeight, (filtered.length * rowHeight) + topMargin + 40);
    
    // Clear
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw day grid
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    for (let day = 0; day <= totalDays; day += (view === 'month' ? 5 : 30)) {
        const x = leftMargin + (day * dayWidth);
        ctx.beginPath();
        ctx.moveTo(x, topMargin);
        ctx.moveTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Draw international windows
    if (showWindows && view === 'full') {
        ctx.fillStyle = 'rgba(248, 81, 73, 0.1)';
        INTL_WINDOWS.forEach(win => {
            const x1 = leftMargin + (win.start * dayWidth);
            const x2 = leftMargin + (win.end * dayWidth);
            ctx.fillRect(x1, topMargin, x2 - x1, canvas.height - topMargin);
            
            // Label
            ctx.fillStyle = '#f85149';
            ctx.font = '9px monospace';
            ctx.fillText(win.name, x1 + 2, topMargin - 5);
            ctx.fillStyle = 'rgba(248, 81, 73, 0.1)';
        });
    }
    
    // Draw day labels
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px monospace';
    for (let day = 0; day <= totalDays; day += (view === 'month' ? 5 : 30)) {
        const x = leftMargin + (day * dayWidth);
        ctx.fillText('D' + day, x, topMargin - 10);
    }
    
    // Draw competitions
    filtered.forEach((comp, idx) => {
        const y = topMargin + (idx * rowHeight);
        const x1 = leftMargin + (comp.minDay * dayWidth);
        const x2 = leftMargin + (comp.maxDay * dayWidth);
        const width = Math.max(x2 - x1, 2);
        
        // Color by type
        let color = '#8b949e';
        if (comp.type === 'DOMESTIC') color = '#238636';
        else if (comp.type === 'CUP') color = '#1f6feb';
        else if (comp.type === 'INTERNATIONAL') color = '#da3633';
        
        // Draw bar
        ctx.fillStyle = comp.id === scheduleData.selectedComp?.id ? '#58a6ff' : color;
        ctx.fillRect(x1, y + 4, width, rowHeight - 8);
        
        // Draw label
        ctx.fillStyle = '#c9d1d9';
        ctx.font = '11px sans-serif';
        ctx.fillText(comp.code, 5, y + 16);
        
        // Draw duration on bar if space
        if (width > 40) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '9px monospace';
            const duration = comp.maxDay - comp.minDay;
            ctx.fillText(duration + 'd', x1 + 4, y + 15);
        }
    });
    
    // Draw selected day marker
    if (scheduleData.selectedDay !== null) {
        const x = leftMargin + (scheduleData.selectedDay * dayWidth);
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, topMargin);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
}

function updateScheduleStats() {
    const total = scheduleData.competitions.length;
    const domestic = scheduleData.competitions.filter(c => c.type === 'DOMESTIC').length;
    const cups = scheduleData.competitions.filter(c => c.type === 'CUP').length;
    const international = scheduleData.competitions.filter(c => c.type === 'INTERNATIONAL').length;
    
    document.getElementById('schedule-stat-total').textContent = total;
    document.getElementById('schedule-stat-domestic').textContent = domestic;
    document.getElementById('schedule-stat-cups').textContent = cups;
    document.getElementById('schedule-stat-international').textContent = international;
    
    // Find busiest day
    const dayCounts = {};
    for (let day = 1; day <= 365; day++) dayCounts[day] = 0;
    
    data.schedule.forEach(line => {
        const day = parseInt(line.split(',')[1]);
        if (day >= 1 && day <= 365) dayCounts[day]++;
    });
    
    let busiestDay = 1;
    let maxCount = 0;
    Object.entries(dayCounts).forEach(([day, count]) => {
        if (count > maxCount) {
            maxCount = count;
            busiestDay = day;
        }
    });
    
    document.getElementById('schedule-stat-busiest').textContent = 'Day ' + busiestDay + ' (' + maxCount + ' matches)';
}

// Click handler for canvas
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('schedule-canvas');
    if (canvas) {
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const view = document.getElementById('schedule-view').value;
            const dayWidth = view === 'month' ? 20 : 2;
            const leftMargin = 150;
            const topMargin = 30;
            const rowHeight = 24;
            
            // Calculate clicked day
            const day = Math.floor((x - leftMargin) / dayWidth);
            
            // Calculate clicked competition
            const row = Math.floor((y - topMargin) / rowHeight);
            const filtered = scheduleData.competitions.filter(c => {
                const showDomestic = document.getElementById('schedule-filter-domestic').checked;
                const showCups = document.getElementById('schedule-filter-cups').checked;
                const showInternational = document.getElementById('schedule-filter-international').checked;
                if (c.type === 'DOMESTIC' && !showDomestic) return false;
                if (c.type === 'CUP' && !showCups) return false;
                if (c.type === 'INTERNATIONAL' && !showInternational) return false;
                return true;
            });
            
            scheduleData.selectedDay = day;
            
            if (row >= 0 && row < filtered.length) {
                const comp = filtered[row];
                if (day >= comp.minDay && day <= comp.maxDay) {
                    scheduleData.selectedComp = comp;
                    showCompDetails(comp);
                } else {
                    scheduleData.selectedComp = null;
                    document.getElementById('schedule-comp-details').style.display = 'none';
                }
            }
            
            showDayInfo(day);
            renderSchedule();
        });
    }
});

function showDayInfo(day) {
    const infoDiv = document.getElementById('schedule-day-info');
    const actionBtn = document.getElementById('schedule-action-btn');
    
    // Calculate date
    const startDate = new Date(2025, 7, 1); // August 1, 2025
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);
    
    let html = '<div style="color:#58a6ff;font-weight:600;margin-bottom:6px">Day ' + day + '</div>';
    html += '<div style="color:#8b949e;margin-bottom:8px">' + date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '</div>';
    
    // Count matches on this day
    const matchesOnDay = data.schedule.filter(s => parseInt(s.split(',')[1]) === day).length;
    html += '<div>Matches scheduled: <span style="color:' + (matchesOnDay > 20 ? '#f85149' : '#3fb950') + '">' + matchesOnDay + '</span></div>';
    
    // Check if in international window
    const inWindow = INTL_WINDOWS.find(w => day >= w.start && day <= w.end);
    if (inWindow) {
        html += '<div style="color:#f85149;margin-top:4px">⚠️ International Window (' + inWindow.name + ')</div>';
    }
    
    infoDiv.innerHTML = html;
    actionBtn.disabled = false;
}

function showCompDetails(comp) {
    const detailsDiv = document.getElementById('schedule-comp-details');
    const infoDiv = document.getElementById('schedule-comp-info');
    
    let html = '<div style="margin-bottom:8px">';
    html += '<div style="color:#58a6ff;font-weight:600">' + comp.code + '</div>';
    html += '<div style="color:#8b949e">' + comp.name + '</div>';
    html += '</div>';
    
    html += '<div style="display:grid;grid-template-columns:auto 1fr;gap:8px 12px;font-size:0.7rem">';
    html += '<span style="color:#8b949e">Type:</span><span>' + comp.type + '</span>';
    html += '<span style="color:#8b949e">Duration:</span><span>' + (comp.maxDay - comp.minDay) + ' days</span>';
    html += '<span style="color:#8b949e">Start:</span><span>Day ' + comp.minDay + '</span>';
    html += '<span style="color:#8b949e">End:</span><span>Day ' + comp.maxDay + '</span>';
    html += '<span style="color:#8b949e">Stages:</span><span>' + comp.stages.join(', ') + '</span>';
    html += '</div>';
    
    infoDiv.innerHTML = html;
    detailsDiv.style.display = 'block';
}

function scheduleHereAction() {
    if (scheduleData.selectedDay === null) return;
    
    // Jump to international generator and fill start day
    showPage('international');
    document.getElementById('intl-startday').value = scheduleData.selectedDay;
    
    // Scroll to start day field
    document.getElementById('intl-startday').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function findFreeWindow() {
    // Find next 30-day window with minimal conflicts
    let bestWindow = { start: 1, conflicts: 999 };
    
    for (let day = 1; day <= 335; day++) {
        let conflicts = 0;
        for (let d = day; d < day + 30; d++) {
            const matchesOnDay = data.schedule.filter(s => parseInt(s.split(',')[1]) === d).length;
            conflicts += matchesOnDay;
        }
        
        if (conflicts < bestWindow.conflicts) {
            bestWindow = { start: day, conflicts };
        }
    }
    
    scheduleData.selectedDay = bestWindow.start;
    showDayInfo(bestWindow.start);
    renderSchedule();
    
    alert('Best 30-day window: Day ' + bestWindow.start + '-' + (bestWindow.start + 30) + '\nConflicts: ' + bestWindow.conflicts + ' matches');
}

// Update schedule when page shown
const originalShowPage = showPage;
showPage = function(pageId) {
    originalShowPage(pageId);
    if (pageId === 'schedule') {
        parseScheduleData();
        renderSchedule();
    }
};

console.log('FCE Creator V10 - Clean Build');