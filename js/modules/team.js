function createTeam(name, tournamentId, seasonId) {
  if (!name || !name.trim()) {
    console.error('createTeam: name cannot be empty');
    return null;
  }
  const trimmed = name.trim();

  const season = getSeason(tournamentId, seasonId);
  if (season) {
    const duplicate = season.teamIds.some(tid => {
      const t = getTeam(tid);
      return t && t.name.trim().toLowerCase() === trimmed.toLowerCase();
    });
    if (duplicate) {
      console.error('createTeam: duplicate team name:', trimmed);
      return { error: 'A team named "' + trimmed + '" already exists in this season.' };
    }
  }

  const team = {
    id: generateId(),
    name: trimmed,
    tournamentId,
    seasonId,
    shortName: trimmed.substring(0, 3).toUpperCase(),
    stadium: '',
    color: '#ffffff',
    coachId: null,
    playerIds: []
  };
  appData.teams.push(team);
  saveData();
  return team;
}

function getTeam(id) {
  const t = appData.teams.find(t => t.id === id) || null;
  if (!t) console.error('getTeam: not found:', id);
  return t;
}

function updateTeam(id, updates) {
  const idx = appData.teams.findIndex(t => t.id === id);
  if (idx !== -1) {
    appData.teams[idx] = { ...appData.teams[idx], ...updates };
    saveData();
    return appData.teams[idx];
  }
  console.error('updateTeam: not found:', id);
  return null;
}

function deleteTeam(id) {
  if (!confirm('Delete this team? All associated players and matches will also be removed.')) return false;

  appData.players = appData.players.filter(p => p.teamId !== id);
  appData.matches = appData.matches.filter(m => m.homeTeamId !== id && m.awayTeamId !== id);
  appData.teams   = appData.teams.filter(t => t.id !== id);

  appData.tournaments.forEach(t => {
    t.seasons.forEach(s => {
      s.teamIds = s.teamIds.filter(tid => tid !== id);
      if (s.groups) {
        s.groups.forEach(g => {
          g.teamIds  = (g.teamIds  || []).filter(tid => tid !== id);
          g.matchIds = (g.matchIds || []).filter(mid => getMatch(mid) !== null);
        });
      }
    });
  });

  saveData();
  return true;
}

function getTeamsByTournamentSeason(tournamentId, seasonId) {
  return appData.teams.filter(t => t.tournamentId === tournamentId && t.seasonId === seasonId);
}

function getTeamPlayers(teamId) {
  return appData.players.filter(p => p.teamId === teamId);
}

function getTeamMatches(teamId, tournamentId, seasonId) {
  return appData.matches.filter(m =>
    m.tournamentId === tournamentId &&
    m.seasonId     === seasonId &&
    (m.homeTeamId  === teamId || m.awayTeamId === teamId)
  );
}

function getTeamLast5(teamId, tournamentId, seasonId) {
  const matches = getTeamMatches(teamId, tournamentId, seasonId)
    .filter(m => m.played)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 5);

  return matches.map(m => {
    const isHome   = m.homeTeamId === teamId;
    const teamScore = isHome ? m.homeScore : m.awayScore;
    const oppScore  = isHome ? m.awayScore : m.homeScore;
    const oppTeam   = getTeam(isHome ? m.awayTeamId : m.homeTeamId);
    let result;
    if (teamScore > oppScore)      result = 'W';
    else if (teamScore < oppScore) result = 'L';
    else                           result = 'D';
    return { result, teamScore, oppScore, opponent: oppTeam ? oppTeam.name : '?', matchId: m.id, isHome };
  });
}

function generateDefaultTeams(count, tournamentId, seasonId) {
  const names = [
    'Eagles FC','Lions United','Panthers City','Tigers FC',
    'Wolves Athletic','Bears United','Falcons FC','Sharks SC',
    'Dragons FC','Vipers United','Storm FC','Thunder SC',
    'Blazers FC','Cobras United','Phoenix FC','Rangers SC',
    'Rebels FC','Knights United','Warriors FC','Spartans SC'
  ];
  const teams = [];
  for (let i = 0; i < count; i++) {
    const name = names[i] || 'Team ' + (i + 1);
    const team = createTeam(name, tournamentId, seasonId);
    if (team && !team.error) teams.push(team);
  }
  return teams;
}

function getTeamLetter(index) {
  if (index < 26) return String.fromCharCode(65 + index);
  return String.fromCharCode(65 + Math.floor(index / 26) - 1) + String.fromCharCode(65 + (index % 26));
}

function generateDefaultPlayers(team, teamIndex) {
  const letter      = getTeamLetter(teamIndex);
  const defaultSquad = [
    { number: 1,  position: 'GK'  },
    { number: 2,  position: 'RB'  },
    { number: 3,  position: 'CB'  },
    { number: 4,  position: 'CB'  },
    { number: 5,  position: 'LB'  },
    { number: 6,  position: 'CDM' },
    { number: 7,  position: 'RM'  },
    { number: 8,  position: 'CM'  },
    { number: 9,  position: 'LM'  },
    { number: 10, position: 'CAM' },
    { number: 11, position: 'CF'  }
  ];
  defaultSquad.forEach((p, i) => {
    createPlayer({
      name:      'p' + letter + (i + 1),
      number:    p.number,
      position:  p.position,
      role:      'player',
      teamId:    team.id,
      nationality: '',
      birthDate:   ''
    });
  });
}
