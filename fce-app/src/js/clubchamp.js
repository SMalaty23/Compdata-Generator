// ============================================================
// CONTINENTAL CUP GENERATOR
// ============================================================
// Replaces the old UEFA-only Club Championship generator.
// Builds C3005-style continental club cups (groups → KO → final).

let contSources = []; // [{type: 'league'|'comp', leagueId, compId, count, maxCountry}]

function contUpdateGroupCalc() {
    const teams = parseInt(document.getElementById('cont-teams').value) || 16;
    const groups = parseInt(document.getElementById('cont-numgroups').value) || 4;
    const tpg = teams / groups;
    const tpgEl = document.getElementById('cont-tpg');
    if (tpgEl) {
        if (Number.isInteger(tpg)) {
            tpgEl.value = tpg;
            tpgEl.style.color = '';
        } else {
            tpgEl.value = '⚠ ' + tpg.toFixed(1);
            tpgEl.style.color = '#da3633';
        }
    }
    contUpdateSourceTotal();
}

function contUpdateSourceTotal() {
    const teams = parseInt(document.getElementById('cont-teams').value) || 16;
    let total = 0;
    contSources.forEach(s => total += parseInt(s.count) || 0);
    const el = document.getElementById('cont-source-total');
    if (el) {
        el.textContent = 'Total: ' + total + ' / ' + teams;
        el.style.color = total === teams ? '#238636' : (total > teams ? '#da3633' : '#58a6ff');
    }
}

function contUpdateLeagueOptions() {
    contRenderSourceRows();
}

function contAddSourceRow(type) {
    const id = 'src_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    contSources.push({
        id,
        type,
        leagueId: '',
        compId: '',
        count: 4,
        maxCountry: 4
    });
    contRenderSourceRows();
}

function contRemoveSourceRow(id) {
    contSources = contSources.filter(s => s.id !== id);
    contRenderSourceRows();
}

function contUpdateSource(id, field, value) {
    const src = contSources.find(s => s.id === id);
    if (!src) return;
    src[field] = value;
    if (field === 'count') contUpdateSourceTotal();
}

function contRenderSourceRows() {
    const container = document.getElementById('cont-sources-list');
    if (!container) return;
    
    if (contSources.length === 0) {
        container.innerHTML = '<div style="color:#8b949e;font-size:0.75rem;padding:8px">No team sources added yet. Click "Add League Source" or "Add Feeder Comp" below.</div>';
        contUpdateSourceTotal();
        return;
    }
    
    let html = '';
    contSources.forEach(src => {
        html += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;padding:6px;background:#161b22;border-radius:4px">';
        
        if (src.type === 'league') {
            html += '<span style="color:#58a6ff;font-size:0.7rem;width:60px">📊 League</span>';
            html += '<select onchange="contUpdateSource(\'' + src.id + '\', \'leagueId\', this.value)" style="flex:2">';
            html += '<option value="">-- Pick league --</option>';
            if (db.leagues) {
                db.leagues.forEach(l => {
                    const sel = src.leagueId == l.leagueid ? ' selected' : '';
                    html += '<option value="' + l.leagueid + '"' + sel + '>' + l.leaguename + ' (' + l.leagueid + ')</option>';
                });
            }
            html += '</select>';
            html += '<label style="font-size:0.7rem;color:#8b949e">Teams</label>';
            html += '<input type="number" min="1" max="32" value="' + src.count + '" onchange="contUpdateSource(\'' + src.id + '\', \'count\', this.value); contUpdateSource(\'' + src.id + '\', \'maxCountry\', this.value); contUpdateSourceTotal()" style="width:60px" title="Number of top teams to take from this league">';
        } else if (src.type === 'comp') {
            html += '<span style="color:#f0883e;font-size:0.7rem;width:60px">🏆 Comp</span>';
            html += '<select onchange="contUpdateSource(\'' + src.id + '\', \'compId\', this.value)" style="flex:2">';
            html += '<option value="">-- Pick feeder comp --</option>';
            if (hierarchy && hierarchy.competitions) {
                hierarchy.competitions.forEach(c => {
                    const sel = src.compId == c.id ? ' selected' : '';
                    html += '<option value="' + c.id + '"' + sel + '>' + c.code + ' - ' + c.name + ' (ID: ' + c.id + ')</option>';
                });
            }
            html += '</select>';
            html += '<label style="font-size:0.7rem;color:#8b949e">Teams</label>';
            html += '<input type="number" min="1" max="32" value="' + src.count + '" onchange="contUpdateSource(\'' + src.id + '\', \'count\', this.value); contUpdateSourceTotal()" style="width:60px" title="Number of teams from this comp">';
        }
        
        html += '<button class="btn btn-secondary" onclick="contRemoveSourceRow(\'' + src.id + '\')" style="padding:4px 8px">✖</button>';
        html += '</div>';
    });
    
    container.innerHTML = html;
    contUpdateSourceTotal();
}

function contPopulateParents() {
    const sel = document.getElementById('cont-parent');
    if (!sel || !hierarchy) return;
    sel.innerHTML = '<option value="">-- Select --</option>';
    hierarchy.confederations.forEach(c => {
        sel.innerHTML += '<option value="' + c.id + '">' + c.code + ' - ' + c.name + '</option>';
    });
}

// Hook into showPage to refresh dropdowns
const _origShowPageForCont = window.showPage;
if (typeof _origShowPageForCont === 'function') {
    window.showPage = function(name) {
        _origShowPageForCont(name);
        if (name === 'clubchamp') {
            contPopulateParents();
            contRenderSourceRows();
            contUpdateGroupCalc();
        }
    };
}

// ============================================================
// MAIN GENERATOR
// ============================================================
function generateContinentalCup() {
    const parentId = document.getElementById('cont-parent').value;
    const code = document.getElementById('cont-code').value.trim().toUpperCase();
    const assetId = parseInt(document.getElementById('cont-asset').value);
    const teamCount = parseInt(document.getElementById('cont-teams').value);
    const numGroups = parseInt(document.getElementById('cont-numgroups').value);
    const advancePerGroup = parseInt(document.getElementById('cont-advance').value);
    const startMonth = parseInt(document.getElementById('cont-startmonth').value);
    const startDayOfMonth = parseInt(document.getElementById('cont-startday').value);
    const gap = parseInt(document.getElementById('cont-gap').value);
    const importance = parseInt(document.getElementById('cont-importance').value);
    const prize = parseInt(document.getElementById('cont-prize').value) || 0;
    const prizeDrop = parseInt(document.getElementById('cont-prize-drop').value) || 0;
    
    if (!parentId) { toast('Select a parent confederation', 'error'); return; }
    if (!code) { toast('Enter a code', 'error'); return; }
    if (!assetId) { toast('Enter an asset ID', 'error'); return; }
    
    const teamsPerGroup = teamCount / numGroups;
    if (!Number.isInteger(teamsPerGroup)) {
        toast('Teams (' + teamCount + ') must be divisible by groups (' + numGroups + ')', 'error');
        return;
    }
    
    if (advancePerGroup < 1 || advancePerGroup > teamsPerGroup) {
        toast('Advance per group must be between 1 and ' + teamsPerGroup, 'error');
        return;
    }
    
    const advancingTeams = numGroups * advancePerGroup;
    if (advancingTeams !== 8) {
        toast('Bracket needs exactly 8 advancing teams (currently ' + advancingTeams + '). Adjust groups × advance per group to equal 8.', 'error');
        return;
    }
    
    let sourceTotal = 0;
    contSources.forEach(s => sourceTotal += parseInt(s.count) || 0);
    if (sourceTotal !== teamCount) {
        toast('Source teams (' + sourceTotal + ') must equal total teams (' + teamCount + ')', 'error');
        return;
    }
    
    if (contSources.length === 0) {
        toast('Add at least one team source', 'error');
        return;
    }
    
    for (const s of contSources) {
        if (s.type === 'league' && !s.leagueId) {
            toast('All league sources must have a league selected', 'error');
            return;
        }
        if (s.type === 'comp' && !s.compId) {
            toast('All feeder comp sources must have a comp selected', 'error');
            return;
        }
    }
    
    // Validate feeder comps have enough initteams slots
    for (const s of contSources) {
        if (s.type !== 'comp') continue;
        const compSlots = data.initteams.filter(line => {
            const parts = line.split(',');
            return parts[0].trim() === s.compId.toString();
        });
        const need = parseInt(s.count) || 0;
        if (compSlots.length < need) {
            const compName = hierarchy.competitions.find(c => c.id === s.compId.toString())?.code || s.compId;
            toast('Feeder comp ' + compName + ' has ' + compSlots.length + ' initteams slot(s), need ' + need, 'error');
            return;
        }
    }
    
    // ----- Begin generation -----
    saveState('Generate Continental Cup ' + code);
    
    const { insertIdx, insertRowId } = findCompInsertPosition(parseInt(parentId));
    
    const totalRows = 1 + 1 + 1 + 1 + numGroups + 1 + 2 + 1 + 4 + 1 + 2 + 1 + 1;
    
    renumberAllFiles(insertRowId, totalRows);
    
    let id = insertRowId;
    const compId = id++;
    const s1Id = id++;
    const setupGroupId = id++;
    const s2Id = id++;
    const groupIds = [];
    for (let i = 0; i < numGroups; i++) groupIds.push(id++);
    const s3Id = id++;
    const winnersPotId = id++;
    const losersPotId = id++;
    const s4Id = id++;
    const qfIds = [id++, id++, id++, id++];
    const s5Id = id++;
    const sfIds = [id++, id++];
    const s6Id = id++;
    const finalId = id++;
    
    // ----- COMPOBJ -----
    const groupLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const newCompobj = [
        compId + ',3,' + code + ',TrophyName_Abbr15_' + assetId + ',' + parentId,
        s1Id + ',4,S1, ,' + compId,
        setupGroupId + ',5,G1, ,' + s1Id,
        s2Id + ',4,S2,FCE_Group_Stage,' + compId,
    ];
    for (let i = 0; i < numGroups; i++) {
        newCompobj.push(groupIds[i] + ',5,G' + (i+1) + ',FCE_Group_' + groupLabels[i] + ',' + s2Id);
    }
    newCompobj.push(s3Id + ',4,S3, ,' + compId);
    newCompobj.push(winnersPotId + ',5,G1, ,' + s3Id);
    newCompobj.push(losersPotId + ',5,G2, ,' + s3Id);
    newCompobj.push(s4Id + ',4,S4,FCE_Quarter_Finals,' + compId);
    for (let i = 0; i < 4; i++) newCompobj.push(qfIds[i] + ',5,G' + (i+1) + ', ,' + s4Id);
    newCompobj.push(s5Id + ',4,S5,FCE_Semi_Finals,' + compId);
    for (let i = 0; i < 2; i++) newCompobj.push(sfIds[i] + ',5,G' + (i+1) + ', ,' + s5Id);
    newCompobj.push(s6Id + ',4,S6,FCE_Final,' + compId);
    newCompobj.push(finalId + ',5,G1, ,' + s6Id);
    
    data.compobj.splice(insertIdx + 1, 0, ...newCompobj);
    
    // ----- SETTINGS -----
    const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const settings = [
        compId + ',asset_id,' + assetId,
        compId + ',comp_type,CUP',
        compId + ',match_matchimportance,' + importance,
        compId + ',schedule_seasonstartmonth,' + MONTH_NAMES[startMonth - 1],
        s1Id + ',match_stagetype,SETUP',
        s2Id + ',match_stagetype,LEAGUE',
        s2Id + ',match_matchsituation,GROUP',
    ];
    for (let i = 0; i < numGroups; i++) {
        settings.push(groupIds[i] + ',num_games,2');
    }
    settings.push(s3Id + ',match_stagetype,SETUP');
    settings.push(s4Id + ',match_stagetype,KO2LEGS');
    settings.push(s4Id + ',match_matchsituation,QUARTER');
    settings.push(s4Id + ',advance_maxteamsgroup,1');
    settings.push(s4Id + ',advance_maxteamsstageref,' + s2Id);
    settings.push(s4Id + ',advance_random_draw_event,1');
    settings.push(s4Id + ',rule_allowadditionalsub,on');
    if (prize > 0) {
        settings.push(s4Id + ',info_prize_money,' + Math.floor(prize * 0.05));
        settings.push(s4Id + ',info_prize_money_drop,' + prizeDrop);
    }
    for (let i = 0; i < 4; i++) settings.push(qfIds[i] + ',num_games,2');
    settings.push(s5Id + ',match_stagetype,KO2LEGS');
    settings.push(s5Id + ',match_matchsituation,SEMI');
    settings.push(s5Id + ',rule_allowadditionalsub,on');
    if (prize > 0) {
        settings.push(s5Id + ',info_prize_money,' + Math.floor(prize * 0.15));
        settings.push(s5Id + ',info_prize_money_drop,' + prizeDrop);
    }
    for (let i = 0; i < 2; i++) settings.push(sfIds[i] + ',num_games,2');
    settings.push(s6Id + ',match_stagetype,KO1LEG');
    settings.push(s6Id + ',match_matchsituation,FINAL');
    settings.push(s6Id + ',rule_allowadditionalsub,on');
    if (prize > 0) {
        settings.push(s6Id + ',info_prize_money,' + Math.floor(prize * 0.5));
        settings.push(s6Id + ',info_prize_money_drop,' + prizeDrop);
    }
    settings.push(finalId + ',num_games,1');
    settings.push(finalId + ',info_slot_champ,1');
    
    insertInOrder(data.settings, settings, compId);
    
    // ----- STANDINGS -----
    const standings = [];
    for (let i = 0; i < teamCount; i++) standings.push(setupGroupId + ',' + i);
    for (let g = 0; g < numGroups; g++) {
        for (let i = 0; i < teamsPerGroup; i++) standings.push(groupIds[g] + ',' + i);
    }
    for (let i = 0; i < numGroups; i++) standings.push(winnersPotId + ',' + i);
    for (let i = 0; i < numGroups; i++) standings.push(losersPotId + ',' + i);
    for (let i = 0; i < 4; i++) {
        standings.push(qfIds[i] + ',0');
        standings.push(qfIds[i] + ',1');
    }
    for (let i = 0; i < 2; i++) {
        standings.push(sfIds[i] + ',0');
        standings.push(sfIds[i] + ',1');
    }
    standings.push(finalId + ',0');
    standings.push(finalId + ',1');
    
    insertInOrder(data.standings, standings, setupGroupId);
    
    // ----- ADVANCEMENT -----
    const advancement = [];
    
    // Setup → groups (snake-seed across groups)
    for (let pos = 1; pos <= teamCount; pos++) {
        const groupIdx = (pos - 1) % numGroups;
        const slotInGroup = Math.floor((pos - 1) / numGroups) + 1;
        advancement.push(setupGroupId + ',' + pos + ',' + groupIds[groupIdx] + ',' + slotInGroup);
    }
    
    // Each group → KO pots
    for (let g = 0; g < numGroups; g++) {
        advancement.push(groupIds[g] + ',1,' + winnersPotId + ',' + (g + 1));
        if (advancePerGroup >= 2) {
            advancement.push(groupIds[g] + ',2,' + losersPotId + ',' + (g + 1));
        }
    }
    
    // Pots → QF (winners pot fills slot 1 of QFs, losers pot fills slot 2)
    for (let i = 0; i < numGroups; i++) {
        const qfIdx = i % 4;
        advancement.push(winnersPotId + ',0,' + qfIds[qfIdx] + ',1');
    }
    for (let i = 0; i < numGroups; i++) {
        const qfIdx = i % 4;
        advancement.push(losersPotId + ',0,' + qfIds[qfIdx] + ',2');
    }
    
    // QF → SF (standard bracket)
    advancement.push(qfIds[0] + ',1,' + sfIds[0] + ',1');
    advancement.push(qfIds[1] + ',1,' + sfIds[0] + ',2');
    advancement.push(qfIds[2] + ',1,' + sfIds[1] + ',1');
    advancement.push(qfIds[3] + ',1,' + sfIds[1] + ',2');
    
    // SF → Final
    advancement.push(sfIds[0] + ',1,' + finalId + ',1');
    advancement.push(sfIds[1] + ',1,' + finalId + ',2');
    
    insertInOrder(data.advancement, advancement, setupGroupId);
    
    // ----- TASKS -----
    const tasks = [];
    contSources.forEach(s => {
        if (s.type === 'league') {
            tasks.push(compId + ',start,FillFromLeagueMaxFromCountry,' + setupGroupId + ',' + s.leagueId + ',' + s.count + ',' + s.maxCountry);
        } else if (s.type === 'comp') {
            tasks.push(compId + ',start,FillFromCompTable,' + setupGroupId + ',' + s.compId + ',' + s.count + ',0');
        }
    });
    tasks.push(compId + ',end,UpdateTable,' + compId + ',' + finalId + ',1,1');
    
    insertInOrder(data.tasks, tasks, compId);
    
    // ----- INITTEAMS -----
    const newInitteams = [compId + ',1,-1'];
    insertInOrder(data.initteams, newInitteams, compId);
    
    // ----- COMPIDS -----
    insertCompId(compId);
    
    // ----- OBJECTIVES -----
    const objectives = [
        setupGroupId + ',REACH_GROUPS,0',
    ];
    for (let g = 0; g < numGroups; g++) {
        objectives.push(groupIds[g] + ',REACH_QUARTER_FINALS,0');
    }
    for (let i = 0; i < 4; i++) {
        objectives.push(qfIds[i] + ',REACH_SEMI_FINALS,0');
    }
    for (let i = 0; i < 2; i++) {
        objectives.push(sfIds[i] + ',REACH_FINALS,0');
    }
    objectives.push(finalId + ',CHAMPION,1');
    objectives.push(finalId + ',REACH_FINALS,0');
    
    insertInOrder(data.objectives, objectives, setupGroupId);
    
    // ----- SCHEDULE -----
    const schedule = [];
    const startDay = dayOfYear(startMonth, startDayOfMonth);
    let curDay = startDay;
    
    const groupRounds = (teamsPerGroup - 1) * 2;
    const matchesPerMD = teamsPerGroup / 2;
    for (let r = 1; r <= groupRounds; r++) {
        for (let g = 0; g < numGroups; g++) {
            schedule.push(groupIds[g] + ',' + curDay + ',' + r + ',' + matchesPerMD + ',' + matchesPerMD + ',1900');
        }
        curDay += gap;
    }
    
    for (let i = 0; i < 4; i++) schedule.push(qfIds[i] + ',' + curDay + ',1,1,1,1900');
    curDay += gap;
    for (let i = 0; i < 4; i++) schedule.push(qfIds[i] + ',' + curDay + ',2,1,1,1900');
    curDay += gap;
    
    for (let i = 0; i < 2; i++) schedule.push(sfIds[i] + ',' + curDay + ',1,1,1,1900');
    curDay += gap;
    for (let i = 0; i < 2; i++) schedule.push(sfIds[i] + ',' + curDay + ',2,1,1,1900');
    curDay += gap;
    
    schedule.push(finalId + ',' + curDay + ',1,1,1,1900');
    
    insertInOrder(data.schedule, schedule, groupIds[0]);
    
    // ----- FINISH -----
    finishGeneration('Continental Cup ' + code, compId, finalId);
    
    // Reset for next generation
    contSources = [];
    contRenderSourceRows();
}