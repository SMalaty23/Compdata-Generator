// ============================================================
// EXPAND COMPETITION
// ============================================================

let expandCompData = {
    compId: null,
    compType: null, // LEAGUE, CUP, INTERCUP, INTERQUAL, etc.
    currentTeams: 0,
    stages: [],
    groups: [],
    settings: []
};

function populateExpandCompList() {
    const select = document.getElementById('exp-comp-select');
    const parentFilter = document.getElementById('exp-parent-filter');
    
    if (!select || !parentFilter) return;
    
    // Populate parent filter
    parentFilter.innerHTML = '<option value="">-- All --</option>';
    hierarchy.confederations.forEach(c => {
        parentFilter.innerHTML += '<option value="' + c.id + '">' + c.code + ' (Confed)</option>';
    });
    hierarchy.nations.forEach(n => {
        parentFilter.innerHTML += '<option value="' + n.id + '">' + n.code + ' (Nation)</option>';
    });
    
    filterExpandCompList();
}

function filterExpandCompList() {
    const select = document.getElementById('exp-comp-select');
    const parentFilter = document.getElementById('exp-parent-filter').value;
    const searchFilter = document.getElementById('exp-search').value.toLowerCase();
    
    select.innerHTML = '';
    
    if (hierarchy.competitions.length === 0) {
        select.innerHTML = '<option value="">-- Load compdata first --</option>';
        return;
    }
    
    hierarchy.competitions.filter(c => {
        if (parentFilter && c.parent !== parentFilter) return false;
        if (searchFilter) {
            const matchCode = c.code.toLowerCase().includes(searchFilter);
            const matchName = c.name.toLowerCase().includes(searchFilter);
            if (!matchCode && !matchName) return false;
        }
        return true;
    }).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.code + ' - ' + c.name + ' (ID: ' + c.id + ')';
        select.appendChild(opt);
    });
    
    if (select.options.length === 0) {
        select.innerHTML = '<option value="">-- No competitions found --</option>';
    }
}

function loadCompForExpand() {
    const select = document.getElementById('exp-comp-select');
    const compId = select.value;
    const infoDiv = document.getElementById('exp-current-info');
    const optionsSection = document.getElementById('exp-options-section');
    
    if (!compId) {
        infoDiv.innerHTML = '<span style="color:#8b949e">Select a competition to see its structure</span>';
        optionsSection.style.display = 'none';
        expandCompData = { compId: null, compType: null, currentTeams: 0, stages: [], groups: [], settings: [], leagueTeams: 0 };
        return;
    }
    
    // Find competition type from settings
    let compType = 'UNKNOWN';
    const compSettings = data.settings.filter(line => line.split(',')[0].trim() === compId);
    
    for (const line of compSettings) {
        const parts = line.split(',');
        if (parts[1]?.trim() === 'comp_type') {
            compType = parts[2]?.trim() || 'UNKNOWN';
            break;
        }
    }
    
    // Find all children (stages/groups) of this competition
    const stages = [];
    const groups = [];
    
    function findChildren(parentId, depth = 0) {
        data.compobj.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 5 && parts[4].trim() === parentId.toString()) {
                const childId = parts[0].trim();
                const type = parts[1].trim();
                const code = parts[2].trim();
                const name = parts[3].trim();
                
                if (type === '4') { // Stage
                    stages.push({ id: childId, code, name });
                    findChildren(childId, depth + 1);
                } else if (type === '5') { // Group
                    groups.push({ id: childId, code, name, parent: parentId });
                }
            }
        });
    }
    findChildren(parseInt(compId));
    
    console.log('=== COMP LOADED ===');
    console.log('CompID:', compId, 'Type:', compType);
    console.log('Stages:', stages.map(s => s.code + '/' + s.name + '(' + s.id + ')').join(', '));
    console.log('Groups:', groups.length);
    
    // Count teams from tasks or standings
    // For INTERCUP/INTERQUAL: count from tasks (most reliable)
    // For other types: count from standings
    let teamCount = 0;
    
    if (compType === 'INTERCUP' || compType === 'INTERQUAL') {
        // Count teams from various task types
        // Get all compobj IDs (comp + stages + groups)
        const allIds = new Set([compId]);
        stages.forEach(s => allIds.add(s.id));
        groups.forEach(g => allIds.add(g.id));
        
        data.tasks.forEach(line => {
            const parts = line.split(',');
            if (!allIds.has(parts[0]?.trim())) return;
            
            const taskType = parts[2]?.trim();
            
            // FillWithTeam: compId,timing,FillWithTeam,groupId,slot,teamId,0
            if (taskType === 'FillWithTeam') {
                teamCount++;
            }
            // FillFromCompTable: compId,timing,FillFromCompTable,groupId,sourceCompId,count,startPos
            else if (taskType === 'FillFromCompTable') {
                const count = parseInt(parts[5]?.trim()) || 0;
                teamCount += count;
            }
            // FillFromLeague: compId,timing,FillFromLeague,groupId,leagueId,count,startPos
            else if (taskType === 'FillFromLeague') {
                const count = parseInt(parts[5]?.trim()) || 0;
                teamCount += count;
            }
            // FillFromTable: compId,timing,FillFromTable,groupId,sourceGroupId,count,startPos
            else if (taskType === 'FillFromTable') {
                const count = parseInt(parts[5]?.trim()) || 0;
                teamCount += count;
            }
        });
        
        // Fallback to initteams count if no tasks found
        if (teamCount === 0) {
            teamCount = data.initteams.filter(line => {
                const parts = line.split(',');
                return parts[0]?.trim() === compId;
            }).length;
        }
        
        // Final fallback to setup stage standings
        if (teamCount === 0 && stages.length > 0) {
            const setupStageId = stages[0].id;
            const setupGroups = groups.filter(g => g.parent.toString() === setupStageId);
            setupGroups.forEach(g => {
                let groupMax = 0;
                data.standings.forEach(line => {
                    const parts = line.split(',');
                    if (parts[0].trim() === g.id) {
                        const pos = parseInt(parts[1]?.trim()) || 0;
                        if (pos > groupMax) groupMax = pos;
                    }
                });
                teamCount += groupMax;
            });
        }
    } else if (groups.length > 0) {
        // For other comp types, count from all groups
        groups.forEach(g => {
            let groupMax = 0;
            data.standings.forEach(line => {
                const parts = line.split(',');
                if (parts[0].trim() === g.id) {
                    const pos = parseInt(parts[1]?.trim()) || 0;
                    if (pos > groupMax) groupMax = pos;
                }
            });
            teamCount += groupMax;
        });
    }
    
    // If no standings, try to get from settings (for leagues)
    if (teamCount === 0) {
        for (const line of compSettings) {
            const parts = line.split(',');
            if (parts[1]?.trim() === 'num_teams') {
                teamCount = parseInt(parts[2]?.trim()) || 0;
                break;
            }
        }
    }
    
    // Check leagueteamlinks for actual team count (for friendlies and similar)
    let leagueTeamCount = 0;
    
    // First find the asset_id for this competition
    let assetId = null;
    for (const line of compSettings) {
        const parts = line.split(',');
        if (parts[1]?.trim() === 'asset_id') {
            assetId = parseInt(parts[2]?.trim()) || null;
            break;
        }
    }
    
    // For international comps, count teams in league 78 (Men's National)
    // For other comps, use asset_id
    const isInternational = compType === 'INTERCUP' || compType === 'INTERQUAL' || compType === 'INTERFRIENDLY';
    const leagueToCheck = isInternational ? 78 : assetId;
    
    if (leagueToCheck && db.teamLeagues && db.teamLeagues.length > 0) {
        leagueTeamCount = db.teamLeagues.filter(tl => tl.leagueid === leagueToCheck).length;
        console.log('League to check:', leagueToCheck, 'Teams in leagueteamlinks:', leagueTeamCount);
    } else {
        console.log('League to check:', leagueToCheck, 'db.teamLeagues:', db.teamLeagues?.length || 0);
    }
    
    // Store data
    expandCompData = {
        compId: compId,
        compType: compType,
        currentTeams: teamCount,
        stages: stages,
        groups: groups,
        settings: compSettings,
        leagueTeams: leagueTeamCount,
        assetId: assetId
    };
    
    // Build info display
    let html = '<div style="color:#58a6ff;font-weight:bold">Competition: ' + compId + '</div>';
    html += '<div style="margin-top:6px">Type: <span style="color:#f0883e">' + compType + '</span></div>';
    if (assetId) {
        html += '<div>Asset ID: <span style="color:#8b949e">' + assetId + '</span></div>';
    }
    
    // Show team count with appropriate label
    if (compType === 'INTERCUP' || compType === 'INTERQUAL') {
        html += '<div>Teams (from tasks): <span style="color:#238636">' + teamCount + '</span></div>';
    } else {
        html += '<div>Teams in standings: <span style="color:#238636">' + teamCount + '</span></div>';
    }
    
    if (leagueTeamCount > 0) {
        html += '<div>Teams in leagueteamlinks: <span style="color:#58a6ff">' + leagueTeamCount + '</span></div>';
    } else if (compType === 'INTERFRIENDLY' || compType === 'FRIENDLY') {
        html += '<div style="color:#f0883e">⚠️ Load database files (leagueteamlinks) to see actual team count</div>';
    }
    html += '<div>Stages: ' + stages.length + ' | Groups: ' + groups.length + '</div>';
    
    if (stages.length > 0) {
        html += '<div style="margin-top:8px;font-size:0.7rem">Stages: ' + stages.map(s => s.code).join(', ') + '</div>';
    }
    if (groups.length > 0) {
        html += '<div style="font-size:0.7rem">Groups: ' + groups.map(g => g.code).join(', ') + '</div>';
    }
    
    infoDiv.innerHTML = html;
    
    // Show appropriate options based on type
    optionsSection.style.display = 'block';
    document.getElementById('exp-league-options').style.display = 'none';
    document.getElementById('exp-cup-options').style.display = 'none';
    document.getElementById('exp-group-options').style.display = 'none';
    document.getElementById('exp-friendly-options').style.display = 'none';
    
    // Show appropriate options based on type
    // IMPORTANT: Check INTERCUP/INTERQUAL first, before friendly detection
    if (compType === 'INTERCUP' || compType === 'INTERQUAL' || compType.includes('GROUP')) {
        document.getElementById('exp-group-options').style.display = 'block';
        document.getElementById('exp-group-current').value = teamCount;
        document.getElementById('exp-group-new').value = teamCount + 8;
        calcExpandGroups();
    } else if (compType === 'INTERFRIENDLY' || compType === 'FRIENDLY') {
        document.getElementById('exp-friendly-options').style.display = 'block';
        document.getElementById('exp-friendly-current').value = teamCount;
        document.getElementById('exp-friendly-dbteams').value = leagueTeamCount;
        document.getElementById('exp-friendly-toadd').value = Math.max(0, leagueTeamCount - teamCount);
        document.getElementById('exp-friendly-new').value = leagueTeamCount > 0 ? leagueTeamCount : teamCount;
    } else if (compType === 'LEAGUE') {
        document.getElementById('exp-league-options').style.display = 'block';
        document.getElementById('exp-league-current').value = teamCount;
        document.getElementById('exp-league-new').value = teamCount + 2;
    } else if (compType === 'CUP') {
        document.getElementById('exp-cup-options').style.display = 'block';
        document.getElementById('exp-cup-current').value = teamCount;
        // Set dropdown to next power of 2
        const nextPow2 = Math.pow(2, Math.ceil(Math.log2(teamCount + 1)));
        document.getElementById('exp-cup-new').value = Math.min(nextPow2, 128);
    } else if (leagueTeamCount > 0 && leagueTeamCount > teamCount) {
        // Fallback: if DB has more teams than standings, treat as friendly-like
        document.getElementById('exp-friendly-options').style.display = 'block';
        document.getElementById('exp-friendly-current').value = teamCount;
        document.getElementById('exp-friendly-dbteams').value = leagueTeamCount;
        document.getElementById('exp-friendly-toadd').value = Math.max(0, leagueTeamCount - teamCount);
        document.getElementById('exp-friendly-new').value = leagueTeamCount > 0 ? leagueTeamCount : teamCount;
    } else {
        // Default to league options for unknown
        document.getElementById('exp-league-options').style.display = 'block';
        document.getElementById('exp-league-current').value = teamCount;
        document.getElementById('exp-league-new').value = teamCount + 2;
    }
    
    // Populate team sources
    populateExpandTeamSources();
    toggleExpandFillMethod(); // Update UI based on comp type
    
    // Clear selected teams display
    document.getElementById('exp-selected-teams').innerHTML = '<span style="color:#8b949e">Ctrl+Click to select teams</span>';
    document.getElementById('exp-selected-count').textContent = '0';
    
    previewExpand();
}

function calcExpandGroups() {
    const totalTeams = parseInt(document.getElementById('exp-group-new').value) || 32;
    const teamsPerGroup = parseInt(document.getElementById('exp-group-size').value) || 4;
    const numGroups = Math.ceil(totalTeams / teamsPerGroup);
    
    document.getElementById('exp-group-count').value = numGroups;
    calcExpandKO();
}

function calcExpandKO() {
    const numGroups = parseInt(document.getElementById('exp-group-count').value) || 8;
    const advancePerGroup = parseInt(document.getElementById('exp-group-advance').value) || 2;
    const best3rd = parseInt(document.getElementById('exp-group-best3rd').value) || 0;
    
    const totalAdvancing = (numGroups * advancePerGroup) + best3rd;
    
    // Find nearest power of 2
    const koBracket = Math.pow(2, Math.ceil(Math.log2(totalAdvancing)));
    document.getElementById('exp-group-ko').value = koBracket;
    
    previewExpand();
}

function toggleExpandFillMethod() {
    const method = document.getElementById('exp-fill-method').value;
    const compType = expandCompData.compType;
    const isInternational = compType === 'INTERCUP' || compType === 'INTERQUAL' || compType === 'INTERFRIENDLY';
    
    document.getElementById('exp-fill-league-field').style.display = method === 'league' ? 'block' : 'none';
    
    // For international comps, show team list with confed filter for both 'league' and 'individual' methods
    if (isInternational && (method === 'league' || method === 'individual')) {
        document.getElementById('exp-fill-individual-field').style.display = 'block';
        document.getElementById('exp-confed-filter-field').style.display = 'block';
    } else {
        document.getElementById('exp-fill-individual-field').style.display = method === 'individual' ? 'block' : 'none';
        document.getElementById('exp-confed-filter-field').style.display = 'none';
    }
}

// Store national teams for expand tool filtering
let expandNationalTeams = [];

function populateExpandTeamSources() {
    const compType = expandCompData.compType;
    const compId = expandCompData.compId;
    const isInternational = compType === 'INTERCUP' || compType === 'INTERQUAL' || compType === 'INTERFRIENDLY';
    
    // Find teams already in competition from tasks (FillWithTeam) and initteams
    const teamsInComp = new Set();
    
    // Get all compobj IDs for this competition (comp + stages + groups)
    const compObjIds = new Set([compId]);
    expandCompData.stages.forEach(s => compObjIds.add(s.id));
    expandCompData.groups.forEach(g => compObjIds.add(g.id));
    
    // Check FillWithTeam tasks: compId,timing,FillWithTeam,groupId,slot,teamId,0
    data.tasks.forEach(line => {
        const parts = line.split(',');
        if (compObjIds.has(parts[0]?.trim()) && parts[2]?.trim() === 'FillWithTeam') {
            const teamId = parseInt(parts[5]?.trim());
            if (teamId && teamId > 0) teamsInComp.add(teamId);
        }
    });
    
    // Check initteams: compId,position,teamId
    data.initteams.forEach(line => {
        const parts = line.split(',');
        if (parts[0]?.trim() === compId) {
            const teamId = parseInt(parts[2]?.trim());
            if (teamId && teamId > 0) teamsInComp.add(teamId);
        }
    });
    
    // Store for use in filtering
    expandCompData.teamsInComp = teamsInComp;
    console.log('Teams already in competition:', teamsInComp.size, Array.from(teamsInComp).slice(0, 10));
    
    // Populate league dropdown
    const leagueSelect = document.getElementById('exp-fill-league');
    leagueSelect.innerHTML = '<option value="">-- Select League --</option>';
    
    if (db.leagues.length > 0) {
        if (isInternational) {
            // For international comps, only show league 78 (Men's National)
            const intlLeague = db.leagues.find(l => l.leagueid === 78);
            if (intlLeague) {
                leagueSelect.innerHTML += '<option value="78" selected>' + escapeHtml(intlLeague.leaguename) + '</option>';
            } else {
                leagueSelect.innerHTML += '<option value="78" selected>Men\'s National (78)</option>';
            }
        } else {
            db.leagues.forEach(l => {
                const nation = NATIONS.find(n => n.id === l.countryid);
                leagueSelect.innerHTML += '<option value="' + l.leagueid + '">' + escapeHtml(l.leaguename) + ' (' + (nation?.code || l.countryid) + ')</option>';
            });
        }
    }
    
    // Populate teams dropdown
    const teamsSelect = document.getElementById('exp-fill-teams');
    teamsSelect.innerHTML = '';
    expandNationalTeams = [];
    
    if (db.teams.length > 0) {
        if (isInternational) {
            // For international comps, load national teams with confederation info
            const nationalTeamIds = new Set(db.teamLeagues.filter(tl => tl.leagueid === 78).map(tl => tl.teamid));
            
            // Get teams with confed info from teamnationlinks if available
            if (db.teamNations && db.teamNations.length > 0) {
                const processedIds = new Set();
                db.teamNations.filter(tn => tn.leagueid === 78).forEach(tn => {
                    if (!processedIds.has(tn.teamid) && !teamsInComp.has(tn.teamid)) {
                        processedIds.add(tn.teamid);
                        const team = db.teams.find(t => t.teamid === tn.teamid);
                        if (team) {
                            const confed = findConfederationForNation(tn.nationid);
                            expandNationalTeams.push({
                                teamid: tn.teamid,
                                teamname: team.teamname,
                                nationid: tn.nationid,
                                confedId: confed.id,
                                confedCode: confed.code || confed.name
                            });
                        }
                    }
                });
            } else {
                // Fallback: just use team list without confed info
                db.teams.filter(t => nationalTeamIds.has(t.teamid) && !teamsInComp.has(t.teamid)).forEach(t => {
                    expandNationalTeams.push({
                        teamid: t.teamid,
                        teamname: t.teamname,
                        nationid: 0,
                        confedId: 0,
                        confedCode: 'Unknown'
                    });
                });
            }
            
            // Sort by confederation then by team name
            expandNationalTeams.sort((a, b) => {
                if (a.confedCode !== b.confedCode) {
                    return a.confedCode.localeCompare(b.confedCode);
                }
                return a.teamname.localeCompare(b.teamname);
            });
            
            // Reset confed filter and populate teams
            document.getElementById('exp-confed-filter').value = '';
            
            // Populate with all teams grouped by confed
            filterExpandTeamsByConfed();
        } else {
            // Non-international: show all teams except those already in comp
            db.teams.filter(t => !teamsInComp.has(t.teamid)).forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.teamid;
                opt.textContent = t.teamname + ' (' + t.teamid + ')';
                teamsSelect.appendChild(opt);
            });
            
            document.getElementById('exp-team-count').textContent = db.teams.filter(t => !teamsInComp.has(t.teamid)).length;
        }
    }
}

function filterExpandTeamsByConfed() {
    const confedFilter = document.getElementById('exp-confed-filter').value;
    const teamsSelect = document.getElementById('exp-fill-teams');
    teamsSelect.innerHTML = '';
    
    // Filter teams by selected confederation
    let filteredTeams = expandNationalTeams;
    if (confedFilter) {
        filteredTeams = expandNationalTeams.filter(t => t.confedCode === confedFilter);
    }
    
    // Group by confederation with headers
    let currentConfed = '';
    filteredTeams.forEach(t => {
        // Add confederation header if showing all
        if (!confedFilter && t.confedCode !== currentConfed) {
            currentConfed = t.confedCode;
            const header = document.createElement('option');
            header.disabled = true;
            header.textContent = '── ' + currentConfed + ' ──';
            header.style.fontWeight = 'bold';
            header.style.backgroundColor = '#21262d';
            teamsSelect.appendChild(header);
        }
        
        const opt = document.createElement('option');
        opt.value = t.teamid;
        opt.textContent = t.teamname + ' (' + t.teamid + ')';
        teamsSelect.appendChild(opt);
    });
    
    document.getElementById('exp-team-count').textContent = filteredTeams.filter(t => t.teamid).length;
    updateSelectedTeamsDisplay();
}

function updateSelectedTeamsDisplay() {
    const teamsSelect = document.getElementById('exp-fill-teams');
    const selectedDisplay = document.getElementById('exp-selected-teams');
    const countSpan = document.getElementById('exp-selected-count');
    
    const selectedOptions = Array.from(teamsSelect.selectedOptions);
    const selectedTeams = selectedOptions.filter(opt => !opt.disabled);
    
    countSpan.textContent = selectedTeams.length;
    
    if (selectedTeams.length === 0) {
        selectedDisplay.innerHTML = '<span style="color:#8b949e">Ctrl+Click to select teams</span>';
    } else {
        let html = '';
        selectedTeams.forEach((opt, idx) => {
            html += '<div style="padding:2px 4px;margin:1px 0;background:rgba(35,134,54,0.2);border-radius:3px;border-left:2px solid #238636">';
            html += '<span style="color:#6e7681;margin-right:6px">' + (idx + 1) + '.</span>';
            html += '<span style="color:#c9d1d9">' + opt.textContent + '</span>';
            html += '</div>';
        });
        selectedDisplay.innerHTML = html;
    }
    
    previewExpand();
}

function selectAllExpandTeams() {
    const teamsSelect = document.getElementById('exp-fill-teams');
    Array.from(teamsSelect.options).forEach(opt => {
        if (!opt.disabled) opt.selected = true;
    });
    updateSelectedTeamsDisplay();
}

function deselectAllExpandTeams() {
    const teamsSelect = document.getElementById('exp-fill-teams');
    Array.from(teamsSelect.options).forEach(opt => opt.selected = false);
    updateSelectedTeamsDisplay();
}

function previewExpand() {
    const preview = document.getElementById('exp-preview');
    
    if (!expandCompData.compId) {
        preview.innerHTML = '<span style="color:#8b949e">Select a competition first</span>';
        return;
    }
    
    let html = '';
    const compType = expandCompData.compType;
    const currentTeams = expandCompData.currentTeams;
    const leagueTeams = expandCompData.leagueTeams || 0;
    
    // Check if friendly type is showing
    const friendlyOptionsVisible = document.getElementById('exp-friendly-options').style.display !== 'none';
    
    if (friendlyOptionsVisible) {
        if (leagueTeams > 0) {
            const teamsToAdd = leagueTeams - currentTeams;
            
            html += '<div style="color:#58a6ff;font-weight:bold">Friendly/Standings Expansion</div>';
            html += '<div style="margin-top:8px">Current standings: <span style="color:#f0883e">' + currentTeams + '</span></div>';
            html += '<div>Teams in leagueteamlinks: <span style="color:#58a6ff">' + leagueTeams + '</span></div>';
            html += '<div>Standings to add: <span style="color:#238636">+' + teamsToAdd + '</span></div>';
            html += '<div style="margin-top:8px">Schedule updates:</div>';
            html += '<div style="margin-left:12px">• Matches per matchday: ' + Math.floor(currentTeams / 2) + ' → <span style="color:#238636">' + Math.floor(leagueTeams / 2) + '</span></div>';
            html += '<div style="margin-left:12px">• Total teams value: ' + currentTeams + ' → <span style="color:#238636">' + leagueTeams + '</span></div>';
            
            if (teamsToAdd <= 0) {
                html += '<div style="color:#238636;margin-top:8px">✓ Standings already match leagueteamlinks count</div>';
            }
        } else {
            html += '<div style="color:#58a6ff;font-weight:bold">Friendly/Standings Expansion</div>';
            html += '<div style="margin-top:8px;color:#da3633">⚠️ Load database files (leagueteamlinks.txt) to detect team count</div>';
            html += '<div style="color:#8b949e">Current standings: ' + currentTeams + '</div>';
        }
        
    } else if (compType === 'LEAGUE') {
        const newTeams = parseInt(document.getElementById('exp-league-new').value) || currentTeams;
        const gamesPerOpp = parseInt(document.getElementById('exp-league-games').value) || 2;
        const teamsToAdd = newTeams - currentTeams;
        
        const currentMatchdays = (currentTeams - 1) * 2;
        const newMatchdays = (newTeams - 1) * gamesPerOpp;
        
        html += '<div style="color:#58a6ff;font-weight:bold">League Expansion</div>';
        html += '<div style="margin-top:8px">Teams: ' + currentTeams + ' → <span style="color:#238636">' + newTeams + '</span> (+' + teamsToAdd + ')</div>';
        html += '<div>Matchdays: ' + currentMatchdays + ' → <span style="color:#238636">' + newMatchdays + '</span></div>';
        html += '<div>New standings slots: +' + teamsToAdd + '</div>';
        
        if (teamsToAdd <= 0) {
            html += '<div style="color:#da3633;margin-top:8px">⚠️ New team count must be greater than current</div>';
        }
        
    } else if (compType === 'CUP') {
        const newTeams = parseInt(document.getElementById('exp-cup-new').value) || currentTeams;
        const teamsToAdd = newTeams - currentTeams;
        
        const currentRounds = Math.log2(currentTeams);
        const newRounds = Math.log2(newTeams);
        const roundsToAdd = newRounds - currentRounds;
        
        html += '<div style="color:#58a6ff;font-weight:bold">Cup Expansion</div>';
        html += '<div style="margin-top:8px">Teams: ' + currentTeams + ' → <span style="color:#238636">' + newTeams + '</span> (+' + teamsToAdd + ')</div>';
        html += '<div>Rounds: ' + currentRounds + ' → <span style="color:#238636">' + newRounds + '</span> (+' + roundsToAdd + ')</div>';
        
        if (roundsToAdd > 0) {
            html += '<div style="margin-top:8px">New rounds to add:</div>';
            let t = newTeams;
            for (let r = 0; r < roundsToAdd; r++) {
                const matches = t / 2;
                html += '<div style="margin-left:12px">• Round of ' + t + ' (' + matches + ' matches)</div>';
                t /= 2;
            }
        }
        
        if (teamsToAdd <= 0) {
            html += '<div style="color:#da3633;margin-top:8px">⚠️ New team count must be greater than current</div>';
        }
        
    } else if (compType === 'INTERCUP' || compType === 'INTERQUAL' || compType.includes('GROUP')) {
        const newTeams = parseInt(document.getElementById('exp-group-new').value) || currentTeams;
        const teamsPerGroup = parseInt(document.getElementById('exp-group-size').value) || 4;
        const numGroups = parseInt(document.getElementById('exp-group-count').value) || 8;
        const advancePerGroup = parseInt(document.getElementById('exp-group-advance').value) || 2;
        const best3rd = parseInt(document.getElementById('exp-group-best3rd').value) || 0;
        const koBracket = parseInt(document.getElementById('exp-group-ko').value) || 16;
        
        // Calculate current structure
        let currentGroupCount = 0;
        let hasR16 = false;
        let hasRankingGroup = false;
        
        // Count groups in group stage
        for (const stage of expandCompData.stages) {
            const stageGroups = data.compobj.filter(line => {
                const parts = line.split(',');
                return parts[1]?.trim() === '5' && parts[4]?.trim() === stage.id;
            });
            if (stageGroups.length >= 2 && stageGroups.length <= 12) {
                currentGroupCount = stageGroups.length;
            } else if (stageGroups.length === 8) {
                hasR16 = true;
            }
            
            // Check for ranking group
            const stageSettings = data.settings.filter(line => line.split(',')[0].trim() === stage.id);
            for (const s of stageSettings) {
                if (s.includes('advance_pointskeep')) {
                    hasRankingGroup = true;
                    break;
                }
            }
        }
        
        if (currentGroupCount === 0) currentGroupCount = expandCompData.groups.length;
        
        const groupsToAdd = numGroups - currentGroupCount;
        const teamsToAdd = newTeams - currentTeams;
        const needsR16 = koBracket >= 16;
        const needsRankingGroup = best3rd > 0;
        
        html += '<div style="color:#58a6ff;font-weight:bold">Tournament Expansion (' + compType + ')</div>';
        html += '<div style="margin-top:8px;color:#f0883e">─── Teams & Groups ───</div>';
        html += '<div>Teams: ' + currentTeams + ' → <span style="color:#238636">' + newTeams + '</span> (+' + teamsToAdd + ')</div>';
        html += '<div>Groups: ' + currentGroupCount + ' → <span style="color:#238636">' + numGroups + '</span>';
        if (groupsToAdd > 0) html += ' <span style="color:#238636">(+' + groupsToAdd + ' new)</span>';
        html += '</div>';
        html += '<div>Teams per group: ' + teamsPerGroup + '</div>';
        
        html += '<div style="margin-top:8px;color:#f0883e">─── Advancement ───</div>';
        html += '<div>Top ' + advancePerGroup + ' per group = ' + (numGroups * advancePerGroup) + ' teams</div>';
        if (best3rd > 0) {
            html += '<div>Best ' + best3rd + ' of ' + numGroups + ' 3rd place teams</div>';
            if (!hasRankingGroup) {
                html += '<div style="color:#238636">  → Will add ranking group with standings_sort</div>';
            }
        }
        html += '<div>Total advancing: ' + ((numGroups * advancePerGroup) + best3rd) + ' teams</div>';
        
        if (compType === 'INTERCUP') {
            html += '<div style="margin-top:8px;color:#f0883e">─── KO Bracket ───</div>';
            if (needsR16 && !hasR16) {
                html += '<div style="color:#238636">✓ Will add Round of 16 (8 matches)</div>';
            } else if (hasR16) {
                html += '<div style="color:#8b949e">✓ R16 already exists</div>';
            }
            html += '<div>KO Bracket: ' + koBracket + ' teams → QF → SF → Final</div>';
        } else if (compType === 'INTERQUAL') {
            html += '<div style="margin-top:8px;color:#f0883e">─── Qualifier Updates ───</div>';
            html += '<div>• Schedule: X,X values will scale proportionally</div>';
            html += '<div>• UpdateTable tasks: will add for new groups</div>';
            html += '<div>• Qualifiers output: ' + ((numGroups * advancePerGroup) + best3rd) + ' teams to main tournament</div>';
        }
        
        html += '<div style="margin-top:8px;color:#f0883e">─── Other Updates ───</div>';
        const teamsAlreadyIn = expandCompData.teamsInComp?.size || 0;
        if (teamsAlreadyIn > 0) {
            html += '<div>• Teams already in comp: <span style="color:#f0883e">' + teamsAlreadyIn + '</span> (filtered from selection)</div>';
        }
        
        // Show selected teams count
        const selectedTeamsSelect = document.getElementById('exp-fill-teams');
        const selectedCount = selectedTeamsSelect ? Array.from(selectedTeamsSelect.selectedOptions).filter(opt => !opt.disabled).length : 0;
        if (selectedCount > 0) {
            html += '<div>• Teams to add: <span style="color:#238636;font-weight:bold">' + selectedCount + '</span> FillWithTeam tasks</div>';
        } else {
            html += '<div style="color:#da3633">• ⚠️ Select teams from the list to add to competition</div>';
        }
        
        html += '<div>• Setup pots: expand standings to fit new teams</div>';
        
        if (compType === 'INTERQUAL') {
            html += '<div>• Initteams: ' + ((numGroups * advancePerGroup) + best3rd) + ' qualifier slots</div>';
        } else {
            html += '<div>• Initteams: special entries only (no change)</div>';
        }
        html += '<div>• Advancement rules: will be regenerated</div>';
        
        const totalAdvancing = (numGroups * advancePerGroup) + best3rd;
        if (compType === 'INTERCUP' && totalAdvancing > koBracket) {
            html += '<div style="color:#da3633;margin-top:8px">⚠️ ' + totalAdvancing + ' teams advance but KO bracket is only ' + koBracket + '</div>';
        }
        
        if (teamsToAdd <= 0) {
            html += '<div style="color:#da3633;margin-top:8px">⚠️ New team count must be greater than current</div>';
        }
    }
    
    preview.innerHTML = html || '<span style="color:#8b949e">Configure options to see preview</span>';
}

function executeExpand() {
    if (!expandCompData.compId) {
        toast('Select a competition first', 'error');
        return;
    }
    
    const compType = expandCompData.compType;
    const currentTeams = expandCompData.currentTeams;
    const leagueTeams = expandCompData.leagueTeams || 0;
    
    // Check if friendly type is showing
    const friendlyOptionsVisible = document.getElementById('exp-friendly-options').style.display !== 'none';
    const groupOptionsVisible = document.getElementById('exp-group-options').style.display !== 'none';
    
    // Validate and execute based on type
    // IMPORTANT: Check INTERCUP/INTERQUAL first
    if (compType === 'INTERCUP' || compType === 'INTERQUAL' || (compType.includes('GROUP') && groupOptionsVisible)) {
        const newTeams = parseInt(document.getElementById('exp-group-new').value);
        if (newTeams <= currentTeams) {
            toast('New team count must be greater than current', 'error');
            return;
        }
        saveState('Expand Tournament to ' + newTeams + ' teams');
        expandGroupTournament(newTeams);
    } else if (compType === 'INTERFRIENDLY' || compType === 'FRIENDLY' || friendlyOptionsVisible) {
        if (leagueTeams <= currentTeams) {
            toast('Standings already match or exceed leagueteamlinks count', 'error');
            return;
        }
        saveState('Expand Friendly to ' + leagueTeams + ' teams');
        expandFriendly(leagueTeams);
    } else if (compType === 'LEAGUE') {
        const newTeams = parseInt(document.getElementById('exp-league-new').value);
        if (newTeams <= currentTeams) {
            toast('New team count must be greater than current', 'error');
            return;
        }
        saveState('Expand League to ' + newTeams + ' teams');
        expandLeague(newTeams);
    } else if (compType === 'CUP') {
        const newTeams = parseInt(document.getElementById('exp-cup-new').value);
        if (newTeams <= currentTeams) {
            toast('New team count must be greater than current', 'error');
            return;
        }
        saveState('Expand Cup to ' + newTeams + ' teams');
        expandCup(newTeams);
    } else {
        toast('Unknown competition type: ' + compType, 'error');
        return;
    }
    
    // Refresh UI
    parseHierarchy();
    findNextId();
    populateDropdowns();
    sortAllData();
    ['compobj','settings','standings','tasks','schedule','objectives','advancement','initteams'].forEach(updateBadge);
    updatePreview();
    
    toast('Competition expanded successfully!');
    loadCompForExpand(); // Refresh display
}

function expandFriendly(newTeams) {
    // Find the group
    const group = expandCompData.groups[0];
    if (!group) {
        toast('Could not find group', 'error');
        return;
    }
    
    const groupId = group.id;
    
    // Find the highest position currently in standings for this group
    let maxPosition = 0;
    data.standings.forEach(line => {
        const parts = line.split(',');
        if (parts[0].trim() === groupId) {
            const pos = parseInt(parts[1]?.trim()) || 0;
            if (pos > maxPosition) maxPosition = pos;
        }
    });
    
    const teamsToAdd = newTeams - maxPosition;
    
    if (teamsToAdd <= 0) {
        toast('Standings already have ' + maxPosition + ' positions', 'error');
        return;
    }
    
    // Add new standings slots (format: groupId,position)
    // Find the last standings row for this group and insert after it
    let lastStandingsIdx = -1;
    for (let i = 0; i < data.standings.length; i++) {
        if (data.standings[i].split(',')[0].trim() === groupId) {
            lastStandingsIdx = i;
        }
    }
    
    const newStandings = [];
    for (let i = maxPosition + 1; i < newTeams; i++) {
        newStandings.push(groupId + ',' + i);
    }
    
    if (lastStandingsIdx >= 0) {
        // Insert after the last existing standings row for this group
        data.standings.splice(lastStandingsIdx + 1, 0, ...newStandings);
    } else {
        // No existing standings, just push
        data.standings.push(...newStandings);
    }
    
    // Update schedule entries
    // Schedule format: groupId, day, matchday, X, X, kickoff
    // We need to update X,X pairs where X is either total teams or half teams
    const halfTeams = Math.floor(newTeams / 2);
    
    for (let i = 0; i < data.schedule.length; i++) {
        const parts = data.schedule[i].split(',');
        if (parts[0].trim() === groupId && parts.length >= 6) {
            const val3 = parseInt(parts[3]?.trim());
            const val4 = parseInt(parts[4]?.trim());
            
            // Check if values are equal (X,X pattern)
            if (val3 === val4 && val3 > 0) {
                // If value is roughly half of some team count, it's matches per matchday
                // If value equals or is close to a full team count, it's total teams
                // Heuristic: if val3 <= maxPosition/2 + 5, treat as half; otherwise full
                if (val3 <= Math.floor(maxPosition / 2) + 5) {
                    // This is matches per matchday (like 15,15)
                    parts[3] = halfTeams.toString();
                    parts[4] = halfTeams.toString();
                } else {
                    // This is total teams (like 30,30)
                    parts[3] = newTeams.toString();
                    parts[4] = newTeams.toString();
                }
                data.schedule[i] = parts.join(',');
            }
        }
    }
}

function expandLeague(newTeams) {
    const compId = expandCompData.compId;
    const currentTeams = expandCompData.currentTeams;
    const teamsToAdd = newTeams - currentTeams;
    const gamesPerOpp = parseInt(document.getElementById('exp-league-games').value) || 2;
    
    // Find the league group
    const leagueGroup = expandCompData.groups[0];
    if (!leagueGroup) {
        toast('Could not find league group', 'error');
        return;
    }
    
    // Add new standings slots (format: groupId,position)
    const newStandings = [];
    for (let i = currentTeams; i < newTeams; i++) {
        newStandings.push(leagueGroup.id + ',' + i);
    }
    
    // Find insert position for standings
    insertInOrder(data.standings, newStandings, parseInt(leagueGroup.id));
    
    // Update schedule - recalculate matchdays
    const newMatchdays = (newTeams - 1) * gamesPerOpp;
    const matchesPerMD = Math.floor(newTeams / 2);
    
    // Find and update existing schedule entries
    const existingSchedule = data.schedule.filter(line => line.split(',')[0].trim() === leagueGroup.id);
    const startDay = existingSchedule.length > 0 ? parseInt(existingSchedule[0].split(',')[1]) : 250;
    const gap = 7; // Default gap
    
    // Remove old schedule for this group
    data.schedule = data.schedule.filter(line => line.split(',')[0].trim() !== leagueGroup.id);
    
    // Add new schedule
    const newSchedule = [];
    for (let md = 1; md <= newMatchdays; md++) {
        const day = startDay + (md - 1) * gap;
        newSchedule.push(leagueGroup.id + ',' + day + ',' + md + ',' + matchesPerMD + ',' + matchesPerMD + ',1200');
    }
    insertInOrder(data.schedule, newSchedule, parseInt(leagueGroup.id));
    
    // Update num_teams setting if exists
    for (let i = 0; i < data.settings.length; i++) {
        const parts = data.settings[i].split(',');
        if (parts[0].trim() === compId && parts[1]?.trim() === 'num_teams') {
            parts[2] = newTeams.toString();
            data.settings[i] = parts.join(',');
            break;
        }
    }
}

function expandCup(newTeams) {
    const compId = expandCompData.compId;
    const currentTeams = expandCompData.currentTeams;
    const format = document.getElementById('exp-cup-format').value;
    
    const currentRounds = Math.log2(currentTeams);
    const newRounds = Math.log2(newTeams);
    const roundsToAdd = newRounds - currentRounds;
    
    if (roundsToAdd <= 0) return;
    
    // Find first stage (setup stage)
    const setupStage = expandCompData.stages[0];
    if (!setupStage) {
        toast('Could not find setup stage', 'error');
        return;
    }
    
    // Find insert position after setup stage
    let insertIdx = -1;
    for (let i = 0; i < data.compobj.length; i++) {
        if (data.compobj[i].split(',')[0].trim() === setupStage.id) {
            insertIdx = i;
            break;
        }
    }
    
    // Calculate IDs needed: for each new round, 1 stage + N matches
    let totalNewIds = 0;
    let t = newTeams;
    for (let r = 0; r < roundsToAdd; r++) {
        const matches = t / 2;
        totalNewIds += 1 + matches; // stage + match groups
        t /= 2;
    }
    
    // Find next available ID
    const firstNewId = nextId;
    renumberAllFiles(firstNewId, totalNewIds);
    
    // Create new stages and groups
    const newCompobj = [];
    const newStandings = [];
    const newSettings = [];
    const newSchedule = [];
    const newAdvancement = [];
    
    let currentId = firstNewId;
    let teamsLeft = newTeams;
    const roundNames = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F'];
    
    // Find what round name to start with
    let roundIdx = roundNames.indexOf('R' + newTeams);
    if (roundIdx === -1) roundIdx = 0;
    
    const newRoundIds = [];
    
    for (let r = 0; r < roundsToAdd; r++) {
        const matches = teamsLeft / 2;
        const stageId = currentId++;
        const matchIds = [];
        
        for (let m = 0; m < matches; m++) {
            matchIds.push(currentId++);
        }
        
        newRoundIds.push({ stageId, matchIds, teams: teamsLeft });
        
        // Stage compobj
        const roundName = 'R' + teamsLeft;
        newCompobj.push(stageId + ',4,' + roundName + ',FCE_' + roundName + ',' + compId);
        
        // Match groups
        for (let m = 0; m < matches; m++) {
            newCompobj.push(matchIds[m] + ',5,M' + (m + 1) + ', ,' + stageId);
            newStandings.push(matchIds[m] + ',1');
            newStandings.push(matchIds[m] + ',2');
        }
        
        // Settings
        newSettings.push(stageId + ',match_type,' + format);
        newSettings.push(stageId + ',match_matchsituation,' + roundName);
        
        // Schedule - find a day before existing rounds
        const startDay = 220 - (roundsToAdd - r) * 14;
        for (let m = 0; m < matches; m++) {
            newSchedule.push(matchIds[m] + ',' + (startDay + Math.floor(m / 4)) + ',1,1,1,1500');
            if (format === 'KO2LEGS') {
                newSchedule.push(matchIds[m] + ',' + (startDay + 7 + Math.floor(m / 4)) + ',2,1,1,1500');
            }
        }
        
        teamsLeft /= 2;
    }
    
    // Add advancement from new rounds to existing rounds
    // Winners of last new round go to first existing round
    if (newRoundIds.length > 0 && expandCompData.stages.length > 1) {
        const lastNewRound = newRoundIds[newRoundIds.length - 1];
        const firstExistingStage = expandCompData.stages[1]; // Skip setup
        
        // Find first match groups of existing stage
        const existingMatches = expandCompData.groups.filter(g => {
            // Check if this group's parent is the first existing stage
            for (const line of data.compobj) {
                const parts = line.split(',');
                if (parts[0].trim() === g.id && parts[4].trim() === firstExistingStage.id) {
                    return true;
                }
            }
            return false;
        });
        
        // Link new round winners to existing round
        for (let m = 0; m < lastNewRound.matchIds.length && m < existingMatches.length; m++) {
            newAdvancement.push(lastNewRound.matchIds[m] + ',1,' + existingMatches[m].id + ',1');
        }
    }
    
    // Insert all new data
    data.compobj.splice(insertIdx + 1, 0, ...newCompobj);
    insertInOrder(data.standings, newStandings, firstNewId);
    insertInOrder(data.settings, newSettings, firstNewId);
    insertInOrder(data.schedule, newSchedule, firstNewId);
    if (newAdvancement.length > 0) {
        insertInOrder(data.advancement, newAdvancement, firstNewId);
    }
    
    // Update nextId
    nextId = currentId;
}

function expandGroupTournament(newTeams) {
    console.log('=== EXPAND GROUP TOURNAMENT START ===');
    toast('Starting expandGroupTournament...', 'info');
    
    const compId = expandCompData.compId;
    const currentTeams = expandCompData.currentTeams;
    const teamsPerGroup = parseInt(document.getElementById('exp-group-size').value) || 4;
    const newNumGroups = parseInt(document.getElementById('exp-group-count').value) || 8;
    const advancePerGroup = parseInt(document.getElementById('exp-group-advance').value) || 2;
    const best3rd = parseInt(document.getElementById('exp-group-best3rd').value) || 0;
    const koBracket = parseInt(document.getElementById('exp-group-ko').value) || 16;
    
    // Get next available ID (max ID in compobj + 1)
    let currentId = 1;
    data.compobj.forEach(line => {
        const id = parseInt(line.split(',')[0]);
        if (!isNaN(id) && id >= currentId) currentId = id + 1;
    });
    console.log('Next available ID:', currentId);
    
    console.log('Config:', { compId, currentTeams, newTeams, teamsPerGroup, newNumGroups, advancePerGroup, best3rd, koBracket });
    console.log('Stages:', expandCompData.stages.map(s => s.code + '(' + s.id + ')').join(', '));
    console.log('Groups:', expandCompData.groups.map(g => g.code + '(' + g.id + ')').join(', '));
    
    // ========== FIND ALL SETUP STAGES (by name) ==========
    let allSetupStages = [];
    let setupPots = []; // All pots from all setup stages
    
    // Look for ALL setup stages by name (Setup, Pots, Draw, etc.)
    for (const stage of expandCompData.stages) {
        const name = (stage.name || '').toLowerCase();
        const code = (stage.code || '').toLowerCase();
        const stageId = String(stage.id);
        
        if (name.includes('setup') || name.includes('pot') || name.includes('draw') ||
            code.includes('setup') || code === 's1' || code === 's_setup') {
            
            // Find pots (groups under this setup stage)
            const stagePots = data.compobj.filter(line => {
                const parts = line.split(',');
                return parts[1]?.trim() === '5' && parts[4]?.trim() === stageId;
            }).map(line => {
                const parts = line.split(',');
                return { id: parts[0].trim(), code: parts[2].trim(), stageId: stageId };
            });
            
            if (stagePots.length > 0) {
                allSetupStages.push({ id: stageId, code: stage.code, name: stage.name, pots: stagePots });
                setupPots.push(...stagePots);
                console.log('Found setup stage:', stage.code, '(' + stageId + ') with', stagePots.length, 'pots');
            }
        }
    }
    
    // For backwards compatibility
    const setupStageId = allSetupStages.length > 0 ? allSetupStages[0].id : null;
    console.log('Total setup stages found:', allSetupStages.length, 'Total pots:', setupPots.length);
    
    // ========== FIND GROUP STAGE (look for FCE_Group_Stage) ==========
    let groupStageId = null;
    let groupStageGroups = [];
    
    // Simple: find stage named FCE_Group_Stage
    for (const stage of expandCompData.stages) {
        if (stage.name === 'FCE_Group_Stage') {
            groupStageId = String(stage.id);
            
            // Get all groups under this stage
            groupStageGroups = data.compobj.filter(line => {
                const parts = line.split(',');
                return parts[1]?.trim() === '5' && parts[4]?.trim() === groupStageId;
            }).map(line => {
                const parts = line.split(',');
                return { id: parts[0].trim(), code: parts[2].trim() };
            });
            
            console.log('Found FCE_Group_Stage:', stage.code, '(ID ' + groupStageId + ') with', groupStageGroups.length, 'groups');
            break;
        }
    }
    
    if (!groupStageId) {
        toast('Could not find FCE_Group_Stage! Check console.', 'error');
        console.error('Stages found:', expandCompData.stages.map(s => s.code + '=' + s.name));
        return;
    }
    
    // Show what we found
    console.log('=== STAGE DETECTION ===');
    console.log('Setup:', setupStageId, 'Pots:', setupPots.map(p => p.code).join(','));
    console.log('Group Stage:', groupStageId, 'Groups:', groupStageGroups.map(g => g.code).join(','));
    
    const currentNumGroups = groupStageGroups.length;
    const groupsToAdd = newNumGroups - currentNumGroups;
    const teamsToAdd = newTeams - currentTeams;
    
    console.log('Groups to add:', groupsToAdd, 'Teams to add:', teamsToAdd);
    
    // Track all changes for logging
    let changes = { compobj: 0, standings: 0, settings: 0, schedule: 0, tasks: 0, advancement: 0, initteams: 0 };
    
    // ========== PRE-CHECK: Does ranking group exist? ==========
    // We need to know this BEFORE section 1 to calculate total IDs needed for renumbering
    
    let existingRankingGroupId = null;
    let needToCreateRanking = false;
    
    if (best3rd > 0) {
        // Get ALL IDs that belong to THIS competition
        const compIds = new Set();
        compIds.add(compId);
        expandCompData.stages.forEach(s => {
            compIds.add(String(s.id));
            data.compobj.filter(line => {
                const parts = line.split(',');
                return parts[1]?.trim() === '5' && parts[4]?.trim() === String(s.id);
            }).forEach(line => compIds.add(line.split(',')[0].trim()));
        });
        
        // Check for GROUP with advance_pointskeep setting WITHIN this comp
        const groupsWithPointsKeep = data.settings.filter(s => {
            const id = s.split(',')[0].trim();
            return compIds.has(id) && s.includes('advance_pointskeep');
        });
        if (groupsWithPointsKeep.length > 0) {
            existingRankingGroupId = groupsWithPointsKeep[0].split(',')[0].trim();
            console.log('Pre-check: Found existing ranking group:', existingRankingGroupId);
        }
        
        // If not found by setting, check for single-group stage after group stage
        if (!existingRankingGroupId && groupStageId) {
            const groupStageIdx = expandCompData.stages.findIndex(s => String(s.id) === groupStageId);
            if (groupStageIdx >= 0 && groupStageIdx < expandCompData.stages.length - 1) {
                for (let i = groupStageIdx + 1; i < expandCompData.stages.length; i++) {
                    const stage = expandCompData.stages[i];
                    const stageName = (stage.name || '').toLowerCase();
                    if (stageName.includes('final') || stageName.includes('knockout') || 
                        stageName.includes('quarter') || stageName.includes('semi') ||
                        stageName.includes('round_of')) continue;
                    
                    const stageGroups = data.compobj.filter(line => {
                        const parts = line.split(',');
                        return parts[1]?.trim() === '5' && parts[4]?.trim() === String(stage.id);
                    });
                    if (stageGroups.length === 1) {
                        existingRankingGroupId = stageGroups[0].split(',')[0].trim();
                        console.log('Pre-check: Found ranking group in stage:', stage.code);
                        break;
                    }
                }
            }
        }
        
        needToCreateRanking = !existingRankingGroupId;
        console.log('Pre-check: Need to create ranking stage/group:', needToCreateRanking);
    }
    
    // ========== 1. ADD NEW GROUPS TO GROUP STAGE ==========
    
    if (groupsToAdd > 0) {
        const lastGroupId = parseInt(groupStageGroups[groupStageGroups.length - 1].id);
        const insertIdx = data.compobj.findIndex(line => line.split(',')[0].trim() === lastGroupId.toString());
        
        // Get template from first group for schedule/settings
        const firstGroupId = groupStageGroups[0].id;
        const templateSchedule = data.schedule.filter(line => line.split(',')[0].trim() === firstGroupId);
        const templateSettings = data.settings.filter(line => line.split(',')[0].trim() === firstGroupId);
        
        // Get naming pattern from existing groups
        const firstGroupLine = data.compobj.find(line => line.split(',')[0].trim() === firstGroupId);
        const firstGroupParts = firstGroupLine ? firstGroupLine.split(',') : [];
        const firstGroupName = firstGroupParts[3]?.trim() || ' ';
        
        // Detect name pattern:
        // - If name is blank/space: keep blank for new groups
        // - If name is FCE_Group_A: use FCE_Group_ + letter
        const useLetterNames = firstGroupName.includes('FCE_Group_');
        const groupLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        console.log('First group name:', firstGroupName, 'Use letter names:', useLetterNames);
        console.log('Insert after ID:', lastGroupId, 'at index:', insertIdx);
        
        // Calculate total IDs needed: groups + ranking stage/group if needed
        const totalNewIds = groupsToAdd + (needToCreateRanking ? 2 : 0);
        
        // First, renumber everything after lastGroupId to make room for ALL new IDs
        const firstNewId = lastGroupId + 1;
        renumberAllFiles(firstNewId, totalNewIds);
        
        currentId = firstNewId; // Start assigning from firstNewId
        
        for (let g = 0; g < groupsToAdd; g++) {
            const groupIdx = currentNumGroups + g; // 0-indexed position (e.g., 9 for G10)
            const groupId = currentId++;
            
            // Code is always G + number (G10, G11, etc.)
            const newCode = 'G' + (groupIdx + 1);
            
            // Name is either blank or FCE_Group_ + letter
            let newName = ' ';
            if (useLetterNames) {
                const letter = groupLetters[groupIdx] || groupLetters[groupIdx % 26];
                newName = 'FCE_Group_' + letter;
            }
            
            // COMPOBJ - splice after last group
            const newCompobj = groupId + ',5,' + newCode + ',' + newName + ',' + groupStageId;
            data.compobj.splice(insertIdx + 1 + g, 0, newCompobj);
            changes.compobj++;
            
            // STANDINGS (0-indexed positions) - collect then insert
            const newStandings = [];
            for (let t = 0; t < teamsPerGroup; t++) {
                newStandings.push(groupId + ',' + t);
                changes.standings++;
            }
            insertInOrder(data.standings, newStandings, groupId);
            
            // SCHEDULE - copy from template
            if (templateSchedule.length > 0) {
                const newSchedule = [];
                templateSchedule.forEach(line => {
                    const parts = line.split(',');
                    parts[0] = groupId.toString();
                    newSchedule.push(parts.join(','));
                    changes.schedule++;
                });
                insertInOrder(data.schedule, newSchedule, groupId);
            }
            
            // SETTINGS - copy from template
            if (templateSettings.length > 0) {
                const newSettings = [];
                templateSettings.forEach(line => {
                    const parts = line.split(',');
                    parts[0] = groupId.toString();
                    newSettings.push(parts.join(','));
                    changes.settings++;
                });
                insertInOrder(data.settings, newSettings, groupId);
            }
            
            groupStageGroups.push({ id: groupId.toString(), code: newCode });
        }
        
        console.log('Added', groupsToAdd, 'groups:', (firstNewId) + '-' + (currentId - 1));
    } else if (needToCreateRanking) {
        // No groups to add, but need to create ranking stage/group
        // Renumber to make room for 2 IDs
        const lastGroupId = parseInt(groupStageGroups[groupStageGroups.length - 1].id);
        const firstNewId = lastGroupId + 1;
        renumberAllFiles(firstNewId, 2);
        currentId = firstNewId;
        console.log('Renumbered for ranking stage/group:', firstNewId, '-', firstNewId + 1);
    }
    
    // ========== 2. UPDATE SETUP POTS (add standings slots) ==========
    
    if (setupPots.length > 0 && teamsToAdd > 0) {
        // Get current standings count for each pot
        const potCurrentSize = {};
        let totalCurrentStandings = 0;
        
        setupPots.forEach(pot => {
            let count = 0;
            data.standings.forEach(line => {
                if (line.split(',')[0].trim() === pot.id) count++;
            });
            potCurrentSize[pot.id] = count;
            totalCurrentStandings += count;
        });
        
        console.log('Current setup pot standings:', potCurrentSize, 'Total:', totalCurrentStandings);
        
        // Scale each pot proportionally
        const scaleFactor = newTeams / Math.max(1, currentTeams);
        
        setupPots.forEach(pot => {
            const currentSize = potCurrentSize[pot.id];
            const newSize = Math.ceil(currentSize * scaleFactor);
            
            // Find current max position (0-indexed)
            let maxPos = -1;
            data.standings.forEach(line => {
                const parts = line.split(',');
                if (parts[0].trim() === pot.id) {
                    const pos = parseInt(parts[1]?.trim());
                    if (!isNaN(pos) && pos > maxPos) maxPos = pos;
                }
            });
            
            // Add new positions from maxPos+1 to newSize-1
            const newPotStandings = [];
            for (let p = maxPos + 1; p < newSize; p++) {
                newPotStandings.push(pot.id + ',' + p);
                changes.standings++;
            }
            if (newPotStandings.length > 0) {
                insertInOrder(data.standings, newPotStandings, parseInt(pot.id));
            }
            
            if (newSize > currentSize) {
                console.log('Pot', pot.id, ':', currentSize, '->', newSize, 'standings');
            }
        });
        
        console.log('Updated setup pots with scale factor:', scaleFactor.toFixed(2));
    }
    
    // ========== 3. UPDATE RANKING GROUP FOR BEST 3RD PLACE ==========
    // Uses pre-check results: existingRankingGroupId, needToCreateRanking
    
    let rankingGroupId = existingRankingGroupId;
    
    if (best3rd > 0) {
        if (rankingGroupId) {
            // UPDATE existing ranking group - add more standings slots
            let currentRankingSlots = 0;
            data.standings.forEach(line => {
                if (line.split(',')[0].trim() === rankingGroupId) currentRankingSlots++;
            });
            
            // Need positions for all groups' 3rd place teams
            const neededSlots = newNumGroups;
            const newRankingStandings = [];
            for (let i = currentRankingSlots; i < neededSlots; i++) {
                newRankingStandings.push(rankingGroupId + ',' + i);
                changes.standings++;
            }
            if (newRankingStandings.length > 0) {
                insertInOrder(data.standings, newRankingStandings, parseInt(rankingGroupId));
            }
            
            console.log('Ranking group standings:', currentRankingSlots, '->', neededSlots);
        } else if (needToCreateRanking) {
            // CREATE ranking stage + group (IDs already reserved in section 1)
            console.log('Creating ranking stage and group for best 3rd place');
            
            // Find insert position - after ALL groups (including new ones)
            const lastGroupId = groupStageGroups[groupStageGroups.length - 1].id;
            let insertIdx = 0;
            for (let i = 0; i < data.compobj.length; i++) {
                if (data.compobj[i].split(',')[0].trim() === lastGroupId) {
                    insertIdx = i;
                    break;
                }
            }
            
            // Get next IDs (sequential after new groups)
            const rankingStageId = currentId++;
            rankingGroupId = String(currentId++);
            
            // COMPOBJ - insert ranking stage and group
            const rankingStageCode = 'S' + (expandCompData.stages.length + 1);
            const rankingStageCompobj = rankingStageId + ',4,' + rankingStageCode + ',FCE_Setup_Stage,' + compId;
            const rankingGroupCompobj = rankingGroupId + ',5,G1, ,' + rankingStageId;
            data.compobj.splice(insertIdx + 1, 0, rankingStageCompobj, rankingGroupCompobj);
            changes.compobj += 2;
            
            // SETTINGS for ranking stage and group
            const rankingSettings = [
                rankingStageId + ',match_stagetype,SETUP',
                rankingGroupId + ',advance_pointskeep,' + groupStageId,
                rankingGroupId + ',standings_sort,POINTS',
                rankingGroupId + ',standings_sort,GOALDIFF',
                rankingGroupId + ',standings_sort,GOALSFOR',
                rankingGroupId + ',standings_sort,WINS'
            ];
            insertInOrder(data.settings, rankingSettings, rankingStageId);
            changes.settings += rankingSettings.length;
            
            // STANDINGS for ranking group (one slot per group)
            const rankingStandings = [];
            for (let i = 0; i < newNumGroups; i++) {
                rankingStandings.push(rankingGroupId + ',' + i);
            }
            insertInOrder(data.standings, rankingStandings, parseInt(rankingGroupId));
            changes.standings += rankingStandings.length;
            
            // ADVANCEMENT from each group's 3rd → ranking group (ALL groups including new)
            const rankingAdvancement = [];
            groupStageGroups.forEach((g, idx) => {
                rankingAdvancement.push(g.id + ',3,' + rankingGroupId + ',' + (idx + 1));
            });
            insertInOrder(data.advancement, rankingAdvancement, parseInt(groupStageGroups[0].id));
            changes.advancement += rankingAdvancement.length;
            
            console.log('Created ranking stage', rankingStageId, 'and group', rankingGroupId, '(sequential after groups)');
        }
    }
    
    // ========== 4. ADD FILLWITHTEAM TASKS FOR SELECTED TEAMS ==========
    
    const selectedTeamsSelect = document.getElementById('exp-fill-teams');
    const selectedTeamIds = Array.from(selectedTeamsSelect.selectedOptions)
        .filter(opt => !opt.disabled && opt.value)
        .map(opt => parseInt(opt.value))
        .filter(id => !isNaN(id) && id > 0);
    
    console.log('Selected team IDs:', selectedTeamIds.length, selectedTeamIds.slice(0, 5));
    
    if (selectedTeamIds.length > 0 && setupPots.length > 0) {
        // Find current max slot in each pot
        const potSlots = {};
        setupPots.forEach(pot => {
            potSlots[pot.id] = 0;
            data.tasks.forEach(line => {
                const parts = line.split(',');
                if (parts[2]?.trim() === 'FillWithTeam' && parts[3]?.trim() === pot.id) {
                    const slot = parseInt(parts[4]?.trim()) || 0;
                    if (slot > potSlots[pot.id]) potSlots[pot.id] = slot;
                }
            });
        });
        
        // Distribute selected teams across pots round-robin
        const newFillTasks = [];
        selectedTeamIds.forEach((teamId, idx) => {
            const pot = setupPots[idx % setupPots.length];
            potSlots[pot.id]++;
            newFillTasks.push(compId + ',start,FillWithTeam,' + pot.id + ',' + potSlots[pot.id] + ',' + teamId + ',0');
            changes.tasks++;
        });
        if (newFillTasks.length > 0) {
            insertInOrder(data.tasks, newFillTasks, parseInt(compId));
        }
        
        console.log('Added', selectedTeamIds.length, 'FillWithTeam tasks');
    }
    
    // ========== 5. UPDATE INITTEAMS (for INTERQUAL) ==========
    
    if (expandCompData.compType === 'INTERQUAL') {
        const qualifiers = (newNumGroups * advancePerGroup) + best3rd;
        const currentInitTeams = data.initteams.filter(line => line.split(',')[0].trim() === compId);
        
        let maxPos = -1;
        currentInitTeams.forEach(line => {
            const pos = parseInt(line.split(',')[1]?.trim()) || 0;
            if (pos > maxPos) maxPos = pos;
        });
        
        const newInitTeams = [];
        for (let i = maxPos + 1; i < qualifiers; i++) {
            newInitTeams.push(compId + ',' + i + ',-1');
            changes.initteams++;
        }
        if (newInitTeams.length > 0) {
            insertInOrder(data.initteams, newInitTeams, parseInt(compId));
        }
        
        console.log('Updated initteams to', qualifiers, 'qualifier slots');
    }
    
    // ========== 6. UPDATE SCHEDULE X,X VALUES (for INTERQUAL) ==========
    
    if (expandCompData.compType === 'INTERQUAL') {
        // Scale schedule values proportionally
        const scaleFactor = newTeams / Math.max(1, currentTeams);
        
        for (let i = 0; i < data.schedule.length; i++) {
            const parts = data.schedule[i].split(',');
            if (parts[0].trim() === groupStageId && parts.length >= 6) {
                const val3 = parseInt(parts[3]?.trim());
                const val4 = parseInt(parts[4]?.trim());
                
                if (val3 === val4 && val3 > 0) {
                    const scaled = Math.round(val3 * scaleFactor);
                    parts[3] = scaled.toString();
                    parts[4] = scaled.toString();
                    data.schedule[i] = parts.join(',');
                    changes.schedule++;
                }
            }
        }
        
        console.log('Scaled schedule values by', scaleFactor.toFixed(2));
    }
    
    // ========== 7. UPDATE UpdateTable TASKS (for INTERQUAL) ==========
    
    if (expandCompData.compType === 'INTERQUAL') {
        const existingUpdateTasks = data.tasks.filter(line => 
            line.split(',')[0].trim() === compId && line.includes('UpdateTable')
        );
        
        if (existingUpdateTasks.length > 0) {
            // Find max slot
            let maxSlot = 0;
            existingUpdateTasks.forEach(task => {
                const parts = task.split(',');
                const slot = parseInt(parts[6]?.trim()) || 0;
                if (slot > maxSlot) maxSlot = slot;
            });
            
            // Track what's already covered: groupId,position
            const coveredEntries = new Set();
            existingUpdateTasks.forEach(task => {
                const parts = task.split(',');
                const groupId = parts[4]?.trim();
                const pos = parts[5]?.trim();
                if (groupId && pos) coveredEntries.add(groupId + ',' + pos);
            });
            
            // Add tasks for new groups (positions 1,2)
            const newUpdateTasks = [];
            groupStageGroups.forEach(g => {
                for (let pos = 1; pos <= advancePerGroup; pos++) {
                    const key = g.id + ',' + pos;
                    if (!coveredEntries.has(key)) {
                        maxSlot++;
                        newUpdateTasks.push(compId + ',end,UpdateTable,' + compId + ',' + g.id + ',' + pos + ',' + maxSlot);
                        changes.tasks++;
                    }
                }
            });
            
            // Add tasks for ranking group (only positions not already covered)
            if (rankingGroupId && best3rd > 0) {
                for (let pos = 1; pos <= best3rd; pos++) {
                    const key = rankingGroupId + ',' + pos;
                    if (!coveredEntries.has(key)) {
                        maxSlot++;
                        newUpdateTasks.push(compId + ',end,UpdateTable,' + compId + ',' + rankingGroupId + ',' + pos + ',' + maxSlot);
                        changes.tasks++;
                    }
                }
            }
            
            if (newUpdateTasks.length > 0) {
                insertInOrder(data.tasks, newUpdateTasks, parseInt(compId));
            }
            
            console.log('UpdateTable tasks updated, max slot:', maxSlot);
        }
    }
    
    // ========== 7B. ADD ADVANCEMENT FOR NEW GROUPS ==========
    
    if (groupsToAdd > 0) {
        // Get ALL advancement entries from existing groups to understand the pattern
        const existingGroupIds = groupStageGroups.slice(0, currentNumGroups).map(g => g.id);
        
        // For each position (1, 2, 3...), find where it goes
        // Pattern: position 1 → some KO tie, position 2 → some KO tie, position 3 → ranking
        const advancementByPosition = {}; // { position: [{ destGroup, destPos }, ...] }
        
        existingGroupIds.forEach((gid, gIdx) => {
            data.advancement.filter(line => line.split(',')[0].trim() === gid).forEach(line => {
                const parts = line.split(',');
                const srcPos = parts[1].trim();
                const destGroup = parts[2].trim();
                const destPos = parseInt(parts[3].trim());
                
                if (!advancementByPosition[srcPos]) advancementByPosition[srcPos] = [];
                advancementByPosition[srcPos].push({ 
                    groupIndex: gIdx, 
                    destGroup, 
                    destPos,
                    // Calculate the slot offset pattern
                    slotOffset: destPos - gIdx - 1
                });
            });
        });
        
        console.log('Advancement patterns by position:', Object.keys(advancementByPosition));
        
        // Check what advancement already exists for new groups (may have been added when creating ranking group)
        const existingNewGroupAdvancement = new Set();
        groupStageGroups.slice(currentNumGroups).forEach(g => {
            data.advancement.filter(line => line.split(',')[0].trim() === g.id).forEach(line => {
                existingNewGroupAdvancement.add(line);
            });
        });
        
        // Add advancement for new groups
        const newAdvancement = [];
        for (let g = 0; g < groupsToAdd; g++) {
            const newGroupId = groupStageGroups[currentNumGroups + g].id;
            const newGroupIndex = currentNumGroups + g;
            
            // For each position that has advancement
            Object.keys(advancementByPosition).forEach(srcPos => {
                const patterns = advancementByPosition[srcPos];
                if (patterns.length === 0) return;
                
                // Check if this goes to ranking group (position 3 typically)
                const goesToRanking = rankingGroupId && patterns.some(p => p.destGroup === String(rankingGroupId));
                
                let newEntry;
                if (goesToRanking) {
                    // 3rd place → ranking: just use next sequential position
                    const maxExistingPos = Math.max(...patterns.map(p => p.destPos));
                    const newDestPos = maxExistingPos + g + 1;
                    newEntry = newGroupId + ',' + srcPos + ',' + rankingGroupId + ',' + newDestPos;
                } else {
                    // 1st/2nd → knockout ties: copy pattern from existing groups
                    // Use the same destination group, but offset the position
                    const pattern = patterns[0]; // Use first group's pattern as template
                    const newDestPos = pattern.destPos + newGroupIndex;
                    newEntry = newGroupId + ',' + srcPos + ',' + pattern.destGroup + ',' + newDestPos;
                }
                
                // Only add if doesn't already exist
                if (!existingNewGroupAdvancement.has(newEntry) && 
                    !data.advancement.some(line => line === newEntry)) {
                    newAdvancement.push(newEntry);
                    changes.advancement++;
                }
            });
        }
        
        if (newAdvancement.length > 0) {
            insertInOrder(data.advancement, newAdvancement, parseInt(groupStageGroups[currentNumGroups].id));
        }
        
        console.log('Added', newAdvancement.length, 'advancement entries for new groups');
    }
    
    // ========== 8. UPDATE FillFromCompTable TASKS ==========
    // FillFromCompTable fills setup pots from initteams/rankings
    // Format: compId,start,FillFromCompTable,potId,sourceCompId,numTeams,startPos
    
    if (setupPots.length > 0) {
        const fillTasks = data.tasks.filter(line => 
            line.split(',')[0].trim() === compId && line.includes('FillFromCompTable')
        );
        
        if (fillTasks.length > 0) {
            // Scale teams per pot proportionally
            const scaleFactor = newTeams / Math.max(1, currentTeams);
            
            fillTasks.forEach(task => {
                const taskIdx = data.tasks.indexOf(task);
                const parts = task.split(',');
                if (parts.length >= 6) {
                    const currentCount = parseInt(parts[5]) || 1;
                    const newCount = Math.ceil(currentCount * scaleFactor);
                    parts[5] = newCount.toString();
                    data.tasks[taskIdx] = parts.join(',');
                    changes.tasks++;
                }
            });
            
            console.log('Updated FillFromCompTable tasks, scale factor:', scaleFactor.toFixed(2));
        }
    }
    
    // ========== DONE ==========
    
    // Recalculate nextId after all changes
    findNextId();
    
    console.log('=== CHANGES MADE ===');
    console.log('compobj:', changes.compobj);
    console.log('standings:', changes.standings);
    console.log('settings:', changes.settings);
    console.log('schedule:', changes.schedule);
    console.log('tasks:', changes.tasks);
    console.log('advancement:', changes.advancement);
    console.log('initteams:', changes.initteams);
    console.log('=== EXPAND COMPLETE ===');
    
    const totalChanges = Object.values(changes).reduce((a, b) => a + b, 0);
    toast('Expanded: ' + totalChanges + ' changes (' + groupsToAdd + ' groups, ' + selectedTeamIds.length + ' teams)');
}

// ============================================================
// DELETE COMPETITION
// ============================================================

let deleteCompData = {
    selectedComps: [],
    allIds: [],
    compCodes: []
};

function populateDeleteCompList() {
    const select = document.getElementById('del-comp-select');
    const parentFilter = document.getElementById('del-parent-filter');
    
    if (!select || !parentFilter) return;
    
    // Populate parent filter with confederations and nations
    parentFilter.innerHTML = '<option value="">-- All --</option>';
    hierarchy.confederations.forEach(c => {
        parentFilter.innerHTML += '<option value="' + c.id + '">' + c.code + ' (Confed)</option>';
    });
    hierarchy.nations.forEach(n => {
        parentFilter.innerHTML += '<option value="' + n.id + '">' + n.code + ' (Nation)</option>';
    });
    
    filterDeleteCompList();
}

function filterDeleteCompList() {
    const select = document.getElementById('del-comp-select');
    const parentFilter = document.getElementById('del-parent-filter').value;
    const genderFilter = document.getElementById('del-gender-filter').value;
    const typeFilter = document.getElementById('del-type-filter')?.value || '';
    const searchFilter = document.getElementById('del-search').value.toLowerCase();
    const countDisplay = document.getElementById('del-filtered-count');
    
    select.innerHTML = '';
    
    // Build combined list of all deletable items
    let allItems = [];
    
    if (!typeFilter || typeFilter === '3') {
        hierarchy.competitions.forEach(c => allItems.push({ ...c, typeLabel: 'Comp' }));
    }
    if (!typeFilter || typeFilter === '6') {
        hierarchy.friendlies.forEach(c => allItems.push({ ...c, typeLabel: 'Friendly' }));
    }
    if (!typeFilter || typeFilter === '2') {
        hierarchy.nations.forEach(c => allItems.push({ ...c, typeLabel: 'Nation' }));
    }
    
    if (allItems.length === 0) {
        select.innerHTML = '<option value="">-- Load compdata first --</option>';
        if (countDisplay) countDisplay.value = '0';
        return;
    }
    
    // Build set of women's competition IDs
    const womensCompIds = new Set();
    if (data.settings) {
        data.settings.forEach(line => {
            if (line.includes(',is_women_competition,true')) {
                const compId = line.split(',')[0].trim();
                womensCompIds.add(compId);
            }
        });
    }
    
    // Build set of valid parent IDs (hierarchical - include the selected parent and all its descendants)
    let validParents = null;
    if (parentFilter) {
        validParents = new Set([parentFilter]);
        // If filtering by a confederation, also include all nations under it
        hierarchy.nations.forEach(n => {
            if (n.parent === parentFilter) validParents.add(n.id);
        });
    }
    
    const filtered = allItems.filter(c => {
        if (validParents && !validParents.has(c.parent)) return false;
        
        if (genderFilter) {
            const isWomens = womensCompIds.has(c.id);
            if (genderFilter === 'women' && !isWomens) return false;
            if (genderFilter === 'men' && isWomens) return false;
        }
        
        if (searchFilter) {
            const matchCode = c.code.toLowerCase().includes(searchFilter);
            const matchName = c.name.toLowerCase().includes(searchFilter);
            if (!matchCode && !matchName) return false;
        }
        return true;
    });
    
    filtered.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.dataset.type = c.type;
        const isWomens = womensCompIds.has(c.id);
        const typeTag = c.typeLabel === 'Friendly' ? ' [Friendly]' : c.typeLabel === 'Nation' ? ' [Nation]' : '';
        opt.textContent = c.code + ' - ' + c.name + ' (ID: ' + c.id + ')' + typeTag + (isWomens ? ' 👩' : '');
        select.appendChild(opt);
    });
    
    if (countDisplay) countDisplay.value = filtered.length;
    
    if (select.options.length === 0) {
        select.innerHTML = '<option value="">-- No competitions found --</option>';
    }
    
    updateSelectedCount();
}

function selectAllFilteredComps() {
    const select = document.getElementById('del-comp-select');
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value) {
            select.options[i].selected = true;
        }
    }
    previewDeleteComp();
}

function clearCompSelection() {
    const select = document.getElementById('del-comp-select');
    for (let i = 0; i < select.options.length; i++) {
        select.options[i].selected = false;
    }
    previewDeleteComp();
}

function updateSelectedCount() {
    const select = document.getElementById('del-comp-select');
    const countSpan = document.getElementById('del-selected-count');
    if (!select || !countSpan) return;
    
    const selectedCount = Array.from(select.selectedOptions).filter(o => o.value).length;
    countSpan.textContent = selectedCount + ' selected';
}

function previewDeleteComp() {
    const select = document.getElementById('del-comp-select');
    const preview = document.getElementById('del-preview');
    
    updateSelectedCount();
    
    const selectedIds = Array.from(select.selectedOptions).map(o => o.value).filter(v => v);
    
    if (selectedIds.length === 0) {
        preview.innerHTML = '<span style="color:#8b949e">Select competition(s) to see what will be deleted</span>';
        deleteCompData = { selectedComps: [], allIds: [], compCodes: [] };
        return;
    }
    
    // Find all selected items (search across all types)
    const allDeletable = [...hierarchy.competitions, ...hierarchy.friendlies, ...hierarchy.nations];
    const selectedComps = selectedIds.map(id => allDeletable.find(c => c.id === id)).filter(c => c);
    
    if (selectedComps.length === 0) {
        preview.innerHTML = '<span style="color:#da3633">Competitions not found</span>';
        return;
    }
    
    // Collect all IDs for all selected competitions
    const allIds = new Set();
    
    function findChildren(parentId) {
        data.compobj.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 5) {
                const id = parseInt(parts[0].trim());
                const parent = parseInt(parts[4].trim());
                if (parent === parentId && !allIds.has(id)) {
                    allIds.add(id);
                    findChildren(id);
                }
            }
        });
    }
    
    selectedComps.forEach(comp => {
        allIds.add(parseInt(comp.id));
        findChildren(parseInt(comp.id));
    });
    
    const idsArray = Array.from(allIds);
    
    // Count entries in each file
    const counts = {
        compobj: 0,
        settings: 0,
        schedule: 0,
        standings: 0,
        advancement: 0,
        tasks: 0,
        objectives: 0,
        initteams: 0,
        weather: 0,
        compids: 0
    };
    
    data.compobj.forEach(line => {
        const id = parseInt(line.split(',')[0]);
        if (allIds.has(id)) counts.compobj++;
    });
    
    ['settings', 'schedule', 'standings', 'advancement', 'tasks', 'objectives', 'initteams', 'weather'].forEach(file => {
        if (data[file]) {
            data[file].forEach(line => {
                const id = parseInt(line.split(',')[0]);
                if (allIds.has(id)) counts[file]++;
            });
        }
    });
    
    // Check compids (any deleted ID that appears in compids)
    if (data.compids) {
        data.compids.forEach(line => {
            const id = parseInt(line.trim());
            if (allIds.has(id)) counts.compids++;
        });
    }
    
    // Build preview
    let html = '<div style="color:#da3633;font-weight:bold">⚠️ WILL BE DELETED:</div>\n';
    html += '<div style="margin-top:8px">';
    html += '<div style="color:#58a6ff">' + selectedComps.length + ' Competition(s):</div>';
    html += '<div style="margin-left:12px;max-height:100px;overflow-y:auto">';
    selectedComps.forEach(c => {
        html += '<div>• ' + c.code + ' - ' + c.name + ' (ID: ' + c.id + ')</div>';
    });
    html += '</div>';
    html += '<div style="margin-top:8px">Total IDs to remove: ' + idsArray.length + '</div>';
    html += '<div style="margin-top:12px;color:#f0883e">Rows affected:</div>';
    html += '<table style="margin-top:4px">';
    Object.entries(counts).forEach(([file, count]) => {
        if (count > 0) {
            html += '<tr><td style="padding:2px 10px 2px 0">' + file + '</td><td style="color:#da3633">' + count + ' rows</td></tr>';
        }
    });
    html += '</table>';
    
    const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);
    html += '<div style="margin-top:12px;color:#da3633;font-weight:bold">Total: ' + totalRows + ' rows will be deleted</div>';
    html += '</div>';
    
    preview.innerHTML = html;
    
    // Store for deletion
    deleteCompData = {
        selectedComps: selectedComps,
        allIds: idsArray,
        compCodes: selectedComps.map(c => c.code)
    };
}

function executeDeleteComp() {
    if (deleteCompData.selectedComps.length === 0) {
        toast('Select competition(s) first', 'error');
        return;
    }
    
    const confirmInput = document.getElementById('del-confirm-input').value.trim();
    if (confirmInput !== 'DELETE') {
        toast('Type DELETE to confirm', 'error');
        return;
    }
    
    // Save state before deletion for undo
    saveState('Delete ' + deleteCompData.selectedComps.length + ' competition(s)');
    
    const shouldCompact = document.getElementById('del-compact-ids').checked;
    const idsToDelete = new Set(deleteCompData.allIds);
    
    // Remove from compobj
    data.compobj = data.compobj.filter(line => {
        const id = parseInt(line.split(',')[0]);
        return !idsToDelete.has(id);
    });
    
    // Remove from other files
    ['settings', 'schedule', 'standings', 'advancement', 'tasks', 'objectives', 'initteams'].forEach(file => {
        if (data[file]) {
            data[file] = data[file].filter(line => {
                const id = parseInt(line.split(',')[0]);
                return !idsToDelete.has(id);
            });
        }
    });
    
    // Remove weather entries (keyed by rule_suspension values)
    // Collect suspension IDs from deleted settings before they were removed
    const weatherIdsToDelete = new Set();
    // The idsToDelete set contains nation IDs whose weather entries need cleanup
    // Weather is keyed by the rule_suspension value which may equal the nation row ID
    idsToDelete.forEach(id => weatherIdsToDelete.add(id));
    if (data.weather) {
        data.weather = data.weather.filter(line => {
            const id = parseInt(line.split(',')[0]);
            return !weatherIdsToDelete.has(id);
        });
    }
    
    // Remove from compids (check all deleted IDs, not just top-level selections)
    if (data.compids) {
        data.compids = data.compids.filter(line => {
            const id = parseInt(line.trim());
            return !idsToDelete.has(id);
        });
    }
    
    // Compact IDs if requested
    if (shouldCompact) {
        compactAllIds();
    }
    
    const deletedCount = deleteCompData.selectedComps.length;
    const deletedCodes = deleteCompData.compCodes.join(', ');
    
    // Update UI
    parseHierarchy();
    findNextId();
    populateDropdowns();
    populateDeleteCompList();
    
    // Ensure all files are in correct ID order
    sortAllData();
    
    // Update badges
    ['compobj','settings','standings','tasks','schedule','objectives','advancement','compids','initteams','weather'].forEach(updateBadge);
    
    // Clear form
    document.getElementById('del-confirm-input').value = '';
    document.getElementById('del-preview').innerHTML = '<span style="color:#238636">✓ ' + deletedCount + ' competition(s) deleted successfully' + (shouldCompact ? ' (IDs compacted)' : '') + '</span>';
    deleteCompData = { selectedComps: [], allIds: [], compCodes: [] };
    
    toast('Deleted ' + deletedCount + ' competition(s): ' + deletedCodes);
}

function compactAllIds() {
    // Get all current IDs from compobj and sort them
    // IMPORTANT: Skip ID 0 as it represents root/world level
    const currentIds = [];
    data.compobj.forEach(line => {
        const id = parseInt(line.split(',')[0]);
        if (!isNaN(id) && id > 0) currentIds.push(id); // Skip 0
    });
    currentIds.sort((a, b) => a - b);
    
    // Build mapping: old ID -> new sequential ID (starting from 1)
    const idMap = new Map();
    currentIds.forEach((oldId, index) => {
        const newId = index + 1; // Start from 1
        if (oldId !== newId) {
            idMap.set(oldId, newId);
        }
    });
    
    // If no changes needed, return
    if (idMap.size === 0) return;
    
    console.log('Compacting IDs, remapping', idMap.size, 'IDs');
    
    // Helper to remap an ID - NEVER remap 0 (root/FIFA level)
    function remap(id) {
        const parsed = parseInt(id);
        if (isNaN(parsed) || parsed === 0) return id; // Keep 0 as root
        return idMap.has(parsed) ? idMap.get(parsed) : parsed;
    }
    
    // Update compobj: columns 0 (ID) and 4 (parent ID)
    for (let i = 0; i < data.compobj.length; i++) {
        const parts = data.compobj[i].split(',');
        if (parts.length >= 5) {
            parts[0] = remap(parts[0].trim()).toString();
            parts[4] = remap(parts[4].trim()).toString();
            data.compobj[i] = parts.join(',');
        }
    }
    
    // Update settings: column 0
    for (let i = 0; i < data.settings.length; i++) {
        const parts = data.settings[i].split(',');
        if (parts.length >= 1) {
            parts[0] = remap(parts[0].trim()).toString();
            data.settings[i] = parts.join(',');
        }
    }
    
    // Update schedule: column 0
    for (let i = 0; i < data.schedule.length; i++) {
        const parts = data.schedule[i].split(',');
        if (parts.length >= 1) {
            parts[0] = remap(parts[0].trim()).toString();
            data.schedule[i] = parts.join(',');
        }
    }
    
    // Update standings: column 0
    for (let i = 0; i < data.standings.length; i++) {
        const parts = data.standings[i].split(',');
        if (parts.length >= 1) {
            parts[0] = remap(parts[0].trim()).toString();
            data.standings[i] = parts.join(',');
        }
    }
    
    // Update advancement: columns 0 (source) and 2 (destination)
    for (let i = 0; i < data.advancement.length; i++) {
        const parts = data.advancement[i].split(',');
        if (parts.length >= 3) {
            parts[0] = remap(parts[0].trim()).toString();
            parts[2] = remap(parts[2].trim()).toString();
            data.advancement[i] = parts.join(',');
        }
    }
    
    // Update tasks: columns 0 (comp ID) and 3 (target group/comp ID)
    for (let i = 0; i < data.tasks.length; i++) {
        const parts = data.tasks[i].split(',');
        if (parts.length >= 4) {
            parts[0] = remap(parts[0].trim()).toString();
            parts[3] = remap(parts[3].trim()).toString();
            // Column 4 might also be a comp ID for some task types
            if (parts.length >= 5) {
                parts[4] = remap(parts[4].trim()).toString();
            }
            data.tasks[i] = parts.join(',');
        }
    }
    
    // Update objectives: column 0
    for (let i = 0; i < data.objectives.length; i++) {
        const parts = data.objectives[i].split(',');
        if (parts.length >= 1) {
            parts[0] = remap(parts[0].trim()).toString();
            data.objectives[i] = parts.join(',');
        }
    }
    
    // Update initteams: column 0
    for (let i = 0; i < data.initteams.length; i++) {
        const parts = data.initteams[i].split(',');
        if (parts.length >= 1) {
            parts[0] = remap(parts[0].trim()).toString();
            data.initteams[i] = parts.join(',');
        }
    }
    
    // Update compids: entire line is the ID
    for (let i = 0; i < data.compids.length; i++) {
        const oldId = parseInt(data.compids[i].trim());
        if (!isNaN(oldId) && idMap.has(oldId)) {
            data.compids[i] = idMap.get(oldId).toString();
        }
    }
    
    console.log('ID compaction complete');
}