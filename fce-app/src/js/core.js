// ============================================================
// DATA STORAGE
// ============================================================
const data = {
    compobj: [],
    settings: [],
    schedule: [],
    standings: [],
    advancement: [],
    tasks: [],
    objectives: [],
    initteams: [],
    compids: [],
    weather: [],
    // Database files (tab-separated)
    teams: [],
    leagues: [],
    leagueteamlinks: [],
    teamnationlinks: [],
    original: {}
};

// Undo/Redo history
const history = [];
let historyIndex = -1;
const MAX_HISTORY = 20;

function saveState(action = 'Unknown') {
    // Remove any redo states if we're not at the end
    if (historyIndex < history.length - 1) {
        history.splice(historyIndex + 1);
    }
    
    // Save current state (deep copy of compdata files only)
    const state = {
        action: action,
        timestamp: new Date().toLocaleTimeString(),
        compobj: [...data.compobj],
        settings: [...data.settings],
        schedule: [...data.schedule],
        standings: [...data.standings],
        advancement: [...data.advancement],
        tasks: [...data.tasks],
        objectives: [...data.objectives],
        initteams: [...data.initteams],
        compids: [...data.compids],
        weather: [...data.weather]
    };
    
    history.push(state);
    historyIndex = history.length - 1;
    
    // Limit history size
    if (history.length > MAX_HISTORY) {
        history.shift();
        historyIndex--;
    }
    
    updateUndoRedoButtons();
    console.log('State saved:', action, '| History:', historyIndex + 1, '/', history.length);
}

function undo() {
    if (historyIndex <= 0) {
        toast('Nothing to undo', 'error');
        return;
    }
    
    historyIndex--;
    restoreState(history[historyIndex]);
    toast('Undo: ' + history[historyIndex + 1].action);
}

function redo() {
    if (historyIndex >= history.length - 1) {
        toast('Nothing to redo', 'error');
        return;
    }
    
    historyIndex++;
    restoreState(history[historyIndex]);
    toast('Redo: ' + history[historyIndex].action);
}

function restoreState(state) {
    data.compobj = [...state.compobj];
    data.settings = [...state.settings];
    data.schedule = [...state.schedule];
    data.standings = [...state.standings];
    data.advancement = [...state.advancement];
    data.tasks = [...state.tasks];
    data.objectives = [...state.objectives];
    data.initteams = [...state.initteams];
    data.compids = [...state.compids];
    data.weather = [...state.weather];
    
    // Refresh UI
    parseHierarchy();
    findNextId();
    populateDropdowns();
    ['compobj','settings','standings','tasks','schedule','objectives','advancement','compids','initteams','weather'].forEach(updateBadge);
    
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const undoInfo = document.getElementById('undo-info');
    
    if (undoBtn) {
        undoBtn.disabled = historyIndex <= 0;
        undoBtn.style.opacity = historyIndex <= 0 ? '0.5' : '1';
    }
    if (redoBtn) {
        redoBtn.disabled = historyIndex >= history.length - 1;
        redoBtn.style.opacity = historyIndex >= history.length - 1 ? '0.5' : '1';
    }
    if (undoInfo) {
        undoInfo.textContent = (historyIndex + 1) + '/' + history.length;
    }
}

// Parsed database lookups
const db = {
    teams: [],      // {teamid, teamname, assetid}
    leagues: [],    // {leagueid, leaguename, countryid}
    teamLeagues: [],// {teamid, leagueid}
    teamNations: [] // {teamid, nationid, leagueid}
};

let nextId = 1700;
let hierarchy = { confederations: [], nations: [], competitions: [] };

// ============================================================
// NATIONS DATABASE
// ============================================================
const NATIONS = [
    {name:"Albania",id:1,code:"ALBA"},{name:"Andorra",id:2,code:"ANDO"},{name:"Armenia",id:3,code:"ARME"},{name:"Austria",id:4,code:"AUST"},{name:"Azerbaijan",id:5,code:"AZER"},{name:"Belarus",id:6,code:"BELA"},{name:"Belgium",id:7,code:"BELG"},{name:"Bosnia and Herzegovina",id:8,code:"BOSN"},{name:"Bulgaria",id:9,code:"BULG"},{name:"Croatia",id:10,code:"CROA"},{name:"Cyprus",id:11,code:"CYPR"},{name:"Czech Republic",id:12,code:"CZEC"},{name:"Denmark",id:13,code:"DENM"},{name:"England",id:14,code:"ENGL"},{name:"Montenegro",id:15,code:"MONT"},{name:"Faroe Islands",id:16,code:"FARO"},{name:"Finland",id:17,code:"FINL"},{name:"France",id:18,code:"FRAN"},{name:"North Macedonia",id:19,code:"NMAC"},{name:"Georgia",id:20,code:"GEOR"},{name:"Germany",id:21,code:"GERM"},{name:"Greece",id:22,code:"GREE"},{name:"Hungary",id:23,code:"HUNG"},{name:"Iceland",id:24,code:"ICEL"},{name:"Republic of Ireland",id:25,code:"IREL"},{name:"Israel",id:26,code:"ISRA"},{name:"Italy",id:27,code:"ITAL"},{name:"Latvia",id:28,code:"LATV"},{name:"Liechtenstein",id:29,code:"LIEC"},{name:"Lithuania",id:30,code:"LITH"},{name:"Luxembourg",id:31,code:"LUXE"},{name:"Malta",id:32,code:"MALT"},{name:"Moldova",id:33,code:"MOLD"},{name:"Holland",id:34,code:"HOLL"},{name:"Northern Ireland",id:35,code:"NIRL"},{name:"Norway",id:36,code:"NORW"},{name:"Poland",id:37,code:"POLA"},{name:"Portugal",id:38,code:"PORT"},{name:"Romania",id:39,code:"ROMA"},{name:"Russia",id:40,code:"RUSS"},{name:"San Marino",id:41,code:"SANM"},{name:"Scotland",id:42,code:"SCOT"},{name:"Slovakia",id:43,code:"SLOV"},{name:"Slovenia",id:44,code:"SLVN"},{name:"Spain",id:45,code:"SPAI"},{name:"Sweden",id:46,code:"SWED"},{name:"Switzerland",id:47,code:"SWIT"},{name:"Turkey",id:48,code:"TURK"},{name:"Ukraine",id:49,code:"UKRA"},{name:"Wales",id:50,code:"WALE"},{name:"Serbia",id:51,code:"SERB"},{name:"Argentina",id:52,code:"ARGE"},{name:"Bolivia",id:53,code:"BOLI"},{name:"Brazil",id:54,code:"BRAZ"},{name:"Chile",id:55,code:"CHIL"},{name:"Colombia",id:56,code:"COLO"},{name:"Ecuador",id:57,code:"ECUA"},{name:"Paraguay",id:58,code:"PARA"},{name:"Peru",id:59,code:"PERU"},{name:"Uruguay",id:60,code:"URUG"},{name:"Venezuela",id:61,code:"VENE"},{name:"Anguilla",id:62,code:"ANGU"},{name:"Antigua and Barbuda",id:63,code:"ANTI"},{name:"Aruba",id:64,code:"ARUB"},{name:"Bahamas",id:65,code:"BAHA"},{name:"Barbados",id:66,code:"BARB"},{name:"Belize",id:67,code:"BELI"},{name:"Bermuda",id:68,code:"BERM"},{name:"British Virgin Islands",id:69,code:"BVIR"},{name:"Canada",id:70,code:"CANA"},{name:"Cayman Islands",id:71,code:"CAYM"},{name:"Costa Rica",id:72,code:"COST"},{name:"Cuba",id:73,code:"CUBA"},{name:"Dominica",id:74,code:"DOMI"},{name:"El Salvador",id:76,code:"ELSA"},{name:"Grenada",id:77,code:"GREN"},{name:"Guatemala",id:78,code:"GUAT"},{name:"Guyana",id:79,code:"GUYA"},{name:"Haiti",id:80,code:"HAIT"},{name:"Honduras",id:81,code:"HOND"},{name:"Jamaica",id:82,code:"JAMA"},{name:"Mexico",id:83,code:"MEXI"},{name:"Montserrat",id:84,code:"MOTS"},{name:"Curacao",id:85,code:"CURA"},{name:"Nicaragua",id:86,code:"NICA"},{name:"Panama",id:87,code:"PANA"},{name:"Puerto Rico",id:88,code:"PUER"},{name:"St. Kitts and Nevis",id:89,code:"SKIT"},{name:"St. Lucia",id:90,code:"STLU"},{name:"St. Vincent and the Grenadines",id:91,code:"STVI"},{name:"Suriname",id:92,code:"SURI"},{name:"Trinidad and Tobago",id:93,code:"TRIN"},{name:"Turks and Caicos Islands",id:94,code:"TURK"},{name:"United States",id:95,code:"USA"},{name:"US Virgin Islands",id:96,code:"USVI"},{name:"Algeria",id:97,code:"ALGE"},{name:"Angola",id:98,code:"ANGO"},{name:"Benin",id:99,code:"BENI"},{name:"Botswana",id:100,code:"BOTS"},{name:"Burkina Faso",id:101,code:"BURK"},{name:"Burundi",id:102,code:"BURU"},{name:"Cameroon",id:103,code:"CAME"},{name:"Cape Verde Islands",id:104,code:"CAPE"},{name:"Central African Republic",id:105,code:"CAFR"},{name:"Chad",id:106,code:"CHAD"},{name:"Congo",id:107,code:"CONG"},{name:"Cote d'Ivoire",id:108,code:"CDIV"},{name:"Djibouti",id:109,code:"DJIB"},{name:"Congo DR",id:110,code:"CODR"},{name:"Egypt",id:111,code:"EGYP"},{name:"Equatorial Guinea",id:112,code:"EQUA"},{name:"Eritrea",id:113,code:"ERIT"},{name:"Ethiopia",id:114,code:"ETHI"},{name:"Gabon",id:115,code:"GABO"},{name:"Gambia",id:116,code:"GAMB"},{name:"Ghana",id:117,code:"GHAN"},{name:"Guinea",id:118,code:"GUIN"},{name:"Guinea-Bissau",id:119,code:"GUBI"},{name:"Kenya",id:120,code:"KENY"},{name:"Lesotho",id:121,code:"LESO"},{name:"Liberia",id:122,code:"LIBE"},{name:"Libya",id:123,code:"LIBY"},{name:"Madagascar",id:124,code:"MADA"},{name:"Malawi",id:125,code:"MALA"},{name:"Mali",id:126,code:"MALI"},{name:"Mauritania",id:127,code:"MAUR"},{name:"Mauritius",id:128,code:"MAUS"},{name:"Morocco",id:129,code:"MORO"},{name:"Mozambique",id:130,code:"MOZA"},{name:"Namibia",id:131,code:"NAMI"},{name:"Niger",id:132,code:"NIGE"},{name:"Nigeria",id:133,code:"NIGR"},{name:"Rwanda",id:134,code:"RWAN"},{name:"Sao Tome e Principe",id:135,code:"SAOT"},{name:"Senegal",id:136,code:"SENE"},{name:"Seychelles",id:137,code:"SEYC"},{name:"Sierra Leone",id:138,code:"SIER"},{name:"Somalia",id:139,code:"SOMA"},{name:"South Africa",id:140,code:"SAFR"},{name:"Sudan",id:141,code:"SUDA"},{name:"Eswatini",id:142,code:"ESWA"},{name:"Tanzania",id:143,code:"TANZ"},{name:"Togo",id:144,code:"TOGO"},{name:"Tunisia",id:145,code:"TUNI"},{name:"Uganda",id:146,code:"UGAN"},{name:"Zambia",id:147,code:"ZAMB"},{name:"Zimbabwe",id:148,code:"ZIMB"},{name:"Afghanistan",id:149,code:"AFGH"},{name:"Bahrain",id:150,code:"BAHR"},{name:"Bangladesh",id:151,code:"BANG"},{name:"Bhutan",id:152,code:"BHUT"},{name:"Brunei Darussalam",id:153,code:"BRUN"},{name:"Cambodia",id:154,code:"CAMB"},{name:"China PR",id:155,code:"CHIN"},{name:"Guam",id:157,code:"GUAM"},{name:"Hong Kong",id:158,code:"HONG"},{name:"India",id:159,code:"INDI"},{name:"Indonesia",id:160,code:"INDO"},{name:"Iran",id:161,code:"IRAN"},{name:"Iraq",id:162,code:"IRAQ"},{name:"Japan",id:163,code:"JAPA"},{name:"Jordan",id:164,code:"JORD"},{name:"Kazakhstan",id:165,code:"KAZA"},{name:"Korea DPR",id:166,code:"KDPR"},{name:"Korea Republic",id:167,code:"KORE"},{name:"Kuwait",id:168,code:"KUWA"},{name:"Kyrgyzstan",id:169,code:"KYRG"},{name:"Laos",id:170,code:"LAOS"},{name:"Lebanon",id:171,code:"LEBA"},{name:"Macau",id:172,code:"MACA"},{name:"Malaysia",id:173,code:"MALY"},{name:"Maldives",id:174,code:"MALD"},{name:"Mongolia",id:175,code:"MONG"},{name:"Myanmar",id:176,code:"MYAN"},{name:"Nepal",id:177,code:"NEPA"},{name:"Oman",id:178,code:"OMAN"},{name:"Pakistan",id:179,code:"PAKI"},{name:"Palestine",id:180,code:"PALE"},{name:"Philippines",id:181,code:"PHIL"},{name:"Qatar",id:182,code:"QATA"},{name:"Saudi Arabia",id:183,code:"SAUD"},{name:"Singapore",id:184,code:"SING"},{name:"Sri Lanka",id:185,code:"SRIL"},{name:"Syria",id:186,code:"SYRI"},{name:"Tajikistan",id:187,code:"TAJI"},{name:"Thailand",id:188,code:"THAI"},{name:"Turkmenistan",id:189,code:"TURM"},{name:"United Arab Emirates",id:190,code:"UAE"},{name:"Uzbekistan",id:191,code:"UZBE"},{name:"Vietnam",id:192,code:"VIET"},{name:"Yemen",id:193,code:"YEME"},{name:"American Samoa",id:194,code:"ASAM"},{name:"Australia",id:195,code:"AUST"},{name:"Cook Islands",id:196,code:"COOK"},{name:"Fiji",id:197,code:"FIJI"},{name:"New Zealand",id:198,code:"NEWZ"},{name:"Papua New Guinea",id:199,code:"PAPU"},{name:"Samoa",id:200,code:"SAMO"},{name:"Solomon Islands",id:201,code:"SOLO"},{name:"Tahiti",id:202,code:"TAHI"},{name:"Tonga",id:203,code:"TONG"},{name:"Vanuatu",id:204,code:"VANU"},{name:"Gibraltar",id:205,code:"GIBR"},{name:"Greenland",id:206,code:"GREE"},{name:"Dominican Republic",id:207,code:"DOMR"},{name:"Estonia",id:208,code:"ESTO"},{name:"Timor-Leste",id:212,code:"TIMO"},{name:"Chinese Taipei",id:213,code:"CTAI"},{name:"Comoros",id:214,code:"COMO"},{name:"New Caledonia",id:215,code:"NCAL"},{name:"South Sudan",id:218,code:"SSUD"},{name:"Kosovo",id:219,code:"KOSO"}
];

const NATION_GROUPS = {
    'Arab': [183,190,182,168,150,178,164,162,186,171,180,111,129,97,145,123,141,193,127,214,139,109],
    'GCC': [183,190,182,168,150,178],
    'Africa': [111,129,97,145,136,103,133,108,117,126,140,110,123,141,101,118,147,115,148,104],
    'Asia': [163,167,195,183,161,190,182,155,162,164,178,168,150,191,192,188,160,173,159,181],
    'Europe': [18,14,45,21,27,34,38,7,10,47,13,4,37,46,49,12,51,42,36,50],
    'South America': [52,54,60,56,55,59,57,58,61,53],
    'CONCACAF': [83,95,72,87,82,81,76,78,70,80]
};

const WEATHER_PRESETS = {
    europe: { sunny: 40, cloudy: 30, rainy: 25, snowy: 5, temp: 12 },
    middleeast: { sunny: 85, cloudy: 10, rainy: 5, snowy: 0, temp: 35 },
    tropical: { sunny: 50, cloudy: 25, rainy: 25, snowy: 0, temp: 28 },
    southam: { sunny: 55, cloudy: 25, rainy: 20, snowy: 0, temp: 22 },
    nordic: { sunny: 30, cloudy: 35, rainy: 20, snowy: 15, temp: 5 }
};

// ============================================================
// UI FUNCTIONS
// ============================================================
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById('page-' + pageId).classList.add('active');
    event.target.classList.add('active');
    
    // Load nations list when switching to international page
    if (pageId === 'international') {
        loadNationsForIntl();
    }
}

function toast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ============================================================
// FILE HANDLING
// ============================================================
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDropCompdata(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    handleFilesCompdata(e.dataTransfer.files);
}

function handleDropDatabase(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    handleFilesDatabase(e.dataTransfer.files);
}

// Compdata files (comma-separated)
const COMPDATA_FILES = ['compobj', 'settings', 'schedule', 'standings', 'advancement', 'tasks', 'objectives', 'initteams', 'compids', 'weather'];

// Open folder picker - uses Tauri native dialog if available, browser picker otherwise.
// Called from drop zone onclick. Tauri path is non-recursive (Rust read_dir).
window.openCompdataFolder = async function() {
    if (window.__TAURI__ && typeof window.__tauriOpenCompdata === 'function') {
        window.__tauriOpenCompdata();
    } else {
        document.getElementById('file-input-compdata').click();
    }
};

window.openDatabaseFolder = async function() {
    if (window.__TAURI__ && typeof window.__tauriOpenDatabase === 'function') {
        window.__tauriOpenDatabase();
    } else {
        document.getElementById('file-input-db').click();
    }
};

function handleFilesCompdata(files) {
    Array.from(files).forEach(file => {
        // Only top-level files: webkitRelativePath should be exactly "folder/file.txt" (depth 2)
        // or empty (drag-dropped individual files). Any deeper = subfolder, skip.
        if (file.webkitRelativePath) {
            const parts = file.webkitRelativePath.split('/');
            if (parts.length !== 2) return; // not top-level inside the picked folder
        }
        if (!file.name.toLowerCase().endsWith('.txt')) return;
        
        const name = file.name.toLowerCase().replace('.txt', '');
        if (!COMPDATA_FILES.includes(name)) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            data[name] = e.target.result.split('\n').map(l => l.trim()).filter(l => l);
            data.original[name] = [...data[name]];
            
            const fileItem = document.getElementById('file-' + name);
            if (fileItem) fileItem.classList.add('loaded');
            
            const statusEl = document.getElementById('status-' + name);
            if (statusEl) statusEl.textContent = data[name].length + ' lines';
            
            const countEl = document.getElementById('count-' + name);
            if (countEl) countEl.textContent = data[name].length;
            
            if (name === 'compobj') {
                parseHierarchy();
                findNextId();
                populateDropdowns();
                showPreview('compobj');
                // Save initial state for undo
                saveState('Loaded files');
            }
            
            toast('Loaded ' + file.name);
        };
        reader.readAsText(file);
    });
}

// Database files (UTF-16 tab-separated)
const DATABASE_FILES = ['teams', 'leagues', 'leagueteamlinks', 'teamnationlinks'];

function handleFilesDatabase(files) {
    Array.from(files).forEach(file => {
        if (file.webkitRelativePath) {
            const parts = file.webkitRelativePath.split('/');
            if (parts.length !== 2) return;
        }
        if (!file.name.toLowerCase().endsWith('.txt')) return;
        
        const name = file.name.toLowerCase().replace('.txt', '');
        if (!DATABASE_FILES.includes(name)) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            data[name] = e.target.result.split('\n').map(l => l.trim()).filter(l => l);
            data.original[name] = [...data[name]];
            parseDatabase(name);
            
            const fileItem = document.getElementById('file-' + name);
            if (fileItem) fileItem.classList.add('loaded');
            
            const statusEl = document.getElementById('status-' + name);
            if (statusEl) statusEl.textContent = data[name].length + ' lines';
            
            toast('Loaded ' + file.name);
        };
        reader.readAsText(file, 'utf-16le');
    });
}

// Parse database file into lookup object
function parseDatabase(name) {
    const lines = data[name];
    if (!lines || lines.length < 2) return;
    
    // First line is headers
    const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
    
    if (name === 'teams') {
        db.teams = [];
        const teamidIdx = headers.indexOf('teamid');
        const teamnameIdx = headers.indexOf('teamname');
        const assetidIdx = headers.indexOf('assetid');
        
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split('\t');
            if (cols.length > teamidIdx) {
                db.teams.push({
                    teamid: parseInt(cols[teamidIdx]?.trim()) || 0,
                    teamname: cols[teamnameIdx]?.trim() || '',
                    assetid: parseInt(cols[assetidIdx]?.trim()) || 0
                });
            }
        }
        document.getElementById('stat-teams').value = db.teams.length;
        console.log('Parsed teams:', db.teams.length);
        loadNationsForIntl(); // Refresh nations list if teamnationlinks is already loaded
    }
    
    if (name === 'leagues') {
        db.leagues = [];
        const leagueidIdx = headers.indexOf('leagueid');
        const leaguenameIdx = headers.indexOf('leaguename');
        const countryidIdx = headers.indexOf('countryid');
        
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split('\t');
            if (cols.length > leagueidIdx) {
                db.leagues.push({
                    leagueid: parseInt(cols[leagueidIdx]?.trim()) || 0,
                    leaguename: cols[leaguenameIdx]?.trim() || '',
                    countryid: parseInt(cols[countryidIdx]?.trim()) || 0
                });
            }
        }
        document.getElementById('stat-leagues').value = db.leagues.length;
        populateDbDropdowns();
        populateLeagueDbDropdown();
        console.log('Parsed leagues:', db.leagues.length);
    }
    
    if (name === 'leagueteamlinks') {
        db.teamLeagues = [];
        const leagueidIdx = headers.indexOf('leagueid');
        const teamidIdx = headers.indexOf('teamid');
        
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split('\t');
            if (cols.length > teamidIdx) {
                db.teamLeagues.push({
                    leagueid: parseInt(cols[leagueidIdx]?.trim()) || 0,
                    teamid: parseInt(cols[teamidIdx]?.trim()) || 0
                });
            }
        }
        document.getElementById('stat-teamleagues').value = db.teamLeagues.length;
        populateLeagueDbDropdown();
        populateCupSourceDropdown();
        loadTeamsForCup();
        console.log('Parsed teamLeagues:', db.teamLeagues.length);
    }
    
    if (name === 'teamnationlinks') {
        db.teamNations = [];
        const leagueidIdx = headers.indexOf('leagueid');
        const teamidIdx = headers.indexOf('teamid');
        const nationidIdx = headers.indexOf('nationid');
        
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split('\t');
            if (cols.length > nationidIdx) {
                db.teamNations.push({
                    leagueid: parseInt(cols[leagueidIdx]?.trim()) || 0,
                    teamid: parseInt(cols[teamidIdx]?.trim()) || 0,
                    nationid: parseInt(cols[nationidIdx]?.trim()) || 0
                });
            }
        }
        document.getElementById('stat-teamnations').value = db.teamNations.length;
        console.log('Parsed teamNations:', db.teamNations.length);
        loadNationsForIntl();
    }
}

// ============================================================
// HIERARCHY PARSING
// ============================================================
function parseHierarchy() {
    hierarchy = { confederations: [], nations: [], competitions: [], friendlies: [] };
    
    data.compobj.forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 5) {
            const id = parts[0].trim();
            const type = parts[1].trim();
            const code = parts[2].trim();
            const name = parts[3].trim();
            const parent = parts[4].trim();
            
            if (type === '1') {
                hierarchy.confederations.push({ id, code, name, parent, type });
            } else if (type === '2') {
                hierarchy.nations.push({ id, code, name, parent, type });
            } else if (type === '3') {
                hierarchy.competitions.push({ id, code, name, parent, type });
            } else if (type === '6') {
                hierarchy.friendlies.push({ id, code, name, parent, type });
            }
        }
    });
    
    document.getElementById('stat-confeds').value = hierarchy.confederations.length;
    document.getElementById('stat-nations').value = hierarchy.nations.length;
    document.getElementById('stat-comps').value = hierarchy.competitions.length;
    
    console.log('Parsed:', hierarchy.confederations.length, 'confeds,', hierarchy.nations.length, 'nations,', hierarchy.competitions.length, 'comps');
}

function findNextId() {
    let maxId = 0;
    data.compobj.forEach(line => {
        const id = parseInt(line.split(',')[0]);
        if (!isNaN(id) && id > maxId) maxId = id;
    });
    nextId = maxId + 1;
    document.getElementById('stat-nextid').value = nextId;
    console.log('Next ID:', nextId);
}

function getNextId() {
    return nextId++;
}

// Renumber ALL file IDs >= fromId by adding 'shift' amount
function renumberAllFiles(fromId, shift) {
    // compobj: columns 0 (id) and 4 (parent)
    for (let i = 0; i < data.compobj.length; i++) {
        const parts = data.compobj[i].split(',');
        if (parts.length >= 5) {
            let id = parseInt(parts[0].trim());
            let parent = parseInt(parts[4].trim());
            let changed = false;
            
            if (id >= fromId) { parts[0] = (id + shift).toString(); changed = true; }
            if (parent >= fromId) { parts[4] = (parent + shift).toString(); changed = true; }
            
            if (changed) data.compobj[i] = parts.join(',');
        }
    }
    
    // settings: column 0 (id), and column 2 if it's rule_suspension (value = id)
    for (let i = 0; i < data.settings.length; i++) {
        const parts = data.settings[i].split(',');
        if (parts.length >= 2) {
            let id = parseInt(parts[0].trim());
            let changed = false;
            
            if (id >= fromId) { parts[0] = (id + shift).toString(); changed = true; }
            
            // rule_suspension value is also the row ID
            if (parts.length >= 3 && parts[1].trim() === 'rule_suspension') {
                let val = parseInt(parts[2].trim());
                if (val >= fromId) { parts[2] = (val + shift).toString(); changed = true; }
            }
            
            if (changed) data.settings[i] = parts.join(',');
        }
    }
    
    // weather: column 0 (id)
    for (let i = 0; i < data.weather.length; i++) {
        const parts = data.weather[i].split(',');
        if (parts.length >= 1) {
            let id = parseInt(parts[0].trim());
            if (id >= fromId) {
                parts[0] = (id + shift).toString();
                data.weather[i] = parts.join(',');
            }
        }
    }
    
    // schedule: column 0 (group id)
    for (let i = 0; i < data.schedule.length; i++) {
        const parts = data.schedule[i].split(',');
        if (parts.length >= 1) {
            let id = parseInt(parts[0].trim());
            if (id >= fromId) {
                parts[0] = (id + shift).toString();
                data.schedule[i] = parts.join(',');
            }
        }
    }
    
    // standings: column 0 (group id)
    for (let i = 0; i < data.standings.length; i++) {
        const parts = data.standings[i].split(',');
        if (parts.length >= 1) {
            let id = parseInt(parts[0].trim());
            if (id >= fromId) {
                parts[0] = (id + shift).toString();
                data.standings[i] = parts.join(',');
            }
        }
    }
    
    // advancement: columns 0, 2 (from group, to group)
    for (let i = 0; i < data.advancement.length; i++) {
        const parts = data.advancement[i].split(',');
        if (parts.length >= 3) {
            let from = parseInt(parts[0].trim());
            let to = parseInt(parts[2].trim());
            let changed = false;
            
            if (from >= fromId) { parts[0] = (from + shift).toString(); changed = true; }
            if (to >= fromId) { parts[2] = (to + shift).toString(); changed = true; }
            
            if (changed) data.advancement[i] = parts.join(',');
        }
    }
    
    // tasks: columns 0 (comp id) and 3 (target group/stage id)
    for (let i = 0; i < data.tasks.length; i++) {
        const parts = data.tasks[i].split(',');
        if (parts.length >= 4) {
            let id = parseInt(parts[0].trim());
            let target = parseInt(parts[3].trim());
            let changed = false;
            
            if (!isNaN(id) && id >= fromId) { parts[0] = (id + shift).toString(); changed = true; }
            if (!isNaN(target) && target >= fromId) { parts[3] = (target + shift).toString(); changed = true; }
            
            if (changed) data.tasks[i] = parts.join(',');
        }
    }
    
    // objectives: column 0
    for (let i = 0; i < data.objectives.length; i++) {
        const parts = data.objectives[i].split(',');
        if (parts.length >= 1) {
            let id = parseInt(parts[0].trim());
            if (!isNaN(id) && id >= fromId) {
                parts[0] = (id + shift).toString();
                data.objectives[i] = parts.join(',');
            }
        }
    }
    
    // compids: each line is a single comp ID
    for (let i = 0; i < data.compids.length; i++) {
        let id = parseInt(data.compids[i].trim());
        if (!isNaN(id) && id >= fromId) {
            data.compids[i] = (id + shift).toString();
        }
    }
    
    // initteams: column 0 (comp id)
    for (let i = 0; i < data.initteams.length; i++) {
        const parts = data.initteams[i].split(',');
        if (parts.length >= 1) {
            let id = parseInt(parts[0].trim());
            if (!isNaN(id) && id >= fromId) {
                parts[0] = (id + shift).toString();
                data.initteams[i] = parts.join(',');
            }
        }
    }
    
    console.log('Renumbered all IDs >= ' + fromId + ' by +' + shift);
    nextId += shift;
    document.getElementById('stat-nextid').value = nextId;
}

// Sort all data arrays by their first column (ID) to guarantee correct ordering
function sortAllData() {
    function byFirstCol(a, b) {
        const idA = parseInt(a.split(',')[0].trim()) || 0;
        const idB = parseInt(b.split(',')[0].trim()) || 0;
        return idA - idB;
    }
    
    ['compobj', 'settings', 'standings', 'schedule', 'advancement', 'tasks', 'objectives', 'initteams', 'weather'].forEach(f => {
        if (data[f] && data[f].length > 0) {
            data[f].sort(byFirstCol);
        }
    });
    
    // compids: sort numerically
    if (data.compids && data.compids.length > 0) {
        data.compids.sort((a, b) => (parseInt(a.trim()) || 0) - (parseInt(b.trim()) || 0));
    }
}

// Clear all compdata from memory (keeps database files loaded)
function resetCompdata() {
    const hasData = data.compobj.length > 0;
    if (hasData && !confirm('Clear all compdata from memory? Any unsaved changes will be lost.')) {
        return;
    }
    
    const COMPDATA_FILES = ['compobj', 'settings', 'schedule', 'standings', 'advancement', 'tasks', 'objectives', 'initteams', 'compids', 'weather'];
    
    COMPDATA_FILES.forEach(f => {
        data[f] = [];
        if (data.original) data.original[f] = [];
        
        // Reset UI indicators
        const fileItem = document.getElementById('file-' + f);
        if (fileItem) fileItem.classList.remove('loaded', 'changed');
        
        const statusEl = document.getElementById('status-' + f);
        if (statusEl) {
            statusEl.textContent = 'Not loaded';
            statusEl.style.color = '';
        }
        
        const countEl = document.getElementById('count-' + f);
        if (countEl) {
            countEl.textContent = '0';
            countEl.classList.remove('new');
        }
    });
    
    // Clear hierarchy
    hierarchy = { confederations: [], nations: [], competitions: [], friendlies: [] };
    nextId = 0;
    
    // Reset stats
    const statConfeds = document.getElementById('stat-confeds');
    const statNations = document.getElementById('stat-nations');
    const statComps = document.getElementById('stat-comps');
    const statNextId = document.getElementById('stat-nextid');
    if (statConfeds) statConfeds.value = 0;
    if (statNations) statNations.value = 0;
    if (statComps) statComps.value = 0;
    if (statNextId) statNextId.value = 0;
    
    // Clear history
    history.length = 0;
    historyIndex = -1;
    
    // Refresh UI
    if (typeof populateDropdowns === 'function') populateDropdowns();
    if (typeof showPreview === 'function') showPreview('compobj');
    
    // Clear last compdata path in Tauri bridge
    if (window.__tauriLastCompdataPath !== undefined) {
        window.__tauriLastCompdataPath = null;
    }
    
    toast('Compdata cleared');
}

// Reload compdata - just re-opens the folder picker
async function reloadCompdata() {
    if (data.compobj.length > 0 && !confirm('Reload compdata? Any unsaved changes will be lost.\n\nYou will be asked to select the folder again.')) {
        return;
    }
    
    // Clear existing data first
    const COMPDATA_FILES = ['compobj', 'settings', 'schedule', 'standings', 'advancement', 'tasks', 'objectives', 'initteams', 'compids', 'weather'];
    COMPDATA_FILES.forEach(f => {
        data[f] = [];
        if (data.original) data.original[f] = [];
    });
    
    // Clear history so loading fresh doesn't leave stale undo states
    history.length = 0;
    historyIndex = -1;
    
    // Trigger the folder picker (works in both Tauri and browser)
    const dropZone = document.getElementById('drop-zone-compdata');
    if (dropZone) dropZone.click();
}

// ============================================================