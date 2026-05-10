// DROPDOWNS
// ============================================================
function populateDropdowns() {
    // Nation parent dropdown (for Add Nation)
    const nationParent = document.getElementById('nation-parent');
    if (nationParent) {
        nationParent.innerHTML = '<option value="">-- Select Confederation --</option>';
        hierarchy.confederations.forEach(conf => {
            nationParent.innerHTML += '<option value="' + conf.id + '">' + conf.code + ' (' + conf.id + ')</option>';
        });
    }
    
    // League parent dropdown (nations only)
    const leagueParent = document.getElementById('league-parent');
    if (leagueParent) {
        leagueParent.innerHTML = '<option value="">-- Select Nation --</option>';
        hierarchy.nations.forEach(n => {
            leagueParent.innerHTML += '<option value="' + n.id + '">' + n.code + ' (' + n.id + ')</option>';
        });
    }
    
    // Cup parent dropdown (nations only)
    const cupParent = document.getElementById('cup-parent');
    if (cupParent) {
        cupParent.innerHTML = '<option value="">-- Select Nation --</option>';
        hierarchy.nations.forEach(n => {
            cupParent.innerHTML += '<option value="' + n.id + '">' + n.code + ' (' + n.id + ')</option>';
        });
    }
    
    // Club Championship parent dropdown (confederations)
    const ccParent = document.getElementById('cc-parent');
    if (ccParent) {
        ccParent.innerHTML = '<option value="0">None (Root)</option>';
        hierarchy.confederations.forEach(c => {
            ccParent.innerHTML += '<option value="' + c.id + '">' + c.code + ' (' + c.id + ')</option>';
        });
    }
    
    // League DB dropdown (from database)
    populateLeagueDbDropdown();
    populateCupSourceDropdown();
    
    // Delete competition dropdown
    populateDeleteCompList();
    
    // Expand competition dropdown
    populateExpandCompList();
}

function populateCupSourceDropdown() {
    const cupSource = document.getElementById('cup-team-source');
    if (cupSource && db.teams.length > 0) {
        cupSource.innerHTML = '<option value="">-- All Teams (' + db.teams.length + ') --</option>';
        db.leagues.forEach(l => {
            const nation = NATIONS.find(n => n.id === l.countryid);
            const teamCount = db.teamLeagues.filter(tl => tl.leagueid === l.leagueid).length;
            cupSource.innerHTML += '<option value="' + l.leagueid + '">' + escapeHtml(l.leaguename) + ' (' + (nation?.code || l.countryid) + ') - ' + teamCount + ' teams</option>';
        });
    }
}

function onCupTypeChange() {
    const cupType = document.getElementById('cup-type').value;
    document.getElementById('cup-ko-options').style.display = cupType === 'knockout' ? 'block' : 'none';
    document.getElementById('cup-group-options').style.display = cupType === 'groupko' ? 'block' : 'none';
    recalcCupGroups();
}

let allCupTeams = []; // Cache all teams for filtering

function loadTeamsForCup() {
    const leagueId = parseInt(document.getElementById('cup-team-source').value) || 0;
    const availableList = document.getElementById('cup-teams-available');
    const selectedList = document.getElementById('cup-teams-list');
    const selectedIds = new Set(Array.from(selectedList.options).map(opt => parseInt(opt.value)));
    
    availableList.innerHTML = '';
    
    let teams = [];
    if (leagueId) {
        // Filter by league
        const teamLinks = db.teamLeagues.filter(tl => tl.leagueid === leagueId);
        teams = teamLinks.map(tl => db.teams.find(t => t.teamid === tl.teamid)).filter(t => t);
    } else {
        // All teams
        teams = [...db.teams];
    }
    
    teams.sort((a, b) => a.teamname.localeCompare(b.teamname));
    allCupTeams = teams;
    
    // Add to available (excluding already selected)
    teams.forEach(t => {
        if (!selectedIds.has(t.teamid)) {
            const opt = document.createElement('option');
            opt.value = t.teamid;
            opt.textContent = t.teamname;
            availableList.appendChild(opt);
        }
    });
    
    filterCupTeams();
}

function filterCupTeams() {
    const search = document.getElementById('cup-team-search').value.toLowerCase();
    const availableList = document.getElementById('cup-teams-available');
    const selectedList = document.getElementById('cup-teams-list');
    const selectedIds = new Set(Array.from(selectedList.options).map(opt => parseInt(opt.value)));
    
    availableList.innerHTML = '';
    
    allCupTeams.forEach(t => {
        if (!selectedIds.has(t.teamid) && t.teamname.toLowerCase().includes(search)) {
            const opt = document.createElement('option');
            opt.value = t.teamid;
            opt.textContent = t.teamname;
            availableList.appendChild(opt);
        }
    });
}

function addSelectedCupTeams() {
    const availableList = document.getElementById('cup-teams-available');
    const selectedList = document.getElementById('cup-teams-list');
    
    Array.from(availableList.selectedOptions).forEach(opt => {
        const newOpt = document.createElement('option');
        newOpt.value = opt.value;
        newOpt.textContent = opt.textContent;
        selectedList.appendChild(newOpt);
        opt.remove();
    });
    
    sortSelectOptions(selectedList);
    updateCupTeamCount();
    recalcCupGroups();
}

function removeSelectedCupTeams() {
    const availableList = document.getElementById('cup-teams-available');
    const selectedList = document.getElementById('cup-teams-list');
    
    Array.from(selectedList.selectedOptions).forEach(opt => {
        const newOpt = document.createElement('option');
        newOpt.value = opt.value;
        newOpt.textContent = opt.textContent;
        availableList.appendChild(newOpt);
        opt.remove();
    });
    
    sortSelectOptions(availableList);
    updateCupTeamCount();
    recalcCupGroups();
}

function addAllCupTeams() {
    const availableList = document.getElementById('cup-teams-available');
    const selectedList = document.getElementById('cup-teams-list');
    
    Array.from(availableList.options).forEach(opt => {
        const newOpt = document.createElement('option');
        newOpt.value = opt.value;
        newOpt.textContent = opt.textContent;
        selectedList.appendChild(newOpt);
    });
    availableList.innerHTML = '';
    
    sortSelectOptions(selectedList);
    updateCupTeamCount();
    recalcCupGroups();
}

function clearCupTeams() {
    const selectedList = document.getElementById('cup-teams-list');
    selectedList.innerHTML = '';
    loadTeamsForCup();
    updateCupTeamCount();
    recalcCupGroups();
}

function sortSelectOptions(selectEl) {
    const options = Array.from(selectEl.options);
    options.sort((a, b) => a.textContent.localeCompare(b.textContent));
    selectEl.innerHTML = '';
    options.forEach(opt => selectEl.appendChild(opt));
}

function updateCupTeamCount() {
    const selectedList = document.getElementById('cup-teams-list');
    const count = selectedList.options.length;
    document.getElementById('cup-team-count').textContent = '(' + count + ')';
}

function recalcCupGroups() {
    const cupType = document.getElementById('cup-type').value;
    if (cupType !== 'groupko') return;
    
    const teamsList = document.getElementById('cup-teams-list');
    const selectedTeams = teamsList.options.length;
    const teamsPerGroup = parseInt(document.getElementById('cup-teams-per-group').value) || 4;
    
    if (selectedTeams > 0 && teamsPerGroup > 0) {
        const numGroups = Math.floor(selectedTeams / teamsPerGroup);
        document.getElementById('cup-num-groups').value = numGroups;
        recalcKoTeams();
    }
}

function recalcCupFromGroups() {
    recalcKoTeams();
}

function recalcKoTeams() {
    const numGroups = parseInt(document.getElementById('cup-num-groups').value) || 8;
    const advancePerGroup = parseInt(document.getElementById('cup-advance-per-group').value) || 2;
    const koTeams = numGroups * advancePerGroup;
    
    // Find next power of 2
    let koBracket = 2;
    while (koBracket < koTeams) koBracket *= 2;
    
    document.getElementById('cup-ko-auto').value = koTeams + ' teams → ' + getRoundName(koBracket) + ' bracket';
}

function getRoundName(teams) {
    if (teams === 2) return 'Final';
    if (teams === 4) return 'SF';
    if (teams === 8) return 'QF';
    if (teams === 16) return 'R16';
    if (teams === 32) return 'R32';
    return 'R' + teams;
}

function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function populateLeagueDbDropdown() {
    const leagueDb = document.getElementById('league-dbid');
    if (leagueDb && db.leagues.length > 0) {
        leagueDb.innerHTML = '<option value="">-- Select League DB --</option>';
        db.leagues.forEach(l => {
            const nation = NATIONS.find(n => n.id === l.countryid);
            const teamCount = db.teamLeagues.filter(tl => tl.leagueid === l.leagueid).length;
            leagueDb.innerHTML += '<option value="' + l.leagueid + '">' + escapeHtml(l.leaguename) + ' (' + (nation?.code || l.countryid) + ') - ' + teamCount + ' teams</option>';
        });
    }
}

function onLeagueDbSelect() {
    const leagueId = parseInt(document.getElementById('league-dbid').value);
    if (!leagueId) return;
    
    // Count teams in this league
    const teamCount = db.teamLeagues.filter(tl => tl.leagueid === leagueId).length;
    if (teamCount > 0) {
        document.getElementById('league-teams').value = teamCount;
    }
    
    // Auto-fill asset ID to match league DB ID
    document.getElementById('league-assetid').value = leagueId;
    
    // Auto-fill code
    document.getElementById('league-code').value = 'C' + leagueId;
    
    // Auto-select parent nation if we can find it
    const league = db.leagues.find(l => l.leagueid === leagueId);
    if (league) {
        // Find nation in hierarchy by matching FIFA nation ID
        const nationRow = hierarchy.nations.find(n => {
            const nation = NATIONS.find(nat => nat.code === n.code);
            return nation && nation.id === league.countryid;
        });
        if (nationRow) {
            document.getElementById('league-parent').value = nationRow.id;
        }
    }
}

// ============================================================
// NATION SEARCH
// ============================================================
function searchNations() {
    const search = document.getElementById('nation-search').value.toLowerCase();
    const container = document.getElementById('nation-search-results');
    
    if (search.length < 2) {
        container.innerHTML = '';
        return;
    }
    
    const matches = NATIONS.filter(n => 
        n.name.toLowerCase().includes(search) || 
        n.code.toLowerCase().includes(search)
    ).slice(0, 10);
    
    if (matches.length === 0) {
        container.innerHTML = '<div style="color:#8b949e;padding:8px">No matches found</div>';
        return;
    }
    
    let html = '';
    matches.forEach(n => {
        html += '<div onclick="selectNation(' + n.id + ',\'' + n.code + '\',\'' + n.name.replace(/'/g, "\\'") + '\')" style="padding:8px;cursor:pointer;border-bottom:1px solid #30363d">';
        html += '<strong>' + n.name + '</strong> (' + n.code + ') - ID: ' + n.id;
        html += '</div>';
    });
    container.innerHTML = html;
}

function selectNation(id, code, name) {
    document.getElementById('nation-code').value = code;
    document.getElementById('nation-id').value = id;
    document.getElementById('nation-search').value = name;
    document.getElementById('nation-search-results').innerHTML = '';
    
    // Auto-select confederation
    let confedCode = getConfedForNation(id);
    if (confedCode && hierarchy.confederations.length > 0) {
        const conf = hierarchy.confederations.find(c => c.code === confedCode);
        if (conf) {
            document.getElementById('nation-parent').value = conf.id;
        }
    }
    
    // Auto-select weather for Middle East nations
    if (confedCode === 'AFC' || confedCode === 'CAF') {
        const nid = parseInt(id);
        if ([183,190,182,168,150,178,164,162,186,171,180,111,129,97,145,123,193].includes(nid)) {
            document.getElementById('nation-weather').value = 'middleeast';
        }
    }
}

function getConfedForNation(id) {
    const nid = parseInt(id);
    if (nid <= 51 || nid === 205 || nid === 208 || nid === 219) return 'UEFA';
    if (nid >= 52 && nid <= 61) return 'CNBL';
    if ((nid >= 62 && nid <= 96) || nid === 207) return 'CCAF';
    if ((nid >= 97 && nid <= 148) || nid === 214 || nid === 218) return 'CAF';
    if ((nid >= 149 && nid <= 193) || nid === 212 || nid === 213) return 'AFC';
    if ((nid >= 194 && nid <= 204) || nid === 215) return 'OFC';
    return null;
}

function showNationGroup(groupName) {
    const nationIds = NATION_GROUPS[groupName];
    if (!nationIds) return;
    
    const nations = NATIONS.filter(n => nationIds.includes(n.id));
    const container = document.getElementById('nation-group-list');
    
    let html = '<div style="color:#58a6ff;margin-bottom:8px"><strong>' + groupName + '</strong> - Click to select:</div>';
    nations.forEach(n => {
        html += '<button class="btn btn-secondary btn-small" onclick="selectNation(' + n.id + ',\'' + n.code + '\',\'' + n.name.replace(/'/g, "\\'") + '\')" style="margin:2px">' + n.code + '</button>';
    });
    container.innerHTML = html;
    
    // Auto-select confed
    const confedMap = { 'GCC': 'AFC', 'Asia': 'AFC', 'Europe': 'UEFA', 'South America': 'CNBL', 'Africa': 'CAF', 'CONCACAF': 'CCAF' };
    const targetCode = confedMap[groupName];
    if (targetCode && hierarchy.confederations.length > 0) {
        const conf = hierarchy.confederations.find(c => c.code === targetCode);
        if (conf) {
            document.getElementById('nation-parent').value = conf.id;
        }
    }
}

// ============================================================
// ADD NATION
// ============================================================
function addNation() {
    // Validate
    if (data.compobj.length === 0) {
        toast('Load compobj.txt first', 'error');
        return;
    }
    
    const parentId = document.getElementById('nation-parent').value;
    const code = document.getElementById('nation-code').value.trim().toUpperCase();
    const nationId = document.getElementById('nation-id').value.trim();
    
    if (!parentId) {
        toast('Select a parent confederation', 'error');
        return;
    }
    
    if (!code || !nationId) {
        toast('Enter nation code and FIFA nation ID', 'error');
        return;
    }
    
    // Check for duplicates
    for (let i = 0; i < data.compobj.length; i++) {
        const parts = data.compobj[i].split(',');
        if (parts.length >= 5 && parts[1].trim() === '2') {
            const existingCode = parts[2].trim().toUpperCase();
            const existingName = parts[3].trim();
            
            if (existingCode === code) {
                toast('Nation ' + code + ' already exists in compobj', 'error');
                return;
            }
            if (existingName === 'NationName_' + nationId) {
                toast('Nation ID ' + nationId + ' already exists in compobj', 'error');
                return;
            }
        }
    }
    
    // Find insert position after ALL descendants of parent confederation
    const { insertIdx, insertRowId } = findCompInsertPosition(parseInt(parentId));
    
    // Save state before adding nation for undo
    saveState('Add Nation ' + code);
    
    // Renumber everything >= insertRowId up by 1
    renumberAllFiles(insertRowId, 1);
    
    // Create compobj line with the sequential ID
    const nationName = 'NationName_' + nationId;
    const newCompobj = insertRowId + ',2,' + code + ',' + nationName + ',' + parentId;
    
    if (insertIdx >= 0) {
        data.compobj.splice(insertIdx + 1, 0, newCompobj);
    } else {
        data.compobj.push(newCompobj);
    }
    
    // Create settings in sorted order by nation ID
    const season = document.getElementById('nation-season').value;
    const yellows = document.getElementById('nation-yellows').value;
    const redban = document.getElementById('nation-redban').value;
    const intldep = document.getElementById('nation-intldep').value;
    
    const newSettings = [
        insertRowId + ',nation_id,' + nationId,
        insertRowId + ',rule_suspension,' + insertRowId,
        insertRowId + ',schedule_seasonstartmonth,' + season,
        insertRowId + ',rule_yellowstored,' + yellows,
        insertRowId + ',rule_redsuspensionlength_min,' + redban,
        insertRowId + ',rule_redsuspensionlength_max,' + redban
    ];
    if (intldep !== 'NONE') {
        newSettings.push(insertRowId + ',intldep,' + intldep);
    }
    
    insertInOrder(data.settings, newSettings, insertRowId);
    
    // Create weather at the correct position
    const weatherPreset = document.getElementById('nation-weather').value;
    const w = WEATHER_PRESETS[weatherPreset] || WEATHER_PRESETS.europe;
    
    const newWeather = [];
    for (let month = 1; month <= 12; month++) {
        const earlyKick = w.sunny >= 70 ? 1800 : 1500;
        const lateKick = w.sunny >= 70 ? 2100 : 2000;
        newWeather.push(insertRowId + ',' + month + ',' + w.sunny + ',' + w.cloudy + ',' + w.rainy + ',' + w.snowy + ',' + w.temp + ',' + earlyKick + ',' + lateKick);
    }
    
    insertInOrder(data.weather, newWeather, insertRowId);
    
    // Ensure all files are in correct ID order
    sortAllData();
    
    // Update UI
    updateBadge('compobj');
    updateBadge('settings');
    updateBadge('weather');
    
    parseHierarchy();
    populateDropdowns();
    updatePreview();
    
    // Clear form
    document.getElementById('nation-code').value = '';
    document.getElementById('nation-id').value = '';
    document.getElementById('nation-search').value = '';
    
    toast('Added ' + code + ' (Row ID: ' + insertRowId + ')');
    console.log('Added:', newCompobj);
}

// ============================================================
// PREVIEW
// ============================================================
let currentPreview = null;

function showPreview(fileType) {
    currentPreview = fileType;
    const container = document.getElementById('preview-container');
    const lines = data[fileType] || [];
    const originalLines = data.original[fileType] || [];
    
    if (lines.length === 0) {
        container.innerHTML = '<span style="color:#8b949e">No data loaded for ' + fileType + '</span>';
        return;
    }
    
    // Build a set of original lines to detect truly new/changed content
    const originalSet = new Set(originalLines);
    let newCount = 0;
    for (let i = 0; i < lines.length; i++) {
        if (!originalSet.has(lines[i])) newCount++;
    }
    const hasChanges = newCount > 0;
    
    // Build header
    let html = '<div style="color:#8b949e;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #30363d">';
    html += '<strong>' + fileType + '.txt</strong> - ' + lines.length + ' lines';
    if (hasChanges) {
        html += ' <span style="color:#238636">(+' + newCount + ' new)</span>';
    }
    html += '</div>';
    
    // Show ALL lines — highlight any line not present in original data
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isNew = !originalSet.has(line);
        const lineNum = '<span style="color:#6e7681;margin-right:10px;display:inline-block;width:45px;text-align:right">' + (i + 1) + '</span>';
        
        if (isNew) {
            html += '<div style="background:rgba(35,134,54,0.3);padding:2px 4px;margin:1px 0;border-radius:3px;border-left:3px solid #238636">' + lineNum + escapeHtml(line) + '</div>';
        } else {
            html += '<div style="padding:2px 4px">' + lineNum + escapeHtml(line) + '</div>';
        }
    }
    
    container.innerHTML = html;
    
    // Scroll to bottom if there are new lines
    if (hasChanges) {
        container.scrollTop = container.scrollHeight;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateBadge(fileType) {
    const countEl = document.getElementById('count-' + fileType);
    const fileItem = document.getElementById('file-' + fileType);
    const statusEl = document.getElementById('status-' + fileType);
    
    const current = data[fileType]?.length || 0;
    const originalLines = data.original[fileType] || [];
    const originalSet = new Set(originalLines);
    let newCount = 0;
    if (data[fileType]) {
        for (let i = 0; i < data[fileType].length; i++) {
            if (!originalSet.has(data[fileType][i])) newCount++;
        }
    }
    
    if (countEl) {
        if (newCount > 0) {
            countEl.textContent = current + ' (+' + newCount + ')';
            countEl.classList.add('new');
        } else {
            countEl.textContent = current;
            countEl.classList.remove('new');
        }
    }
    
    if (fileItem && newCount > 0) {
        fileItem.classList.add('changed');
    }
    
    if (statusEl && newCount > 0) {
        statusEl.textContent = current + ' lines (+' + newCount + ' new)';
        statusEl.style.color = '#238636';
    }
}

function updatePreview() {
    if (currentPreview) {
        showPreview(currentPreview);
    }
}

// Show database preview in a readable format
function showDbPreview(name) {
    const container = document.getElementById('preview-container');
    
    let items = [];
    let html = '';
    
    if (name === 'teams') {
        items = db.teams;
        html = '<div style="color:#8b949e;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #30363d"><strong>teams</strong> - ' + items.length + ' teams</div>';
        items.slice(0, 200).forEach((t, i) => {
            html += '<div style="padding:2px 4px"><span style="color:#6e7681;width:45px;display:inline-block">' + (i+1) + '</span>';
            html += '<span style="color:#58a6ff;width:60px;display:inline-block">' + t.teamid + '</span>';
            html += escapeHtml(t.teamname) + '</div>';
        });
        if (items.length > 200) html += '<div style="color:#8b949e">... and ' + (items.length - 200) + ' more</div>';
    }
    
    if (name === 'leagues') {
        items = db.leagues;
        html = '<div style="color:#8b949e;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #30363d"><strong>leagues</strong> - ' + items.length + ' leagues</div>';
        items.forEach((l, i) => {
            const nation = NATIONS.find(n => n.id === l.countryid);
            html += '<div style="padding:2px 4px"><span style="color:#6e7681;width:45px;display:inline-block">' + (i+1) + '</span>';
            html += '<span style="color:#58a6ff;width:50px;display:inline-block">' + l.leagueid + '</span>';
            html += '<span style="color:#f0883e;width:60px;display:inline-block">' + (nation?.code || l.countryid) + '</span>';
            html += escapeHtml(l.leaguename) + '</div>';
        });
    }
    
    if (name === 'leagueteamlinks') {
        items = db.teamLeagues;
        html = '<div style="color:#8b949e;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #30363d"><strong>leagueteamlinks</strong> - ' + items.length + ' links</div>';
        items.slice(0, 200).forEach((l, i) => {
            const team = db.teams.find(t => t.teamid === l.teamid);
            const league = db.leagues.find(lg => lg.leagueid === l.leagueid);
            html += '<div style="padding:2px 4px"><span style="color:#6e7681;width:45px;display:inline-block">' + (i+1) + '</span>';
            html += '<span style="color:#58a6ff;width:60px;display:inline-block">' + l.teamid + '</span>';
            html += '<span style="color:#f0883e;width:150px;display:inline-block">' + (team?.teamname || '?') + '</span>';
            html += '→ ' + (league?.leaguename || 'League ' + l.leagueid) + '</div>';
        });
        if (items.length > 200) html += '<div style="color:#8b949e">... and ' + (items.length - 200) + ' more</div>';
    }
    
    if (name === 'teamnationlinks') {
        items = db.teamNations;
        html = '<div style="color:#8b949e;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #30363d"><strong>teamnationlinks</strong> - ' + items.length + ' national team links</div>';
        items.forEach((l, i) => {
            const team = db.teams.find(t => t.teamid === l.teamid);
            const nation = NATIONS.find(n => n.id === l.nationid);
            html += '<div style="padding:2px 4px"><span style="color:#6e7681;width:45px;display:inline-block">' + (i+1) + '</span>';
            html += '<span style="color:#58a6ff;width:60px;display:inline-block">' + l.teamid + '</span>';
            html += '<span style="color:#f0883e;width:150px;display:inline-block">' + (team?.teamname || '?') + '</span>';
            html += '→ ' + (nation?.name || 'Nation ' + l.nationid) + '</div>';
        });
    }
    
    if (items.length === 0) {
        html = '<span style="color:#8b949e">No data loaded for ' + name + '. Load the database file first.</span>';
    }
    
    container.innerHTML = html;
}

// Database lookup functions
function getTeamById(teamid) {
    return db.teams.find(t => t.teamid === teamid);
}

function getTeamsByLeague(leagueid) {
    const teamIds = db.teamLeagues.filter(l => l.leagueid === leagueid).map(l => l.teamid);
    return db.teams.filter(t => teamIds.includes(t.teamid));
}

function getTeamsByNation(nationid) {
    const teamIds = db.teamNations.filter(l => l.nationid === nationid).map(l => l.teamid);
    return db.teams.filter(t => teamIds.includes(t.teamid));
}

function getLeaguesByNation(nationid) {
    return db.leagues.filter(l => l.countryid === nationid);
}

function searchTeams(query) {
    const q = query.toLowerCase();
    return db.teams.filter(t => t.teamname.toLowerCase().includes(q)).slice(0, 20);
}

// Database Browser functions
function dbSearchTeams() {
    const query = document.getElementById('db-search').value;
    const container = document.getElementById('db-search-results');
    
    if (query.length < 2) {
        container.innerHTML = '';
        return;
    }
    
    const matches = searchTeams(query);
    if (matches.length === 0) {
        container.innerHTML = '<div style="color:#8b949e;padding:8px">No teams found</div>';
        return;
    }
    
    let html = '';
    matches.forEach(t => {
        const league = db.teamLeagues.find(l => l.teamid === t.teamid);
        const leagueInfo = league ? db.leagues.find(l => l.leagueid === league.leagueid) : null;
        html += '<div style="padding:6px 8px;border-bottom:1px solid #30363d;display:flex;justify-content:space-between">';
        html += '<span><strong>' + escapeHtml(t.teamname) + '</strong> <span style="color:#6e7681">(ID: ' + t.teamid + ')</span></span>';
        html += '<span style="color:#8b949e">' + (leagueInfo ? escapeHtml(leagueInfo.leaguename) : '') + '</span>';
        html += '</div>';
    });
    container.innerHTML = html;
}

function populateDbDropdowns() {
    // Populate nation dropdown with nations that have leagues
    const nationSelect = document.getElementById('db-nation');
    if (!nationSelect) return;
    
    const nationIds = [...new Set(db.leagues.map(l => l.countryid))];
    nationSelect.innerHTML = '<option value="">-- Select Nation --</option>';
    
    nationIds.sort((a, b) => {
        const nA = NATIONS.find(n => n.id === a);
        const nB = NATIONS.find(n => n.id === b);
        return (nA?.name || '').localeCompare(nB?.name || '');
    }).forEach(nid => {
        const nation = NATIONS.find(n => n.id === nid);
        if (nation) {
            nationSelect.innerHTML += '<option value="' + nid + '">' + nation.name + ' (' + nation.code + ')</option>';
        }
    });
}

function dbLoadNation() {
    const nationId = parseInt(document.getElementById('db-nation').value);
    const leagueSelect = document.getElementById('db-league');
    
    // Populate league dropdown
    leagueSelect.innerHTML = '<option value="">-- All Leagues --</option>';
    
    if (nationId) {
        const leagues = db.leagues.filter(l => l.countryid === nationId);
        leagues.forEach(l => {
            leagueSelect.innerHTML += '<option value="' + l.leagueid + '">' + escapeHtml(l.leaguename) + '</option>';
        });
        
        // Show all teams from this nation's leagues
        dbShowTeamsForNation(nationId);
        
        // Show national team players
        dbShowNationalTeam(nationId);
    }
}

function dbLoadLeague() {
    const leagueId = parseInt(document.getElementById('db-league').value);
    if (leagueId) {
        dbShowTeamsForLeague(leagueId);
    } else {
        // Show all teams for selected nation
        const nationId = parseInt(document.getElementById('db-nation').value);
        if (nationId) dbShowTeamsForNation(nationId);
    }
}

function dbShowTeamsForNation(nationId) {
    const leagues = db.leagues.filter(l => l.countryid === nationId);
    const leagueIds = leagues.map(l => l.leagueid);
    const teamLinks = db.teamLeagues.filter(l => leagueIds.includes(l.leagueid));
    const teamIds = teamLinks.map(l => l.teamid);
    const teams = db.teams.filter(t => teamIds.includes(t.teamid));
    
    dbRenderTeamList(teams, leagues);
}

function dbShowTeamsForLeague(leagueId) {
    const teamLinks = db.teamLeagues.filter(l => l.leagueid === leagueId);
    const teamIds = teamLinks.map(l => l.teamid);
    const teams = db.teams.filter(t => teamIds.includes(t.teamid));
    const league = db.leagues.find(l => l.leagueid === leagueId);
    
    dbRenderTeamList(teams, league ? [league] : []);
}

function dbRenderTeamList(teams, leagues) {
    const container = document.getElementById('db-teams-list');
    document.getElementById('db-team-count').textContent = teams.length;
    
    if (teams.length === 0) {
        container.innerHTML = '<div style="color:#8b949e">No teams found</div>';
        return;
    }
    
    let html = '<table><thead><tr><th>ID</th><th>Team Name</th><th>League</th></tr></thead><tbody>';
    
    teams.sort((a, b) => a.teamname.localeCompare(b.teamname)).forEach(t => {
        const link = db.teamLeagues.find(l => l.teamid === t.teamid);
        const league = link ? leagues.find(l => l.leagueid === link.leagueid) : null;
        html += '<tr>';
        html += '<td style="color:#6e7681">' + t.teamid + '</td>';
        html += '<td>' + escapeHtml(t.teamname) + '</td>';
        html += '<td style="color:#8b949e">' + (league ? escapeHtml(league.leaguename) : '-') + '</td>';
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function dbShowNationalTeam(nationId) {
    const container = document.getElementById('db-national-list');
    const links = db.teamNations.filter(l => l.nationid === nationId);
    
    document.getElementById('db-national-count').textContent = links.length;
    
    if (links.length === 0) {
        container.innerHTML = '<div style="color:#8b949e">No national team links found for this nation</div>';
        return;
    }
    
    let html = '<table><thead><tr><th>ID</th><th>Team/Player</th><th>League</th></tr></thead><tbody>';
    
    links.forEach(l => {
        const team = db.teams.find(t => t.teamid === l.teamid);
        const league = db.leagues.find(lg => lg.leagueid === l.leagueid);
        html += '<tr>';
        html += '<td style="color:#6e7681">' + l.teamid + '</td>';
        html += '<td>' + (team ? escapeHtml(team.teamname) : 'ID: ' + l.teamid) + '</td>';
        html += '<td style="color:#8b949e">' + (league ? escapeHtml(league.leaguename) : 'League ' + l.leagueid) + '</td>';
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ============================================================
// EXPORT
// ============================================================
function exportFile(fileType) {
    if (!data[fileType] || data[fileType].length === 0) {
        toast('No data to export', 'error');
        return;
    }
    
    const content = data[fileType].join('\r\n') + '\r\n';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileType + '.txt';
    a.click();
    
    URL.revokeObjectURL(url);
    toast('Exported ' + fileType + '.txt');
}

function exportAll() {
    const allFiles = ['compobj', 'settings', 'schedule', 'standings', 'advancement', 'tasks', 'objectives', 'initteams', 'compids', 'weather'];
    let exported = 0;
    
    allFiles.forEach(f => {
        if (data[f] && data[f].length > 0) {
            const original = data.original[f] || [];
            if (data[f].length !== original.length || JSON.stringify(data[f]) !== JSON.stringify(original)) {
                exportFile(f);
                exported++;
            }
        }
    });
    
    if (exported === 0) {
        toast('No changes to export', 'error');
    }
}

function exportZip() {
    // Export only changed files as ZIP
    const allFiles = ['compobj', 'settings', 'schedule', 'standings', 'advancement', 'tasks', 'objectives', 'initteams', 'compids', 'weather'];
    const zip = new JSZip();
    let fileCount = 0;
    
    allFiles.forEach(f => {
        if (data[f] && data[f].length > 0) {
            const original = data.original[f] || [];
            if (data[f].length !== original.length || JSON.stringify(data[f]) !== JSON.stringify(original)) {
                const content = data[f].join('\r\n') + '\r\n';
                zip.file(f + '.txt', content);
                fileCount++;
            }
        }
    });
    
    if (fileCount === 0) {
        toast('No changes to export', 'error');
        return;
    }
    
    zip.generateAsync({ type: 'blob' }).then(function(content) {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'compdata_export.zip';
        a.click();
        URL.revokeObjectURL(url);
        toast('Exported ' + fileCount + ' files as ZIP');
    });
}

function exportZipAll() {
    // Export ALL files as ZIP (even unchanged)
    const allFiles = ['compobj', 'settings', 'schedule', 'standings', 'advancement', 'tasks', 'objectives', 'initteams', 'compids', 'weather'];
    const zip = new JSZip();
    let fileCount = 0;
    
    allFiles.forEach(f => {
        if (data[f] && data[f].length > 0) {
            const content = data[f].join('\r\n') + '\r\n';
            zip.file(f + '.txt', content);
            fileCount++;
        }
    });
    
    if (fileCount === 0) {
        toast('No data to export', 'error');
        return;
    }
    
    zip.generateAsync({ type: 'blob' }).then(function(content) {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'compdata_full.zip';
        a.click();
        URL.revokeObjectURL(url);
        toast('Exported ' + fileCount + ' files as ZIP');
    });
}