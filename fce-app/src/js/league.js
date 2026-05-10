// ============================================================
// LEAGUE GENERATOR
// ============================================================

// Map schedule_seasonstartmonth strings to numeric month values
const SEASON_MONTH_MAP = {
    JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
    JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
};

// When a nation is selected, pull its schedule_seasonstartmonth from settings
// and auto-fill the league start month/day.
function autoSetStartMonthFromNation(nationId) {
    if (!nationId || !data.settings) return;
    
    // Find this nation's schedule_seasonstartmonth setting
    let seasonMonth = null;
    for (const line of data.settings) {
        const parts = line.split(',');
        if (parts.length >= 3 && parts[0].trim() === nationId.toString() && parts[1].trim() === 'schedule_seasonstartmonth') {
            seasonMonth = parts[2].trim().toUpperCase();
            break;
        }
    }
    
    if (!seasonMonth) return;
    
    const monthNum = SEASON_MONTH_MAP[seasonMonth];
    if (!monthNum) return;
    
    // Update the league start month dropdown
    const monthEl = document.getElementById('league-startmonth');
    if (monthEl) {
        monthEl.value = monthNum;
        // Trigger the calc day update
        if (typeof updateLeagueCalcDay === 'function') updateLeagueCalcDay();
    }
    
    // For January-season leagues, use day 15 as default; for others keep existing
    const dayEl = document.getElementById('league-startdayofmonth');
    if (dayEl && monthNum === 1) {
        dayEl.value = 15;
        if (typeof updateLeagueCalcDay === 'function') updateLeagueCalcDay();
    }
}

function dayOfYear(month, day) {
    // Days in each month (non-leap year)
    const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let doy = 0;
    for (let m = 1; m < month; m++) {
        doy += daysInMonth[m];
    }
    return doy + day;
}

function updateLeagueCalcDay() {
    const month = parseInt(document.getElementById('league-startmonth').value) || 8;
    const day = parseInt(document.getElementById('league-startdayofmonth').value) || 15;
    const doy = dayOfYear(month, day);
    document.getElementById('league-calcday').value = 'Day ' + doy;
}

// Add event listeners for calc day update
document.addEventListener('DOMContentLoaded', function() {
    const monthEl = document.getElementById('league-startmonth');
    const dayEl = document.getElementById('league-startdayofmonth');
    if (monthEl) monthEl.addEventListener('change', updateLeagueCalcDay);
    if (dayEl) dayEl.addEventListener('input', updateLeagueCalcDay);
    updateLeagueCalcDay();
});

function findInsertPosition(arr, targetId) {
    // Find position where targetId should be inserted to maintain ID order
    // Insert AFTER all entries with the same ID (for initteams, standings, etc.)
    let lastSameOrLower = -1;
    for (let i = 0; i < arr.length; i++) {
        const id = parseInt(arr[i].split(',')[0].trim());
        if (id <= targetId) lastSameOrLower = i;
    }
    return lastSameOrLower + 1;
}

function insertInOrder(arr, entries, firstId) {
    const pos = findInsertPosition(arr, firstId);
    arr.splice(pos, 0, ...entries);
}

function insertCompId(compId) {
    // Insert compid in sorted order, not at the bottom
    let insertIdx = 0;
    for (let i = 0; i < data.compids.length; i++) {
        if (parseInt(data.compids[i]) < compId) insertIdx = i + 1;
    }
    data.compids.splice(insertIdx, 0, compId.toString());
}

function findLastDescendant(parentId) {
    // Find the last ID that belongs under this parent (recursively)
    let lastId = parentId;
    let found = true;
    
    while (found) {
        found = false;
        for (let i = 0; i < data.compobj.length; i++) {
            const parts = data.compobj[i].split(',');
            if (parts.length >= 5) {
                const id = parseInt(parts[0].trim());
                const parent = parseInt(parts[4].trim());
                // If this item's parent is anywhere in our tree (from parentId to lastId)
                if (parent >= parentId && parent <= lastId && id > lastId) {
                    lastId = id;
                    found = true;
                }
            }
        }
    }
    return lastId;
}

function findCompInsertPosition(parentId) {
    // Find insertIdx (array index) and insertRowId (the ID to use) for compobj
    const lastId = findLastDescendant(parentId);
    let insertIdx = -1;
    
    for (let i = 0; i < data.compobj.length; i++) {
        const parts = data.compobj[i].split(',');
        if (parts.length >= 5) {
            const id = parseInt(parts[0].trim());
            if (id === lastId) {
                insertIdx = i;
                break;
            }
        }
    }
    
    return { insertIdx, insertRowId: lastId + 1 };
}

function onLeagueTypeChange() {
    const type = document.getElementById('league-type').value;
    document.getElementById('league-split-options').style.display = type === 'split' ? 'block' : 'none';
    document.getElementById('league-playoff-options').style.display = type === 'playoff' ? 'block' : 'none';
}

function previewLeague() {
    const preview = document.getElementById('league-preview');
    const config = getLeagueConfig();
    
    if (!config.valid) {
        preview.innerHTML = '<span style="color:#f85149">' + config.error + '</span>';
        return;
    }
    
    let html = '<div style="color:#58a6ff;margin-bottom:8px"><strong>' + config.code + '</strong></div>';
    html += 'Teams: ' + config.teams + ' | Format: ' + config.numGames + 'x round-robin<br>';
    html += 'Prize: $' + config.prize.toLocaleString() + '<br>';
    
    if (config.promotion > 0 || config.promotionPlayoff > 0) {
        html += 'Promotion: ' + config.promotion + ' direct';
        if (config.promotionPlayoff > 0) html += ' + ' + config.promotionPlayoff + ' playoff';
        html += '<br>';
    }
    if (config.relegation > 0 || config.relegationPlayoff > 0) {
        html += 'Relegation: ' + config.relegation + ' direct';
        if (config.relegationPlayoff > 0) html += ' + ' + config.relegationPlayoff + ' playoff';
        html += '<br>';
    }
    
    const rounds = config.isOdd ? config.teams * config.numGames : (config.teams - 1) * config.numGames;
    html += 'Schedule: ' + rounds + ' rounds, Day ' + config.startDay + '-' + (config.startDay + (rounds-1) * config.gap);
    
    preview.innerHTML = html;
}

function getLeagueConfig() {
    const parentId = document.getElementById('league-parent').value;
    const rawCode = document.getElementById('league-code').value.trim().toUpperCase();
    const code = rawCode.startsWith('C') ? rawCode : 'C' + rawCode;
    const assetId = parseInt(document.getElementById('league-assetid').value) || 0;
    const leagueDbId = parseInt(document.getElementById('league-dbid').value) || 0;
    const leagueType = document.getElementById('league-type').value;
    const teams = parseInt(document.getElementById('league-teams').value) || 18;
    const numGames = parseInt(document.getElementById('league-numgames').value) || 2;
    const splitTop = parseInt(document.getElementById('league-split-top')?.value) || 6;
    const playoffTeams = parseInt(document.getElementById('league-playoff-teams')?.value) || 4;
    const playoffLegs = document.getElementById('league-playoff-legs')?.value || '1';
    const promotion = parseInt(document.getElementById('league-promotion')?.value) || 0;
    const promotionPlayoff = parseInt(document.getElementById('league-promotion-playoff')?.value) || 0;
    const relegation = parseInt(document.getElementById('league-relegation')?.value) || 0;
    const relegationPlayoff = parseInt(document.getElementById('league-relegation-playoff')?.value) || 0;
    const prize = parseInt(document.getElementById('league-prize').value) || 0;
    const prizeDrop = parseInt(document.getElementById('league-prizedrop').value) || 5;
    const startMonth = parseInt(document.getElementById('league-startmonth').value) || 8;
    const startDayOfMonth = parseInt(document.getElementById('league-startdayofmonth').value) || 15;
    const startDay = dayOfYear(startMonth, startDayOfMonth);
    const gap = parseInt(document.getElementById('league-gap').value) || 7;
    const kickoff = parseInt(document.getElementById('league-kickoff').value) || 1500;
    const year = parseInt(document.getElementById('league-year').value) || 2025;
    
    if (!parentId) return { valid: false, error: 'Select parent nation' };
    if (!code || code === 'C') return { valid: false, error: 'Enter code' };
    if (!assetId) return { valid: false, error: 'Enter asset ID' };
    if (teams < 4) return { valid: false, error: 'Min 4 teams' };
    
    const league = db.leagues.find(l => l.leagueid === (leagueDbId || assetId));
    
    return {
        valid: true,
        parentId: parseInt(parentId),
        code,
        assetId,
        leagueDbId: leagueDbId || assetId,
        leagueType,
        teams,
        numGames,
        splitTop,
        playoffTeams,
        playoffLegs,
        promotion,
        promotionPlayoff,
        relegation,
        relegationPlayoff,
        prize,
        prizeDrop,
        startDay,
        gap,
        kickoff,
        year,
        isOdd: teams % 2 !== 0
    };
}

function generateLeague() {
    if (data.compobj.length === 0) { toast('Load compobj first', 'error'); return; }
    
    const config = getLeagueConfig();
    if (!config.valid) { toast(config.error, 'error'); return; }
    
    // Check duplicate
    for (let line of data.settings) {
        const parts = line.split(',');
        if (parts[1]?.trim() === 'asset_id' && parseInt(parts[2]?.trim()) === config.assetId) {
            toast('Asset ID ' + config.assetId + ' exists', 'error');
            return;
        }
    }
    
    if (config.leagueType === 'standard') generateStandardLeague(config);
    else if (config.leagueType === 'split') generateSplitLeague(config);
    else if (config.leagueType === 'playoff') generatePlayoffLeague(config);
}

function generateStandardLeague(config) {
    // Save state before generation for undo
    saveState('Generate League ' + config.code);
    
    const teamCount = config.teams;
    const rounds = config.isOdd ? teamCount * config.numGames : (teamCount - 1) * config.numGames;
    
    // Find insert position after ALL descendants of this nation
    const { insertIdx, insertRowId } = findCompInsertPosition(config.parentId);
    
    // Renumber everything >= insertRowId up by 3
    renumberAllFiles(insertRowId, 3);
    
    const compId = insertRowId, stageId = insertRowId + 1, groupId = insertRowId + 2;
    
    // COMPOBJ
    data.compobj.splice(insertIdx + 1, 0,
        compId + ',3,' + config.code + ',TrophyName_Abbr15_' + config.assetId + ',' + config.parentId,
        stageId + ',4,S1,FCE_League_Stage,' + compId,
        groupId + ',5,G1, ,' + stageId
    );
    
    // SETTINGS
    const settings = [
        compId + ',asset_id,' + config.assetId,
        compId + ',comp_type,LEAGUE',
        stageId + ',match_matchsituation,LEAGUE',
        stageId + ',standings_sort,POINTS',
        stageId + ',standings_sort,GOALDIFF',
        stageId + ',standings_sort,GOALSFOR',
        stageId + ',standings_sort,H2HPOINTS',
        stageId + ',standings_sort,H2HGOALSFOR',
        stageId + ',standings_sort,H2HGOALSAWAY',
        groupId + ',num_games,' + config.numGames,
        groupId + ',info_slot_champ,1',
        groupId + ',info_label_slot_champ,1'
    ];
    
    // Prize money only if set
    if (config.prize > 0) {
        settings.push(stageId + ',info_prize_money,' + config.prize);
        settings.push(stageId + ',info_prize_money_drop,' + config.prizeDrop);
    }
    
    // Promotion slots only if promotion exists
    if (config.promotion > 0) {
        for (let i = 1; i <= config.promotion; i++) {
            settings.push(groupId + ',info_slot_promo,' + i);
        }
        for (let i = 1; i <= config.promotion; i++) {
            settings.push(groupId + ',info_label_slot_promo,' + i);
        }
    }
    
    // Promotion playoff only if set
    if (config.promotionPlayoff > 0) {
        const start = config.promotion + 1;
        const end = config.promotion + config.promotionPlayoff;
        for (let i = start; i <= end; i++) {
            settings.push(groupId + ',info_slot_promo_poss,' + i);
        }
        for (let i = start; i <= end; i++) {
            settings.push(groupId + ',info_label_slot_promo_playoff,' + i);
        }
    }
    
    // Relegation slots only if relegation exists
    if (config.relegation > 0) {
        const start = teamCount - config.relegation + 1;
        for (let i = start; i <= teamCount; i++) {
            settings.push(groupId + ',info_slot_releg,' + i);
        }
        for (let i = start; i <= teamCount; i++) {
            settings.push(groupId + ',info_label_slot_releg,' + i);
        }
    }
    
    // Relegation playoff only if set
    if (config.relegationPlayoff > 0) {
        const start = teamCount - config.relegation - config.relegationPlayoff + 1;
        const end = teamCount - config.relegation;
        for (let i = start; i <= end; i++) {
            settings.push(groupId + ',info_slot_releg_poss,' + i);
        }
        for (let i = start; i <= end; i++) {
            settings.push(groupId + ',info_label_slot_releg_playoff,' + i);
        }
    }
    
    settings.push(groupId + ',info_override_slot_labels,1');
    insertInOrder(data.settings, settings, compId);
    
    // STANDINGS (0 to teamCount-1) - insert in order
    const standings = [];
    for (let i = 0; i < teamCount; i++) {
        standings.push(groupId + ',' + i);
    }
    insertInOrder(data.standings, standings, groupId);
    
    // TASKS - insert in order
    const tasks = [
        compId + ',start,FillFromLeague,' + groupId + ',' + config.leagueDbId + ',0,0',
        compId + ',start,ClearLeagueStats,' + stageId + ',' + config.leagueDbId + ',0,0',
        compId + ',end,UpdateLeagueStats,' + stageId + ',' + config.leagueDbId + ',0,0'
    ];
    
    // UpdateTable only if other comps need results (promotion/relegation links)
    if (config.promotion > 0 || config.relegation > 0) {
        for (let i = 1; i <= teamCount; i++) {
            tasks.push(compId + ',end,UpdateTable,' + compId + ',' + groupId + ',' + i + ',' + i);
        }
    }
    insertInOrder(data.tasks, tasks, compId);
    
    // SCHEDULE - insert in order
    const schedule = [];
    const matchesPerRound = Math.ceil(teamCount / 2);
    for (let r = 1; r <= rounds; r++) {
        schedule.push(stageId + ',' + (config.startDay + (r-1) * config.gap) + ',' + r + ',' + matchesPerRound + ',' + matchesPerRound + ',' + config.kickoff);
    }
    insertInOrder(data.schedule, schedule, stageId);
    
    // OBJECTIVES - insert in order
    const objectives = [];
    generateObjectivesArr(objectives, groupId, teamCount, config.relegation > 0);
    insertInOrder(data.objectives, objectives, groupId);
    
    // COMPIDS - just append (it's just a list of IDs)
    insertCompId(compId);
    
    finishGeneration('League ' + config.code, compId, groupId);
}

function generateSplitLeague(config) {
    // Save state before generation for undo
    saveState('Generate Split League ' + config.code);
    
    const teamCount = config.teams;
    const topCount = config.splitTop;
    const bottomCount = teamCount - topCount;
    const phase1Rounds = config.isOdd ? teamCount * config.numGames : (teamCount - 1) * config.numGames;
    const phase2Rounds = topCount - 1;
    
    // Find insert position after ALL descendants of this nation
    const { insertIdx, insertRowId } = findCompInsertPosition(config.parentId);
    
    // Renumber everything >= insertRowId up by 6
    renumberAllFiles(insertRowId, 6);
    
    const compId = insertRowId;
    const stage1Id = insertRowId + 1, group1Id = insertRowId + 2;
    const stage2Id = insertRowId + 3, groupTopId = insertRowId + 4, groupBottomId = insertRowId + 5;
    
    // COMPOBJ
    data.compobj.splice(insertIdx + 1, 0,
        compId + ',3,' + config.code + ',TrophyName_Abbr15_' + config.assetId + ',' + config.parentId,
        stage1Id + ',4,S1,FCE_League_Stage_1,' + compId,
        group1Id + ',5,G1, ,' + stage1Id,
        stage2Id + ',4,S2,FCE_League_Stage_2,' + compId,
        groupTopId + ',5,G1,FCE_Championship_Group,' + stage2Id,
        groupBottomId + ',5,G2,FCE_Bottom_Group,' + stage2Id
    );
    
    // SETTINGS
    const settings = [
        compId + ',asset_id,' + config.assetId,
        compId + ',comp_type,LEAGUE',
        stage1Id + ',match_matchsituation,LEAGUE',
        stage1Id + ',num_games,' + config.numGames
    ];
    
    // Phase 1 advancement labels (one fewer than topCount)
    for (let i = 1; i < topCount; i++) {
        settings.push(group1Id + ',info_label_slot_adv_group,' + i);
    }
    
    // Phase 2
    settings.push(stage2Id + ',match_matchsituation,LEAGUE');
    settings.push(stage2Id + ',advance_standingskeep,' + stage1Id);
    settings.push(groupTopId + ',num_games,1');
    settings.push(groupTopId + ',info_slot_champ,1');
    settings.push(groupTopId + ',info_label_slot_champ,1');
    settings.push(groupBottomId + ',num_games,1');
    
    if (config.prize > 0) {
        settings.push(groupTopId + ',info_prize_money,' + config.prize);
        settings.push(groupTopId + ',info_prize_money_drop,' + config.prizeDrop);
    }
    
    // Relegation from bottom group
    if (config.relegation > 0) {
        for (let i = bottomCount - config.relegation + 1; i <= bottomCount; i++) {
            settings.push(groupBottomId + ',info_slot_releg,' + i);
            settings.push(groupBottomId + ',info_label_slot_releg,' + i);
        }
    }
    
    insertInOrder(data.settings, settings, compId);
    
    // STANDINGS - insert in order
    const standings = [];
    for (let i = 0; i < teamCount; i++) standings.push(group1Id + ',' + i);
    for (let i = 0; i < topCount; i++) standings.push(groupTopId + ',' + i);
    for (let i = 0; i < bottomCount; i++) standings.push(groupBottomId + ',' + i);
    insertInOrder(data.standings, standings, group1Id);
    
    // ADVANCEMENT - insert in order
    const advancement = [];
    for (let i = 1; i <= topCount; i++) {
        advancement.push(group1Id + ',' + i + ',' + groupTopId + ',' + i);
    }
    for (let i = 1; i <= bottomCount; i++) {
        advancement.push(group1Id + ',' + (topCount + i) + ',' + groupBottomId + ',' + i);
    }
    insertInOrder(data.advancement, advancement, group1Id);
    
    // TASKS - insert in order
    const tasks = [
        compId + ',start,FillFromLeague,' + group1Id + ',' + config.leagueDbId + ',0,0',
        compId + ',start,ClearLeagueStats,' + stage1Id + ',' + config.leagueDbId + ',0,0',
        compId + ',end,UpdateMultiGroupLeagueStats,' + stage2Id + ',' + config.leagueDbId + ',0,0'
    ];
    insertInOrder(data.tasks, tasks, compId);
    
    // SCHEDULE - insert in order
    const schedule = [];
    const matchesPerRound = Math.ceil(teamCount / 2);
    for (let r = 1; r <= phase1Rounds; r++) {
        schedule.push(stage1Id + ',' + (config.startDay + (r-1) * config.gap) + ',' + r + ',' + matchesPerRound + ',' + matchesPerRound + ',' + config.kickoff);
    }
    
    const phase2Start = config.startDay + phase1Rounds * config.gap;
    for (let r = 1; r <= phase2Rounds; r++) {
        schedule.push(stage2Id + ',' + (phase2Start + (r-1) * config.gap) + ',' + r + ',' + matchesPerRound + ',' + matchesPerRound + ',' + config.kickoff);
    }
    insertInOrder(data.schedule, schedule, stage1Id);
    
    // OBJECTIVES - split: top group gets positive objectives, bottom group gets negative
    const objectives = [];
    // Top group: CHAMPION, FIGHT_FOR_TITLE, HIGH_FINISH
    objectives.push(groupTopId + ',CHAMPION,1');
    if (topCount >= 4) {
        objectives.push(groupTopId + ',FIGHT_FOR_TITLE,2');
        objectives.push(groupTopId + ',HIGH_FINISH,' + Math.floor(topCount * 0.6));
    } else if (topCount >= 2) {
        objectives.push(groupTopId + ',FIGHT_FOR_TITLE,2');
    }
    // Bottom group: MID_TABLE (always 0 then small threshold), AVOID_LOWLY_FINISH or AVOID_RELEGATION
    objectives.push(groupBottomId + ',MID_TABLE,0');
    objectives.push(groupBottomId + ',MID_TABLE,' + Math.max(2, Math.floor(bottomCount * 0.15)));
    if (config.relegation > 0) {
        objectives.push(groupBottomId + ',AVOID_RELEGATION,' + bottomCount);
    } else {
        objectives.push(groupBottomId + ',AVOID_LOWLY_FINISH,' + bottomCount);
    }
    insertInOrder(data.objectives, objectives, groupTopId);
    
    // COMPIDS
    insertCompId(compId);
    
    finishGeneration('Split League ' + config.code, compId, groupBottomId);
}

function generatePlayoffLeague(config) {
    // Save state before generation for undo
    saveState('Generate Playoff League ' + config.code);
    
    const teamCount = config.teams;
    const rounds = config.isOdd ? teamCount * config.numGames : (teamCount - 1) * config.numGames;
    const playoffTeams = config.playoffTeams;
    const isKO2 = config.playoffLegs === '2';
    
    // Need: comp, leagueStage, leagueGroup, semiStage, semiG1, semiG2, finalStage, finalGroup
    // For 4 teams: semi (1v4, 2v3) → final
    
    // Find insert position after ALL descendants of this nation
    const { insertIdx, insertRowId } = findCompInsertPosition(config.parentId);
    
    // Renumber everything >= insertRowId up by 8
    renumberAllFiles(insertRowId, 8);
    
    const compId = insertRowId;
    const leagueStageId = insertRowId + 1, leagueGroupId = insertRowId + 2;
    const semiStageId = insertRowId + 3, semiG1 = insertRowId + 4, semiG2 = insertRowId + 5;
    const finalStageId = insertRowId + 6, finalGroupId = insertRowId + 7;
    
    // COMPOBJ
    data.compobj.splice(insertIdx + 1, 0,
        compId + ',3,' + config.code + ',TrophyName_Abbr15_' + config.assetId + ',' + config.parentId,
        leagueStageId + ',4,S1,FCE_League_Stage,' + compId,
        leagueGroupId + ',5,G1, ,' + leagueStageId,
        semiStageId + ',4,S2,FCE_Semi_Finals,' + compId,
        semiG1 + ',5,G1, ,' + semiStageId,
        semiG2 + ',5,G2, ,' + semiStageId,
        finalStageId + ',4,S3,FCE_Final,' + compId,
        finalGroupId + ',5,G1, ,' + finalStageId
    );
    
    // SETTINGS
    const stageType = isKO2 ? 'KO2LEGS' : 'KO1LEG';
    const settings = [
        compId + ',asset_id,' + config.assetId,
        compId + ',comp_type,LEAGUE',
        leagueStageId + ',match_matchsituation,LEAGUE',
        leagueStageId + ',standings_sort,POINTS',
        leagueStageId + ',standings_sort,GOALDIFF',
        leagueStageId + ',standings_sort,GOALSFOR',
        leagueStageId + ',standings_sort,H2HPOINTS',
        leagueStageId + ',standings_sort,H2HGOALSFOR',
        leagueStageId + ',standings_sort,H2HGOALSAWAY',
        leagueGroupId + ',num_games,' + config.numGames
    ];
    
    // Advancement labels for playoff spots
    for (let i = 1; i <= playoffTeams; i++) {
        settings.push(leagueGroupId + ',info_label_slot_adv_group,' + i);
    }
    
    // Semi settings
    settings.push(semiStageId + ',match_stagetype,' + stageType);
    settings.push(semiStageId + ',match_matchsituation,SEMI');
    settings.push(semiG1 + ',num_games,' + (isKO2 ? '2' : '1'));
    settings.push(semiG2 + ',num_games,' + (isKO2 ? '2' : '1'));
    
    // Final settings
    settings.push(finalStageId + ',match_stagetype,KO1LEG');
    settings.push(finalStageId + ',match_matchsituation,FINAL');
    settings.push(finalGroupId + ',num_games,1');
    settings.push(finalGroupId + ',info_slot_champ,1');
    
    if (config.prize > 0) {
        settings.push(finalStageId + ',info_prize_money,' + config.prize);
        settings.push(finalStageId + ',info_prize_money_drop,50');
    }
    
    // KO end rules
    if (isKO2) {
        settings.push(semiStageId + ',match_endruleko2leg1,END');
        settings.push(semiStageId + ',match_endruleko2leg2,AGG');
        settings.push(semiStageId + ',match_endruleko2leg2,ET');
        settings.push(semiStageId + ',match_endruleko2leg2,PENS');
    } else {
        settings.push(semiStageId + ',match_endruleko1leg,ET');
        settings.push(semiStageId + ',match_endruleko1leg,PENS');
    }
    settings.push(finalStageId + ',match_endruleko1leg,ET');
    settings.push(finalStageId + ',match_endruleko1leg,PENS');
    
    settings.push(leagueGroupId + ',info_override_slot_labels,1');
    insertInOrder(data.settings, settings, compId);
    
    // STANDINGS - insert in order
    const standings = [];
    for (let i = 0; i < teamCount; i++) standings.push(leagueGroupId + ',' + i);
    standings.push(semiG1 + ',0', semiG1 + ',1', semiG1 + ',2');
    standings.push(semiG2 + ',0', semiG2 + ',1', semiG2 + ',2');
    standings.push(finalGroupId + ',0', finalGroupId + ',1', finalGroupId + ',2');
    insertInOrder(data.standings, standings, leagueGroupId);
    
    // ADVANCEMENT - insert in order
    const advancement = [
        leagueGroupId + ',1,' + semiG1 + ',1',
        leagueGroupId + ',4,' + semiG1 + ',2',
        leagueGroupId + ',2,' + semiG2 + ',1',
        leagueGroupId + ',3,' + semiG2 + ',2',
        semiG1 + ',1,' + finalGroupId + ',1',
        semiG2 + ',1,' + finalGroupId + ',2'
    ];
    insertInOrder(data.advancement, advancement, leagueGroupId);
    
    // TASKS - insert in order
    const tasks = [
        compId + ',start,FillFromLeague,' + leagueGroupId + ',' + config.leagueDbId + ',0,0',
        compId + ',start,ClearLeagueStats,' + leagueStageId + ',' + config.leagueDbId + ',0,0',
        compId + ',end,UpdateTable,' + compId + ',' + finalGroupId + ',1,1',
        compId + ',end,UpdateLeagueStats,' + leagueStageId + ',' + config.leagueDbId + ',0,0'
    ];
    insertInOrder(data.tasks, tasks, compId);
    
    // SCHEDULE - insert in order
    const schedule = [];
    const matchesPerRound = Math.ceil(teamCount / 2);
    for (let r = 1; r <= rounds; r++) {
        schedule.push(leagueStageId + ',' + (config.startDay + (r-1) * config.gap) + ',' + r + ',' + matchesPerRound + ',' + matchesPerRound + ',' + config.kickoff);
    }
    
    // Playoff schedule
    const playoffStart = config.startDay + rounds * config.gap;
    if (isKO2) {
        schedule.push(semiStageId + ',' + playoffStart + ',1,2,2,' + config.kickoff);
        schedule.push(semiStageId + ',' + (playoffStart + config.gap) + ',2,2,2,' + config.kickoff);
        schedule.push(finalStageId + ',' + (playoffStart + config.gap * 2) + ',1,1,1,' + config.kickoff);
    } else {
        schedule.push(semiStageId + ',' + playoffStart + ',1,2,2,' + config.kickoff);
        schedule.push(finalStageId + ',' + (playoffStart + config.gap) + ',1,1,1,' + config.kickoff);
    }
    insertInOrder(data.schedule, schedule, leagueStageId);
    
    // OBJECTIVES - insert in order
    const objectives = [];
    generateObjectivesArr(objectives, leagueGroupId, teamCount, false);
    objectives.push(finalGroupId + ',CHAMPION,1');
    insertInOrder(data.objectives, objectives, leagueGroupId);
    
    // COMPIDS
    insertCompId(compId);
    
    finishGeneration('Playoff League ' + config.code, compId, finalGroupId);
}

function generateObjectivesArr(arr, groupId, teamCount, hasRelegation) {
    // Generate threshold-based objectives (one line per objective type with boundary position)
    // e.g. for 16 teams: CHAMPION,1  FIGHT_FOR_TITLE,3  HIGH_FINISH,6  MID_TABLE,12  AVOID_LOWLY_FINISH,15
    
    const champion = 1;
    const fightForTitle = Math.max(2, Math.min(4, Math.ceil(teamCount * 0.15)));
    const highFinish = Math.max(fightForTitle + 1, Math.ceil(teamCount * 0.35));
    const midTable = Math.max(highFinish + 1, Math.ceil(teamCount * 0.75));
    const lastPos = teamCount - 1; // last meaningful threshold (teamCount itself is implicit)
    
    arr.push(groupId + ',CHAMPION,' + champion);
    
    if (fightForTitle > champion) {
        arr.push(groupId + ',FIGHT_FOR_TITLE,' + fightForTitle);
    }
    
    if (highFinish > fightForTitle) {
        arr.push(groupId + ',HIGH_FINISH,' + highFinish);
    }
    
    if (midTable > highFinish) {
        arr.push(groupId + ',MID_TABLE,' + midTable);
    }
    
    if (hasRelegation) {
        if (lastPos > midTable) {
            arr.push(groupId + ',AVOID_RELEGATION,' + lastPos);
        }
    } else {
        if (lastPos > midTable) {
            arr.push(groupId + ',AVOID_LOWLY_FINISH,' + lastPos);
        }
    }
}

function finishGeneration(name, startId, endId) {
    sortAllData();
    ['compobj','settings','standings','tasks','schedule','objectives','advancement','compids'].forEach(updateBadge);
    document.getElementById('stat-nextid').value = nextId;
    parseHierarchy();
    populateDropdowns();
    showPreview('compobj');
    toast('Generated ' + name + ' (IDs ' + startId + '-' + endId + ')');
}