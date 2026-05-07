const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CM', 'CDM', 'RM', 'LM', 'CAM', 'CF', 'RW', 'LW'];
const POSITION_GROUPS = {
  GK:  'Goalkeepers',
  CB:  'Defenders',  LB: 'Defenders',  RB: 'Defenders',
  CM:  'Midfielders', CDM: 'Midfielders', RM: 'Midfielders', LM: 'Midfielders', CAM: 'Midfielders',
  CF:  'Attackers',  RW: 'Attackers',  LW: 'Attackers'
};

function createPlayer(data) {
  if (!data.name || !data.name.trim()) {
    console.error('createPlayer: name cannot be empty');
    return null;
  }

  const player = {
    id:          generateId(),
    name:        data.name.trim(),
    number:      data.number  || 0,
    position:    data.position || 'CM',
    birthDate:   data.birthDate   || '',
    nationality: data.nationality || '',
    teamId:      data.teamId || null,
    role:        data.role   || 'player',
    history:     [],
    seasonStats: {},
    careerStats: { goals: 0, assists: 0, yellowCards: 0, redCards: 0, appearances: 0 }
  };

  /* Push to global array FIRST — prevents corrupted state if team link fails */
  appData.players.push(player);

  if (player.teamId) {
    const team = appData.teams.find(t => t.id === player.teamId);
    if (team) {
      team.playerIds.push(player.id);
    } else {
      console.error('createPlayer: teamId not found:', player.teamId);
    }
  }

  saveData();
  return player;
}

function getPlayer(id) {
  const p = appData.players.find(p => p.id === id) || null;
  if (!p) console.error('getPlayer: not found:', id);
  return p;
}

function updatePlayer(id, updates) {
  const idx = appData.players.findIndex(p => p.id === id);
  if (idx !== -1) {
    appData.players[idx] = { ...appData.players[idx], ...updates };
    saveData();
    return appData.players[idx];
  }
  console.error('updatePlayer: not found:', id);
  return null;
}

function deletePlayer(id) {
  if (!confirm('Delete this player? This cannot be undone.')) return false;

  const player = appData.players.find(p => p.id === id);
  if (player && player.teamId) {
    const team = appData.teams.find(t => t.id === player.teamId);
    if (team) team.playerIds = team.playerIds.filter(pid => pid !== id);
  }
  appData.players = appData.players.filter(p => p.id !== id);
  saveData();
  return true;
}

function transferPlayer(playerId, newTeamId) {
  const player = getPlayer(playerId);
  if (!player) return null;

  if (player.teamId) {
    const oldTeam = appData.teams.find(t => t.id === player.teamId);
    if (oldTeam) {
      oldTeam.playerIds = oldTeam.playerIds.filter(pid => pid !== playerId);
      player.history.push({ teamId: player.teamId, teamName: oldTeam.name });
    }
  }

  const newTeam = appData.teams.find(t => t.id === newTeamId);
  if (newTeam) newTeam.playerIds.push(playerId);

  player.teamId = newTeamId;
  saveData();
  return player;
}

function getPlayerAge(birthDate) {
  if (!birthDate) return '-';
  const birth = new Date(birthDate);
  const now   = new Date();
  let age     = now.getFullYear() - birth.getFullYear();
  const m     = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function getPlayerSeasonStats(playerId, tournamentId, seasonId) {
  const key    = tournamentId + '_' + seasonId;
  const player = appData.players.find(p => p.id === playerId);
  if (!player) return { goals: 0, assists: 0, yellowCards: 0, redCards: 0, appearances: 0 };
  return player.seasonStats[key] || { goals: 0, assists: 0, yellowCards: 0, redCards: 0, appearances: 0 };
}

function incrementPlayerStat(playerId, tournamentId, seasonId, stat, value) {
  const player = appData.players.find(p => p.id === playerId);
  if (!player) { console.error('incrementPlayerStat: player not found:', playerId); return; }
  const key = tournamentId + '_' + seasonId;
  if (!player.seasonStats[key]) {
    player.seasonStats[key] = { goals: 0, assists: 0, yellowCards: 0, redCards: 0, appearances: 0 };
  }
  player.seasonStats[key][stat]  = (player.seasonStats[key][stat]  || 0) + (value || 1);
  player.careerStats[stat]       = (player.careerStats[stat]       || 0) + (value || 1);
  saveData();
}

function decrementPlayerStat(playerId, tournamentId, seasonId, stat, value) {
  const player = appData.players.find(p => p.id === playerId);
  if (!player) { console.error('decrementPlayerStat: player not found:', playerId); return; }
  const key = tournamentId + '_' + seasonId;
  if (!player.seasonStats[key]) return;
  player.seasonStats[key][stat] = Math.max(0, (player.seasonStats[key][stat] || 0) - (value || 1));
  player.careerStats[stat]      = Math.max(0, (player.careerStats[stat]      || 0) - (value || 1));
  saveData();
}
