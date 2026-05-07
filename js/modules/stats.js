function getLeagueStandings(tournamentId, seasonId) {
  const season = getSeason(tournamentId, seasonId);
  if (!season) return [];
  const matches = getMatchesByTournamentSeason(tournamentId, seasonId).filter(m => m.played);
  const teamIds = season.teamIds;
  const table   = {};

  teamIds.forEach(tid => {
    table[tid] = { teamId: tid, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, form: [] };
  });

  matches.forEach(m => {
    if (!table[m.homeTeamId] || !table[m.awayTeamId]) return;
    const h = table[m.homeTeamId];
    const a = table[m.awayTeamId];
    h.played++; a.played++;
    h.gf += m.homeScore; h.ga += m.awayScore;
    a.gf += m.awayScore; a.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      h.won++;  h.points += season.pointsWin  || 3;
      a.lost++; a.points += season.pointsLoss || 0;
      h.form.push('W'); a.form.push('L');
    } else if (m.homeScore < m.awayScore) {
      a.won++;  a.points += season.pointsWin  || 3;
      h.lost++; h.points += season.pointsLoss || 0;
      a.form.push('W'); h.form.push('L');
    } else {
      h.drawn++; h.points += season.pointsDraw || 1;
      a.drawn++; a.points += season.pointsDraw || 1;
      h.form.push('D'); a.form.push('D');
    }
  });

  Object.values(table).forEach(row => {
    row.gd   = row.gf - row.ga;
    row.form = row.form.slice(-5);
  });

  /* Tie-breaker: Points → GD → GF */
  return Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd     !== a.gd)     return b.gd     - a.gd;
    return b.gf - a.gf;
  });
}

function getGroupStandings(tournamentId, seasonId, groupId) {
  const season = getSeason(tournamentId, seasonId);
  if (!season) return [];
  const group = season.groups.find(g => g.id === groupId);
  if (!group)  return [];

  const matches = group.matchIds.map(mid => appData.matches.find(m => m.id === mid)).filter(m => m && m.played);
  const table   = {};

  group.teamIds.forEach(tid => {
    table[tid] = { teamId: tid, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, form: [] };
  });

  matches.forEach(m => {
    if (!table[m.homeTeamId] || !table[m.awayTeamId]) return;
    const h = table[m.homeTeamId];
    const a = table[m.awayTeamId];
    h.played++; a.played++;
    h.gf += m.homeScore; h.ga += m.awayScore;
    a.gf += m.awayScore; a.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      h.won++;  h.points += season.pointsWin  || 3;
      a.lost++; a.points += season.pointsLoss || 0;
      h.form.push('W'); a.form.push('L');
    } else if (m.homeScore < m.awayScore) {
      a.won++;  a.points += season.pointsWin  || 3;
      h.lost++; h.points += season.pointsLoss || 0;
      a.form.push('W'); h.form.push('L');
    } else {
      h.drawn++; h.points += season.pointsDraw || 1;
      a.drawn++; a.points += season.pointsDraw || 1;
      h.form.push('D'); a.form.push('D');
    }
  });

  Object.values(table).forEach(row => { row.gd = row.gf - row.ga; row.form = row.form.slice(-5); });

  return Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd     !== a.gd)     return b.gd     - a.gd;
    return b.gf - a.gf;
  });
}

function getTopScorers(tournamentId, seasonId, limit) {
  const key = tournamentId + '_' + seasonId;
  return appData.players
    .filter(p => p.seasonStats && p.seasonStats[key] && p.seasonStats[key].goals > 0)
    .map(p => ({ player: p, stats: p.seasonStats[key] }))
    .sort((a, b) => b.stats.goals - a.stats.goals)
    .slice(0, limit || 20);
}

function getTopAssists(tournamentId, seasonId, limit) {
  const key = tournamentId + '_' + seasonId;
  return appData.players
    .filter(p => p.seasonStats && p.seasonStats[key] && p.seasonStats[key].assists > 0)
    .map(p => ({ player: p, stats: p.seasonStats[key] }))
    .sort((a, b) => b.stats.assists - a.stats.assists)
    .slice(0, limit || 20);
}

function getTopContributions(tournamentId, seasonId, limit) {
  const key = tournamentId + '_' + seasonId;
  return appData.players
    .filter(p => p.seasonStats && p.seasonStats[key])
    .map(p => ({
      player: p,
      stats: p.seasonStats[key],
      contributions: (p.seasonStats[key].goals || 0) + (p.seasonStats[key].assists || 0)
    }))
    .filter(x => x.contributions > 0)
    .sort((a, b) => b.contributions - a.contributions)
    .slice(0, limit || 20);
}

function getYellowCards(tournamentId, seasonId, limit) {
  const key = tournamentId + '_' + seasonId;
  return appData.players
    .filter(p => p.seasonStats && p.seasonStats[key] && p.seasonStats[key].yellowCards > 0)
    .map(p => ({ player: p, stats: p.seasonStats[key] }))
    .sort((a, b) => b.stats.yellowCards - a.stats.yellowCards)
    .slice(0, limit || 20);
}

function getRedCards(tournamentId, seasonId, limit) {
  const key = tournamentId + '_' + seasonId;
  return appData.players
    .filter(p => p.seasonStats && p.seasonStats[key] && p.seasonStats[key].redCards > 0)
    .map(p => ({ player: p, stats: p.seasonStats[key] }))
    .sort((a, b) => b.stats.redCards - a.stats.redCards)
    .slice(0, limit || 20);
}

function getTeamAttackStats(tournamentId, seasonId) {
  const season = getSeason(tournamentId, seasonId);
  if (!season) return [];
  const matches = getMatchesByTournamentSeason(tournamentId, seasonId).filter(m => m.played);
  const stats   = {};

  season.teamIds.forEach(tid => {
    stats[tid] = { teamId: tid, goals: 0, matches: 0, goalsPerMatch: 0, conceded: 0, concededPerMatch: 0 };
  });

  matches.forEach(m => {
    if (stats[m.homeTeamId]) {
      stats[m.homeTeamId].goals    += m.homeScore;
      stats[m.homeTeamId].conceded += m.awayScore;
      stats[m.homeTeamId].matches++;
    }
    if (stats[m.awayTeamId]) {
      stats[m.awayTeamId].goals    += m.awayScore;
      stats[m.awayTeamId].conceded += m.homeScore;
      stats[m.awayTeamId].matches++;
    }
  });

  return Object.values(stats).map(s => {
    s.goalsPerMatch    = s.matches > 0 ? (s.goals    / s.matches).toFixed(2) : '0.00';
    s.concededPerMatch = s.matches > 0 ? (s.conceded / s.matches).toFixed(2) : '0.00';
    return s;
  }).sort((a, b) => b.goals - a.goals);
}

function getTeamCardStats(tournamentId, seasonId) {
  const season = getSeason(tournamentId, seasonId);
  if (!season) return [];
  const key = tournamentId + '_' + seasonId;

  const teamStats = {};
  season.teamIds.forEach(tid => {
    teamStats[tid] = { teamId: tid, yellowCards: 0, redCards: 0 };
  });

  appData.players.forEach(p => {
    if (!p.seasonStats || !p.seasonStats[key]) return;
    if (teamStats[p.teamId]) {
      teamStats[p.teamId].yellowCards += p.seasonStats[key].yellowCards || 0;
      teamStats[p.teamId].redCards    += p.seasonStats[key].redCards    || 0;
    }
  });

  return Object.values(teamStats).sort((a, b) => b.yellowCards - a.yellowCards);
}
