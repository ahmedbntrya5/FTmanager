function createMatch(tournamentId, seasonId, homeTeamId, awayTeamId, matchType, round, groupId, stage) {
  const match = {
    id: generateId(),
    tournamentId,
    seasonId,
    homeTeamId,
    awayTeamId,
    matchType,
    round:   round   || null,
    groupId: groupId || null,
    stage:   stage   || null,
    date:    '',
    time:    '',
    stadium: '',
    played:    false,
    homeScore: 0,
    awayScore: 0,
    events:    []
  };
  appData.matches.push(match);
  saveData();
  return match;
}

function getMatch(id) {
  const m = appData.matches.find(m => m.id === id) || null;
  if (!m) console.error('getMatch: not found:', id);
  return m;
}

function updateMatch(id, updates) {
  const idx = appData.matches.findIndex(m => m.id === id);
  if (idx !== -1) {
    appData.matches[idx] = { ...appData.matches[idx], ...updates };
    saveData();
    return appData.matches[idx];
  }
  console.error('updateMatch: not found:', id);
  return null;
}

function addMatchEvent(matchId, event) {
  const match = appData.matches.find(m => m.id === matchId);
  if (!match) { console.error('addMatchEvent: match not found:', matchId); return null; }

  /* Validate minute: must be 0–130 */
  if (event.minute !== undefined && event.minute !== null && event.minute !== '') {
    const min = parseInt(event.minute, 10);
    if (isNaN(min) || min < 0 || min > 130) {
      console.error('addMatchEvent: minute out of range (0-130):', event.minute);
      return { error: 'Match minute must be between 0 and 130.' };
    }
    event = { ...event, minute: min };
  }

  const ev = { ...event, id: generateId() };
  match.events.push(ev);

  const tId = match.tournamentId;
  const sId = match.seasonId;

  if (ev.type === 'goal' || ev.type === 'penalty') {
    if (ev.playerId) incrementPlayerStat(ev.playerId, tId, sId, 'goals', 1);
    if (ev.assistId) incrementPlayerStat(ev.assistId, tId, sId, 'assists', 1);
    if (ev.teamId === match.homeTeamId) match.homeScore++;
    else match.awayScore++;
  } else if (ev.type === 'ownGoal') {
    if (ev.teamId === match.homeTeamId) match.awayScore++;
    else match.homeScore++;
  } else if (ev.type === 'yellow') {
    if (ev.playerId) incrementPlayerStat(ev.playerId, tId, sId, 'yellowCards', 1);
  } else if (ev.type === 'red') {
    if (ev.playerId) incrementPlayerStat(ev.playerId, tId, sId, 'redCards', 1);
  }

  saveData();
  return ev;
}

function removeMatchEvent(matchId, eventId) {
  const match = appData.matches.find(m => m.id === matchId);
  if (!match) { console.error('removeMatchEvent: match not found:', matchId); return; }
  const ev = match.events.find(e => e.id === eventId);
  if (!ev) return;

  const tId = match.tournamentId;
  const sId = match.seasonId;

  if (ev.type === 'goal' || ev.type === 'penalty') {
    if (ev.playerId) decrementPlayerStat(ev.playerId, tId, sId, 'goals', 1);
    if (ev.assistId) decrementPlayerStat(ev.assistId, tId, sId, 'assists', 1);
    if (ev.teamId === match.homeTeamId) match.homeScore = Math.max(0, match.homeScore - 1);
    else match.awayScore = Math.max(0, match.awayScore - 1);
  } else if (ev.type === 'ownGoal') {
    if (ev.teamId === match.homeTeamId) match.awayScore = Math.max(0, match.awayScore - 1);
    else match.homeScore = Math.max(0, match.homeScore - 1);
  } else if (ev.type === 'yellow') {
    if (ev.playerId) decrementPlayerStat(ev.playerId, tId, sId, 'yellowCards', 1);
  } else if (ev.type === 'red') {
    if (ev.playerId) decrementPlayerStat(ev.playerId, tId, sId, 'redCards', 1);
  }

  match.events = match.events.filter(e => e.id !== eventId);
  saveData();
}

function setMatchScore(matchId, homeScore, awayScore) {
  const match = appData.matches.find(m => m.id === matchId);
  if (!match) { console.error('setMatchScore: match not found:', matchId); return; }
  match.homeScore = parseInt(homeScore) || 0;
  match.awayScore = parseInt(awayScore) || 0;
  match.played    = true;
  saveData();
  return match;
}

function finalizeMatch(matchId) {
  const match = appData.matches.find(m => m.id === matchId);
  if (!match) { console.error('finalizeMatch: match not found:', matchId); return; }
  match.played = true;

  const tId = match.tournamentId;
  const sId = match.seasonId;

  [match.homeTeamId, match.awayTeamId].forEach(teamId => {
    appData.players.filter(p => p.teamId === teamId).forEach(p => {
      const key = tId + '_' + sId;
      if (!p.seasonStats[key]) p.seasonStats[key] = { goals: 0, assists: 0, yellowCards: 0, redCards: 0, appearances: 0 };
      p.seasonStats[key].appearances  = (p.seasonStats[key].appearances  || 0) + 1;
      p.careerStats.appearances       = (p.careerStats.appearances       || 0) + 1;
    });
  });

  saveData();
  return match;
}

function getMatchesByTournamentSeason(tournamentId, seasonId) {
  return appData.matches.filter(m => m.tournamentId === tournamentId && m.seasonId === seasonId);
}

function getKnockoutAggregate(pair, legs) {
  if (legs === 1) {
    const m = appData.matches.find(m => m.id === pair.matchIds[0]);
    if (!m || !m.played) return null;
    return { team1Goals: m.homeScore, team2Goals: m.awayScore };
  }
  let t1 = 0, t2 = 0;
  pair.matchIds.forEach((mid, i) => {
    const m = appData.matches.find(m => m.id === mid);
    if (!m || !m.played) return;
    if (i === 0) { t1 += m.homeScore; t2 += m.awayScore; }
    else         { t2 += m.homeScore; t1 += m.awayScore; }
  });
  return { team1Goals: t1, team2Goals: t2 };
}
