// ============================================================
// INTERNATIONAL GENERATOR
// ============================================================

// Nation team IDs by confederation (from teamnationlinks)
const CONFED_NATIONS = {
    1: [], // UEFA - loaded from DB
    1600: [], // CONMEBOL
    1531: [], // AFC
    1443: [], // CONCACAF
    1774: [], // CAF
    1775: [] // OFC
};

let allIntlNations = [];

function loadNationsForIntl() {
    const availableList = document.getElementById('intl-nations-available');
    const selectedList = document.getElementById('intl-nations-list');
    const selectedIds = new Set(Array.from(selectedList.options).map(opt => parseInt(opt.value)));
    
    availableList.innerHTML = '';
    
    // Check if database files are loaded
    if (!db.teams || db.teams.length === 0) {
        const opt = document.createElement('option');
        opt.disabled = true;
        opt.textContent = '⚠ Load teams.txt first';
        opt.style.color = '#f85149';
        availableList.appendChild(opt);
        return;
    }
    
    if (!db.teamNations || db.teamNations.length === 0) {
        const opt = document.createElement('option');
        opt.disabled = true;
        opt.textContent = '⚠ Load teamnationlinks.txt first';
        opt.style.color = '#f85149';
        availableList.appendChild(opt);
        return;
    }
    
    // Load national teams from teamnationlinks - ONLY league 78 (Men's National)
    let nations = [];
    // Filter to only league 78 teams
    const nationalTeams = db.teamNations.filter(tn => tn.leagueid === 78);
    
    // Get unique nation teams with confederation info
    const nationTeamIds = new Set();
    nationalTeams.forEach(tn => {
        if (!nationTeamIds.has(tn.teamid)) {
            nationTeamIds.add(tn.teamid);
            const team = db.teams.find(t => t.teamid === tn.teamid);
            if (team) {
                // Find confederation for this nation
                const confed = findConfederationForNation(tn.nationid);
                nations.push({ 
                    teamid: tn.teamid, 
                    teamname: team.teamname, 
                    nationid: tn.nationid,
                    confedId: confed.id,
                    confedName: confed.name
                });
            }
        }
    });
    
    // Sort by confederation then by team name
    nations.sort((a, b) => {
        if (a.confedName !== b.confedName) {
            return a.confedName.localeCompare(b.confedName);
        }
        return a.teamname.localeCompare(b.teamname);
    });
    
    allIntlNations = nations;
    
    if (nations.length === 0) {
        const opt = document.createElement('option');
        opt.disabled = true;
        opt.textContent = '⚠ No national teams found (league 78)';
        opt.style.color = '#f85149';
        availableList.appendChild(opt);
        return;
    }
    
    // Group by confederation with headers
    let currentConfed = '';
    nations.forEach(n => {
        if (!selectedIds.has(n.teamid)) {
            // Add confederation header
            if (n.confedName !== currentConfed) {
                currentConfed = n.confedName;
                const header = document.createElement('option');
                header.disabled = true;
                header.textContent = '── ' + currentConfed + ' ──';
                header.style.fontWeight = 'bold';
                header.style.backgroundColor = '#21262d';
                availableList.appendChild(header);
            }
            
            const opt = document.createElement('option');
            opt.value = n.teamid;
            opt.textContent = n.teamname;
            availableList.appendChild(opt);
        }
    });
    
    filterIntlNations();
}

function findConfederationForNation(nationId) {
    // Hardcoded FIFA nation ID to confederation mapping
    // UEFA (Europe)
    const UEFA = [1,4,5,7,8,10,11,12,13,14,17,18,20,21,22,23,24,25,27,28,29,30,31,32,33,34,35,36,37,38,39,42,43,44,45,46,47,48,49,50,51,219];
    // CONMEBOL (South America)
    const CONMEBOL = [52,53,54,55,56,57,58,59,60,61];
    // CONCACAF (North/Central America & Caribbean)
    const CONCACAF = [82,83,84,85,86,87,88,89,90,91,92,93,94,95,96];
    // CAF (Africa)
    const CAF = [97,101,103,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,214,218];
    // AFC (Asia)
    const AFC = [150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194];
    // OFC (Oceania)
    const OFC = [195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,215,216,217];
    
    if (UEFA.includes(nationId)) return { id: 1, name: 'UEFA' };
    if (CONMEBOL.includes(nationId)) return { id: 1600, name: 'CONMEBOL' };
    if (CONCACAF.includes(nationId)) return { id: 1443, name: 'CONCACAF' };
    if (CAF.includes(nationId)) return { id: 1774, name: 'CAF' };
    if (AFC.includes(nationId)) return { id: 1531, name: 'AFC' };
    if (OFC.includes(nationId)) return { id: 1775, name: 'OFC' };
    
    return { id: 0, name: 'Other' };
}

function filterIntlNations() {
    const search = document.getElementById('intl-nation-search').value.toLowerCase();
    const confedFilter = document.getElementById('intl-confed-filter')?.value || '';
    const availableList = document.getElementById('intl-nations-available');
    const selectedList = document.getElementById('intl-nations-list');
    const selectedIds = new Set(Array.from(selectedList.options).map(opt => parseInt(opt.value)));
    
    availableList.innerHTML = '';
    
    // Filter nations
    const filtered = allIntlNations.filter(n => {
        if (selectedIds.has(n.teamid)) return false;
        if (search && !n.teamname.toLowerCase().includes(search)) return false;
        if (confedFilter && n.confedName !== confedFilter) return false;
        return true;
    });
    
    // Group filtered results by confederation
    let currentConfed = '';
    
    filtered.forEach(n => {
        // Add confederation header if new confederation
        if (n.confedName !== currentConfed) {
            currentConfed = n.confedName;
            const header = document.createElement('option');
            header.disabled = true;
            header.textContent = '── ' + currentConfed + ' ──';
            header.style.fontWeight = 'bold';
            header.style.backgroundColor = '#21262d';
            availableList.appendChild(header);
        }
        
        const opt = document.createElement('option');
        opt.value = n.teamid;
        opt.textContent = n.teamname;
        availableList.appendChild(opt);
    });
}

function addSelectedIntlNations() {
    const availableList = document.getElementById('intl-nations-available');
    const selectedList = document.getElementById('intl-nations-list');
    
    Array.from(availableList.selectedOptions).forEach(opt => {
        const newOpt = document.createElement('option');
        newOpt.value = opt.value;
        newOpt.textContent = opt.textContent;
        selectedList.appendChild(newOpt);
        opt.remove();
    });
    
    sortSelectOptions(selectedList);
    updateIntlNationCount();
    recalcIntlStructure();
}

function removeSelectedIntlNations() {
    const availableList = document.getElementById('intl-nations-available');
    const selectedList = document.getElementById('intl-nations-list');
    
    Array.from(selectedList.selectedOptions).forEach(opt => {
        const newOpt = document.createElement('option');
        newOpt.value = opt.value;
        newOpt.textContent = opt.textContent;
        availableList.appendChild(newOpt);
        opt.remove();
    });
    
    sortSelectOptions(availableList);
    updateIntlNationCount();
    recalcIntlStructure();
}

function addAllIntlNations() {
    const availableList = document.getElementById('intl-nations-available');
    const selectedList = document.getElementById('intl-nations-list');
    
    Array.from(availableList.options).forEach(opt => {
        const newOpt = document.createElement('option');
        newOpt.value = opt.value;
        newOpt.textContent = opt.textContent;
        selectedList.appendChild(newOpt);
    });
    availableList.innerHTML = '';
    
    sortSelectOptions(selectedList);
    updateIntlNationCount();
    recalcIntlStructure();
}

function clearIntlNations() {
    document.getElementById('intl-nations-list').innerHTML = '';
    loadNationsForIntl();
    updateIntlNationCount();
    recalcIntlStructure();
}

function updateIntlNationCount() {
    const count = document.getElementById('intl-nations-list').options.length;
    document.getElementById('intl-nation-count').textContent = '(' + count + ')';
}

function loadIntlPreset() {
    const preset = document.getElementById('intl-nation-preset').value;
    if (!preset) return;
    
    // Clear and set number of groups based on preset
    clearIntlNations();
    
    const presetConfig = {
        'uefa16': { groups: 4, teamsPerGroup: 4, confed: 'UEFA', count: 16 },
        'uefa24': { groups: 6, teamsPerGroup: 4, confed: 'UEFA', count: 24 },
        'conmebol10': { groups: 2, teamsPerGroup: 5, confed: 'CONMEBOL', count: 10 },
        'afc24': { groups: 6, teamsPerGroup: 4, confed: 'AFC', count: 24 },
        'caf24': { groups: 6, teamsPerGroup: 4, confed: 'CAF', count: 24 },
        'concacaf16': { groups: 4, teamsPerGroup: 4, confed: 'CONCACAF', count: 16 }
    };
    
    if (presetConfig[preset]) {
        const cfg = presetConfig[preset];
        document.getElementById('intl-num-groups').value = cfg.groups;
        document.getElementById('intl-teams-per-group').value = cfg.teamsPerGroup;
        recalcIntlStructure();
        
        // Auto-select nations from the confederation
        const selectedList = document.getElementById('intl-nations-list');
        const nationsFromConfed = allIntlNations.filter(n => n.confedName === cfg.confed);
        
        let added = 0;
        for (let n of nationsFromConfed) {
            if (added >= cfg.count) break;
            const opt = document.createElement('option');
            opt.value = n.teamid;
            opt.textContent = n.teamname;
            selectedList.appendChild(opt);
            added++;
        }
        
        sortSelectOptions(selectedList);
        updateIntlNationCount();
        filterIntlNations(); // Refresh available list
        
        toast('Added ' + added + ' ' + cfg.confed + ' nations');
    }
}

function onIntlTypeChange() {
    const intlType = document.getElementById('intl-type').value;
    const koOptions = document.getElementById('intl-ko-options');
    const modeSelection = document.getElementById('intl-mode-selection');
    const regularGroupOptions = document.getElementById('intl-regular-group-options');
    const worldcupOptions = document.getElementById('intl-worldcup-options');
    const koTeamsField = document.getElementById('intl-ko-teams-field');
    const koRoundsField = document.getElementById('intl-ko-rounds-field');
    
    // Show KO options for INTERCUP and INTERQUAL_KO
    koOptions.style.display = (intlType === 'INTERQUAL') ? 'none' : 'block';
    
    // Show mode selection only for INTERQUAL_KO
    modeSelection.style.display = (intlType === 'INTERQUAL_KO') ? 'block' : 'none';
    
    // Reset to simple mode when switching types
    const simpleRadio = document.querySelector('input[name="intl-qual-mode"][value="simple"]');
    if (simpleRadio) simpleRadio.checked = true;
    
    // Always show regular groups by default, hide world cup options
    regularGroupOptions.style.display = 'block';
    worldcupOptions.style.display = 'none';
    
    // Show KO teams/rounds info (not redundant in simple/intercup mode)
    if (koTeamsField) koTeamsField.style.display = 'block';
    if (koRoundsField) koRoundsField.style.display = 'block';
    
    // Adjust group format based on type
    const groupFormat = document.getElementById('intl-group-format');
    if (intlType === 'INTERCUP') {
        groupFormat.value = '1'; // Single round-robin for hosted tournaments
        document.getElementById('intl-schedule-mode').value = 'hosted';
    } else {
        groupFormat.value = '2'; // Home & Away for qualifiers
        document.getElementById('intl-schedule-mode').value = 'windows';
    }
    
    onIntlScheduleModeChange();
    recalcIntlStructure();
}

function onQualModeChange() {
    const mode = document.querySelector('input[name="intl-qual-mode"]:checked')?.value || 'simple';
    const regularGroupOptions = document.getElementById('intl-regular-group-options');
    const worldcupOptions = document.getElementById('intl-worldcup-options');
    const koTeamsField = document.getElementById('intl-ko-teams-field');
    const koRoundsField = document.getElementById('intl-ko-rounds-field');
    
    if (mode === 'worldcup') {
        regularGroupOptions.style.display = 'none';
        worldcupOptions.style.display = 'block';
        // Hide redundant KO info (already shown in Final Tournament section)
        if (koTeamsField) koTeamsField.style.display = 'none';
        if (koRoundsField) koRoundsField.style.display = 'none';
        
        // Auto-populate confederations if empty
        const slotsDiv = document.getElementById('intl-confed-slots');
        if (slotsDiv && slotsDiv.children.length === 0) {
            autoPopulateConfedSlots();
        }
    } else {
        regularGroupOptions.style.display = 'block';
        worldcupOptions.style.display = 'none';
        // Show KO info for simple mode
        if (koTeamsField) koTeamsField.style.display = 'block';
        if (koRoundsField) koRoundsField.style.display = 'block';
    }
    
    recalcIntlStructure();
}

// Keep for backwards compatibility but redirect to new function
function onConfedQualifiersToggle() {
    onQualModeChange();
}

function autoPopulateConfedSlots() {
    const slotsDiv = document.getElementById('intl-confed-slots');
    slotsDiv.innerHTML = '';
    
    // Update global confed counts from database
    updateConfedCounts();
    
    // Default team counts if database not loaded
    const defaultTeams = {
        1: 55,      // UEFA
        1600: 10,   // CONMEBOL
        1531: 46,   // AFC
        1443: 35,   // CONCACAF
        1774: 54,   // CAF
        1775: 11    // OFC
    };
    
    // Default qualifying slots based on FIFA allocations
    const defaultQualSlots = {
        1: 16,      // UEFA
        1600: 6,    // CONMEBOL
        1531: 8,    // AFC
        1443: 6,    // CONCACAF
        1774: 9,    // CAF
        1775: 1     // OFC
    };
    
    // Create slot for each confederation
    Object.entries(confedCounts).forEach(([confedId, data]) => {
        // Use database teams if available, otherwise default
        const teams = data.teams > 0 ? data.teams : (defaultTeams[confedId] || 10);
        
        if (teams > 0) {
            // Auto-calculate groups: aim for 4-5 teams per group
            const teamsPerGroup = teams <= 12 ? Math.min(teams, 4) : 
                                  teams <= 20 ? 4 : 
                                  teams <= 32 ? 4 : 5;
            const numGroups = Math.ceil(teams / teamsPerGroup);
            
            // Use default qualifying slots
            const qualifyingSlots = defaultQualSlots[confedId] || Math.ceil(teams / 8);
            
            addConfedSlotWithData(parseInt(confedId), data.name, numGroups, teamsPerGroup, qualifyingSlots, teams);
            
            // Auto-add redirects for very small confederations (< 6 teams)
            const minTeamsForOwnQualifier = 6;
            if (teams < minTeamsForOwnQualifier && teams > 0) {
                const row = slotsDiv.lastElementChild;
                const addBtn = row.querySelector('.confed-redirects button');
                
                // OFC -> split between AFC and CAF
                if (confedId === '1775') {
                    if (teams >= 2) {
                        addBtn.click();
                        const redirectRows = row.querySelectorAll('.redirect-row');
                        const lastRow = redirectRows[redirectRows.length - 1];
                        lastRow.querySelector('.redirect-count').value = Math.ceil(teams / 2);
                        lastRow.querySelector('.redirect-target').value = '1531'; // AFC
                        
                        if (teams > 1) {
                            addBtn.click();
                            const redirectRows2 = row.querySelectorAll('.redirect-row');
                            const lastRow2 = redirectRows2[redirectRows2.length - 1];
                            lastRow2.querySelector('.redirect-count').value = Math.floor(teams / 2);
                            lastRow2.querySelector('.redirect-target').value = '1774'; // CAF
                        }
                    }
                } else {
                    addBtn.click();
                    const redirectRows = row.querySelectorAll('.redirect-row');
                    const lastRow = redirectRows[redirectRows.length - 1];
                    lastRow.querySelector('.redirect-count').value = teams;
                    if (confedId === '1443') lastRow.querySelector('.redirect-target').value = '1600';
                    else lastRow.querySelector('.redirect-target').value = '1';
                }
            }
        }
    });
    
    recalcConfedAfterRedirect();
}

function addConfedSlotWithData(confedId, confedName, numGroups, teamsPerGroup, qualifyingSlots, totalTeams) {
    const slotsDiv = document.getElementById('intl-confed-slots');
    
    const confeds = [
        { id: 1, name: 'UEFA', defaultAsset: 901 },
        { id: 1600, name: 'CONMEBOL', defaultAsset: 902 },
        { id: 1531, name: 'AFC', defaultAsset: 903 },
        { id: 1443, name: 'CONCACAF', defaultAsset: 904 },
        { id: 1774, name: 'CAF', defaultAsset: 905 },
        { id: 1775, name: 'OFC', defaultAsset: 906 }
    ];
    
    // Get default asset ID for this confed
    const confedData = confeds.find(c => c.id === confedId) || { defaultAsset: 900 };
    
    // Calculate advance per group and best 3rd from total qualifying slots
    const advancePerGroup = Math.min(2, Math.floor(qualifyingSlots / numGroups));
    const remaining = qualifyingSlots - (advancePerGroup * numGroups);
    const best3rd = remaining > 0 ? remaining : 0;
    
    const row = document.createElement('div');
    row.className = 'confed-slot-row';
    row.dataset.confedId = confedId;
    row.dataset.baseTeams = totalTeams;
    row.style.cssText = 'background:#161b22;padding:8px;border-radius:4px;margin-bottom:8px';
    
    // Build redirect options (all confeds except self)
    const redirectOptions = confeds.filter(c => c.id !== confedId).map(c => 
        '<option value="' + c.id + '">' + c.name + '</option>'
    ).join('');
    
    row.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 60px 45px 45px 45px 45px 45px 24px;gap:4px;align-items:center;margin-bottom:6px">
            <div style="display:flex;align-items:center;gap:4px">
                <select class="confed-id" style="padding:3px;font-size:0.65rem;flex:1" onchange="onConfedIdChange(this)">
                    ${confeds.map(c => '<option value="' + c.id + '"' + (c.id === confedId ? ' selected' : '') + '>' + c.name + '</option>').join('')}
                </select>
                <span class="confed-team-count" style="color:#58a6ff;font-size:0.6rem;white-space:nowrap">(${totalTeams})</span>
            </div>
            <input type="number" class="confed-assetid" value="${confedData.defaultAsset}" min="1" style="padding:2px;font-size:0.65rem" title="Asset ID for this qualifier">
            <input type="number" class="confed-groups" value="${numGroups}" min="0" max="20" style="padding:2px;font-size:0.65rem" onchange="recalcConfedAfterRedirect()">
            <input type="number" class="confed-teams" value="${teamsPerGroup}" min="2" max="6" style="padding:2px;font-size:0.65rem" onchange="recalcConfedAfterRedirect()">
            <input type="number" class="confed-advance" value="${advancePerGroup}" min="1" max="4" style="padding:2px;font-size:0.65rem" onchange="updateConfedQualifyTotal(this)" title="Teams advancing per group">
            <input type="number" class="confed-best3rd" value="${best3rd}" min="0" max="12" style="padding:2px;font-size:0.65rem" onchange="updateConfedQualifyTotal(this)" title="Best 3rd place teams">
            <span class="confed-qualify-total" style="font-size:0.65rem;color:#7ee787;text-align:center">${qualifyingSlots}</span>
            <button type="button" onclick="removeConfedSlot(this)" style="padding:1px 4px;font-size:0.6rem;color:#f85149">×</button>
        </div>
        <div class="confed-redirects" style="margin-left:10px;font-size:0.65rem">
            <div style="color:#8b949e;margin-bottom:4px">Redirect teams:</div>
            <div class="redirect-list"></div>
            <button type="button" onclick="addRedirectRow(this)" style="padding:2px 6px;font-size:0.6rem;margin-top:4px">+ Add redirect</button>
        </div>
        <div class="confed-effective" style="margin-top:6px;font-size:0.65rem;color:#7ee787"></div>
    `;
    slotsDiv.appendChild(row);
}

function updateConfedQualifyTotal(input) {
    const row = input.closest('.confed-slot-row');
    if (!row) return;
    
    const groupsEl = row.querySelector('.confed-groups');
    const advanceEl = row.querySelector('.confed-advance');
    const best3rdEl = row.querySelector('.confed-best3rd');
    const totalEl = row.querySelector('.confed-qualify-total');
    
    const numGroups = groupsEl ? parseInt(groupsEl.value) || 0 : 0;
    const advancePerGroup = advanceEl ? parseInt(advanceEl.value) || 0 : 0;
    const best3rd = best3rdEl ? parseInt(best3rdEl.value) || 0 : 0;
    const total = (numGroups * advancePerGroup) + best3rd;
    
    if (totalEl) totalEl.textContent = total;
    updateConfedTotals();
}

function addRedirectRow(btn) {
    const row = btn.closest('.confed-slot-row');
    const confedId = parseInt(row.dataset.confedId);
    const baseTeams = parseInt(row.dataset.baseTeams) || 0;
    const redirectList = row.querySelector('.redirect-list');
    
    const confeds = [
        { id: 1, name: 'UEFA' },
        { id: 1600, name: 'CONMEBOL' },
        { id: 1531, name: 'AFC' },
        { id: 1443, name: 'CONCACAF' },
        { id: 1774, name: 'CAF' },
        { id: 1775, name: 'OFC' }
    ];
    
    const redirectOptions = confeds.filter(c => c.id !== confedId).map(c => 
        '<option value="' + c.id + '">' + c.name + '</option>'
    ).join('');
    
    const redirectRow = document.createElement('div');
    redirectRow.className = 'redirect-row';
    redirectRow.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:4px';
    redirectRow.innerHTML = `
        <span>Send</span>
        <input type="number" class="redirect-count" value="1" min="1" max="${baseTeams}" style="width:40px;padding:2px 4px;font-size:0.7rem" onchange="recalcConfedAfterRedirect()">
        <span>team(s) to</span>
        <select class="redirect-target" style="padding:2px 4px;font-size:0.7rem" onchange="recalcConfedAfterRedirect()">
            ${redirectOptions}
        </select>
        <button type="button" onclick="removeRedirectRow(this)" style="padding:1px 4px;font-size:0.6rem;color:#f85149">×</button>
    `;
    redirectList.appendChild(redirectRow);
    recalcConfedAfterRedirect();
}

function removeRedirectRow(btn) {
    btn.closest('.redirect-row').remove();
    recalcConfedAfterRedirect();
}

function recalcConfedAfterRedirect() {
    const rows = document.querySelectorAll('.confed-slot-row');
    
    // First pass: calculate outgoing redirects per confed
    const outgoing = {}; // confedId -> total teams redirected out
    const incoming = {}; // confedId -> { fromConfedId: count }
    
    rows.forEach(row => {
        const confedId = row.dataset.confedId;
        outgoing[confedId] = 0;
        incoming[confedId] = incoming[confedId] || {};
        
        row.querySelectorAll('.redirect-row').forEach(rr => {
            const countEl = rr.querySelector('.redirect-count');
            const targetEl = rr.querySelector('.redirect-target');
            if (!countEl || !targetEl) return;
            
            const count = parseInt(countEl.value) || 0;
            const target = targetEl.value;
            outgoing[confedId] += count;
            incoming[target] = incoming[target] || {};
            incoming[target][confedId] = (incoming[target][confedId] || 0) + count;
        });
    });
    
    // Second pass: update effective teams and UI
    rows.forEach(row => {
        const confedId = row.dataset.confedId;
        const baseTeams = parseInt(row.dataset.baseTeams) || 0;
        const teamsOut = outgoing[confedId] || 0;
        const teamsIn = Object.values(incoming[confedId] || {}).reduce((a, b) => a + b, 0);
        const effectiveTeams = baseTeams - teamsOut + teamsIn;
        
        // Get elements with null safety
        const countSpan = row.querySelector('.confed-team-count');
        const effectiveDiv = row.querySelector('.confed-effective');
        const groupsEl = row.querySelector('.confed-groups');
        const teamsEl = row.querySelector('.confed-teams');
        const advanceEl = row.querySelector('.confed-advance');
        const best3rdEl = row.querySelector('.confed-best3rd');
        const qualifyTotalEl = row.querySelector('.confed-qualify-total');
        
        // Update team count display
        if (countSpan) {
            if (teamsOut > 0 || teamsIn > 0) {
                countSpan.textContent = '(' + effectiveTeams + ')';
                countSpan.title = baseTeams + ' base' + (teamsOut > 0 ? ' -' + teamsOut + ' out' : '') + (teamsIn > 0 ? ' +' + teamsIn + ' in' : '');
                countSpan.style.color = effectiveTeams !== baseTeams ? '#f0883e' : '#58a6ff';
            } else {
                countSpan.textContent = '(' + baseTeams + ')';
                countSpan.title = baseTeams + ' teams';
                countSpan.style.color = '#58a6ff';
            }
        }
        
        // Update effective display
        if (effectiveDiv) {
            if (effectiveTeams > 0) {
                const suggestedTeamsPerGroup = effectiveTeams <= 12 ? Math.min(effectiveTeams, 4) : 
                                              effectiveTeams <= 20 ? 4 : 
                                              effectiveTeams <= 32 ? 4 : 5;
                const suggestedGroups = Math.ceil(effectiveTeams / suggestedTeamsPerGroup);
                effectiveDiv.innerHTML = 'Effective: <strong>' + effectiveTeams + '</strong> teams → suggest ' + suggestedGroups + ' groups of ' + suggestedTeamsPerGroup;
                effectiveDiv.style.display = 'block';
                
                // Enable inputs
                if (groupsEl) groupsEl.disabled = false;
                if (teamsEl) teamsEl.disabled = false;
                if (advanceEl) advanceEl.disabled = false;
                if (best3rdEl) best3rdEl.disabled = false;
                row.style.opacity = '1';
            } else {
                effectiveDiv.innerHTML = '<span style="color:#f85149">All teams redirected - no qualifier needed</span>';
                effectiveDiv.style.display = 'block';
                
                // Disable inputs and set to 0
                if (groupsEl) { groupsEl.disabled = true; groupsEl.value = 0; }
                if (teamsEl) teamsEl.disabled = true;
                if (advanceEl) { advanceEl.disabled = true; advanceEl.value = 0; }
                if (best3rdEl) { best3rdEl.disabled = true; best3rdEl.value = 0; }
                if (qualifyTotalEl) qualifyTotalEl.textContent = '0';
                row.style.opacity = '0.6';
            }
        }
        
        // Store effective teams
        row.dataset.effectiveTeams = effectiveTeams;
        
        // Store incoming details for generation
        row.dataset.incomingFrom = JSON.stringify(incoming[confedId] || {});
        
        // Update qualify total
        if (effectiveTeams > 0 && groupsEl && advanceEl && best3rdEl && qualifyTotalEl) {
            const numGroups = parseInt(groupsEl.value) || 0;
            const advancePerGroup = parseInt(advanceEl.value) || 0;
            const best3rd = parseInt(best3rdEl.value) || 0;
            qualifyTotalEl.textContent = (numGroups * advancePerGroup) + best3rd;
        }
    });
    
    updateConfedTotals();
}

function onConfedIdChange(select) {
    const row = select.closest('.confed-slot-row');
    const confedId = parseInt(select.value);
    const oldConfedId = row.dataset.confedId;
    row.dataset.confedId = confedId;
    row.dataset.baseTeams = confedCounts[confedId]?.teams || 0;
    
    // Update redirect target options in all redirect rows (exclude self)
    const confeds = [
        { id: 1, name: 'UEFA' },
        { id: 1600, name: 'CONMEBOL' },
        { id: 1531, name: 'AFC' },
        { id: 1443, name: 'CONCACAF' },
        { id: 1774, name: 'CAF' },
        { id: 1775, name: 'OFC' }
    ];
    
    row.querySelectorAll('.redirect-target').forEach(sel => {
        const currentVal = sel.value;
        sel.innerHTML = confeds.filter(c => c.id !== confedId).map(c => 
            '<option value="' + c.id + '"' + (String(c.id) === currentVal ? ' selected' : '') + '>' + c.name + '</option>'
        ).join('');
    });
    
    recalcConfedAfterRedirect();
}

function addConfedSlot() {
    // Manual add - use defaults
    updateConfedCounts();
    // Find first confed not already added
    const existingIds = new Set();
    document.querySelectorAll('.confed-slot-row').forEach(row => {
        existingIds.add(row.dataset.confedId);
    });
    
    const confedOrder = ['1', '1600', '1531', '1443', '1774', '1775'];
    let confedId = 1;
    for (const id of confedOrder) {
        if (!existingIds.has(id) && (confedCounts[id]?.teams || 0) > 0) {
            confedId = parseInt(id);
            break;
        }
    }
    
    const teams = confedCounts[confedId]?.teams || 10;
    const teamsPerGroup = teams <= 12 ? Math.min(teams, 4) : 4;
    const numGroups = Math.ceil(teams / teamsPerGroup);
    addConfedSlotWithData(confedId, '', numGroups, teamsPerGroup, 4, teams);
    recalcConfedAfterRedirect();
}

// Store confed counts globally for dropdown updates
let confedCounts = {};

function updateConfedCounts() {
    confedCounts = {
        1: { name: 'UEFA (Europe)', teams: 0 },
        1600: { name: 'CONMEBOL (S. America)', teams: 0 },
        1531: { name: 'AFC (Asia)', teams: 0 },
        1443: { name: 'CONCACAF (N. America)', teams: 0 },
        1774: { name: 'CAF (Africa)', teams: 0 },
        1775: { name: 'OFC (Oceania)', teams: 0 }
    };
    
    if (db.teamNations && db.teamNations.length > 0) {
        const nationalTeams = db.teamNations.filter(tn => tn.leagueid === 78);
        const countedTeams = new Set();
        
        nationalTeams.forEach(tn => {
            if (!countedTeams.has(tn.teamid)) {
                countedTeams.add(tn.teamid);
                const confed = findConfederationForNation(tn.nationid);
                if (confedCounts[confed.id]) {
                    confedCounts[confed.id].teams++;
                }
            }
        });
    }
}

function removeConfedSlot(btn) {
    btn.closest('.confed-slot-row').remove();
    recalcConfedAfterRedirect();
    updateConfedTotals();
}

function updateConfedTotals() {
    const rows = document.querySelectorAll('.confed-slot-row');
    let totalQual = 0;
    
    rows.forEach(row => {
        const effectiveTeams = parseInt(row.dataset.effectiveTeams) || 0;
        if (effectiveTeams > 0) {
            const qualTotalEl = row.querySelector('.confed-qualify-total');
            const qualTotal = qualTotalEl ? parseInt(qualTotalEl.textContent) || 0 : 0;
            totalQual += qualTotal;
        }
    });
    
    const totalSlotEl = document.getElementById('intl-total-qual-slots');
    if (totalSlotEl) totalSlotEl.textContent = totalQual;
    
    // Update final teams needed
    const finalGroupsEl = document.getElementById('intl-final-num-groups');
    const finalTeamsPerGroupEl = document.getElementById('intl-final-teams-per-group');
    const finalAdvanceEl = document.getElementById('intl-final-advance');
    const finalBest3rdEl = document.getElementById('intl-final-best3rd');
    const finalBest3rdNumEl = document.getElementById('intl-final-best3rd-num');
    
    const finalGroups = finalGroupsEl ? parseInt(finalGroupsEl.value) || 8 : 8;
    const finalTeamsPerGroup = finalTeamsPerGroupEl ? parseInt(finalTeamsPerGroupEl.value) || 4 : 4;
    const finalAdvance = finalAdvanceEl ? parseInt(finalAdvanceEl.value) || 2 : 2;
    const finalBest3rd = (finalBest3rdEl?.checked && finalBest3rdNumEl) ? 
        (parseInt(finalBest3rdNumEl.value) || 0) : 0;
    
    const finalTeams = finalGroups * finalTeamsPerGroup;
    const finalAdvancing = (finalGroups * finalAdvance) + finalBest3rd;
    
    // Calculate KO bracket
    let koBracket = 2;
    while (koBracket < finalAdvancing) koBracket *= 2;
    const koName = koBracket === 2 ? 'Final' : koBracket === 4 ? 'SF' : koBracket === 8 ? 'QF' : 'R' + koBracket;
    
    const neededEl = document.getElementById('intl-final-teams-needed');
    const advancingEl = document.getElementById('intl-final-advancing');
    const bracketEl = document.getElementById('intl-final-ko-bracket');
    
    if (neededEl) neededEl.textContent = finalTeams;
    if (advancingEl) advancingEl.textContent = finalAdvancing;
    if (bracketEl) bracketEl.textContent = koName;
    
    recalcIntlStructure();
}

function onFinalBest3rdChange() {
    const enabled = document.getElementById('intl-final-best3rd').checked;
    document.getElementById('intl-final-best3rd-count').style.display = enabled ? 'block' : 'none';
    updateConfedTotals();
}

function getConfedConfigs() {
    const rows = document.querySelectorAll('.confed-slot-row');
    const configs = [];
    const confedNames = { 1: 'UEFA', 1600: 'CONMEBOL', 1531: 'AFC', 1443: 'CONCACAF', 1774: 'CAF', 1775: 'OFC' };
    
    rows.forEach(row => {
        const confedId = parseInt(row.dataset.confedId) || 0;
        const baseTeams = parseInt(row.dataset.baseTeams) || 0;
        const effectiveTeams = parseInt(row.dataset.effectiveTeams) || baseTeams || 10;
        
        // Get elements with null safety
        const groupsEl = row.querySelector('.confed-groups');
        const teamsEl = row.querySelector('.confed-teams');
        const advanceEl = row.querySelector('.confed-advance');
        const best3rdEl = row.querySelector('.confed-best3rd');
        const assetEl = row.querySelector('.confed-assetid');
        
        // Skip if essential elements missing
        if (!groupsEl) {
            console.warn('Missing .confed-groups in row', row);
            return;
        }
        
        const numGroups = parseInt(groupsEl.value) || 0;
        if (numGroups <= 0) return; // Skip fully redirected confeds
        
        // Parse incoming redirects
        let incomingFrom = {};
        try {
            incomingFrom = JSON.parse(row.dataset.incomingFrom || '{}');
        } catch (e) {}
        
        const teamsPerGroup = teamsEl ? parseInt(teamsEl.value) || 4 : 4;
        const advancePerGroup = advanceEl ? parseInt(advanceEl.value) || 2 : 2;
        const best3rd = best3rdEl ? parseInt(best3rdEl.value) || 0 : 0;
        const assetId = assetEl ? parseInt(assetEl.value) || 900 : 900;
        const qualifyingSlots = (numGroups * advancePerGroup) + best3rd;
        
        configs.push({
            confedId: confedId,
            confedName: confedNames[confedId] || 'Confed_' + confedId,
            assetId: assetId,
            numGroups: numGroups,
            teamsPerGroup: teamsPerGroup,
            advancePerGroup: advancePerGroup,
            best3rd: best3rd,
            qualifyingSlots: qualifyingSlots,
            baseTeams: baseTeams,
            effectiveTeams: effectiveTeams,
            totalTeams: effectiveTeams,
            includesFrom: Object.keys(incomingFrom).map(id => parseInt(id)),
            incomingCounts: incomingFrom
        });
    });
    
    return configs;
}

function onIntlScheduleModeChange() {
    const mode = document.getElementById('intl-schedule-mode').value;
    document.getElementById('intl-hosted-opts').style.display = (mode === 'hosted') ? 'grid' : 'none';
    document.getElementById('intl-reference-opts').style.display = (mode === 'reference') ? 'grid' : 'none';
    document.getElementById('intl-windows-opts').style.display = (mode === 'windows') ? 'block' : 'none';
}

function onAdvanceChange() {
    const advancePerGroup = parseInt(document.getElementById('intl-advance-per-group').value);
    const bestThirdCheckbox = document.getElementById('intl-best-third');
    const bestThirdLabel = bestThirdCheckbox.parentElement;
    
    // Update label based on advance setting
    if (advancePerGroup === 2) {
        bestThirdLabel.innerHTML = '<input type="checkbox" id="intl-best-third" onchange="onBestThirdChange()"> Also advance best 3rd place teams';
    } else if (advancePerGroup === 3) {
        bestThirdLabel.innerHTML = '<input type="checkbox" id="intl-best-third" onchange="onBestThirdChange()"> Also advance best 4th place teams';
    } else {
        bestThirdLabel.innerHTML = '<input type="checkbox" id="intl-best-third" onchange="onBestThirdChange()" disabled> Best place advancement (N/A)';
        document.getElementById('intl-best-third-count').style.display = 'none';
    }
    
    recalcIntlStructure();
}

function onBestThirdChange() {
    const enabled = document.getElementById('intl-best-third').checked;
    document.getElementById('intl-best-third-count').style.display = enabled ? 'block' : 'none';
    recalcIntlStructure();
}

function recalcIntlStructure() {
    const numGroups = parseInt(document.getElementById('intl-num-groups').value) || 4;
    const teamsPerGroup = parseInt(document.getElementById('intl-teams-per-group').value) || 4;
    const advancePerGroup = parseInt(document.getElementById('intl-advance-per-group').value) || 2;
    const intlType = document.getElementById('intl-type').value;
    
    // Check for best 3rd/4th place
    const bestThirdEnabled = document.getElementById('intl-best-third')?.checked || false;
    const bestThirdNum = bestThirdEnabled ? (parseInt(document.getElementById('intl-best-third-num')?.value) || 4) : 0;
    
    const totalTeams = numGroups * teamsPerGroup;
    const advancingFromGroups = numGroups * advancePerGroup;
    const advancingTeams = advancingFromGroups + bestThirdNum;
    
    // Calculate KO bracket
    let koBracket = 2;
    while (koBracket < advancingTeams) koBracket *= 2;
    
    // KO rounds
    const koRounds = [];
    let teamsLeft = koBracket;
    while (teamsLeft >= 2) {
        koRounds.push(getRoundName(teamsLeft));
        teamsLeft /= 2;
    }
    
    // Update info
    let structureText = totalTeams + ' teams in ' + numGroups + ' groups of ' + teamsPerGroup + 
        ' → Top ' + advancePerGroup;
    if (bestThirdNum > 0) {
        const posName = advancePerGroup === 2 ? '3rd' : '4th';
        structureText += ' + best ' + bestThirdNum + ' ' + posName;
    }
    structureText += ' = ' + advancingTeams + ' advance';
    document.getElementById('intl-structure-info').textContent = structureText;
    
    if (intlType !== 'INTERQUAL') {
        document.getElementById('intl-ko-teams').value = advancingTeams + ' teams → ' + koBracket + ' bracket';
        document.getElementById('intl-ko-rounds').value = koRounds.join(' → ');
    }
}

function getIntlConfig() {
    const parentId = parseInt(document.getElementById('intl-parent').value);
    const rawCode = document.getElementById('intl-code').value.trim().toUpperCase();
    const code = rawCode.startsWith('C') ? rawCode : 'C' + rawCode;
    const assetId = parseInt(document.getElementById('intl-assetid').value) || 0;
    const intlType = document.getElementById('intl-type').value;
    const yearOffset = parseInt(document.getElementById('intl-year-offset').value) || 4;
    const numGroups = parseInt(document.getElementById('intl-num-groups').value) || 4;
    const teamsPerGroup = parseInt(document.getElementById('intl-teams-per-group').value) || 4;
    const groupFormat = parseInt(document.getElementById('intl-group-format').value) || 1;
    const advancePerGroup = parseInt(document.getElementById('intl-advance-per-group').value) || 2;
    const koFormat = document.getElementById('intl-ko-format')?.value || 'KO1LEG';
    const thirdPlaceMatch = document.getElementById('intl-third-place-match')?.checked || false;
    const startMonth = document.getElementById('intl-startmonth').value;
    const startYear = parseInt(document.getElementById('intl-startyear').value) || 2028;
    const scheduleMode = document.getElementById('intl-schedule-mode')?.value || 'hosted';
    const startDay = parseInt(document.getElementById('intl-startday').value) || 165;
    const gap = parseInt(document.getElementById('intl-gap').value) || 4;
    const kickoff = parseInt(document.getElementById('intl-kickoff')?.value) || 2000;
    const useDatesComp = parseInt(document.getElementById('intl-usedatescomp')?.value) || 0;
    
    // Best 3rd/4th place settings
    const bestThirdEnabled = document.getElementById('intl-best-third')?.checked || false;
    const bestThirdNum = bestThirdEnabled ? (parseInt(document.getElementById('intl-best-third-num')?.value) || 4) : 0;
    // Which position is "best" - if advancing top 2, then best 3rd; if top 3, then best 4th
    const bestThirdPosition = advancePerGroup + 1;
    
    // Fill teams option - if unchecked, leave pots empty for FillFromCompTable
    const fillTeams = document.getElementById('intl-fill-teams')?.checked !== false;
    
    // Get selected nations
    const nationsList = document.getElementById('intl-nations-list');
    const selectedNations = Array.from(nationsList.options).map(opt => parseInt(opt.value));
    
    if (!code || code === 'C') return { valid: false, error: 'Enter code' };
    if (!assetId) return { valid: false, error: 'Enter asset ID' };
    
    // For INTERQUAL_KO with World Cup mode
    const qualMode = document.querySelector('input[name="intl-qual-mode"]:checked')?.value || 'simple';
    const useConfedQualifiers = intlType === 'INTERQUAL_KO' && qualMode === 'worldcup';
    
    let confedConfigs = [];
    let finalNumGroups = 8;
    let finalTeamsPerGroup = 4;
    let finalGroupFormat = 1;
    let finalAdvance = 2;
    let finalBest3rd = 0;
    let finalAssetId = 980;
    
    if (useConfedQualifiers) {
        confedConfigs = getConfedConfigs();
        finalNumGroups = parseInt(document.getElementById('intl-final-num-groups').value) || 8;
        finalTeamsPerGroup = parseInt(document.getElementById('intl-final-teams-per-group').value) || 4;
        finalGroupFormat = parseInt(document.getElementById('intl-final-group-format').value) || 1;
        finalAdvance = parseInt(document.getElementById('intl-final-advance').value) || 2;
        finalBest3rd = document.getElementById('intl-final-best3rd')?.checked ? 
            (parseInt(document.getElementById('intl-final-best3rd-num')?.value) || 0) : 0;
        finalAssetId = parseInt(document.getElementById('intl-final-assetid').value) || 980;
        
        // Validate confederation configs
        if (confedConfigs.length === 0) {
            return { valid: false, error: 'Add at least one confederation' };
        }
        
        let totalQualSlots = confedConfigs.reduce((sum, c) => sum + c.qualifyingSlots, 0);
        let finalTeamsNeeded = finalNumGroups * finalTeamsPerGroup;
        
        if (totalQualSlots !== finalTeamsNeeded) {
            return { valid: false, error: 'Qualifying slots (' + totalQualSlots + ') must match final teams (' + finalTeamsNeeded + ')' };
        }
        
        // Validate final best 3rd
        if (finalBest3rd > finalNumGroups) {
            return { valid: false, error: 'Final best 3rd (' + finalBest3rd + ') cannot exceed groups (' + finalNumGroups + ')' };
        }
    }
    
    const totalTeams = numGroups * teamsPerGroup;
    // Only validate nation count if fillTeams is explicitly enabled AND we have a nations list
    if (!useConfedQualifiers && fillTeams && selectedNations.length > 0 && selectedNations.length < totalTeams) {
        return { valid: false, error: 'Need ' + totalTeams + ' nations, have ' + selectedNations.length };
    }
    
    // Validate best 3rd/4th - can't have more than numGroups (only if enabled)
    if (bestThirdEnabled && bestThirdNum > numGroups) {
        return { valid: false, error: 'Best ' + bestThirdPosition + 'rd/th (' + bestThirdNum + ') cannot exceed number of groups (' + numGroups + ')' };
    }
    
    // Calculate KO bracket based on final tournament or qualifying
    let advancingTeams, koBracket;
    if (useConfedQualifiers) {
        advancingTeams = (finalNumGroups * finalAdvance) + finalBest3rd;
        koBracket = 2;
        while (koBracket < advancingTeams) koBracket *= 2;
    } else {
        advancingTeams = (numGroups * advancePerGroup) + bestThirdNum;
        koBracket = 2;
        while (koBracket < advancingTeams) koBracket *= 2;
    }
    
    return {
        valid: true,
        parentId,
        code,
        assetId,
        intlType,
        yearOffset,
        numGroups,
        teamsPerGroup,
        groupFormat,
        advancePerGroup,
        koFormat,
        thirdPlaceMatch,
        startMonth,
        startYear,
        scheduleMode,
        startDay,
        gap,
        kickoff,
        useDatesComp,
        selectedNations,
        totalTeams,
        advancingTeams,
        koBracket,
        fillTeams,
        // Best 3rd/4th place
        bestThirdEnabled,
        bestThirdNum,
        bestThirdPosition,
        // Confederation qualifiers
        useConfedQualifiers,
        confedConfigs,
        finalNumGroups,
        finalTeamsPerGroup,
        finalGroupFormat,
        finalAdvance,
        finalBest3rd,
        finalAssetId
    };
}

function previewIntl() {
    const preview = document.getElementById('intl-preview');
    const config = getIntlConfig();
    
    if (!config.valid) {
        preview.innerHTML = '<span style="color:#f85149">' + config.error + '</span>';
        return;
    }
    
    let html = '<div style="color:#58a6ff;margin-bottom:8px"><strong>' + config.code + '</strong> (' + config.intlType + ')</div>';
    html += 'Parent: ' + (config.parentId === 0 ? 'World' : 'Confed ' + config.parentId) + '<br>';
    
    // Show confederation qualifiers structure
    if (config.useConfedQualifiers) {
        html += '<strong style="color:#f0883e">Confederation Qualifiers:</strong><br>';
        const confedNames = { 1: 'UEFA', 1600: 'CONMEBOL', 1531: 'AFC', 1443: 'CONCACAF', 1774: 'CAF', 1775: 'OFC' };
        for (let c of config.confedConfigs) {
            html += '&nbsp;&nbsp;' + (confedNames[c.confedId] || c.confedId) + ': ' + 
                c.numGroups + ' groups × ' + c.teamsPerGroup + ' teams → ' + c.qualifyingSlots + ' qualify<br>';
        }
        html += '<strong style="color:#3fb950">Final Tournament:</strong><br>';
        html += '&nbsp;&nbsp;' + config.finalNumGroups + ' groups × ' + config.finalTeamsPerGroup + ' teams<br>';
        html += '&nbsp;&nbsp;Top ' + config.finalAdvance + ' advance → ' + config.advancingTeams + ' to KO<br>';
    } else {
        html += 'Groups: ' + config.numGroups + ' × ' + config.teamsPerGroup + ' teams<br>';
        html += 'Format: ' + (config.groupFormat === 2 ? 'Home & Away' : 'Single Round-Robin') + '<br>';
        let advanceText = 'Advance: Top ' + config.advancePerGroup;
        if (config.bestThirdEnabled && config.bestThirdNum > 0) {
            advanceText += ' + best ' + config.bestThirdNum + ' ' + getOrdinal(config.bestThirdPosition) + ' place';
        }
        advanceText += ' = ' + config.advancingTeams + ' teams';
        html += advanceText + '<br>';
    }
    
    if (config.intlType !== 'INTERQUAL') {
        const koRounds = [];
        let teamsLeft = config.koBracket;
        while (teamsLeft >= 2) {
            koRounds.push(getRoundName(teamsLeft));
            teamsLeft /= 2;
        }
        html += 'Knockout: ' + koRounds.join(' → ') + ' (' + config.koFormat + ')<br>';
    } else {
        // Show qualifier output info
        const totalQualifiers = (config.numGroups * config.advancePerGroup) + config.bestThirdNum;
        html += '<span style="color:#3fb950">Qualifiers: ' + totalQualifiers + ' teams → initteams</span><br>';
        if (!config.fillTeams) {
            html += '<span style="color:#f0883e">Teams: Empty (for FillFromCompTable)</span><br>';
        }
    }
    
    // Schedule info
    html += '<br><strong>Schedule:</strong> ';
    if (config.scheduleMode === 'hosted') {
        html += 'Hosted (compact) starting day ' + config.startDay + ', ' + config.gap + '-day gaps<br>';
    } else if (config.scheduleMode === 'reference') {
        html += 'Using dates from comp ' + config.useDatesComp + '<br>';
    } else {
        html += 'International windows (Sep/Oct/Nov/Mar)<br>';
    }
    html += config.startMonth + ' ' + config.startYear + ', every ' + config.yearOffset + ' years';
    
    preview.innerHTML = html;
}

function generateIntl() {
    try {
        if (data.compobj.length === 0) { 
            toast('Load compobj first', 'error'); 
            return; 
        }
        
        const config = getIntlConfig();
        console.log('International config:', config);
        
        if (!config.valid) { 
            toast(config.error, 'error'); 
            return; 
        }
        
        // Check duplicate asset ID
        const assetToCheck = config.useConfedQualifiers ? config.finalAssetId : config.assetId;
        for (let line of data.settings) {
            const parts = line.split(',');
            if (parts[1]?.trim() === 'asset_id' && parseInt(parts[2]?.trim()) === assetToCheck) {
                toast('Asset ID ' + assetToCheck + ' already exists', 'error');
                return;
            }
        }
        
        // Also check confed asset IDs if using confederation qualifiers
        if (config.useConfedQualifiers && config.confedConfigs) {
            for (let c of config.confedConfigs) {
                for (let line of data.settings) {
                    const parts = line.split(',');
                    if (parts[1]?.trim() === 'asset_id' && parseInt(parts[2]?.trim()) === c.assetId) {
                        toast('Confed Asset ID ' + c.assetId + ' (' + c.confedName + ') already exists', 'error');
                        return;
                    }
                }
            }
        }
        
        if (config.intlType === 'INTERCUP') {
            generateInterCup(config);
        } else if (config.intlType === 'INTERQUAL') {
            generateInterQual(config);
        } else {
            generateInterQualKO(config);
        }
    } catch (e) {
        console.error('Generate International error:', e);
        toast('Error: ' + e.message, 'error');
    }
}

function generateInterCup(config) {
    // Find insert position
    let insertIdx = -1, insertRowId = 1;
    
    if (config.parentId === 0) {
        // World comp - find end of all comps
        for (let i = 0; i < data.compobj.length; i++) {
            const parts = data.compobj[i].split(',');
            const id = parseInt(parts[0].trim());
            if (id >= insertRowId) {
                insertIdx = i;
                insertRowId = id + 1;
            }
        }
    } else {
        // Under confederation
        const { insertIdx: idx, insertRowId: rowId } = findCompInsertPosition(config.parentId);
        insertIdx = idx;
        insertRowId = rowId;
    }
    
    // Calculate IDs needed:
    // comp + setup stage + setup groups (one per pot)
    // + group stage + groups
    // + (if best 3rd) collection stage + collection group
    // + KO rounds (stage + matches each)
    const numPots = 4; // Standard 4 pots for seeding
    let totalIds = 1 + 1 + numPots; // comp + setup stage + pot groups
    totalIds += 1 + config.numGroups; // group stage + groups
    
    // Best 3rd collection stage (if enabled)
    if (config.bestThirdEnabled && config.bestThirdNum > 0) {
        totalIds += 2; // collection stage + collection group
    }
    
    // KO rounds
    const koRounds = [];
    let teamsLeft = config.koBracket;
    while (teamsLeft >= 2) {
        const matches = teamsLeft / 2;
        koRounds.push({ teams: teamsLeft, matches });
        totalIds += 1 + matches;
        teamsLeft /= 2;
    }
    
    // Save state before generation for undo
    saveState('Generate International Cup ' + config.code);
    
    renumberAllFiles(insertRowId, totalIds);
    
    let currentId = insertRowId;
    const compId = currentId++;
    const setupStageId = currentId++;
    
    // Pot groups for seeding
    const potGroups = [];
    for (let p = 0; p < numPots; p++) {
        potGroups.push(currentId++);
    }
    
    // Group stage
    const groupStageId = currentId++;
    const groupIds = [];
    for (let g = 0; g < config.numGroups; g++) {
        groupIds.push(currentId++);
    }
    
    // Best 3rd collection stage (if enabled)
    let collectionStageId = null;
    let collectionGroupId = null;
    if (config.bestThirdEnabled && config.bestThirdNum > 0) {
        collectionStageId = currentId++;
        collectionGroupId = currentId++;
    }
    
    // KO rounds
    const koRoundData = [];
    for (let r = 0; r < koRounds.length; r++) {
        const stageId = currentId++;
        const groups = [];
        for (let m = 0; m < koRounds[r].matches; m++) {
            groups.push(currentId++);
        }
        koRoundData.push({ stageId, groups, teams: koRounds[r].teams, matches: koRounds[r].matches });
    }
    
    // COMPOBJ
    const compobj = [
        compId + ',3,' + config.code + ',TrophyName_Abbr15_' + config.assetId + ',' + config.parentId,
        setupStageId + ',4,S1,FCE_Setup_Stage,' + compId
    ];
    
    for (let p = 0; p < numPots; p++) {
        compobj.push(potGroups[p] + ',5,G' + (p + 1) + ', ,' + setupStageId);
    }
    
    compobj.push(groupStageId + ',4,S2,FCE_Group_Stage,' + compId);
    const groupLetters = 'ABCDEFGHIJKLMNOP';
    for (let g = 0; g < config.numGroups; g++) {
        compobj.push(groupIds[g] + ',5,G' + (g + 1) + ',FCE_Group_' + groupLetters[g] + ',' + groupStageId);
    }
    
    let stageNum = 3;
    
    // Best 3rd collection stage (if enabled)
    if (collectionStageId) {
        compobj.push(collectionStageId + ',4,S' + stageNum + ', ,' + compId);
        compobj.push(collectionGroupId + ',5,G1, ,' + collectionStageId);
        stageNum++;
    }
    
    for (let r = 0; r < koRoundData.length; r++) {
        const round = koRoundData[r];
        const stageName = getRoundStageName(round.teams);
        compobj.push(round.stageId + ',4,S' + stageNum + ',' + stageName + ',' + compId);
        for (let m = 0; m < round.matches; m++) {
            compobj.push(round.groups[m] + ',5,G' + (m + 1) + ', ,' + round.stageId);
        }
        stageNum++;
    }
    
    // SETTINGS
    const settings = [
        compId + ',asset_id,' + config.assetId,
        compId + ',comp_type,INTERCUP',
        compId + ',match_matchimportance,100',
        compId + ',schedule_seasonstartmonth,' + config.startMonth,
        compId + ',schedule_year_start,' + config.startYear,
        compId + ',schedule_year_offset,' + config.yearOffset,
        compId + ',schedule_internationaldependency,NONE',
        setupStageId + ',match_stagetype,SETUP',
        groupStageId + ',match_stagetype,LEAGUE',
        groupStageId + ',match_matchsituation,GROUP',
        groupStageId + ',advance_random_draw_event,1'
    ];
    
    // Group settings
    for (let g = 0; g < config.numGroups; g++) {
        settings.push(groupIds[g] + ',num_games,' + config.groupFormat);
    }
    
    // Add advancement labels for group stage (which positions advance)
    for (let pos = 1; pos <= config.advancePerGroup; pos++) {
        settings.push(groupStageId + ',info_label_slot_adv_group,' + pos);
    }
    
    // Add best 3rd/4th place advancement label if enabled
    if (config.bestThirdEnabled && config.bestThirdNum > 0) {
        settings.push(groupStageId + ',info_label_slot_adv_group,' + config.bestThirdPosition);
        
        // Collection stage settings
        settings.push(collectionStageId + ',match_stagetype,SETUP');
        settings.push(collectionGroupId + ',advance_pointskeep,' + groupStageId);
        settings.push(collectionGroupId + ',standings_sort,POINTS');
        settings.push(collectionGroupId + ',standings_sort,GOALDIFF');
        settings.push(collectionGroupId + ',standings_sort,GOALSFOR');
        settings.push(collectionGroupId + ',standings_sort,WINS');
    }
    
    // KO stage settings
    for (let r = 0; r < koRoundData.length; r++) {
        const round = koRoundData[r];
        const isFinal = round.teams === 2;
        settings.push(round.stageId + ',match_stagetype,' + config.koFormat);
        settings.push(round.stageId + ',match_matchsituation,' + getRoundSituation(round.teams));
        settings.push(round.stageId + ',rule_allowadditionalsub,on');
        
        for (let m = 0; m < round.matches; m++) {
            settings.push(round.groups[m] + ',num_games,' + (config.koFormat === 'KO2LEGS' ? '2' : '1'));
            if (isFinal) {
                settings.push(round.groups[m] + ',info_slot_champ,1');
            }
        }
    }
    
    // STANDINGS
    const standings = [];
    
    // Pot groups
    const teamsPerPot = Math.ceil(config.totalTeams / numPots);
    for (let p = 0; p < numPots; p++) {
        for (let t = 0; t <= teamsPerPot; t++) {
            standings.push(potGroups[p] + ',' + t);
        }
    }
    
    // Group stage groups
    for (let g = 0; g < config.numGroups; g++) {
        for (let t = 0; t <= config.teamsPerGroup; t++) {
            standings.push(groupIds[g] + ',' + t);
        }
    }
    
    // Collection group for best 3rd (if enabled)
    if (collectionGroupId) {
        for (let t = 0; t <= config.numGroups; t++) {
            standings.push(collectionGroupId + ',' + t);
        }
    }
    
    // KO groups
    for (let r = 0; r < koRoundData.length; r++) {
        for (let m = 0; m < koRoundData[r].matches; m++) {
            standings.push(koRoundData[r].groups[m] + ',0');
            standings.push(koRoundData[r].groups[m] + ',1');
        }
    }
    
    // ADVANCEMENT
    const advancement = [];
    
    // Pots → Groups (distribute across groups)
    // This creates the standard pot-based draw advancement
    for (let p = 0; p < numPots; p++) {
        for (let g = 0; g < config.numGroups; g++) {
            advancement.push(potGroups[p] + ',0,' + groupIds[g] + ',' + (p + 1));
        }
    }
    
    // Groups → KO (flexible advancement based on settings)
    const firstKO = koRoundData[0];
    const bestAdvancing = config.bestThirdNum || 0;
    
    // Calculate KO slots needed
    let koSlotIdx = 0;
    
    // Direct qualifiers from each group (1st, 2nd, etc.)
    for (let pos = 1; pos <= config.advancePerGroup; pos++) {
        for (let g = 0; g < config.numGroups; g++) {
            // Distribute across KO matches
            const matchIdx = koSlotIdx % firstKO.matches;
            const slot = Math.floor(koSlotIdx / firstKO.matches) + 1;
            advancement.push(groupIds[g] + ',' + pos + ',' + firstKO.groups[matchIdx] + ',' + slot);
            koSlotIdx++;
        }
    }
    
    // Best 3rd/4th place teams - use collection group
    if (bestAdvancing > 0 && collectionGroupId) {
        // All 3rd/4th place teams go to collection group
        for (let g = 0; g < config.numGroups; g++) {
            advancement.push(groupIds[g] + ',' + config.bestThirdPosition + ',' + collectionGroupId + ',' + (g + 1));
        }
        
        // Best N from collection group advance to KO
        for (let b = 0; b < bestAdvancing; b++) {
            const matchIdx = koSlotIdx % firstKO.matches;
            const slot = Math.floor(koSlotIdx / firstKO.matches) + 1;
            advancement.push(collectionGroupId + ',' + (b + 1) + ',' + firstKO.groups[matchIdx] + ',' + slot);
            koSlotIdx++;
        }
    }
    
    // KO round advancement
    for (let r = 0; r < koRoundData.length - 1; r++) {
        const currentRound = koRoundData[r];
        const nextRound = koRoundData[r + 1];
        
        for (let m = 0; m < currentRound.matches; m++) {
            const targetMatch = Math.floor(m / 2);
            const slot = (m % 2) + 1;
            advancement.push(currentRound.groups[m] + ',1,' + nextRound.groups[targetMatch] + ',' + slot);
        }
    }
    
    // TASKS - FillWithTeam for each nation
    const tasks = [];
    const teamsPerPotActual = Math.ceil(config.selectedNations.length / numPots);
    for (let i = 0; i < config.selectedNations.length; i++) {
        const potIdx = Math.floor(i / teamsPerPotActual);
        const slotInPot = (i % teamsPerPotActual) + 1;
        if (potIdx < numPots) {
            tasks.push(compId + ',start,FillWithTeam,' + potGroups[potIdx] + ',' + slotInPot + ',' + config.selectedNations[i] + ',0');
        }
    }
    
    // UpdateTable for winner
    const finalGroup = koRoundData[koRoundData.length - 1].groups[0];
    tasks.push(compId + ',end,UpdateTable,' + compId + ',' + finalGroup + ',1,1');
    tasks.push(compId + ',end,UpdateTable,' + compId + ',' + finalGroup + ',2,2');
    
    // SCHEDULE - INTERCUP uses STAGE level schedule (like testing.xlsx)
    // Format: stageId, day, matchday, min, max, kickoff
    const schedule = [];
    let baseDay = config.startDay;
    
    // Group stage - STAGE level schedule
    // With N groups × T teams: each matchday has N × (T/2) matches
    // For single RR: (T-1) matchdays, for H&A: 2×(T-1) matchdays
    const groupMatchdays = config.groupFormat * (config.teamsPerGroup - 1);
    const matchesPerGroup = Math.floor(config.teamsPerGroup / 2); // matches per group per matchday
    const matchesPerMatchday = config.numGroups * matchesPerGroup;
    const halfMatches = Math.ceil(matchesPerMatchday / 2);
    
    // Kickoff times (2 slots for splitting matches)
    const kickoff1 = config.kickoff >= 1600 ? config.kickoff - 200 : config.kickoff;
    const kickoff2 = config.kickoff >= 1600 ? config.kickoff : config.kickoff + 200;
    
    let currentDay = baseDay;
    for (let md = 1; md <= groupMatchdays; md++) {
        const isLastMatchday = md === groupMatchdays;
        
        if (isLastMatchday) {
            // Last matchday: all matches simultaneous
            schedule.push(groupStageId + ',' + currentDay + ',' + md + ',' + matchesPerMatchday + ',' + matchesPerMatchday + ',' + kickoff2);
        } else if (matchesPerMatchday <= 4) {
            // Small tournament: all matches at once
            schedule.push(groupStageId + ',' + currentDay + ',' + md + ',' + matchesPerMatchday + ',' + matchesPerMatchday + ',' + kickoff2);
        } else {
            // Split across 2 kickoff times on same day
            schedule.push(groupStageId + ',' + currentDay + ',' + md + ',' + halfMatches + ',' + halfMatches + ',' + kickoff1);
            schedule.push(groupStageId + ',' + currentDay + ',' + md + ',' + halfMatches + ',' + halfMatches + ',' + kickoff2);
        }
        currentDay += config.gap;
    }
    
    // KO rounds - STAGE level
    let koStartDay = currentDay + config.gap;
    
    for (let r = 0; r < koRoundData.length; r++) {
        const round = koRoundData[r];
        const numMatches = round.matches;
        const halfKoMatches = Math.ceil(numMatches / 2);
        
        if (config.koFormat === 'KO2LEGS') {
            // Leg 1
            schedule.push(round.stageId + ',' + koStartDay + ',1,' + halfKoMatches + ',' + halfKoMatches + ',' + kickoff2);
            if (numMatches > 2) {
                schedule.push(round.stageId + ',' + (koStartDay + 1) + ',1,' + (numMatches - halfKoMatches) + ',' + (numMatches - halfKoMatches) + ',' + kickoff2);
            }
            koStartDay += config.gap;
            // Leg 2
            schedule.push(round.stageId + ',' + koStartDay + ',2,' + halfKoMatches + ',' + halfKoMatches + ',' + kickoff2);
            if (numMatches > 2) {
                schedule.push(round.stageId + ',' + (koStartDay + 1) + ',2,' + (numMatches - halfKoMatches) + ',' + (numMatches - halfKoMatches) + ',' + kickoff2);
            }
            koStartDay += config.gap;
        } else {
            // Single leg - all matches at same kickoff
            schedule.push(round.stageId + ',' + koStartDay + ',1,' + numMatches + ',' + numMatches + ',' + kickoff2);
            koStartDay += config.gap;
        }
    }
    
    // Insert
    data.compobj.splice(insertIdx + 1, 0, ...compobj);
    insertInOrder(data.settings, settings, compId);
    insertInOrder(data.standings, standings, potGroups[0]);
    insertInOrder(data.advancement, advancement, potGroups[0]);
    insertInOrder(data.tasks, tasks, compId);
    insertInOrder(data.schedule, schedule, groupIds[0]);
    
    // INITTEAMS - champion and runner-up
    const initteams = [compId + ',0,-1', compId + ',1,-1'];
    insertInOrder(data.initteams, initteams, compId);
    
    insertCompId(compId);
    
    finishGeneration('INTERCUP ' + config.code, compId, currentId - 1);
}

function generateInterQual(config) {
    // Find insert position
    let insertIdx = -1, insertRowId = 1;
    
    if (config.parentId === 0) {
        for (let i = 0; i < data.compobj.length; i++) {
            const parts = data.compobj[i].split(',');
            const id = parseInt(parts[0].trim());
            if (id >= insertRowId) {
                insertIdx = i;
                insertRowId = id + 1;
            }
        }
    } else {
        const { insertIdx: idx, insertRowId: rowId } = findCompInsertPosition(config.parentId);
        insertIdx = idx;
        insertRowId = rowId;
    }
    
    // IDs: comp + setup stage + setup groups + group stage + groups + (ranking stage + ranking group if best3rd)
    const numPots = 4;
    let totalIds = 1 + 1 + numPots + 1 + config.numGroups;
    if (config.bestThirdEnabled && config.bestThirdNum > 0) {
        totalIds += 2; // ranking stage + ranking group
    }
    
    // Save state before generation for undo
    saveState('Generate Qualifier ' + config.code);
    
    renumberAllFiles(insertRowId, totalIds);
    
    let currentId = insertRowId;
    const compId = currentId++;
    const setupStageId = currentId++;
    
    const potGroups = [];
    for (let p = 0; p < numPots; p++) {
        potGroups.push(currentId++);
    }
    
    const groupStageId = currentId++;
    const groupIds = [];
    for (let g = 0; g < config.numGroups; g++) {
        groupIds.push(currentId++);
    }
    
    // Ranking group for best 3rd (if enabled)
    let rankingStageId = null, rankingGroupId = null;
    if (config.bestThirdEnabled && config.bestThirdNum > 0) {
        rankingStageId = currentId++;
        rankingGroupId = currentId++;
    }
    
    // COMPOBJ
    const compobj = [
        compId + ',3,' + config.code + ',TrophyName_Abbr15_' + config.assetId + ',' + config.parentId,
        setupStageId + ',4,S1,FCE_Setup_Stage,' + compId
    ];
    
    for (let p = 0; p < numPots; p++) {
        compobj.push(potGroups[p] + ',5,G' + (p + 1) + ', ,' + setupStageId);
    }
    
    compobj.push(groupStageId + ',4,S2,FCE_Group_Stage,' + compId);
    for (let g = 0; g < config.numGroups; g++) {
        compobj.push(groupIds[g] + ',5,G' + (g + 1) + ', ,' + groupStageId);
    }
    
    // Ranking stage for best 3rd
    if (rankingStageId && rankingGroupId) {
        compobj.push(rankingStageId + ',4,S3,FCE_Setup_Stage,' + compId);
        compobj.push(rankingGroupId + ',5,G1, ,' + rankingStageId);
    }
    
    // SETTINGS
    const settings = [
        compId + ',asset_id,' + config.assetId,
        compId + ',comp_type,INTERQUAL',
        compId + ',match_matchimportance,100',
        compId + ',schedule_seasonstartmonth,' + config.startMonth,
        compId + ',schedule_year_start,' + config.startYear,
        compId + ',schedule_year_offset,' + config.yearOffset,
        compId + ',schedule_internationaldependency,NONE'
    ];
    
    // Add schedule_use_dates_comp if reference mode
    if (config.scheduleMode === 'reference' && config.useDatesComp) {
        settings.push(compId + ',schedule_use_dates_comp,' + config.useDatesComp);
    }
    
    settings.push(setupStageId + ',match_stagetype,SETUP');
    settings.push(groupStageId + ',match_stagetype,LEAGUE');
    settings.push(groupStageId + ',match_matchsituation,GROUP');
    settings.push(groupStageId + ',match_matchsituation,QUALIFY');
    
    // Mark qualifying slots
    for (let i = 1; i <= config.advancePerGroup; i++) {
        settings.push(groupStageId + ',info_label_slot_adv_group,' + i);
    }
    
    for (let g = 0; g < config.numGroups; g++) {
        settings.push(groupIds[g] + ',num_games,' + config.groupFormat);
    }
    
    // Ranking stage settings
    if (rankingStageId) {
        settings.push(rankingStageId + ',match_stagetype,SETUP');
    }
    
    // Ranking group settings (for sorting best 3rd place teams)
    if (rankingGroupId) {
        settings.push(rankingGroupId + ',advance_pointskeep,' + groupStageId);
        settings.push(rankingGroupId + ',standings_sort,POINTS');
        settings.push(rankingGroupId + ',standings_sort,GOALDIFF');
        settings.push(rankingGroupId + ',standings_sort,GOALSFOR');
        settings.push(rankingGroupId + ',standings_sort,WINS');
    }
    
    // STANDINGS
    const standings = [];
    const teamsPerPot = Math.ceil(config.totalTeams / numPots);
    for (let p = 0; p < numPots; p++) {
        for (let t = 0; t < teamsPerPot; t++) {
            standings.push(potGroups[p] + ',' + t);
        }
    }
    
    // Group standings - handle uneven distribution
    const baseGroupSize = Math.floor(config.totalTeams / config.numGroups);
    const extraTeamsCount = config.totalTeams % config.numGroups;
    for (let g = 0; g < config.numGroups; g++) {
        const groupSize = g < extraTeamsCount ? baseGroupSize + 1 : baseGroupSize;
        for (let t = 0; t < groupSize; t++) {
            standings.push(groupIds[g] + ',' + t);
        }
    }
    
    // Ranking group standings (one per group for 3rd place)
    if (rankingGroupId) {
        for (let t = 0; t < config.numGroups; t++) {
            standings.push(rankingGroupId + ',' + t);
        }
    }
    
    // ADVANCEMENT
    const advancement = [];
    // Setup pots → Groups (distribute teams across groups)
    for (let p = 0; p < numPots; p++) {
        for (let g = 0; g < config.numGroups; g++) {
            advancement.push(potGroups[p] + ',0,' + groupIds[g] + ',' + (p + 1));
        }
    }
    
    // 3rd place → Ranking group (if enabled)
    if (rankingGroupId) {
        for (let g = 0; g < config.numGroups; g++) {
            advancement.push(groupIds[g] + ',' + config.bestThirdPosition + ',' + rankingGroupId + ',' + (g + 1));
        }
    }
    
    // TASKS
    const tasks = [];
    
    // Fill teams with selection (if enabled)
    if (config.fillTeams) {
        const teamsPerPotActual = Math.ceil(config.selectedNations.length / numPots);
        for (let i = 0; i < config.selectedNations.length; i++) {
            const potIdx = Math.floor(i / teamsPerPotActual);
            const slotInPot = (i % teamsPerPotActual) + 1;
            if (potIdx < numPots) {
                tasks.push(compId + ',start,FillWithTeam,' + potGroups[potIdx] + ',' + slotInPot + ',' + config.selectedNations[i] + ',0');
            }
        }
    }
    
    // UpdateTable for qualifiers: groups 1st/2nd → initteams
    let slot = 1;
    for (let g = 0; g < config.numGroups; g++) {
        for (let pos = 1; pos <= config.advancePerGroup; pos++) {
            tasks.push(compId + ',end,UpdateTable,' + compId + ',' + groupIds[g] + ',' + pos + ',' + slot);
            slot++;
        }
    }
    
    // UpdateTable for ranking group best 3rd → initteams
    if (rankingGroupId && config.bestThirdNum > 0) {
        for (let pos = 1; pos <= config.bestThirdNum; pos++) {
            tasks.push(compId + ',end,UpdateTable,' + compId + ',' + rankingGroupId + ',' + pos + ',' + slot);
            slot++;
        }
    }
    
    // INITTEAMS - total qualifiers
    const initteams = [];
    const totalQualifiers = (config.numGroups * config.advancePerGroup) + config.bestThirdNum;
    for (let i = 0; i < totalQualifiers; i++) {
        initteams.push(compId + ',' + i + ',-1');
    }
    
    // SCHEDULE - INTERQUAL uses STAGE level schedule spread across international windows
    const schedule = [];
    
    // Only generate schedule if not using reference comp
    if (config.scheduleMode !== 'reference') {
        // International window dates
        const intlWindows = [
            { day1: 257, day2: 258, day3: 261 },  // September window
            { day1: 292, day2: 293, day3: 296 },  // October window
            { day1: 327, day2: 328, day3: 331 },  // November window
            { day1: 451, day2: 454, day3: 455 },  // March (next year)
            { day1: 530, day2: 531, day3: 534 },  // May/June
            { day1: 622, day2: 623, day3: 625 }   // June
        ];
        
        // Calculate group distribution for uneven teams
        const baseTeamsPerGroup = Math.floor(config.totalTeams / config.numGroups);
        const extraTeams = config.totalTeams % config.numGroups;
        
        const largerGroupCount = extraTeams;
        const largerGroupSize = baseTeamsPerGroup + 1;
        const smallerGroupCount = config.numGroups - extraTeams;
        const smallerGroupSize = baseTeamsPerGroup;
        
        // Matchdays based on largest group (H&A)
        const maxGroupSize = extraTeams > 0 ? largerGroupSize : smallerGroupSize;
        const maxMatchdays = 2 * (maxGroupSize - 1);
        const smallerMatchdays = 2 * (smallerGroupSize - 1);
        
        // Matches per group per matchday
        const matchesPerLargerGroup = Math.floor(largerGroupSize / 2);
        const matchesPerSmallerGroup = Math.floor(smallerGroupSize / 2);
        
        function getMatchesForMatchday(md) {
            let total = 0;
            if (largerGroupCount > 0 && md <= maxMatchdays) {
                total += largerGroupCount * matchesPerLargerGroup;
            }
            if (smallerGroupCount > 0 && md <= smallerMatchdays) {
                total += smallerGroupCount * matchesPerSmallerGroup;
            }
            return total;
        }
        
        // Generate schedule using window pattern
        let windowIdx = 0;
        let md = 1;
        
        while (md <= maxMatchdays) {
            const window = intlWindows[windowIdx % intlWindows.length];
            const matchesMD1 = getMatchesForMatchday(md);
            const matchesMD2 = (md + 1 <= maxMatchdays) ? getMatchesForMatchday(md + 1) : 0;
            
            if (matchesMD1 > 0) {
                const half = Math.ceil(matchesMD1 / 2);
                if (matchesMD1 > 2) {
                    schedule.push(groupStageId + ',' + window.day1 + ',' + md + ',' + half + ',' + half + ',1945');
                    schedule.push(groupStageId + ',' + window.day2 + ',' + md + ',' + (matchesMD1 - half) + ',' + (matchesMD1 - half) + ',1800');
                } else {
                    schedule.push(groupStageId + ',' + window.day1 + ',' + md + ',' + matchesMD1 + ',' + matchesMD1 + ',1945');
                }
            }
            md++;
            
            if (md <= maxMatchdays && matchesMD2 > 0) {
                schedule.push(groupStageId + ',' + window.day3 + ',' + md + ',' + matchesMD2 + ',' + matchesMD2 + ',1945');
                md++;
            }
            
            windowIdx++;
        }
    }
    
    // Insert
    data.compobj.splice(insertIdx + 1, 0, ...compobj);
    insertInOrder(data.settings, settings, compId);
    insertInOrder(data.standings, standings, potGroups[0]);
    insertInOrder(data.advancement, advancement, potGroups[0]);
    insertInOrder(data.tasks, tasks, compId);
    if (schedule.length > 0) {
        insertInOrder(data.schedule, schedule, groupStageId);
    }
    insertInOrder(data.initteams, initteams, compId);
    insertCompId(compId);
    
    finishGeneration('INTERQUAL ' + config.code, compId, currentId - 1);
}

function generateInterQualKO(config) {
    // Check if using confederation qualifiers (World Cup style)
    if (config.useConfedQualifiers) {
        generateConfedQualifiers(config);
        return;
    }
    
    // Original simple qualifiers + KO playoffs
    // Find insert position
    let insertIdx = -1, insertRowId = 1;
    
    if (config.parentId === 0) {
        for (let i = 0; i < data.compobj.length; i++) {
            const parts = data.compobj[i].split(',');
            const id = parseInt(parts[0].trim());
            if (id >= insertRowId) {
                insertIdx = i;
                insertRowId = id + 1;
            }
        }
    } else {
        const { insertIdx: idx, insertRowId: rowId } = findCompInsertPosition(config.parentId);
        insertIdx = idx;
        insertRowId = rowId;
    }
    
    // IDs: comp + setup + pots + group stage + groups + KO draw setup + KO draw groups + KO rounds
    const numPots = 4;
    let totalIds = 1 + 1 + numPots + 1 + config.numGroups;
    totalIds += 1 + 2; // KO draw setup + 2 groups (qualifiers pool)
    
    // KO rounds
    const koRounds = [];
    let teamsLeft = config.koBracket;
    while (teamsLeft >= 2) {
        const matches = teamsLeft / 2;
        koRounds.push({ teams: teamsLeft, matches });
        totalIds += 1 + matches;
        teamsLeft /= 2;
    }
    
    // Save state before generation for undo
    saveState('Generate Qualifier+KO ' + config.code);
    
    renumberAllFiles(insertRowId, totalIds);
    
    let currentId = insertRowId;
    const compId = currentId++;
    const setupStageId = currentId++;
    
    const potGroups = [];
    for (let p = 0; p < numPots; p++) {
        potGroups.push(currentId++);
    }
    
    const groupStageId = currentId++;
    const groupIds = [];
    for (let g = 0; g < config.numGroups; g++) {
        groupIds.push(currentId++);
    }
    
    // KO draw setup
    const koDrawStageId = currentId++;
    const koDrawGroups = [currentId++, currentId++]; // Winners + Runners-up pools
    
    // KO rounds
    const koRoundData = [];
    for (let r = 0; r < koRounds.length; r++) {
        const stageId = currentId++;
        const groups = [];
        for (let m = 0; m < koRounds[r].matches; m++) {
            groups.push(currentId++);
        }
        koRoundData.push({ stageId, groups, teams: koRounds[r].teams, matches: koRounds[r].matches });
    }
    
    // COMPOBJ
    const compobj = [
        compId + ',3,' + config.code + ',TrophyName_Abbr15_' + config.assetId + ',' + config.parentId,
        setupStageId + ',4,S1,FCE_Setup_Stage,' + compId
    ];
    
    for (let p = 0; p < numPots; p++) {
        compobj.push(potGroups[p] + ',5,G' + (p + 1) + ', ,' + setupStageId);
    }
    
    compobj.push(groupStageId + ',4,S2,FCE_Qualifying_Round,' + compId);
    const groupLetters = 'ABCDEFGHIJKLMNOP';
    for (let g = 0; g < config.numGroups; g++) {
        compobj.push(groupIds[g] + ',5,G' + (g + 1) + ',FCE_Group_' + groupLetters[g] + ',' + groupStageId);
    }
    
    compobj.push(koDrawStageId + ',4,S3,FCE_Playoff_Draw,' + compId);
    compobj.push(koDrawGroups[0] + ',5,G1,FCE_Group_Winners,' + koDrawStageId);
    compobj.push(koDrawGroups[1] + ',5,G2,FCE_Group_Runners_Up,' + koDrawStageId);
    
    let stageNum = 4;
    for (let r = 0; r < koRoundData.length; r++) {
        const round = koRoundData[r];
        const stageName = getRoundStageName(round.teams);
        compobj.push(round.stageId + ',4,S' + stageNum + ',' + stageName + ',' + compId);
        for (let m = 0; m < round.matches; m++) {
            compobj.push(round.groups[m] + ',5,G' + (m + 1) + ', ,' + round.stageId);
        }
        stageNum++;
    }
    
    // SETTINGS
    const settings = [
        compId + ',asset_id,' + config.assetId,
        compId + ',comp_type,INTERQUAL',
        compId + ',match_matchimportance,100',
        compId + ',schedule_seasonstartmonth,' + config.startMonth,
        compId + ',schedule_year_start,' + config.startYear,
        compId + ',schedule_year_offset,' + config.yearOffset,
        compId + ',schedule_internationaldependency,NONE'
    ];
    
    if (config.scheduleMode === 'reference' && config.useDatesComp) {
        settings.push(compId + ',schedule_use_dates_comp,' + config.useDatesComp);
    }
    
    settings.push(setupStageId + ',match_stagetype,SETUP');
    settings.push(groupStageId + ',match_stagetype,LEAGUE');
    settings.push(groupStageId + ',match_matchsituation,GROUP');
    settings.push(groupStageId + ',match_matchsituation,QUALIFY');
    settings.push(koDrawStageId + ',match_stagetype,SETUP');
    
    for (let i = 1; i <= config.advancePerGroup; i++) {
        settings.push(groupStageId + ',info_label_slot_adv_group,' + i);
    }
    
    for (let g = 0; g < config.numGroups; g++) {
        settings.push(groupIds[g] + ',num_games,' + config.groupFormat);
    }
    
    // KO settings
    for (let r = 0; r < koRoundData.length; r++) {
        const round = koRoundData[r];
        const isFinal = round.teams === 2;
        settings.push(round.stageId + ',match_stagetype,' + config.koFormat);
        settings.push(round.stageId + ',match_matchsituation,' + getRoundSituation(round.teams));
        settings.push(round.stageId + ',rule_allowadditionalsub,on');
        
        for (let m = 0; m < round.matches; m++) {
            settings.push(round.groups[m] + ',num_games,' + (config.koFormat === 'KO2LEGS' ? '2' : '1'));
            if (isFinal) {
                settings.push(round.groups[m] + ',info_slot_champ,1');
            }
        }
    }
    
    // STANDINGS
    const standings = [];
    const teamsPerPot = Math.ceil(config.totalTeams / numPots);
    for (let p = 0; p < numPots; p++) {
        for (let t = 0; t <= teamsPerPot; t++) {
            standings.push(potGroups[p] + ',' + t);
        }
    }
    
    // Group standings - handle uneven distribution
    const baseGroupSize = Math.floor(config.totalTeams / config.numGroups);
    const extraTeamsCount = config.totalTeams % config.numGroups;
    for (let g = 0; g < config.numGroups; g++) {
        const groupSize = g < extraTeamsCount ? baseGroupSize + 1 : baseGroupSize;
        for (let t = 0; t <= groupSize; t++) {
            standings.push(groupIds[g] + ',' + t);
        }
    }
    
    // KO draw groups
    for (let i = 0; i < 2; i++) {
        for (let t = 0; t <= config.numGroups; t++) {
            standings.push(koDrawGroups[i] + ',' + t);
        }
    }
    
    // KO round groups
    for (let r = 0; r < koRoundData.length; r++) {
        for (let m = 0; m < koRoundData[r].matches; m++) {
            standings.push(koRoundData[r].groups[m] + ',0');
            standings.push(koRoundData[r].groups[m] + ',1');
        }
    }
    
    // ADVANCEMENT
    const advancement = [];
    
    // Pots → Groups
    for (let p = 0; p < numPots; p++) {
        for (let g = 0; g < config.numGroups; g++) {
            advancement.push(potGroups[p] + ',0,' + groupIds[g] + ',' + (p + 1));
        }
    }
    
    // Groups → KO Draw
    for (let g = 0; g < config.numGroups; g++) {
        advancement.push(groupIds[g] + ',1,' + koDrawGroups[0] + ',' + (g + 1)); // Winners
        advancement.push(groupIds[g] + ',2,' + koDrawGroups[1] + ',' + (g + 1)); // Runners-up
    }
    
    // KO Draw → First KO Round
    const firstKO = koRoundData[0];
    for (let m = 0; m < firstKO.matches; m++) {
        advancement.push(koDrawGroups[0] + ',' + (m + 1) + ',' + firstKO.groups[m] + ',1');
        advancement.push(koDrawGroups[1] + ',' + (config.numGroups - m) + ',' + firstKO.groups[m] + ',2');
    }
    
    // KO round advancement
    for (let r = 0; r < koRoundData.length - 1; r++) {
        const currentRound = koRoundData[r];
        const nextRound = koRoundData[r + 1];
        
        for (let m = 0; m < currentRound.matches; m++) {
            const targetMatch = Math.floor(m / 2);
            const slot = (m % 2) + 1;
            advancement.push(currentRound.groups[m] + ',1,' + nextRound.groups[targetMatch] + ',' + slot);
        }
    }
    
    // TASKS
    const tasks = [];
    const teamsPerPotActual = Math.ceil(config.selectedNations.length / numPots);
    for (let i = 0; i < config.selectedNations.length; i++) {
        const potIdx = Math.floor(i / teamsPerPotActual);
        const slotInPot = (i % teamsPerPotActual) + 1;
        if (potIdx < numPots) {
            tasks.push(compId + ',start,FillWithTeam,' + potGroups[potIdx] + ',' + slotInPot + ',' + config.selectedNations[i] + ',0');
        }
    }
    
    // UpdateTable for qualifiers
    const finalGroup = koRoundData[koRoundData.length - 1].groups[0];
    tasks.push(compId + ',end,UpdateTable,' + compId + ',' + finalGroup + ',1,1');
    tasks.push(compId + ',end,UpdateTable,' + compId + ',' + finalGroup + ',2,2');
    
    // SCHEDULE
    const schedule = [];
    if (config.scheduleMode !== 'reference') {
        // International windows pattern
        // Each window has 3 days: day1+day2 for split matchday, day3 for combined matchday
        const intlWindows = [
            { day1: 257, day2: 258, day3: 261 },  // September
            { day1: 292, day2: 293, day3: 296 },  // October
            { day1: 327, day2: 328, day3: 331 },  // November
            { day1: 451, day2: 454, day3: 455 },  // March
            { day1: 530, day2: 531, day3: 534 },  // May/June
            { day1: 622, day2: 623, day3: 625 }   // June
        ];
        
        // Calculate group distribution for uneven teams
        // E.g., 17 teams / 4 groups = 3 groups of 4 + 1 group of 5
        const baseTeamsPerGroup = Math.floor(config.totalTeams / config.numGroups);
        const extraTeams = config.totalTeams % config.numGroups;
        
        // Groups with extra team (larger groups)
        const largerGroupCount = extraTeams;
        const largerGroupSize = baseTeamsPerGroup + 1;
        const smallerGroupCount = config.numGroups - extraTeams;
        const smallerGroupSize = baseTeamsPerGroup;
        
        // Matchdays based on largest group (H&A)
        const maxGroupSize = extraTeams > 0 ? largerGroupSize : smallerGroupSize;
        const maxMatchdays = 2 * (maxGroupSize - 1);
        const smallerMatchdays = 2 * (smallerGroupSize - 1);
        
        // Calculate matches per matchday
        // Matches per group per matchday = floor(groupSize / 2)
        const matchesPerLargerGroup = Math.floor(largerGroupSize / 2);
        const matchesPerSmallerGroup = Math.floor(smallerGroupSize / 2);
        
        // For each matchday, calculate total matches
        // Smaller groups finish earlier (at smallerMatchdays)
        function getMatchesForMatchday(md) {
            let total = 0;
            // Larger groups play all matchdays
            if (largerGroupCount > 0 && md <= maxMatchdays) {
                total += largerGroupCount * matchesPerLargerGroup;
            }
            // Smaller groups only play up to their matchday limit
            if (smallerGroupCount > 0 && md <= smallerMatchdays) {
                total += smallerGroupCount * matchesPerSmallerGroup;
            }
            return total;
        }
        
        // Generate schedule using window pattern
        // Pattern: MD1 split, MD2 all, MD3 split, MD4 all, etc.
        let windowIdx = 0;
        let md = 1;
        
        while (md <= maxMatchdays) {
            const window = intlWindows[windowIdx % intlWindows.length];
            const matchesMD1 = getMatchesForMatchday(md);
            const matchesMD2 = (md + 1 <= maxMatchdays) ? getMatchesForMatchday(md + 1) : 0;
            
            if (matchesMD1 > 0) {
                // First matchday of window - split across 2 days
                const half = Math.ceil(matchesMD1 / 2);
                if (matchesMD1 > 2) {
                    schedule.push(groupStageId + ',' + window.day1 + ',' + md + ',' + half + ',' + half + ',1945');
                    schedule.push(groupStageId + ',' + window.day2 + ',' + md + ',' + (matchesMD1 - half) + ',' + (matchesMD1 - half) + ',1800');
                } else {
                    schedule.push(groupStageId + ',' + window.day1 + ',' + md + ',' + matchesMD1 + ',' + matchesMD1 + ',1945');
                }
            }
            md++;
            
            if (md <= maxMatchdays && matchesMD2 > 0) {
                // Second matchday of window - all together
                schedule.push(groupStageId + ',' + window.day3 + ',' + md + ',' + matchesMD2 + ',' + matchesMD2 + ',1945');
                md++;
            }
            
            windowIdx++;
        }
        
        // KO rounds schedule
        for (let r = 0; r < koRoundData.length; r++) {
            const round = koRoundData[r];
            const window = intlWindows[windowIdx % intlWindows.length];
            
            if (config.koFormat === 'KO2LEGS') {
                schedule.push(round.stageId + ',' + window.day1 + ',1,' + round.matches + ',' + round.matches + ',2000');
                const window2 = intlWindows[(windowIdx + 1) % intlWindows.length];
                schedule.push(round.stageId + ',' + window2.day1 + ',2,' + round.matches + ',' + round.matches + ',2000');
                windowIdx += 2;
            } else {
                schedule.push(round.stageId + ',' + window.day1 + ',1,' + round.matches + ',' + round.matches + ',2000');
                windowIdx++;
            }
        }
    }
    
    // Insert
    data.compobj.splice(insertIdx + 1, 0, ...compobj);
    insertInOrder(data.settings, settings, compId);
    insertInOrder(data.standings, standings, potGroups[0]);
    insertInOrder(data.advancement, advancement, potGroups[0]);
    insertInOrder(data.tasks, tasks, compId);
    if (schedule.length > 0) {
        insertInOrder(data.schedule, schedule, groupStageId);
    }
    
    // INITTEAMS - champion and runner-up
    const initteams = [compId + ',0,-1', compId + ',1,-1'];
    insertInOrder(data.initteams, initteams, compId);
    
    insertCompId(compId);
    finishGeneration('INTERQUAL+KO ' + config.code, compId, currentId - 1);
}

// Confederation Qualifiers + Final Tournament generator (World Cup style)
function generateConfedQualifiers(config) {
    // Structure:
    // 1. Parent comp (World Cup)
    // 2. Initial Setup Stage (pots for seeding into confederation qualifiers)
    // 3. Confederation Qualifying Stages (one per confederation)
    //    - Each with its own groups
    //    - Ranking stage if best3rd enabled
    // 4. Final Tournament Setup Stage (pots for finals draw)
    // 5. Final Tournament Group Stage
    //    - Ranking stage if finalBest3rd enabled
    // 6. Knockout Rounds
    
    let insertIdx = -1, insertRowId = 1;
    
    if (config.parentId === 0) {
        for (let i = 0; i < data.compobj.length; i++) {
            const parts = data.compobj[i].split(',');
            const id = parseInt(parts[0].trim());
            if (id >= insertRowId) {
                insertIdx = i;
                insertRowId = id + 1;
            }
        }
    } else {
        const { insertIdx: idx, insertRowId: rowId } = findCompInsertPosition(config.parentId);
        insertIdx = idx;
        insertRowId = rowId;
    }
    
    // Calculate total IDs needed
    let totalIds = 1; // Comp
    
    // Initial setup stage with pots (one pot per confederation)
    const numInitialPots = config.confedConfigs.length;
    totalIds += 1 + numInitialPots;
    
    // Confederation qualifying stages
    for (let c of config.confedConfigs) {
        totalIds += 1; // Stage
        totalIds += c.numGroups; // Groups
        if (c.best3rd > 0) {
            totalIds += 2; // Ranking stage + ranking group
        }
    }
    
    // Final tournament setup + pots
    const numFinalPots = 4;
    totalIds += 1 + numFinalPots;
    
    // Final group stage + groups
    totalIds += 1 + config.finalNumGroups;
    
    // Final ranking stage if best3rd
    if (config.finalBest3rd > 0) {
        totalIds += 2; // Ranking stage + ranking group
    }
    
    // KO rounds
    const koRounds = [];
    let teamsLeft = config.koBracket;
    while (teamsLeft >= 2) {
        koRounds.push({ teams: teamsLeft, matches: teamsLeft / 2 });
        totalIds += 1 + (teamsLeft / 2); // Stage + match groups
        teamsLeft /= 2;
    }
    
    // Third place match (if enabled and we have semis)
    if (config.thirdPlaceMatch && koRounds.length >= 2) {
        totalIds += 2; // Stage + group for third place match
    }
    
    renumberAllFiles(insertRowId, totalIds);
    
    let currentId = insertRowId;
    const compId = currentId++;
    
    // Initial setup stage (for seeding into confederation qualifiers)
    const initialSetupStageId = currentId++;
    const initialPotGroups = [];
    for (let p = 0; p < numInitialPots; p++) {
        initialPotGroups.push(currentId++);
    }
    let stageNum = 1;
    const initialSetupStageNum = stageNum++;
    
    // Build confederation qualifying stages
    const confedStages = [];
    const confedNames = { 1: 'UEFA', 1600: 'CONMEBOL', 1531: 'AFC', 1443: 'CONCACAF', 1774: 'CAF', 1775: 'OFC' };
    
    for (let c of config.confedConfigs) {
        const stageId = currentId++;
        const groups = [];
        for (let g = 0; g < c.numGroups; g++) {
            groups.push(currentId++);
        }
        
        // Create ranking stage/group if best3rd is enabled
        let rankingStageId = null;
        let rankingGroupId = null;
        if (c.best3rd > 0) {
            rankingStageId = currentId++;
            rankingGroupId = currentId++;
        }
        
        confedStages.push({
            confedId: c.confedId,
            confedName: confedNames[c.confedId] || 'Confed_' + c.confedId,
            assetId: c.assetId || 900,
            stageId,
            groups,
            numGroups: c.numGroups,
            teamsPerGroup: c.teamsPerGroup,
            advancePerGroup: c.advancePerGroup || 2,
            best3rd: c.best3rd || 0,
            qualifyingSlots: c.qualifyingSlots,
            stageNum: stageNum++,
            rankingStageNum: (c.best3rd > 0) ? stageNum++ : null,
            rankingStageId,
            rankingGroupId,
            totalTeams: c.effectiveTeams || c.totalTeams || (c.numGroups * c.teamsPerGroup),
            includesFrom: c.includesFrom || [],
            incomingCounts: c.incomingCounts || {}
        });
    }
    
    // Final tournament setup
    const finalSetupStageId = currentId++;
    const finalPotGroups = [];
    for (let p = 0; p < numFinalPots; p++) {
        finalPotGroups.push(currentId++);
    }
    const setupStageNum = stageNum++;
    
    // Final group stage
    const finalGroupStageId = currentId++;
    const finalGroupIds = [];
    for (let g = 0; g < config.finalNumGroups; g++) {
        finalGroupIds.push(currentId++);
    }
    const groupStageNum = stageNum++;
    
    // Final ranking stage (for best 3rd place in finals)
    let finalRankingStageId = null;
    let finalRankingGroupId = null;
    let finalRankingStageNum = null;
    if (config.finalBest3rd > 0) {
        finalRankingStageId = currentId++;
        finalRankingGroupId = currentId++;
        finalRankingStageNum = stageNum++;
    }
    
    // KO rounds
    const koRoundData = [];
    for (let r = 0; r < koRounds.length; r++) {
        const roundStageId = currentId++;
        const groups = [];
        for (let m = 0; m < koRounds[r].matches; m++) {
            groups.push(currentId++);
        }
        koRoundData.push({
            stageId: roundStageId,
            groups,
            teams: koRounds[r].teams,
            matches: koRounds[r].matches,
            stageNum: stageNum++
        });
    }
    
    // Third place match
    let thirdPlaceStageId = null;
    let thirdPlaceGroupId = null;
    let thirdPlaceStageNum = null;
    if (config.thirdPlaceMatch && koRoundData.length >= 2) {
        thirdPlaceStageId = currentId++;
        thirdPlaceGroupId = currentId++;
        thirdPlaceStageNum = stageNum++;
    }
    
    // COMPOBJ
    const compobj = [
        compId + ',3,' + config.code + ',TrophyName_Abbr15_' + config.assetId + ',' + config.parentId
    ];
    
    // Initial setup stage
    const groupLetters = 'ABCDEFGHIJKLMNOP';
    compobj.push(initialSetupStageId + ',4,S' + initialSetupStageNum + ',FCE_Setup_Stage,' + compId);
    for (let p = 0; p < numInitialPots; p++) {
        compobj.push(initialPotGroups[p] + ',5,G' + (p + 1) + ', ,' + initialSetupStageId);
    }
    
    // Confederation qualifying stages
    const singleConfed = confedStages.length === 1;
    for (let cs of confedStages) {
        // Use simpler name if only one confederation (e.g. Euro Qualifiers)
        const stageName = singleConfed ? 'FCE_Qualifying' : 'FCE_' + cs.confedName + '_Qualifying';
        compobj.push(cs.stageId + ',4,S' + cs.stageNum + ',' + stageName + ',' + compId);
        for (let g = 0; g < cs.numGroups; g++) {
            compobj.push(cs.groups[g] + ',5,G' + (g + 1) + ',FCE_Group_' + groupLetters[g] + ',' + cs.stageId);
        }
        // Add ranking stage/group for best 3rd place if enabled
        if (cs.rankingStageId && cs.rankingGroupId) {
            const rankingName = singleConfed ? 'FCE_Ranking' : 'FCE_' + cs.confedName + '_Ranking';
            compobj.push(cs.rankingStageId + ',4,S' + cs.rankingStageNum + ',' + rankingName + ',' + compId);
            compobj.push(cs.rankingGroupId + ',5,G1, ,' + cs.rankingStageId);
        }
    }
    
    // Final setup stage
    compobj.push(finalSetupStageId + ',4,S' + setupStageNum + ',FCE_Setup_Stage,' + compId);
    for (let p = 0; p < numFinalPots; p++) {
        compobj.push(finalPotGroups[p] + ',5,G' + (p + 1) + ',FCE_Pot_' + (p + 1) + ',' + finalSetupStageId);
    }
    
    // Final group stage
    compobj.push(finalGroupStageId + ',4,S' + groupStageNum + ',FCE_Group_Stage,' + compId);
    for (let g = 0; g < config.finalNumGroups; g++) {
        compobj.push(finalGroupIds[g] + ',5,G' + (g + 1) + ',FCE_Group_' + groupLetters[g] + ',' + finalGroupStageId);
    }
    
    // Final ranking stage if best 3rd
    if (finalRankingStageId && finalRankingGroupId) {
        compobj.push(finalRankingStageId + ',4,S' + finalRankingStageNum + ', ,' + compId);
        compobj.push(finalRankingGroupId + ',5,G1, ,' + finalRankingStageId);
    }
    
    // KO stages
    for (let r of koRoundData) {
        const stageName = getRoundStageName(r.teams);
        compobj.push(r.stageId + ',4,S' + r.stageNum + ',' + stageName + ',' + compId);
        for (let m = 0; m < r.matches; m++) {
            compobj.push(r.groups[m] + ',5,G' + (m + 1) + ', ,' + r.stageId);
        }
    }
    
    // Third place match
    if (thirdPlaceStageId && thirdPlaceGroupId) {
        compobj.push(thirdPlaceStageId + ',4,S' + thirdPlaceStageNum + ',FCE_Third_Place,' + compId);
        compobj.push(thirdPlaceGroupId + ',5,G1, ,' + thirdPlaceStageId);
    }
    
    // SETTINGS
    const settings = [
        compId + ',asset_id,' + (config.finalAssetId || config.assetId),
        compId + ',comp_type,INTERQUAL',
        compId + ',match_matchimportance,100',
        compId + ',schedule_seasonstartmonth,' + config.startMonth,
        compId + ',schedule_year_start,' + config.startYear,
        compId + ',schedule_year_offset,' + config.yearOffset,
        compId + ',schedule_internationaldependency,NONE'
    ];
    
    if (config.scheduleMode === 'reference' && config.useDatesComp) {
        settings.push(compId + ',schedule_use_dates_comp,' + config.useDatesComp);
    }
    
    // Initial setup stage settings
    settings.push(initialSetupStageId + ',match_stagetype,SETUP');
    
    // Confederation qualifying stage settings
    for (let cs of confedStages) {
        // Stage-level asset_id for qualifier graphics
        settings.push(cs.stageId + ',asset_id,' + cs.assetId);
        settings.push(cs.stageId + ',match_stagetype,LEAGUE');
        settings.push(cs.stageId + ',match_matchsituation,GROUP');
        settings.push(cs.stageId + ',match_matchsituation,QUALIFY');
        
        // Mark advancing positions
        for (let i = 1; i <= cs.advancePerGroup; i++) {
            settings.push(cs.stageId + ',info_label_slot_adv_group,' + i);
        }
        
        for (let g of cs.groups) {
            settings.push(g + ',num_games,2'); // Home & away
        }
        
        // Ranking stage/group settings for best 3rd place
        if (cs.rankingStageId && cs.rankingGroupId) {
            settings.push(cs.rankingStageId + ',match_stagetype,SETUP');
            settings.push(cs.rankingGroupId + ',advance_pointskeep,' + cs.stageId);
            settings.push(cs.rankingGroupId + ',standings_sort,POINTS');
            settings.push(cs.rankingGroupId + ',standings_sort,GOALDIFF');
            settings.push(cs.rankingGroupId + ',standings_sort,GOALSFOR');
            settings.push(cs.rankingGroupId + ',standings_sort,WINS');
        }
    }
    
    // Final setup stage
    settings.push(finalSetupStageId + ',match_stagetype,SETUP');
    
    // Final group stage
    settings.push(finalGroupStageId + ',match_stagetype,LEAGUE');
    settings.push(finalGroupStageId + ',match_matchsituation,GROUP');
    for (let i = 1; i <= config.finalAdvance; i++) {
        settings.push(finalGroupStageId + ',info_label_slot_adv_group,' + i);
    }
    for (let g of finalGroupIds) {
        settings.push(g + ',num_games,' + config.finalGroupFormat);
    }
    
    // Final ranking stage settings for best 3rd place
    if (finalRankingStageId && finalRankingGroupId) {
        settings.push(finalRankingStageId + ',match_stagetype,SETUP');
        settings.push(finalRankingGroupId + ',advance_pointskeep,' + finalGroupStageId);
        settings.push(finalRankingGroupId + ',standings_sort,POINTS');
        settings.push(finalRankingGroupId + ',standings_sort,GOALDIFF');
        settings.push(finalRankingGroupId + ',standings_sort,GOALSFOR');
        settings.push(finalRankingGroupId + ',standings_sort,WINS');
    }
    
    // KO settings
    for (let r of koRoundData) {
        settings.push(r.stageId + ',match_stagetype,' + config.koFormat);
        settings.push(r.stageId + ',match_matchsituation,' + getRoundSituation(r.teams));
        settings.push(r.stageId + ',rule_allowadditionalsub,on');
        
        for (let g of r.groups) {
            settings.push(g + ',num_games,' + (config.koFormat === 'KO2LEGS' ? '2' : '1'));
            if (r.teams === 2) {
                settings.push(g + ',info_slot_champ,1');
            }
        }
    }
    
    // Third place match settings
    if (thirdPlaceStageId && thirdPlaceGroupId) {
        settings.push(thirdPlaceStageId + ',match_stagetype,KO1LEG'); // Always single match
        settings.push(thirdPlaceStageId + ',match_matchsituation,THIRD_PLACE');
        settings.push(thirdPlaceStageId + ',rule_allowadditionalsub,on');
        settings.push(thirdPlaceGroupId + ',num_games,1');
    }
    
    // STANDINGS
    const standings = [];
    
    // Initial setup stage pots
    for (let p = 0; p < numInitialPots; p++) {
        const teamsInPot = confedStages[p] ? confedStages[p].totalTeams : 10;
        for (let t = 0; t <= teamsInPot; t++) {
            standings.push(initialPotGroups[p] + ',' + t);
        }
    }
    
    // Confederation qualifying groups
    for (let cs of confedStages) {
        for (let g of cs.groups) {
            for (let t = 0; t <= cs.teamsPerGroup; t++) {
                standings.push(g + ',' + t);
            }
        }
        // Ranking group standings (one slot per group for 3rd place teams)
        if (cs.rankingGroupId) {
            for (let t = 0; t < cs.numGroups; t++) {
                standings.push(cs.rankingGroupId + ',' + t);
            }
        }
    }
    
    // Final pots
    const teamsPerPot = Math.ceil((config.finalNumGroups * config.finalTeamsPerGroup) / numFinalPots);
    for (let p = 0; p < numFinalPots; p++) {
        for (let t = 0; t <= teamsPerPot; t++) {
            standings.push(finalPotGroups[p] + ',' + t);
        }
    }
    
    // Final groups
    for (let g of finalGroupIds) {
        for (let t = 0; t <= config.finalTeamsPerGroup; t++) {
            standings.push(g + ',' + t);
        }
    }
    
    // Final ranking group (for best 3rd place)
    if (finalRankingGroupId) {
        for (let t = 0; t < config.finalNumGroups; t++) {
            standings.push(finalRankingGroupId + ',' + t);
        }
    }
    
    // KO groups
    for (let r of koRoundData) {
        for (let g of r.groups) {
            standings.push(g + ',0');
            standings.push(g + ',1');
        }
    }
    
    // Third place match standings
    if (thirdPlaceGroupId) {
        standings.push(thirdPlaceGroupId + ',0');
        standings.push(thirdPlaceGroupId + ',1');
    }
    
    // ADVANCEMENT
    const advancement = [];
    
    // Qualifying groups → Final pots / Ranking groups
    let potSlot = [1, 1, 1, 1]; // Track slot in each pot
    for (let cs of confedStages) {
        for (let g = 0; g < cs.numGroups; g++) {
            // Direct qualifiers (1st, 2nd, etc.) go to pots
            for (let pos = 1; pos <= cs.advancePerGroup; pos++) {
                const targetPot = Math.min(pos - 1, numFinalPots - 1);
                advancement.push(cs.groups[g] + ',' + pos + ',' + finalPotGroups[targetPot] + ',' + potSlot[targetPot]);
                potSlot[targetPot]++;
            }
            // 3rd place goes to ranking group if best3rd enabled
            if (cs.rankingGroupId && cs.advancePerGroup < cs.teamsPerGroup) {
                const thirdPos = cs.advancePerGroup + 1;
                advancement.push(cs.groups[g] + ',' + thirdPos + ',' + cs.rankingGroupId + ',' + (g + 1));
            }
        }
        // Best 3rd place teams from ranking group go to pots
        if (cs.rankingGroupId && cs.best3rd > 0) {
            for (let i = 1; i <= cs.best3rd; i++) {
                const targetPot = Math.min(2, numFinalPots - 1); // Best 3rd go to pot 3
                advancement.push(cs.rankingGroupId + ',' + i + ',' + finalPotGroups[targetPot] + ',' + potSlot[targetPot]);
                potSlot[targetPot]++;
            }
        }
    }
    
    // Pots → Final groups (draw)
    for (let p = 0; p < numFinalPots; p++) {
        for (let g = 0; g < config.finalNumGroups; g++) {
            advancement.push(finalPotGroups[p] + ',0,' + finalGroupIds[g] + ',' + (p + 1));
        }
    }
    
    // Final groups → First KO round / Ranking group
    const firstKO = koRoundData[0];
    
    // 3rd place teams go to ranking group if finalBest3rd enabled
    if (finalRankingGroupId && config.finalBest3rd > 0) {
        for (let g = 0; g < config.finalNumGroups; g++) {
            const thirdPos = config.finalAdvance + 1; // 3rd place
            advancement.push(finalGroupIds[g] + ',' + thirdPos + ',' + finalRankingGroupId + ',' + (g + 1));
        }
    }
    
    // Calculate how many teams advance directly vs from ranking
    const directAdvancing = config.finalNumGroups * config.finalAdvance;
    const fromRanking = config.finalBest3rd || 0;
    const totalToKO = directAdvancing + fromRanking;
    
    // Top teams go directly
    let koSlot = 1;
    for (let g = 0; g < config.finalNumGroups; g++) {
        const koMatch = g % firstKO.matches;
        advancement.push(finalGroupIds[g] + ',1,' + firstKO.groups[koMatch] + ',' + ((koSlot++ - 1) % 2 === 0 ? 1 : 2));
    }
    
    // Second place crossover
    for (let g = 0; g < config.finalNumGroups; g++) {
        const koMatch = (config.finalNumGroups - 1 - g) % firstKO.matches;
        if (config.finalAdvance >= 2) {
            advancement.push(finalGroupIds[g] + ',2,' + firstKO.groups[koMatch] + ',' + ((koSlot++ - 1) % 2 === 0 ? 1 : 2));
        }
    }
    
    // Best 3rd place teams from ranking group to first KO
    if (finalRankingGroupId && config.finalBest3rd > 0) {
        for (let i = 1; i <= config.finalBest3rd; i++) {
            const koMatch = (directAdvancing + i - 1) % firstKO.matches;
            const slot = ((directAdvancing + i - 1) % 2 === 0) ? 1 : 2;
            advancement.push(finalRankingGroupId + ',' + i + ',' + firstKO.groups[koMatch] + ',' + slot);
        }
    }
    
    // KO round advancement
    for (let r = 0; r < koRoundData.length - 1; r++) {
        const curr = koRoundData[r];
        const next = koRoundData[r + 1];
        for (let m = 0; m < curr.matches; m++) {
            advancement.push(curr.groups[m] + ',1,' + next.groups[Math.floor(m / 2)] + ',' + ((m % 2) + 1));
        }
    }
    
    // Third place match advancement (SF losers)
    if (thirdPlaceGroupId && koRoundData.length >= 2) {
        const sfRound = koRoundData[koRoundData.length - 2]; // Semi-finals
        if (sfRound.teams === 4) {
            // SF loser 1 → 3rd place match slot 1
            advancement.push(sfRound.groups[0] + ',2,' + thirdPlaceGroupId + ',1');
            // SF loser 2 → 3rd place match slot 2
            advancement.push(sfRound.groups[1] + ',2,' + thirdPlaceGroupId + ',2');
        }
    }
    
    // TASKS
    const tasks = [];
    
    console.log('fillTeams:', config.fillTeams, 'selectedNations:', config.selectedNations?.length || 0);
    
    // FillWithTeam - ONLY for initial setup pots, ONLY if fillTeams enabled
    if (config.fillTeams) {
        
        if (confedStages.length === 1) {
            // SINGLE CONFEDERATION (e.g. Euro Qualifiers)
            const pot = initialPotGroups[0];
            
            if (config.selectedNations && config.selectedNations.length > 0) {
                // Use selected teams (selectedNations contains teamIds)
                for (let i = 0; i < config.selectedNations.length; i++) {
                    tasks.push(compId + ',start,FillWithTeam,' + pot + ',' + (i + 1) + ',' + config.selectedNations[i] + ',0');
                }
            } else {
                // Auto-fill ALL teams from this confederation from database
                const confedId = confedStages[0].confedId;
                const teamsInConfed = data.teamnationlinks
                    .filter(line => {
                        const parts = line.split('\t');
                        const leagueId = parseInt(parts[1]);
                        const nationId = parseInt(parts[2]);
                        if (leagueId !== 78) return false; // Only Men's National teams (league 78)
                        const nation = hierarchy.nations.find(n => n.id === nationId);
                        return nation && nation.parent === confedId;
                    })
                    .map(line => parseInt(line.split('\t')[0])); // teamid
                
                console.log('Auto-filling', teamsInConfed.length, 'teams for confederation', confedId);
                for (let i = 0; i < teamsInConfed.length; i++) {
                    tasks.push(compId + ',start,FillWithTeam,' + pot + ',' + (i + 1) + ',' + teamsInConfed[i] + ',0');
                }
            }
        } else {
            // MULTIPLE CONFEDERATIONS (e.g. World Cup)
            
            if (config.selectedNations && config.selectedNations.length > 0) {
                // Use selected teams - distribute by confederation
                // selectedNations contains teamIds, need to map to confederations
                const teamsByConfed = {};
                for (const cs of confedStages) {
                    teamsByConfed[cs.confedId] = [];
                }
                
                for (const teamId of config.selectedNations) {
                    // Find this team's nation and confederation
                    const teamNationLink = data.teamnationlinks.find(line => {
                        const parts = line.split('\t');
                        return parseInt(parts[0]) === teamId && parseInt(parts[1]) === 78;
                    });
                    
                    if (teamNationLink) {
                        const nationId = parseInt(teamNationLink.split('\t')[2]);
                        const nation = hierarchy.nations.find(n => n.id === nationId);
                        if (nation && nation.parent && teamsByConfed[nation.parent] !== undefined) {
                            teamsByConfed[nation.parent].push(teamId);
                        }
                    }
                }
                
                for (let i = 0; i < confedStages.length; i++) {
                    const cs = confedStages[i];
                    const teams = teamsByConfed[cs.confedId] || [];
                    console.log('Confederation', cs.confedName, '(ID:', cs.confedId + '):', teams.length, 'selected teams');
                    for (let slot = 0; slot < teams.length; slot++) {
                        tasks.push(compId + ',start,FillWithTeam,' + initialPotGroups[i] + ',' + (slot + 1) + ',' + teams[slot] + ',0');
                    }
                }
            } else {
                // Auto-fill ALL teams from database grouped by confederation
                for (let i = 0; i < confedStages.length; i++) {
                    const cs = confedStages[i];
                    const teamsInConfed = data.teamnationlinks
                        .filter(line => {
                            const parts = line.split('\t');
                            const leagueId = parseInt(parts[1]);
                            const nationId = parseInt(parts[2]);
                            if (leagueId !== 78) return false; // Only Men's National teams
                            const nation = hierarchy.nations.find(n => n.id === nationId);
                            return nation && nation.parent === cs.confedId;
                        })
                        .map(line => parseInt(line.split('\t')[0])); // teamid
                    
                    console.log('Confederation', cs.confedName, '(ID:', cs.confedId + '):', teamsInConfed.length, 'teams from database');
                    for (let slot = 0; slot < teamsInConfed.length; slot++) {
                        tasks.push(compId + ',start,FillWithTeam,' + initialPotGroups[i] + ',' + (slot + 1) + ',' + teamsInConfed[slot] + ',0');
                    }
                }
            }
        }
    }
    
    // UpdateTable - champion and runner-up
    const finalKOGroup = koRoundData[koRoundData.length - 1].groups[0];
    tasks.push(compId + ',end,UpdateTable,' + compId + ',' + finalKOGroup + ',1,1');
    tasks.push(compId + ',end,UpdateTable,' + compId + ',' + finalKOGroup + ',2,2');
    
    console.log('Generated', tasks.length, 'tasks for World Cup style comp (' + (tasks.length - 2) + ' FillWithTeam, 2 UpdateTable)');
    
    // SCHEDULE
    const schedule = [];
    if (config.scheduleMode !== 'reference') {
        const intlWindows = [
            { day1: 257, day2: 258, day3: 261 },
            { day1: 292, day2: 293, day3: 296 },
            { day1: 327, day2: 328, day3: 331 },
            { day1: 451, day2: 454, day3: 455 },
            { day1: 530, day2: 531, day3: 534 },
            { day1: 622, day2: 623, day3: 625 }
        ];
        
        // Qualifying stages (all confederations play in same windows)
        let windowIdx = 0;
        for (let cs of confedStages) {
            const groupMatchdays = 2 * (cs.teamsPerGroup - 1); // Home & away
            const matchesPerRound = cs.numGroups * Math.floor(cs.teamsPerGroup / 2);
            
            for (let md = 1; md <= groupMatchdays; md++) {
                const window = intlWindows[windowIdx % intlWindows.length];
                if (md % 2 === 1) {
                    schedule.push(cs.stageId + ',' + window.day1 + ',' + md + ',' + matchesPerRound + ',' + matchesPerRound + ',1945');
                    schedule.push(cs.stageId + ',' + window.day2 + ',' + md + ',' + matchesPerRound + ',' + matchesPerRound + ',1800');
                } else {
                    schedule.push(cs.stageId + ',' + window.day3 + ',' + md + ',' + (matchesPerRound * 2) + ',' + (matchesPerRound * 2) + ',1945');
                }
            }
        }
        
        // Final tournament group stage (hosted - staggered)
        let finalStartDay = config.startDay;
        const finalMatchdays = config.finalGroupFormat * (config.finalTeamsPerGroup - 1);
        const kickoffTimes = [config.kickoff - 200, config.kickoff];
        
        for (let g = 0; g < config.finalNumGroups; g++) {
            let groupDay = finalStartDay + g;
            for (let md = 1; md <= finalMatchdays; md++) {
                if (md === finalMatchdays) {
                    schedule.push(finalGroupIds[g] + ',' + groupDay + ',' + md + ',2,2,' + kickoffTimes[1]);
                } else {
                    schedule.push(finalGroupIds[g] + ',' + groupDay + ',' + md + ',1,1,' + kickoffTimes[0]);
                    schedule.push(finalGroupIds[g] + ',' + groupDay + ',' + md + ',1,1,' + kickoffTimes[1]);
                }
                groupDay += config.gap;
            }
        }
        
        // KO rounds
        let koStartDay = finalStartDay + config.finalNumGroups + (finalMatchdays * config.gap);
        for (let r of koRoundData) {
            for (let m = 0; m < r.matches; m++) {
                if (config.koFormat === 'KO2LEGS') {
                    schedule.push(r.groups[m] + ',' + koStartDay + ',1,1,1,' + kickoffTimes[1]);
                    schedule.push(r.groups[m] + ',' + (koStartDay + config.gap) + ',2,1,1,' + kickoffTimes[1]);
                } else {
                    schedule.push(r.groups[m] + ',' + (koStartDay + m) + ',1,1,1,' + kickoffTimes[1]);
                }
            }
            koStartDay += config.koFormat === 'KO2LEGS' ? (config.gap * 2) : (r.matches + config.gap);
        }
        
        // Third place match (day before final)
        if (thirdPlaceGroupId) {
            const finalDay = koStartDay - config.gap; // Day of final
            const thirdPlaceDay = finalDay - 1; // Day before final
            schedule.push(thirdPlaceGroupId + ',' + thirdPlaceDay + ',1,1,1,' + kickoffTimes[1]);
        }
    }
    
    // INITTEAMS - champion and runner-up slots
    const initteams = [
        compId + ',0,-1',  // Champion
        compId + ',1,-1'   // Runner-up
    ];
    
    // Insert all
    data.compobj.splice(insertIdx + 1, 0, ...compobj);
    insertInOrder(data.settings, settings, compId);
    insertInOrder(data.standings, standings, confedStages[0].groups[0]);
    insertInOrder(data.advancement, advancement, confedStages[0].groups[0]);
    insertInOrder(data.tasks, tasks, compId);
    insertInOrder(data.initteams, initteams, compId);
    if (schedule.length > 0) {
        insertInOrder(data.schedule, schedule, confedStages[0].stageId);
    }
    
    insertCompId(compId);
    
    const confedList = config.confedConfigs.map(c => {
        const name = confedNames[c.confedId] || c.confedId;
        let info = name + '[' + c.assetId + ']';
        
        // Show best3rd info
        let qualInfo = c.advancePerGroup + '/grp';
        if (c.best3rd > 0) {
            qualInfo += '+' + c.best3rd + 'x3rd';
        }
        info += '(' + qualInfo + ')';
        
        // Show redirects
        if (c.includesFrom && c.includesFrom.length > 0) {
            const included = c.includesFrom.map(id => {
                const fromName = confedNames[id] || id;
                const count = c.incomingCounts?.[id] || '?';
                return count + fromName;
            }).join('+');
            info += '[+' + included + ']';
        }
        return info;
    }).join(' + ');
    const finalAsset = config.finalAssetId || config.assetId;
    finishGeneration('INTERQUAL+KO ' + config.code + ' (' + confedList + ' → Finals[' + finalAsset + '])', compId, currentId - 1);
}


