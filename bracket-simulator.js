const state = {
    teams: [],
    rounds: [],
    history: [],
    champion: null
};

const teamsInput = document.getElementById("teams-input");
const createTeamsButton = document.getElementById("create-teams-button");
const teamForm = document.getElementById("team-form");
const teamFields = document.getElementById("team-fields");
const teamCountLabel = document.getElementById("team-count-label");
const setupError = document.getElementById("setup-error");
const startButton = document.getElementById("start-button");

const setupScreen = document.getElementById("setup-screen");
const bracketScreen = document.getElementById("bracket-screen");
const bracketContainer = document.getElementById("bracket-container");
const tournamentTitle = document.getElementById("tournament-title");
const instruction = document.getElementById("instruction");
const undoButton = document.getElementById("undo-button");
const restartButton = document.getElementById("restart-button");
const resetButton = document.getElementById("reset-button");

const winnerCard = document.getElementById("winner-card");
const winnerImageWrap = document.getElementById("winner-image-wrap");
const winnerName = document.getElementById("winner-name");
const newTournamentButton = document.getElementById("new-tournament-button");

const birthdayOverlay = document.getElementById("birthdayOverlay");
const closeBirthdayButton = document.getElementById("closeBirthday");
const birthdayToggle = document.getElementById("birthdayToggle");

const savedBracketSelect = document.getElementById("saved-bracket-select");
const loadSavedButton = document.getElementById("load-saved-button");
const deleteSavedButton = document.getElementById("delete-saved-button");
const importBracketButton = document.getElementById("import-bracket-button");
const importBracketInput = document.getElementById("import-bracket-input");
const saveBracketButton = document.getElementById("save-bracket-button");
const shareBracketButton = document.getElementById("share-bracket-button");
const loadBracketButton = document.getElementById("load-bracket-button");

const SAVED_BRACKETS_KEY = "birthdayBracketSavedBrackets";

function getBracketSize(teamCount) {
    let size = 2;
    while (size < teamCount) size *= 2;
    return size;
}

function roundName(roundIndex, totalRounds) {
    if (roundIndex === totalRounds - 1) return "Final";
    if (roundIndex === totalRounds - 2) return "Semifinals";
    if (roundIndex === totalRounds - 3) return "Quarterfinals";
    return `Round ${roundIndex + 1}`;
}

function createTeamFields(count) {
    teamFields.innerHTML = "";
    teamCountLabel.textContent = `${count} teams`;

    for (let i = 0; i < count; i++) {
        const row = document.createElement("div");
        row.className = "team-field";

        const number = document.createElement("div");
        number.className = "team-number";
        number.textContent = i + 1;

        const name = document.createElement("input");
        name.className = "team-name-input";
        name.type = "text";
        name.maxLength = 40;
        name.placeholder = `Team ${i + 1}`;
        name.value = `Team ${i + 1}`;
        name.setAttribute("aria-label", `Team ${i + 1} name`);

        const label = document.createElement("label");
        label.className = "file-label";
        label.textContent = "Add picture";

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.setAttribute("aria-label", `Picture for team ${i + 1}`);

        const status = document.createElement("span");
        status.className = "file-status";
        status.textContent = "Optional";

        fileInput.addEventListener("change", () => {
            status.textContent = fileInput.files[0]?.name || "Optional";
        });

        label.appendChild(fileInput);
        row.append(number, name, label, status);
        teamFields.appendChild(row);
    }

    teamForm.classList.remove("hidden");
}

function readImage(file) {
    return new Promise((resolve) => {
        if (!file) {
            resolve(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

async function collectTeams() {
    const rows = [...teamFields.querySelectorAll(".team-field")];
    const teams = [];

    for (let i = 0; i < rows.length; i++) {
        const nameInput = rows[i].querySelector(".team-name-input");
        const fileInput = rows[i].querySelector('input[type="file"]');

        const name = nameInput.value.trim() || `Team ${i + 1}`;
        const image = await readImage(fileInput.files[0]);

        teams.push({
            id: `team-${i}-${Date.now()}`,
            name,
            image
        });
    }

    return teams;
}

function buildInitialRounds(teams) {
    const bracketSize = getBracketSize(teams.length);
    const slots = [...teams];

    while (slots.length < bracketSize) slots.push("BYE");

    const rounds = [];
    const totalRounds = Math.log2(bracketSize);
    let matchCount = bracketSize / 2;

    const firstMatches = [];
    for (let i = 0; i < matchCount; i++) {
        firstMatches.push({
            team1: slots[i * 2],
            team2: slots[i * 2 + 1],
            winner: null
        });
    }

    rounds.push({ name: "Round 1", matches: firstMatches });

    while (matchCount > 1) {
        matchCount /= 2;
        const matches = [];

        for (let i = 0; i < matchCount; i++) {
            matches.push({
                team1: null,
                team2: null,
                winner: null
            });
        }

        rounds.push({
            name: roundName(rounds.length, totalRounds),
            matches
        });
    }

    return rounds;
}

function cloneRounds(rounds) {
    return rounds.map(round => ({
        name: round.name,
        matches: round.matches.map(match => ({
            team1: match.team1,
            team2: match.team2,
            winner: match.winner
        }))
    }));
}

function saveHistory() {
    state.history.push({
        rounds: cloneRounds(state.rounds),
        champion: state.champion
    });
}

function teamKey(team) {
    return team && typeof team === "object" ? team.id : team;
}

function sameTeam(a, b) {
    return teamKey(a) !== null && teamKey(a) === teamKey(b);
}

function isRealTeam(team) {
    return team && team !== "BYE";
}

function clearDownstream(roundIndex, matchIndex) {
    const nextIndex = roundIndex + 1;
    if (nextIndex >= state.rounds.length) return;

    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = state.rounds[nextIndex].matches[nextMatchIndex];

    if (matchIndex % 2 === 0) nextMatch.team1 = null;
    else nextMatch.team2 = null;

    nextMatch.winner = null;
    clearDownstream(nextIndex, nextMatchIndex);
}

function placeWinner(roundIndex, matchIndex, winner) {
    const nextIndex = roundIndex + 1;

    if (nextIndex >= state.rounds.length) {
        state.champion = winner === "BYE" ? null : winner;
        return;
    }

    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = state.rounds[nextIndex].matches[nextMatchIndex];

    if (matchIndex % 2 === 0) nextMatch.team1 = winner;
    else nextMatch.team2 = winner;

    nextMatch.winner = null;
}

function autoAdvanceByes() {
    let changed = true;

    while (changed) {
        changed = false;

        for (let roundIndex = 0; roundIndex < state.rounds.length; roundIndex++) {
            for (let matchIndex = 0; matchIndex < state.rounds[roundIndex].matches.length; matchIndex++) {
                const match = state.rounds[roundIndex].matches[matchIndex];
                if (match.winner) continue;

                const firstIsReal = isRealTeam(match.team1);
                const secondIsReal = isRealTeam(match.team2);
                const firstIsBye = match.team1 === "BYE";
                const secondIsBye = match.team2 === "BYE";

                // One real team against a known BYE advances automatically.
                if (firstIsReal && (secondIsBye || match.team2 === null && roundIndex === 0)) {
                    match.winner = match.team1;
                    placeWinner(roundIndex, matchIndex, match.team1);
                    changed = true;
                    continue;
                }

                if (secondIsReal && (firstIsBye || match.team1 === null && roundIndex === 0)) {
                    match.winner = match.team2;
                    placeWinner(roundIndex, matchIndex, match.team2);
                    changed = true;
                    continue;
                }

                // A later-round match with one real team and one slot that has
                // already been proven empty is also a BYE.
                if (firstIsReal && secondIsBye) {
                    match.winner = match.team1;
                    placeWinner(roundIndex, matchIndex, match.team1);
                    changed = true;
                    continue;
                }

                if (secondIsReal && firstIsBye) {
                    match.winner = match.team2;
                    placeWinner(roundIndex, matchIndex, match.team2);
                    changed = true;
                }
            }
        }

        // If a match is completely empty because both source matches were
        // empty, mark its output as a BYE so the emptiness can cascade.
        for (let roundIndex = 0; roundIndex < state.rounds.length - 1; roundIndex++) {
            for (let matchIndex = 0; matchIndex < state.rounds[roundIndex].matches.length; matchIndex++) {
                const match = state.rounds[roundIndex].matches[matchIndex];
                if (match.winner) continue;

                if (match.team1 === "BYE" && match.team2 === "BYE") {
                    match.winner = "BYE";
                    placeWinner(roundIndex, matchIndex, "BYE");
                    changed = true;
                }
            }
        }
    }
}

function displayTeam(team, options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "team";

    if (team === "BYE") {
        button.classList.add("bye");
        button.disabled = true;
        button.textContent = "BYE";
        return button;
    }

    if (!team) {
        button.classList.add("tbd");
        button.disabled = true;
        button.textContent = "Waiting...";
        return button;
    }

    const avatar = document.createElement("span");
    avatar.className = "team-avatar";

    if (team.image) {
        const img = document.createElement("img");
        img.src = team.image;
        img.alt = "";
        avatar.appendChild(img);
    } else {
        avatar.textContent = team.name.slice(0, 2).toUpperCase();
    }

    const name = document.createElement("span");
    name.className = "team-name";
    name.textContent = team.name;

    button.append(avatar, name);

    if (options.clickable) {
        button.classList.add("clickable");
        button.addEventListener("click", () => selectWinner(options.roundIndex, options.matchIndex, team));
    }

    if (options.winner) button.classList.add("winner");

    return button;
}

function renderBracket() {
    bracketContainer.innerHTML = "";

    state.rounds.forEach((round, roundIndex) => {
        const roundDiv = document.createElement("section");
        roundDiv.className = "round";

        const title = document.createElement("div");
        title.className = "round-title";
        title.textContent = round.name;

        const matchList = document.createElement("div");
        matchList.className = "match-list";

        round.matches.forEach((match, matchIndex) => {
            const matchDiv = document.createElement("div");
            matchDiv.className = "match";

            const canChoose = !match.winner && isRealTeam(match.team1) && isRealTeam(match.team2);

            matchDiv.append(
                displayTeam(match.team1, {
                    clickable: canChoose,
                    winner: sameTeam(match.winner, match.team1),
                    roundIndex,
                    matchIndex
                }),
                displayTeam(match.team2, {
                    clickable: canChoose,
                    winner: sameTeam(match.winner, match.team2),
                    roundIndex,
                    matchIndex
                })
            );

            matchList.appendChild(matchDiv);
        });

        roundDiv.append(title, matchList);
        bracketContainer.appendChild(roundDiv);
    });

    undoButton.disabled = state.history.length === 0;
    instruction.textContent = state.champion
        ? "Tournament complete."
        : "Click the team you think should advance.";
}

function renderWinner() {
    if (!state.champion) {
        winnerCard.classList.add("hidden");
        return;
    }

    winnerName.textContent = state.champion.name;
    winnerImageWrap.innerHTML = "";

    if (state.champion.image) {
        const img = document.createElement("img");
        img.src = state.champion.image;
        img.alt = `${state.champion.name} image`;
        winnerImageWrap.appendChild(img);
    } else {
        winnerImageWrap.textContent = state.champion.name.slice(0, 2).toUpperCase();
    }

    winnerCard.classList.remove("hidden");
    winnerCard.scrollIntoView({ behavior: "smooth", block: "center" });
}

function selectWinner(roundIndex, matchIndex, team) {
    const match = state.rounds[roundIndex].matches[matchIndex];

    if (match.winner || !isRealTeam(match.team1) || !isRealTeam(match.team2)) return;

    saveHistory();
    match.winner = team;
    clearDownstream(roundIndex, matchIndex);
    placeWinner(roundIndex, matchIndex, team);
    autoAdvanceByes();

    renderBracket();
    renderWinner();

    if (state.champion) {
        launchConfetti();
    }
}

function startTournament(teams) {
    state.teams = teams;
    state.history = [];
    state.champion = null;
    state.rounds = buildInitialRounds(teams);

    autoAdvanceByes();

    setupScreen.classList.add("hidden");
    bracketScreen.classList.remove("hidden");
    resetButton.classList.remove("hidden");
    tournamentTitle.textContent = `${teams.length}-Team Tournament`;

    renderBracket();
    renderWinner();
}

createTeamsButton.addEventListener("click", () => {
    const count = Number.parseInt(teamsInput.value, 10);

    if (!Number.isInteger(count) || count < 2 || count > 64) {
        setupError.textContent = "Choose a number between 2 and 64.";
        teamForm.classList.add("hidden");
        return;
    }

    setupError.textContent = "";
    createTeamFields(count);
});

startButton.addEventListener("click", async () => {
    startButton.disabled = true;
    startButton.textContent = "Building bracket...";

    try {
        const teams = await collectTeams();
        startTournament(teams);
    } catch (error) {
        console.error(error);
        setupError.textContent = "Something went wrong while creating the bracket.";
    } finally {
        startButton.disabled = false;
        startButton.textContent = "Generate bracket";
    }
});

undoButton.addEventListener("click", () => {
    const previous = state.history.pop();
    if (!previous) return;

    state.rounds = previous.rounds;
    state.champion = previous.champion;

    renderBracket();
    renderWinner();
});

function restartBracket() {
    state.history = [];
    state.champion = null;
    state.rounds = buildInitialRounds(state.teams);
    autoAdvanceByes();
    renderBracket();
    renderWinner();
}

restartButton.addEventListener("click", restartBracket);

function goToSetup() {
    state.teams = [];
    state.rounds = [];
    state.history = [];
    state.champion = null;

    bracketScreen.classList.add("hidden");
    setupScreen.classList.remove("hidden");
    resetButton.classList.add("hidden");
    winnerCard.classList.add("hidden");
    teamForm.classList.add("hidden");
    setupError.textContent = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

resetButton.addEventListener("click", goToSetup);
newTournamentButton.addEventListener("click", goToSetup);


// Save / load / share --------------------------------------------------------
function getSavedBrackets() {
    try {
        return JSON.parse(localStorage.getItem(SAVED_BRACKETS_KEY) || "[]");
    } catch (error) {
        console.error(error);
        return [];
    }
}

function writeSavedBrackets(brackets) {
    localStorage.setItem(SAVED_BRACKETS_KEY, JSON.stringify(brackets));
}

function makeBracketData(name = "My Bracket") {
    return {
        format: "birthday-bracket",
        version: 1,
        name,
        savedAt: new Date().toISOString(),
        state: JSON.parse(JSON.stringify(state))
    };
}

function isValidBracketData(data) {
    return Boolean(
        data &&
        data.format === "birthday-bracket" &&
        data.version === 1 &&
        data.state &&
        Array.isArray(data.state.teams) &&
        Array.isArray(data.state.rounds)
    );
}

function applyBracketData(data) {
    if (!isValidBracketData(data)) {
        throw new Error("That file is not a valid birthday bracket.");
    }

    state.teams = data.state.teams;
    state.rounds = data.state.rounds;
    state.history = Array.isArray(data.state.history) ? data.state.history : [];
    state.champion = data.state.champion || null;

    setupScreen.classList.add("hidden");
    bracketScreen.classList.remove("hidden");
    resetButton.classList.remove("hidden");
    winnerCard.classList.add("hidden");
    tournamentTitle.textContent = `${state.teams.length}-Team Tournament`;

    renderBracket();
    renderWinner();
}

function refreshSavedBracketList() {
    if (!savedBracketSelect) return;

    const brackets = getSavedBrackets();
    savedBracketSelect.innerHTML = "";

    if (brackets.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No saved brackets";
        savedBracketSelect.appendChild(option);
    } else {
        brackets.forEach(bracket => {
            const option = document.createElement("option");
            option.value = bracket.id;
            option.textContent = bracket.name;
            savedBracketSelect.appendChild(option);
        });
    }

    const hasSelection = Boolean(savedBracketSelect.value);
    loadSavedButton.disabled = !hasSelection;
    deleteSavedButton.disabled = !hasSelection;
}

function saveCurrentBracket() {
    if (!state.teams.length || !state.rounds.length) return;

    const name = window.prompt("Name this bracket:", "My Bracket");
    if (name === null) return;

    const trimmedName = name.trim() || "My Bracket";
    const brackets = getSavedBrackets();
    const id = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `bracket-${Date.now()}`;

    brackets.push({
        id,
        name: trimmedName,
        savedAt: new Date().toISOString(),
        state: JSON.parse(JSON.stringify(state))
    });

    try {
        writeSavedBrackets(brackets);
        refreshSavedBracketList();
        savedBracketSelect.value = id;
        refreshSavedBracketList();
        savedBracketSelect.value = id;
    } catch (error) {
        console.error(error);
        window.alert("This bracket could not be saved. The browser may be out of local storage space.");
    }
}

function loadSavedBracket() {
    const id = savedBracketSelect?.value;
    if (!id) return;

    const bracket = getSavedBrackets().find(item => item.id === id);
    if (!bracket) return;

    try {
        applyBracketData({
            format: "birthday-bracket",
            version: 1,
            name: bracket.name,
            savedAt: bracket.savedAt,
            state: bracket.state
        });
    } catch (error) {
        console.error(error);
        window.alert("That saved bracket could not be loaded.");
    }
}

function deleteSavedBracket() {
    const id = savedBracketSelect?.value;
    if (!id) return;

    const brackets = getSavedBrackets();
    const bracket = brackets.find(item => item.id === id);
    if (!bracket) return;

    if (!window.confirm(`Delete the saved bracket “${bracket.name}”?`)) return;

    writeSavedBrackets(brackets.filter(item => item.id !== id));
    refreshSavedBracketList();
}

function downloadBracketFile() {
    const name = state.teams.length ? `${state.teams.length}-team bracket` : "bracket";
    const data = makeBracketData(name);
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "bracket"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

async function shareCurrentBracket() {
    if (!state.teams.length || !state.rounds.length) return;

    const name = `${state.teams.length}-team bracket`;
    const data = makeBracketData(name);
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const file = new File([blob], `${name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "bracket"}.json`, { type: "application/json" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({
                title: "Birthday Bracket",
                text: "Here's a bracket to load into the birthday bracket app.",
                files: [file]
            });
            return;
        } catch (error) {
            if (error.name === "AbortError") return;
        }
    }

    downloadBracketFile();
}

function loadBracketFromFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            applyBracketData(data);
        } catch (error) {
            console.error(error);
            window.alert("That file could not be loaded. Make sure it came from this bracket app.");
        }
    };
    reader.readAsText(file);
}

if (savedBracketSelect) {
    savedBracketSelect.addEventListener("change", refreshSavedBracketList);
}

loadSavedButton?.addEventListener("click", loadSavedBracket);
deleteSavedButton?.addEventListener("click", deleteSavedBracket);
saveBracketButton?.addEventListener("click", saveCurrentBracket);
shareBracketButton?.addEventListener("click", shareCurrentBracket);
loadBracketButton?.addEventListener("click", () => {
    importBracketInput?.click();
});
importBracketButton?.addEventListener("click", () => {
    importBracketInput?.click();
});
importBracketInput?.addEventListener("change", () => {
    loadBracketFromFile(importBracketInput.files[0]);
    importBracketInput.value = "";
});

refreshSavedBracketList();

// Birthday greeting ---------------------------------------------------------
const BIRTHDAY_ENABLED_KEY = "bracketBirthdayEnabled";

function launchConfetti() {
    const colors = [
        getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
        getComputedStyle(document.documentElement).getPropertyValue("--accent-light").trim(),
        getComputedStyle(document.documentElement).getPropertyValue("--accent-complement").trim(),
        "#f7c948",
        "#ffffff"
    ];

    for (let i = 0; i < 140; i++) {
        const piece = document.createElement("span");
        piece.className = "confetti-piece";
        const size = 7 + Math.random() * 8;
        piece.style.width = `${size}px`;
        piece.style.height = `${size * 1.5}px`;
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.left = `${Math.random() * 100}vw`;
        piece.style.top = `${-40 - Math.random() * 120}px`;
        piece.style.setProperty("--drift", `${-260 + Math.random() * 520}px`);
        piece.style.setProperty("--rotation", `${360 + Math.random() * 1080}deg`);
        piece.style.animationDuration = `${3 + Math.random() * 2.5}s`;
        piece.style.animationDelay = `${Math.random() * 0.35}s`;
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 6500);
    }
}

function showBirthdayGreeting() {
    if (!birthdayOverlay) return;
    birthdayOverlay.classList.add("show");
    birthdayOverlay.setAttribute("aria-hidden", "false");
    launchConfetti();
}

function setupBirthdayGreeting() {
    if (!birthdayToggle || !birthdayOverlay || !closeBirthdayButton) return;

    const savedSetting = localStorage.getItem(BIRTHDAY_ENABLED_KEY);
    birthdayToggle.checked = savedSetting !== "false";

    birthdayToggle.addEventListener("change", () => {
        localStorage.setItem(BIRTHDAY_ENABLED_KEY, String(birthdayToggle.checked));
    });

    closeBirthdayButton.addEventListener("click", () => {
        birthdayOverlay.classList.remove("show");
        birthdayOverlay.setAttribute("aria-hidden", "true");
        setupScreen.classList.remove("hidden");
    });

    // Deliberately do NOT store a "shown" flag. If the feature is enabled,
    // the birthday welcome appears whenever the page is opened.
    if (birthdayToggle.checked) {
        setupScreen.classList.add("hidden");
        setTimeout(showBirthdayGreeting, 120);
    }
}

createTeamsButton.click();
setupBirthdayGreeting();
