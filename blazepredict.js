const apiToken = "805e2ea33ede4dbe8542234fe9cd6faf"; // Your football-data.org token
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// Helper: Calculate probability from last 5 matches
function calculateProbabilities(homeMatches, awayMatches) {
    const calcFormPoints = matches => matches.reduce((sum, m) => {
        if (m.result === "W") return sum + 3;
        if (m.result === "D") return sum + 1;
        return sum;
    }, 0);
    const calcGoalsDiff = matches => matches.reduce((sum, m) => sum + (m.goalsFor - m.goalsAgainst), 0);

    const homeScore = calcFormPoints(homeMatches) * 0.6 + calcGoalsDiff(homeMatches) * 0.4;
    const awayScore = calcFormPoints(awayMatches) * 0.6 + calcGoalsDiff(awayMatches) * 0.4;

    const homeProb = Math.round((homeScore / (homeScore + awayScore)) * 100);
    const awayProb = 100 - homeProb;
    const predictedWinner = homeProb > awayProb ? "Home Team" : "Away Team";
    return { homeProb, awayProb, predictedWinner };
}

// Fetch last 5 matches for a team
async function getLastFiveMatches(teamId) {
    const response = await fetch(
        `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&dateTo=${today}&limit=5`,
        { headers: { "X-Auth-Token": apiToken } }
    );
    const data = await response.json();
    return data.matches.map(match => ({
        result: match.score.winner === 'HOME_TEAM' ? 'W' : match.score.winner === 'AWAY_TEAM' ? 'L' : 'D',
        goalsFor: match.homeTeam.id === teamId ? match.score.fullTime.home : match.score.fullTime.away,
        goalsAgainst: match.homeTeam.id === teamId ? match.score.fullTime.away : match.score.fullTime.home,
    }));
}

// Fetch today's matches and display predictions
async function fetchAndDisplayMatches() {
    const response = await fetch(
        `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${today}`,
        { headers: { "X-Auth-Token": apiToken } }
    );
    const data = await response.json();

    const matchesContainer = document.getElementById("matchesContainer");
    matchesContainer.innerHTML = ""; // Clear previous content

    for (const match of data.matches) {
        const homeTeamId = match.homeTeam.id;
        const awayTeamId = match.awayTeam.id;

        const homeTeamMatches = await getLastFiveMatches(homeTeamId);
        const awayTeamMatches = await getLastFiveMatches(awayTeamId);

        const { homeProb, awayProb, predictedWinner } = calculateProbabilities(homeTeamMatches, awayTeamMatches);

        const matchElement = document.createElement("div");
        matchElement.classList.add("match");

        matchElement.innerHTML = `
            <div class="match-header">
                <h5>${match.homeTeam.name} vs ${match.awayTeam.name}</h5>
                <p><strong>Prediction:</strong> ${predictedWinner} wins</p>
            </div>
            <div class="match-info">
                <p>Home Team Probability: ${homeProb}%</p>
                <p>Away Team Probability: ${awayProb}%</p>
            </div>
        `;
        
        matchesContainer.appendChild(matchElement);
    }
}

// Fetch matches when the page loads
window.onload = fetchAndDisplayMatches;

// Chat functionality (simulating chat)
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (message === '') return;

    // Add the sent message to chat
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message');
    messageDiv.innerHTML = `<div class="message sent">${message}</div>`;
    chatBox.appendChild(messageDiv);

    // Scroll to the bottom
    chatBox.scrollTop = chatBox.scrollHeight;

    // Clear the input field
    input.value = '';

    // Simulate a response after 1 second
    setTimeout(() => {
        const responseDiv = document.createElement('div');
        responseDiv.classList.add('chat-message');
        responseDiv.innerHTML = `<div class="message">Thanks for reaching out! How can I assist you?</div>`;
        chatBox.appendChild(responseDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 1000);
}