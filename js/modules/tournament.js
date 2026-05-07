/* ── Collision-resistant ID generator ── */
let _idCounter = 0;
function generateId() {
  _idCounter++;
  return 't' + Date.now().toString(36) + '_' + _idCounter.toString(36);
}

/* ── Tournament CRUD ── */
function createTournament(name, type, numTeams, seasonName) {
  if (!name || !name.trim()) {
    console.error('createTournament: name cannot be empty');
    return null;
  }
  const id       = generateId();
  const seasonId = generateId();
  const tournament = {
    id,
    name: name.trim(),
    type,
    numTeams,
    seasons: [
      {
        id: seasonId,
        name: seasonName || String(new Date().getFullYear()),
        number: 1,
        teamIds: [],
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
        groups: [],
        rounds: [],
        bracketLegs: 1,
        currentRound: 1,
        status: 'active'
      }
    ],
    currentSeasonId: seasonId
  };
  appData.tournaments.push(tournament);
  saveData();
  return tournament;
}

function getTournament(id) {
  const t = appData.tournaments.find(t => t.id === id) || null;
  if (!t) console.error('getTournament: not found:', id);
  return t;
}

function updateTournament(id, updates) {
  const idx = appData.tournaments.findIndex(t => t.id === id);
  if (idx !== -1) {
    appData.tournaments[idx] = { ...appData.tournaments[idx], ...updates };
    saveData();
    return appData.tournaments[idx];
  }
  console.error('updateTournament: not found:', id);
  return null;
}

function deleteTournament(id) {
  appData.tournaments = appData.tournaments.filter(t => t.id !== id);
  saveData();
}

/* ── Season CRUD ── */
function addSeason(tournamentId, seasonName) {
  const t = getTournament(tournamentId);
  if (!t) return null;
  const num      = t.seasons.length + 1;
  const seasonId = generateId();
  const season = {
    id: seasonId,
    name: seasonName || String(new Date().getFullYear() + t.seasons.length),
    number: num,
    teamIds: [],
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    groups: [],
    rounds: [],
    bracketLegs: 1,
    currentRound: 1,
    status: 'active'
  };
  t.seasons.push(season);
  t.currentSeasonId = seasonId;
  saveData();
  return season;
}

function deleteSeason(tournamentId, seasonId) {
  const t = getTournament(tournamentId);
  if (!t || t.seasons.length <= 1) return false;
  const season = t.seasons.find(s => s.id === seasonId);
  if (!season) return false;

  season.teamIds.forEach(teamId => {
    appData.players = appData.players.filter(p => p.teamId !== teamId);
  });
  appData.teams   = appData.teams.filter(tm => !season.teamIds.includes(tm.id));
  appData.matches = appData.matches.filter(m => !(m.tournamentId === tournamentId && m.seasonId === seasonId));
  t.seasons       = t.seasons.filter(s => s.id !== seasonId);
  t.currentSeasonId = t.seasons[t.seasons.length - 1].id;
  saveData();
  return true;
}

function getSeason(tournamentId, seasonId) {
  const t = getTournament(tournamentId);
  if (!t) return null;
  const s = t.seasons.find(s => s.id === seasonId) || null;
  if (!s) console.error('getSeason: not found:', seasonId, 'in tournament:', tournamentId);
  return s;
}

function updateSeason(tournamentId, seasonId, updates) {
  const t = getTournament(tournamentId);
  if (!t) return null;
  const idx = t.seasons.findIndex(s => s.id === seasonId);
  if (idx !== -1) {
    t.seasons[idx] = { ...t.seasons[idx], ...updates };
    saveData();
    return t.seasons[idx];
  }
  console.error('updateSeason: not found:', seasonId);
  return null;
}

/* ── Duplicate / fixture checks ── */
function matchExistsInSeason(tournamentId, seasonId, homeTeamId, awayTeamId) {
  return appData.matches.some(m =>
    m.tournamentId === tournamentId &&
    m.seasonId     === seasonId &&
    m.homeTeamId   === homeTeamId &&
    m.awayTeamId   === awayTeamId
  );
}

function bothFixturesExist(tournamentId, seasonId, teamA, teamB) {
  return matchExistsInSeason(tournamentId, seasonId, teamA, teamB) &&
         matchExistsInSeason(tournamentId, seasonId, teamB, teamA);
}

function getRemainingPairs(tournamentId, seasonId) {
  const season = getSeason(tournamentId, seasonId);
  if (!season) return [];
  const teams = season.teamIds;
  const remaining = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      if (!matchExistsInSeason(tournamentId, seasonId, teams[i], teams[j])) {
        remaining.push([teams[i], teams[j]]);
      }
    }
  }
  return remaining;
}

function getRemainingSecondLegPairs(tournamentId, seasonId) {
  const season = getSeason(tournamentId, seasonId);
  if (!season) return [];
  const teams = season.teamIds;
  const remaining = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const firstLeg   = matchExistsInSeason(tournamentId, seasonId, teams[i], teams[j]) ||
                         matchExistsInSeason(tournamentId, seasonId, teams[j], teams[i]);
      const secondLegAB = matchExistsInSeason(tournamentId, seasonId, teams[i], teams[j]) &&
                          matchExistsInSeason(tournamentId, seasonId, teams[j], teams[i]);
      if (firstLeg && !secondLegAB) {
        if (!matchExistsInSeason(tournamentId, seasonId, teams[j], teams[i])) {
          remaining.push([teams[j], teams[i]]);
        } else if (!matchExistsInSeason(tournamentId, seasonId, teams[i], teams[j])) {
          remaining.push([teams[i], teams[j]]);
        }
      }
    }
  }
  return remaining;
}

/* ── League round generation ── */
function getNextRoundNumber(tournamentId, seasonId) {
  const matches = appData.matches.filter(m => m.tournamentId === tournamentId && m.seasonId === seasonId && m.round);
  if (matches.length === 0) return 1;
  return Math.max(...matches.map(m => m.round || 0)) + 1;
}

function generateLeagueNextRound(tournamentId, seasonId) {
  const season = getSeason(tournamentId, seasonId);
  if (!season) return { added: 0, error: 'Season not found' };

  const teams = season.teamIds;
  const n     = teams.length;
  if (n < 2) return { added: 0, error: 'Need at least 2 teams' };

  const existingRounds = appData.matches
    .filter(m => m.tournamentId === tournamentId && m.seasonId === seasonId && m.round)
    .map(m => m.round);
  const maxRound  = existingRounds.length ? Math.max(...existingRounds) : 0;
  const nextRound = maxRound + 1;

  const n_effective        = n % 2 === 0 ? n : n + 1;
  const totalFirstLegRounds = n_effective - 1;
  const totalRounds         = totalFirstLegRounds * 2;

  if (nextRound > totalRounds) {
    return { added: 0, error: 'All rounds already generated (both legs complete)' };
  }

  let teamList = teams.slice();
  if (teamList.length % 2 !== 0) teamList.push('BYE');
  const total = teamList.length;
  const half  = total / 2;

  const isSecondLeg = nextRound > totalFirstLegRounds;
  const legRound    = isSecondLeg ? nextRound - totalFirstLegRounds : nextRound;

  let rotatedList = teamList.slice();
  const fixed     = rotatedList[0];
  const rotating  = rotatedList.slice(1);
  for (let r = 1; r < legRound; r++) rotating.unshift(rotating.pop());
  rotatedList = [fixed, ...rotating];

  let added = 0;
  const roundMatchIds = [];
  for (let i = 0; i < half; i++) {
    let home = rotatedList[i];
    let away = rotatedList[total - 1 - i];
    if (home === 'BYE' || away === 'BYE') continue;
    if (isSecondLeg) { const tmp = home; home = away; away = tmp; }
    if (matchExistsInSeason(tournamentId, seasonId, home, away)) continue;
    const match = createMatch(tournamentId, seasonId, home, away, 'league', nextRound, null, null);
    roundMatchIds.push(match.id);
    added++;
  }

  if (added > 0) {
    if (!season.rounds) season.rounds = [];
    season.rounds.push({ number: nextRound, matchIds: roundMatchIds });
    season.currentRound = nextRound;
    saveData();
  }
  return { added, round: nextRound };
}

function generateLeagueNRounds(tournamentId, seasonId, numRounds) {
  let totalAdded = 0;
  for (let i = 0; i < numRounds; i++) {
    const result = generateLeagueNextRound(tournamentId, seasonId);
    if (result.added === 0) break;
    totalAdded += result.added;
  }
  return totalAdded;
}

function generateLeagueAllRemaining(tournamentId, seasonId) {
  const s = getSeason(tournamentId, seasonId);
  if (!s) return 0;
  const n           = s.teamIds.length % 2 === 0 ? s.teamIds.length : s.teamIds.length + 1;
  const totalRounds = (n - 1) * 2;
  return generateLeagueNRounds(tournamentId, seasonId, totalRounds);
}

/* ── Groups & Knockout ── */
function generateGroups(tournamentId, seasonId, numGroups) {
  const t = getTournament(tournamentId);
  if (!t) return;
  const season = getSeason(tournamentId, seasonId);
  if (!season) return;
  const teams  = season.teamIds.slice();
  const groups = [];

  for (let g = 0; g < numGroups; g++) {
    const label = String.fromCharCode(65 + g);
    groups.push({ id: generateId(), label, teamIds: [], matchIds: [] });
  }
  teams.forEach((tid, i) => groups[i % numGroups].teamIds.push(tid));
  groups.forEach(group => {
    const gteams = group.teamIds;
    for (let i = 0; i < gteams.length; i++) {
      for (let j = i + 1; j < gteams.length; j++) {
        if (matchExistsInSeason(tournamentId, seasonId, gteams[i], gteams[j])) continue;
        const match = createMatch(tournamentId, seasonId, gteams[i], gteams[j], 'group', 1, group.id, null);
        group.matchIds.push(match.id);
      }
    }
  });
  season.groups = groups;
  saveData();
}

function generateKnockoutBracket(tournamentId, seasonId, teamIds, stageName, legs) {
  const season = getSeason(tournamentId, seasonId);
  if (!season) return;
  const pairs    = [];
  const shuffled = teamIds.slice();

  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      const match1   = createMatch(tournamentId, seasonId, shuffled[i], shuffled[i + 1], 'knockout', null, null, stageName);
      const matchIds = [match1.id];
      if (legs === 2) {
        const match2 = createMatch(tournamentId, seasonId, shuffled[i + 1], shuffled[i], 'knockout', null, null, stageName + ' (2nd leg)');
        matchIds.push(match2.id);
      }
      pairs.push({ team1: shuffled[i], team2: shuffled[i + 1], matchIds });
    }
  }

  if (!season.bracket) season.bracket = { stages: [] };
  season.bracket.stages.push({ name: stageName, pairs, legs });
  saveData();
  return pairs;
}

function addManualMatch(tournamentId, seasonId, homeTeamId, awayTeamId, matchType, round, groupId, stage) {
  if (matchExistsInSeason(tournamentId, seasonId, homeTeamId, awayTeamId)) {
    return { error: 'This fixture already exists in the current season.' };
  }
  const match = createMatch(tournamentId, seasonId, homeTeamId, awayTeamId, matchType, round || null, groupId || null, stage || null);
  if (matchType === 'league' && round) {
    const season = getSeason(tournamentId, seasonId);
    if (season) {
      if (!season.rounds) season.rounds = [];
      let r = season.rounds.find(r => r.number === round);
      if (!r) { r = { number: round, matchIds: [] }; season.rounds.push(r); }
      r.matchIds.push(match.id);
      saveData();
    }
  }
  return { match };
}

/* ── Promotion / Relegation ── */
/**
 * Swap the bottom `count` teams of the higher league with the
 * top `count` teams of the lower league.
 * Both seasons must belong to league-type tournaments.
 * Returns { promoted: [teamIds], relegated: [teamIds] } or { error }
 */
function promoteRelegateTeams(higherTId, higherSId, lowerTId, lowerSId, count) {
  const higherSeason = getSeason(higherTId, higherSId);
  const lowerSeason  = getSeason(lowerTId,  lowerSId);
  if (!higherSeason || !lowerSeason) {
    return { error: 'One or both seasons not found' };
  }
  if (!Number.isInteger(count) || count < 1) {
    return { error: 'count must be a positive integer' };
  }

  const higherStandings = getLeagueStandings(higherTId, higherSId);
  const lowerStandings  = getLeagueStandings(lowerTId,  lowerSId);

  if (higherStandings.length < count || lowerStandings.length < count) {
    return { error: 'Not enough teams for the requested swap count' };
  }

  const relegated = higherStandings.slice(-count).map(r => r.teamId);
  const promoted  = lowerStandings.slice(0, count).map(r => r.teamId);

  higherSeason.teamIds = higherSeason.teamIds.filter(id => !relegated.includes(id));
  higherSeason.teamIds.push(...promoted);

  lowerSeason.teamIds  = lowerSeason.teamIds.filter(id => !promoted.includes(id));
  lowerSeason.teamIds.push(...relegated);

  promoted.forEach(tid => {
    const team = getTeam(tid);
    if (team) { team.tournamentId = higherTId; team.seasonId = higherSId; }
  });
  relegated.forEach(tid => {
    const team = getTeam(tid);
    if (team) { team.tournamentId = lowerTId; team.seasonId = lowerSId; }
  });

  saveData();
  return { promoted, relegated };
}
