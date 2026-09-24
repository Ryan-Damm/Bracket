// 1. INPUT: Change this array to any size you want! (e.g., 3, 5, 11, 16...)
let inputTeams = ["Alphas", "Betas", "Gammas", "Deltas", "Epsilons", "Zetas"];
const teamsInput = document.getElementById("teams-input");
const submitButton = document.getElementById("submit-button");

// 2. LOGIC: Generate full tournament structure with all rounds based on team length
function buildFullTournamentData(teams) {
    const totalTeams = teams.length;
    if (totalTeams < 2) return [];

    // Find base size (next highest power of 2)
    let bracketSize = 1;
    while (bracketSize < totalTeams) {
        bracketSize *= 2;
    }

    const numByes = bracketSize - totalTeams;
    const tournamentRounds = [];

    // --- ROUND 1 GENERATION ---
    let round1Matches = [];
    let currentTeamIndex = 0;
    let byesAllocated = 0;

    for (let i = 0; i < bracketSize / 2; i++) {
        let teamA = teams[currentTeamIndex++];
        let teamB;

        if (byesAllocated < numByes) {
            teamB = "BYE";
            byesAllocated++;
        } else {
            teamB = teams[currentTeamIndex++];
        }

        round1Matches.push({
            team1: teamA,
            team2: teamB
        });
    }

    tournamentRounds.push({
        roundName: "Round 1",
        matches: round1Matches
    });

    // --- LATER ROUNDS GENERATION ---
    let matchesInCurrentRound = bracketSize / 2;
    let roundNumber = 2;

    while (matchesInCurrentRound > 1) {
        matchesInCurrentRound /= 2;
        let roundMatches = [];

        // Name the final rounds cleanly
        let name = `Round ${roundNumber}`;
        if (matchesInCurrentRound === 2) name = "Semifinals";
        if (matchesInCurrentRound === 1) name = "Finals";

        for (let i = 0; i < matchesInCurrentRound; i++) {
            // Check if previous round matches had a BYE to pre-fill known winners
            let prevMatch1 = tournamentRounds[tournamentRounds.length - 1].matches[i * 2];
            let prevMatch2 = tournamentRounds[tournamentRounds.length - 1].matches[i * 2 + 1];

            let computedTeam1 = (prevMatch1.team2 === "BYE") ? prevMatch1.team1 : "TBD";
            let computedTeam2 = (prevMatch2.team2 === "BYE") ? prevMatch2.team1 : "TBD";

            roundMatches.push({
                team1: computedTeam1,
                team2: computedTeam2
            });
        }

        tournamentRounds.push({
            roundName: name,
            matches: roundMatches
        });
        roundNumber++;
    }

    return tournamentRounds;
}

// 3. RENDER: Draw the data structurally into the DOM
function renderBracketHTML(rounds) {
    const container = document.getElementById("bracket-container");
    container.innerHTML = "";

    rounds.forEach(roundData => {
        const roundDiv = document.createElement("div");
        roundDiv.className = "round";

        // Add Round Title
        const title = document.createElement("div");
        title.className = "round-title";
        title.textContent = roundData.roundName;
        roundDiv.appendChild(title);

        // Container for matches to let Flexbox handle alignment
        const matchListDiv = document.createElement("div");
        matchListDiv.className = "match-list";

        roundData.matches.forEach(match => {
            const matchDiv = document.createElement("div");
            matchDiv.className = "match";

            const team1Div = document.createElement("div");
            team1Div.className = "team" + (match.team1 === "BYE" ? " bye-team" : "");
            team1Div.textContent = match.team1;

            const team2Div = document.createElement("div");
            team2Div.className = "team" + (match.team2 === "BYE" ? " bye-team" : "");
            team2Div.textContent = match.team2;

            matchDiv.appendChild(team1Div);
            matchDiv.appendChild(team2Div);
            matchListDiv.appendChild(matchDiv);
        });

        roundDiv.appendChild(matchListDiv);
        container.appendChild(roundDiv);
    });
}

submitButton.addEventListener("click", () => {
    let currentText = teamsInput.value;
    inputTeams = [];
    while (currentText > 0) {
        inputTeams.push("Team" + currentText);
        currentText--;
    }

    console.log(inputTeams);

    const structuredData = buildFullTournamentData(inputTeams);
    renderBracketHTML(structuredData);
});

// Execute processing pipeline when script loads
const structuredData = buildFullTournamentData(inputTeams);
renderBracketHTML(structuredData);
