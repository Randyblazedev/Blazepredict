const API_TOKEN = "805e2ea33ede4dbe8542234fe9cd6faf";
const today = new Date().toISOString().split('T')[0];

// Handle zero-score case so we don't get NaN
function calculateProbabilities(homeMatches, awayMatches) {
    const calcFormPoints = matches => matches.reduce((sum, m) => {
        if (m.result === "W") return sum + 3;
        if (m.result === "D") return sum + 1;
        return sum;
    }, 0);
    const calcGoalsDiff = matches => matches.reduce((sum, m) => sum + (m.goalsFor - m.goalsAgainst), 0);

    const homeScore = calcFormPoints(homeMatches) * 0.6 + calcGoalsDiff(homeMatches) * 0.4;
    const awayScore = calcFormPoints(awayMatches) * 0.6 + calcGoalsDiff(awayMatches) * 0.4;

    const total = homeScore + awayScore;
    if (total === 0) return { homeProb: 50, awayProb: 50, predictedWinner: "Draw / Unknown" };

    const homeProb = Math.round((homeScore / total) * 100);
    const awayProb = 100 - homeProb;
    const predictedWinner = homeProb > awayProb ? homeProb + "% Home" : awayProb + "% Away";
    return { homeProb, awayProb, predictedWinner };
}

async function getLastFiveMatches(teamId) {
    try {
        const response = await fetch(
            `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=5`,
            { headers: { "X-Auth-Token": API_TOKEN } }
        );
        if (!response.ok) return [];
        const data = await response.json();
        return (data.matches || []).map(match => ({
            result: match.score.winner === 'HOME_TEAM' ? 'W' : match.score.winner === 'AWAY_TEAM' ? 'L' : 'D',
            goalsFor: match.homeTeam.id === teamId ? (match.score.fullTime.home || 0) : (match.score.fullTime.away || 0),
            goalsAgainst: match.homeTeam.id === teamId ? (match.score.fullTime.away || 0) : (match.score.fullTime.home || 0),
        }));
    } catch (e) {
        return [];
    }
}

async function fetchAndDisplayMatches() {
    const container = document.getElementById("matchesContainer");
    if (!container) return;
    container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading matches...</p></div>';

    try {
        const response = await fetch(
            `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${today}`,
            { headers: { "X-Auth-Token": API_TOKEN } }
        );
        if (!response.ok) throw new Error("API error: " + response.status);
        const data = await response.json();
        const matches = data.matches || [];

        if (matches.length === 0) {
            container.innerHTML = '<div class="alert alert-info text-center">No matches scheduled for today.</div>';
            return;
        }

        // Fetch team histories in parallel
        const teamPromises = matches.flatMap(m => [getLastFiveMatches(m.homeTeam.id), getLastFiveMatches(m.awayTeam.id)]);
        const results = await Promise.all(teamPromises);

        container.innerHTML = '';
        matches.forEach((match, i) => {
            const homeTeamMatches = results[i * 2];
            const awayTeamMatches = results[i * 2 + 1];
            const { homeProb, awayProb, predictedWinner } = calculateProbabilities(homeTeamMatches, awayTeamMatches);

            const el = document.createElement("div");
            el.className = "match-card";
            el.innerHTML = `
                <div class="match-teams">
                    <span class="team home">${match.homeTeam.name}</span>
                    <span class="vs">vs</span>
                    <span class="team away">${match.awayTeam.name}</span>
                </div>
                <div class="match-prediction">Prediction: <strong>${predictedWinner}</strong></div>
                <div class="match-bars">
                    <div class="bar-track">
                        <div class="bar home" style="width:${homeProb}%">${homeProb}%</div>
                        <div class="bar away" style="width:${awayProb}%">${awayProb}%</div>
                    </div>
                </div>
                <div class="match-competition">${match.competition?.name || ''}</div>
            `;
            container.appendChild(el);
        });
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger text-center">Failed to load matches. ${e.message}</div>`;
    }
}

window.onload = fetchAndDisplayMatches;
