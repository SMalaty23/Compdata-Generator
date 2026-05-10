// ============================================================
// CUP GENERATOR
// ============================================================

function getCupConfig() {
    const parentId = document.getElementById('cup-parent').value;
    const rawCode = document.getElementById('cup-code').value.trim().toUpperCase();
    const code = rawCode.startsWith('C') ? rawCode : 'C' + rawCode;
    const assetId = parseInt(document.getElementById('cup-assetid').value) || 0;
    const cupType = document.getElementById('cup-type').value;
    const legs = document.getElementById('cup-legs').value;
    const fillType = document.getElementById('cup-filltype').value;
    const prizeFinal = parseInt(document.getElementById('cup-prize-final').value) || 0;
    const prizeSemi = parseInt(document.getElementById('cup-prize-semi').value) || 0;
    const prizeQF = parseInt(document.getElementById('cup-prize-qf').value) || 0;
    const prizeEarly = parseInt(document.getElementById('cup-prize-early').value) || 0;
    const startMonth = parseInt(document.getElementById('cup-startmonth').value) || 9;
    const startDayOfMonth = parseInt(document.getElementById('cup-startdayofmonth').value) || 15;
    const startDay = dayOfYear(startMonth, startDayOfMonth);
    const gap = parseInt(document.getElementById('cup-gap').value) || 21;
    const kickoff = parseInt(document.getElementById('cup-kickoff').value) || 2000;
    
    // Get selected teams (all items in the selected list)
    const teamsList = document.getElementById('cup-teams-list');
    const selectedTeams = Array.from(teamsList.options).map(opt => parseInt(opt.value));
    
    // Get source league for fill task
    const sourceLeague = parseInt(document.getElementById('cup-team-source').value) || assetId;
    
    if (!parentId) return { valid: false, error: 'Select parent nation' };
    if (!code || code === 'C') return { valid: false, error: 'Enter code' };
    if (!assetId) return { valid: false, error: 'Enter asset ID' };
    
    if (cupType === 'knockout') {
        // Direct knockout
        const teams = parseInt(document.getElementById('cup-ko-teams').value) || 16;
        const byes = parseInt(document.getElementById('cup-byes').value) || 0;
        
        if (byes >= teams) return { valid: false, error: 'Byes must be less than teams' };
        const rounds = Math.log2(teams);
        if (!Number.isInteger(rounds)) return { valid: false, error: 'Teams must be power of 2' };
        
        return {
            valid: true,
            cupType: 'knockout',
            parentId: parseInt(parentId),
            code,
            assetId,
            teams,
            byes,
            legs,
            sourceLeague,
            fillType,
            prizeFinal,
            prizeSemi,
            prizeQF,
            prizeEarly,
            startDay,
            gap,
            kickoff,
            rounds
        };
    } else {
        // Group + Knockout
        const teamsPerGroup = parseInt(document.getElementById('cup-teams-per-group').value) || 4;
        const numGroups = parseInt(document.getElementById('cup-num-groups').value) || 8;
        const advancePerGroup = parseInt(document.getElementById('cup-advance-per-group').value) || 2;
        const groupRounds = parseInt(document.getElementById('cup-group-rounds').value) || 2;
        
        const totalGroupTeams = numGroups * teamsPerGroup;
        const koTeams = numGroups * advancePerGroup;
        
        // Find next power of 2 for knockout
        let koBracket = 2;
        while (koBracket < koTeams) koBracket *= 2;
        
        if (selectedTeams.length < totalGroupTeams) {
            return { valid: false, error: 'Need ' + totalGroupTeams + ' teams for ' + numGroups + ' groups of ' + teamsPerGroup };
        }
        
        return {
            valid: true,
            cupType: 'groupko',
            parentId: parseInt(parentId),
            code,
            assetId,
            legs,
            sourceLeague,
            fillType,
            selectedTeams,
            teamsPerGroup,
            numGroups,
            advancePerGroup,
            groupRounds,
            koTeams,
            koBracket,
            prizeFinal,
            prizeSemi,
            prizeQF,
            prizeEarly,
            startDay,
            gap,
            kickoff
        };
    }
}

function previewCup() {
    const preview = document.getElementById('cup-preview');
    const config = getCupConfig();
    
    if (!config.valid) {
        preview.innerHTML = '<span style="color:#f85149">' + config.error + '</span>';
        return;
    }
    
    let html = '<div style="color:#58a6ff;margin-bottom:8px"><strong>' + config.code + '</strong></div>';
    
    if (config.cupType === 'knockout') {
        const roundNames = getRoundNames(config.teams);
        html += 'Type: Direct Knockout<br>';
        html += 'Teams: ' + config.teams + ' | Byes: ' + config.byes + '<br>';
        html += 'Rounds: ' + roundNames.join(' → ') + '<br>';
        html += 'Format: ' + (config.legs === '2' ? 'Two Legs (Final: Single)' : 'Single Leg') + '<br>';
        
        if (config.prizeFinal > 0) {
            html += 'Prize: $' + config.prizeFinal.toLocaleString() + ' (winner)<br>';
        }
        
        const firstRoundTeams = config.teams - config.byes;
        const firstRoundMatches = firstRoundTeams / 2;
        html += 'First round: ' + firstRoundMatches + ' matches (Day ' + config.startDay + ')';
    } else {
        // Group + Knockout
        const koRoundNames = getRoundNames(config.koBracket);
        html += 'Type: Group Stage + Knockout<br>';
        html += 'Groups: ' + config.numGroups + ' groups × ' + config.teamsPerGroup + ' teams<br>';
        html += 'Group Format: ' + (config.groupRounds === 2 ? 'Home & Away' : 'Single Round-Robin') + '<br>';
        html += 'Advance: Top ' + config.advancePerGroup + ' per group → ' + config.koTeams + ' teams<br>';
        html += 'Knockout: ' + koRoundNames.join(' → ') + '<br>';
        html += 'KO Format: ' + (config.legs === '2' ? 'Two Legs (Final: Single)' : 'Single Leg') + '<br>';
        
        if (config.prizeFinal > 0) {
            html += 'Prize: $' + config.prizeFinal.toLocaleString() + ' (winner)<br>';
        }
        
        html += 'Starts: Day ' + config.startDay;
    }
    
    preview.innerHTML = html;
}

function getRoundNames(teams) {
    const names = [];
    let remaining = teams;
    while (remaining > 1) {
        if (remaining === 2) names.push('Final');
        else if (remaining === 4) names.push('Semi');
        else if (remaining === 8) names.push('QF');
        else if (remaining === 16) names.push('R16');
        else if (remaining === 32) names.push('R32');
        else if (remaining === 64) names.push('R64');
        else names.push('R' + remaining);
        remaining /= 2;
    }
    return names.reverse();
}

function getRoundSituation(teamsRemaining) {
    if (teamsRemaining === 2) return 'FINAL';
    if (teamsRemaining === 4) return 'SEMI';
    if (teamsRemaining === 8) return 'QUARTER';
    return 'ROUNDX';
}

function getRoundStageName(teamsRemaining) {
    if (teamsRemaining === 2) return 'FCE_Final';
    if (teamsRemaining === 4) return 'FCE_Semi_Finals';
    if (teamsRemaining === 8) return 'FCE_Quarter_Finals';
    if (teamsRemaining === 16) return 'FCE_Round_of_16';
    if (teamsRemaining === 32) return 'FCE_Round_of_32';
    return 'FCE_Round_' + teamsRemaining;
}

function generateCup() {
    if (data.compobj.length === 0) { toast('Load compobj first', 'error'); return; }
    
    const config = getCupConfig();
    if (!config.valid) { toast(config.error, 'error'); return; }
    
    // Check duplicate
    for (let line of data.settings) {
        const parts = line.split(',');
        if (parts[1]?.trim() === 'asset_id' && parseInt(parts[2]?.trim()) === config.assetId) {
            toast('Asset ID ' + config.assetId + ' exists', 'error');
            return;
        }
    }
    
    if (config.cupType === 'knockout') {
        generateKnockoutCup(config);
    } else {
        generateGroupKnockoutCup(config);
    }
}

function generateKnockoutCup(config) {
    // Save state before generation for undo
    saveState('Generate Cup ' + config.code);
    
    // Find insert position after ALL descendants of this nation
    const { insertIdx, insertRowId } = findCompInsertPosition(config.parentId);
    
    // Calculate structure - count total IDs needed
    const roundNames = getRoundNames(config.teams);
    let totalIds = 2; // comp + setup stage
    totalIds += 1;    // setup group
    
    for (let i = 0; i < roundNames.length; i++) {
        const teamsInRound = config.teams / Math.pow(2, i);
        const matchesInRound = teamsInRound / 2;
        totalIds += 1 + matchesInRound; // stage + groups
    }
    
    // Renumber everything >= insertRowId up by totalIds
    renumberAllFiles(insertRowId, totalIds);
    
    let currentId = insertRowId;
    const compId = currentId++;
    const setupStageId = currentId++;
    const setupGroupId = currentId++;
    
    // COMPOBJ entries
    const compobj = [
        compId + ',3,' + config.code + ',TrophyName_Abbr15_' + config.assetId + ',' + config.parentId,
        setupStageId + ',4,S1,FCE_Setup_Stage,' + compId,
        setupGroupId + ',5,G1, ,' + setupStageId
    ];
    
    // Settings
    const settings = [
        compId + ',asset_id,' + config.assetId,
        compId + ',comp_type,CUP',
        setupStageId + ',match_stagetype,SETUP'
    ];
    
    // Standings for setup group (all teams)
    const standings = [];
    for (let i = 0; i < config.teams; i++) {
        standings.push(setupGroupId + ',' + i);
    }
    
    // Track stages and groups for each round
    const roundData = [];
    let stageNum = 2;
    
    for (let r = 0; r < roundNames.length; r++) {
        const teamsInRound = config.teams / Math.pow(2, r);
        const matchesInRound = teamsInRound / 2;
        const isFinal = (teamsInRound === 2);
        const isSemi = (teamsInRound === 4);
        const isQF = (teamsInRound === 8);
        
        const stageId = currentId++;
        const stageName = getRoundStageName(teamsInRound);
        const situation = getRoundSituation(teamsInRound);
        
        compobj.push(stageId + ',4,S' + stageNum + ',' + stageName + ',' + compId);
        
        // Stage settings
        const isKO2 = config.legs === '2' && !isFinal;
        settings.push(stageId + ',match_stagetype,' + (isKO2 ? 'KO2LEGS' : 'KO1LEG'));
        settings.push(stageId + ',match_matchsituation,' + situation);
        
        // Prize money
        let prize = config.prizeEarly;
        if (isFinal) prize = config.prizeFinal;
        else if (isSemi) prize = config.prizeSemi;
        else if (isQF) prize = config.prizeQF;
        
        if (prize > 0) {
            settings.push(stageId + ',info_prize_money,' + prize);
            settings.push(stageId + ',info_prize_money_drop,0');
        }
        
        settings.push(stageId + ',rule_allowadditionalsub,on');
        
        // KO end rules
        if (isKO2) {
            settings.push(stageId + ',match_endruleko2leg1,END');
            settings.push(stageId + ',match_endruleko2leg2,AGG');
            settings.push(stageId + ',match_endruleko2leg2,ET');
            settings.push(stageId + ',match_endruleko2leg2,PENS');
        } else {
            settings.push(stageId + ',match_endruleko1leg,ET');
            settings.push(stageId + ',match_endruleko1leg,PENS');
        }
        
        // Groups for this round
        const groups = [];
        for (let g = 0; g < matchesInRound; g++) {
            const groupId = currentId++;
            groups.push(groupId);
            compobj.push(groupId + ',5,G' + (g + 1) + ', ,' + stageId);
            settings.push(groupId + ',num_games,' + (isKO2 ? '2' : '1'));
            
            // Standings for each group
            standings.push(groupId + ',0');
            standings.push(groupId + ',1');
            
            // Champion marker on final group
            if (isFinal) {
                settings.push(groupId + ',info_slot_champ,1');
            }
        }
        
        roundData.push({ stageId, groups, teamsInRound, matchesInRound });
        stageNum++;
    }
    
    // ADVANCEMENT
    const advancement = [];
    
    if (config.byes > 0) {
        let byeRoundIdx = 0;
        let teamsAtRound = config.teams;
        while (teamsAtRound > config.teams - config.byes && byeRoundIdx < roundData.length - 1) {
            byeRoundIdx++;
            teamsAtRound /= 2;
        }
        
        const byeRound = roundData[byeRoundIdx];
        for (let i = 0; i < config.byes && i < byeRound.groups.length; i++) {
            advancement.push(setupGroupId + ',' + (i + 1) + ',' + byeRound.groups[i] + ',1');
        }
        
        const firstPlayedRound = roundData[0];
        const firstRoundTeams = config.teams - config.byes;
        for (let i = 0; i < firstRoundTeams; i++) {
            const groupIdx = Math.floor(i / 2);
            const slot = (i % 2) + 1;
            advancement.push(setupGroupId + ',' + (config.byes + i + 1) + ',' + firstPlayedRound.groups[groupIdx] + ',' + slot);
        }
        
        for (let i = 0; i < firstPlayedRound.groups.length; i++) {
            const targetSlot = config.byes + i;
            if (targetSlot < byeRound.groups.length) {
                advancement.push(firstPlayedRound.groups[i] + ',1,' + byeRound.groups[targetSlot] + ',2');
            }
        }
    } else {
        const firstRound = roundData[0];
        for (let i = 0; i < config.teams; i++) {
            const groupIdx = Math.floor(i / 2);
            const slot = (i % 2) + 1;
            advancement.push(setupGroupId + ',' + (i + 1) + ',' + firstRound.groups[groupIdx] + ',' + slot);
        }
    }
    
    for (let r = 0; r < roundData.length - 1; r++) {
        const currentRound = roundData[r];
        const nextRound = roundData[r + 1];
        
        if (config.byes > 0 && r === 0) continue;
        
        for (let i = 0; i < currentRound.groups.length; i++) {
            const targetGroupIdx = Math.floor(i / 2);
            const targetSlot = (i % 2) + 1;
            if (targetGroupIdx < nextRound.groups.length) {
                advancement.push(currentRound.groups[i] + ',1,' + nextRound.groups[targetGroupIdx] + ',' + targetSlot);
            }
        }
    }
    
    // TASKS
    const tasks = [
        compId + ',start,' + config.fillType + ',' + setupGroupId + ',' + config.sourceLeague + ',0,0'
    ];
    
    const finalGroup = roundData[roundData.length - 1].groups[0];
    tasks.push(compId + ',end,UpdateTable,' + compId + ',' + finalGroup + ',1,1');
    tasks.push(compId + ',end,UpdateTable,' + compId + ',' + finalGroup + ',2,2');
    
    // SCHEDULE
    const schedule = [];
    let currentDay = config.startDay;
    
    for (let r = 0; r < roundData.length; r++) {
        const round = roundData[r];
        const isKO2 = config.legs === '2' && round.teamsInRound > 2;
        
        if (isKO2) {
            schedule.push(round.stageId + ',' + currentDay + ',1,' + round.matchesInRound + ',' + round.matchesInRound + ',' + config.kickoff);
            currentDay += config.gap;
            schedule.push(round.stageId + ',' + currentDay + ',2,' + round.matchesInRound + ',' + round.matchesInRound + ',' + config.kickoff);
        } else {
            schedule.push(round.stageId + ',' + currentDay + ',1,' + round.matchesInRound + ',' + round.matchesInRound + ',' + config.kickoff);
        }
        currentDay += config.gap;
    }
    
    // Insert all in order
    data.compobj.splice(insertIdx + 1, 0, ...compobj);
    insertInOrder(data.settings, settings, compId);
    insertInOrder(data.standings, standings, setupGroupId);
    insertInOrder(data.advancement, advancement, setupGroupId);
    insertInOrder(data.tasks, tasks, compId);
    insertInOrder(data.schedule, schedule, roundData[0].stageId);
    
    insertCompId(compId);
    
    finishGeneration('Cup ' + config.code, compId, currentId - 1);
}

function generateGroupKnockoutCup(config) {
    // Save state before generation for undo
    saveState('Generate Group+KO Cup ' + config.code);
    
    // Find insert position
    const { insertIdx, insertRowId } = findCompInsertPosition(config.parentId);
    
    // Calculate total IDs needed:
    // comp + setup stage + setup group
    // + group stage + N groups
    // + KO draw setup stage + draw groups (winners, runners-up)
    // + KO rounds (each with stage + matches)
    let totalIds = 3; // comp + setup stage + setup group
    totalIds += 1 + config.numGroups; // group stage + groups
    totalIds += 1 + config.advancePerGroup; // KO draw setup + groups for each position
    
    // KO rounds
    const koRounds = [];
    let koTeamsLeft = config.koBracket;
    while (koTeamsLeft >= 2) {
        const matches = koTeamsLeft / 2;
        koRounds.push({ teams: koTeamsLeft, matches });
        totalIds += 1 + matches; // stage + groups
        koTeamsLeft /= 2;
    }
    
    // Renumber
    renumberAllFiles(insertRowId, totalIds);
    
    let currentId = insertRowId;
    const compId = currentId++;
    
    // Setup stage
    const setupStageId = currentId++;
    const setupGroupId = currentId++;
    
    // Group stage
    const groupStageId = currentId++;
    const groupIds = [];
    for (let g = 0; g < config.numGroups; g++) {
        groupIds.push(currentId++);
    }
    
    // KO draw setup
    const koDrawStageId = currentId++;
    const koDrawGroups = [];
    for (let p = 0; p < config.advancePerGroup; p++) {
        koDrawGroups.push(currentId++);
    }
    
    // KO rounds
    const koRoundData = [];
    let stageNum = 4 + config.advancePerGroup;
    for (let r = 0; r < koRounds.length; r++) {
        const stageId = currentId++;
        const groups = [];
        for (let g = 0; g < koRounds[r].matches; g++) {
            groups.push(currentId++);
        }
        koRoundData.push({ stageId, groups, teams: koRounds[r].teams, matches: koRounds[r].matches });
        stageNum++;
    }
    
    // COMPOBJ
    const compobj = [
        compId + ',3,' + config.code + ',TrophyName_Abbr15_' + config.assetId + ',' + config.parentId,
        setupStageId + ',4,S1,FCE_Setup_Stage,' + compId,
        setupGroupId + ',5,G1, ,' + setupStageId,
        groupStageId + ',4,S2,FCE_Group_Stage,' + compId
    ];
    
    const groupLetters = 'ABCDEFGHIJKLMNOP';
    for (let g = 0; g < config.numGroups; g++) {
        compobj.push(groupIds[g] + ',5,G' + (g + 1) + ',FCE_Group_' + groupLetters[g] + ',' + groupStageId);
    }
    
    compobj.push(koDrawStageId + ',4,S3,FCE_KO_Draw_Setup,' + compId);
    for (let p = 0; p < config.advancePerGroup; p++) {
        const label = p === 0 ? 'FCE_Group_Winners' : (p === 1 ? 'FCE_Group_Runners_Up' : 'FCE_Group_' + (p + 1) + 'rd');
        compobj.push(koDrawGroups[p] + ',5,G' + (p + 1) + ',' + label + ',' + koDrawStageId);
    }
    
    let koStageNum = 4;
    for (let r = 0; r < koRoundData.length; r++) {
        const round = koRoundData[r];
        const stageName = getRoundStageName(round.teams);
        compobj.push(round.stageId + ',4,S' + koStageNum + ',' + stageName + ',' + compId);
        for (let g = 0; g < round.groups.length; g++) {
            compobj.push(round.groups[g] + ',5,G' + (g + 1) + ', ,' + round.stageId);
        }
        koStageNum++;
    }
    
    // SETTINGS
    const settings = [
        compId + ',asset_id,' + config.assetId,
        compId + ',comp_type,CUP',
        setupStageId + ',match_stagetype,SETUP',
        groupStageId + ',match_stagetype,LEAGUE',
        groupStageId + ',match_matchsituation,GROUP',
        groupStageId + ',standings_sort,POINTS',
        groupStageId + ',standings_sort,GOALDIFF',
        groupStageId + ',standings_sort,GOALSFOR',
        groupStageId + ',standings_sort,H2HPOINTS'
    ];
    
    if (config.prizeEarly > 0) {
        settings.push(groupStageId + ',info_prize_money,' + config.prizeEarly);
        settings.push(groupStageId + ',info_prize_money_drop,50');
    }
    
    // Group settings
    for (let g = 0; g < config.numGroups; g++) {
        settings.push(groupIds[g] + ',num_games,' + config.groupRounds);
    }
    
    settings.push(koDrawStageId + ',match_stagetype,SETUP');
    
    // KO stage settings
    for (let r = 0; r < koRoundData.length; r++) {
        const round = koRoundData[r];
        const isFinal = round.teams === 2;
        const isSemi = round.teams === 4;
        const isQF = round.teams === 8;
        const isKO2 = config.legs === '2' && !isFinal;
        
        settings.push(round.stageId + ',match_stagetype,' + (isKO2 ? 'KO2LEGS' : 'KO1LEG'));
        settings.push(round.stageId + ',match_matchsituation,' + getRoundSituation(round.teams));
        
        let prize = config.prizeEarly;
        if (isFinal) prize = config.prizeFinal;
        else if (isSemi) prize = config.prizeSemi;
        else if (isQF) prize = config.prizeQF;
        
        if (prize > 0) {
            settings.push(round.stageId + ',info_prize_money,' + prize);
            settings.push(round.stageId + ',info_prize_money_drop,0');
        }
        
        settings.push(round.stageId + ',rule_allowadditionalsub,on');
        
        if (isKO2) {
            settings.push(round.stageId + ',match_endruleko2leg1,END');
            settings.push(round.stageId + ',match_endruleko2leg2,AGG');
            settings.push(round.stageId + ',match_endruleko2leg2,ET');
            settings.push(round.stageId + ',match_endruleko2leg2,PENS');
        } else {
            settings.push(round.stageId + ',match_endruleko1leg,ET');
            settings.push(round.stageId + ',match_endruleko1leg,PENS');
        }
        
        for (let g = 0; g < round.groups.length; g++) {
            settings.push(round.groups[g] + ',num_games,' + (isKO2 ? '2' : '1'));
            if (isFinal) {
                settings.push(round.groups[g] + ',info_slot_champ,1');
            }
        }
    }
    
    // STANDINGS
    const standings = [];
    // Setup group
    const totalTeams = config.numGroups * config.teamsPerGroup;
    for (let i = 0; i < totalTeams; i++) {
        standings.push(setupGroupId + ',' + i);
    }
    
    // Group stage groups
    for (let g = 0; g < config.numGroups; g++) {
        for (let t = 0; t < config.teamsPerGroup; t++) {
            standings.push(groupIds[g] + ',' + t);
        }
    }
    
    // KO draw groups
    for (let p = 0; p < config.advancePerGroup; p++) {
        for (let t = 0; t <= config.numGroups; t++) {
            standings.push(koDrawGroups[p] + ',' + t);
        }
    }
    
    // KO round groups
    for (let r = 0; r < koRoundData.length; r++) {
        for (let g = 0; g < koRoundData[r].groups.length; g++) {
            standings.push(koRoundData[r].groups[g] + ',0');
            standings.push(koRoundData[r].groups[g] + ',1');
        }
    }
    
    // ADVANCEMENT
    const advancement = [];
    
    // Setup → Groups (distribute teams across groups)
    for (let t = 0; t < totalTeams; t++) {
        const groupIdx = t % config.numGroups;
        const slot = Math.floor(t / config.numGroups) + 1;
        advancement.push(setupGroupId + ',' + (t + 1) + ',' + groupIds[groupIdx] + ',' + slot);
    }
    
    // Groups → KO Draw (winners to G1, runners-up to G2, etc)
    for (let g = 0; g < config.numGroups; g++) {
        for (let p = 0; p < config.advancePerGroup; p++) {
            advancement.push(groupIds[g] + ',' + (p + 1) + ',' + koDrawGroups[p] + ',' + (g + 1));
        }
    }
    
    // KO Draw → First KO Round
    // Pair winners with runners-up from different groups
    const firstKO = koRoundData[0];
    for (let m = 0; m < firstKO.matches; m++) {
        // Winner from slot m+1 vs Runner-up from different slot
        const winnerSlot = m + 1;
        const runnerSlot = (config.numGroups - m);
        advancement.push(koDrawGroups[0] + ',' + winnerSlot + ',' + firstKO.groups[m] + ',1');
        if (config.advancePerGroup >= 2) {
            advancement.push(koDrawGroups[1] + ',' + runnerSlot + ',' + firstKO.groups[m] + ',2');
        }
    }
    
    // KO Round advancement (winners advance)
    for (let r = 0; r < koRoundData.length - 1; r++) {
        const currentRound = koRoundData[r];
        const nextRound = koRoundData[r + 1];
        
        for (let i = 0; i < currentRound.groups.length; i++) {
            const targetGroupIdx = Math.floor(i / 2);
            const targetSlot = (i % 2) + 1;
            advancement.push(currentRound.groups[i] + ',1,' + nextRound.groups[targetGroupIdx] + ',' + targetSlot);
        }
    }
    
    // TASKS
    const tasks = [
        compId + ',start,' + config.fillType + ',' + setupGroupId + ',' + config.sourceLeague + ',0,0'
    ];
    
    const finalGroup = koRoundData[koRoundData.length - 1].groups[0];
    tasks.push(compId + ',end,UpdateTable,' + compId + ',' + finalGroup + ',1,1');
    tasks.push(compId + ',end,UpdateTable,' + compId + ',' + finalGroup + ',2,2');
    
    // SCHEDULE
    const schedule = [];
    let currentDay = config.startDay;
    
    // Group stage schedule (each matchday)
    const groupMatchdays = config.groupRounds * (config.teamsPerGroup - 1);
    for (let md = 1; md <= groupMatchdays; md++) {
        schedule.push(groupStageId + ',' + currentDay + ',' + md + ',' + config.numGroups + ',' + config.numGroups + ',' + config.kickoff);
        currentDay += config.gap;
    }
    
    // KO rounds
    for (let r = 0; r < koRoundData.length; r++) {
        const round = koRoundData[r];
        const isFinal = round.teams === 2;
        const isKO2 = config.legs === '2' && !isFinal;
        
        if (isKO2) {
            schedule.push(round.stageId + ',' + currentDay + ',1,' + round.matches + ',' + round.matches + ',' + config.kickoff);
            currentDay += config.gap;
            schedule.push(round.stageId + ',' + currentDay + ',2,' + round.matches + ',' + round.matches + ',' + config.kickoff);
        } else {
            schedule.push(round.stageId + ',' + currentDay + ',1,' + round.matches + ',' + round.matches + ',' + config.kickoff);
        }
        currentDay += config.gap;
    }
    
    // Insert all in order
    data.compobj.splice(insertIdx + 1, 0, ...compobj);
    insertInOrder(data.settings, settings, compId);
    insertInOrder(data.standings, standings, setupGroupId);
    insertInOrder(data.advancement, advancement, setupGroupId);
    insertInOrder(data.tasks, tasks, compId);
    insertInOrder(data.schedule, schedule, groupStageId);
    
    insertCompId(compId);
    
    finishGeneration('Group+KO Cup ' + config.code, compId, currentId - 1);
}

