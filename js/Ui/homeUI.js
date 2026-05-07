function renderHome() {
  const view = document.getElementById('view-home');
  view.innerHTML = `
    <div class="home-header">
      <h1 class="home-title">⚽ Football Manager</h1>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button class="btn btn-primary btn-icon" id="btn-create-tournament">+ New Tournament</button>
        <button class="btn btn-secondary btn-sm" id="btn-promote-relegate" title="Swap top/bottom teams between two leagues">⇅ Promote / Relegate</button>
      </div>
    </div>
    <div class="tournaments-grid" id="tournaments-grid">
      ${renderTournamentCards()}
    </div>
    ${renderCreateTournamentModal()}
    ${renderSetupTeamsModal()}
    ${renderPromoteRelegateModal()}
  `;

  document.getElementById('btn-create-tournament').addEventListener('click', openCreateTournamentModal);
  document.getElementById('btn-promote-relegate').addEventListener('click', openPromoteRelegateModal);
  addHomeEventListeners();
}

function renderTournamentCards() {
  if (appData.tournaments.length === 0) {
    return `<div class="empty-state">
      <div class="empty-icon">🏆</div>
      <p>No tournaments yet. Click <strong>+ New Tournament</strong> to get started.</p>
    </div>`;
  }
  return appData.tournaments.map(t => {
    const currentSeason = t.seasons.find(s => s.id === t.currentSeasonId);
    const teamCount     = currentSeason ? currentSeason.teamIds.length : 0;
    const typeLabel     = { league: 'League', knockout: 'Knockout', groups_knockout: 'Groups + Knockout' }[t.type] || t.type;
    return `
      <div class="tournament-card" data-id="${t.id}">
        <div class="tournament-card-badge">${typeLabel}</div>
        <div class="tournament-card-title">${escapeHtml(t.name)}</div>
        <div class="tournament-card-meta">
          <span>${t.seasons.length} season${t.seasons.length !== 1 ? 's' : ''}</span>
          <span>${teamCount} team${teamCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="tournament-card-actions">
          <button class="btn btn-sm btn-primary btn-open-tournament" data-id="${t.id}">Open</button>
          <button class="btn btn-sm btn-danger btn-delete-tournament" data-id="${t.id}">Delete</button>
        </div>
      </div>`;
  }).join('');
}

function renderCreateTournamentModal() {
  const currentYear = new Date().getFullYear();
  return `
    <div class="modal-overlay" id="modal-create-tournament" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2>New Tournament</h2>
          <button class="modal-close" id="close-create-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Tournament Name</label>
            <input type="text" id="input-tournament-name" class="form-input" placeholder="e.g. Premier League">
          </div>
          <div class="form-group">
            <label>Type</label>
            <select id="input-tournament-type" class="form-input">
              <option value="league">League</option>
              <option value="knockout">Knockout</option>
              <option value="groups_knockout">Groups + Knockout</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Number of Teams (min 2)</label>
              <input type="number" id="input-num-teams" class="form-input" min="2" max="32" value="8">
            </div>
            <div class="form-group">
              <label>Season Name (e.g. year)</label>
              <input type="number" id="input-season-name" class="form-input" min="1900" max="2100" value="${currentYear}">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-create">Cancel</button>
          <button class="btn btn-primary" id="btn-confirm-create">Next: Set Up Teams</button>
        </div>
      </div>
    </div>`;
}

function renderSetupTeamsModal() {
  return `
    <div class="modal-overlay" id="modal-setup-teams" style="display:none">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2>Set Up Teams</h2>
          <button class="modal-close" id="close-setup-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-hint">Edit team names below. 11 players will be auto-generated per team.</p>
          <div id="teams-name-list" class="teams-name-list"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-back-setup">Back</button>
          <button class="btn btn-primary" id="btn-confirm-teams">Create Tournament</button>
        </div>
      </div>
    </div>`;
}

function renderPromoteRelegateModal() {
  const leagues = appData.tournaments.filter(t => t.type === 'league');
  const options  = leagues.map(t => {
    const s = t.seasons.find(s => s.id === t.currentSeasonId);
    return t.seasons.map(season =>
      `<option value="${t.id}|${season.id}">${escapeHtml(t.name)} — ${escapeHtml(season.name)}</option>`
    ).join('');
  }).join('');

  if (!options) {
    return `<div id="modal-promote-relegate" class="modal-overlay" style="display:none">
      <div class="modal"><div class="modal-header"><h2>Promote / Relegate</h2>
        <button class="modal-close" id="close-promote-modal">&times;</button></div>
        <div class="modal-body"><p class="empty-state">You need at least two league-type tournaments to use this feature.</p></div>
      </div></div>`;
  }

  return `
    <div class="modal-overlay" id="modal-promote-relegate" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2>⇅ Promote / Relegate</h2>
          <button class="modal-close" id="close-promote-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-hint">Swaps the bottom X teams of the higher league with the top X teams of the lower league based on current standings.</p>
          <div class="form-group">
            <label>Higher League (Season)</label>
            <select id="pr-higher" class="form-input">${options}</select>
          </div>
          <div class="form-group">
            <label>Lower League (Season)</label>
            <select id="pr-lower" class="form-input">${options}</select>
          </div>
          <div class="form-group">
            <label>Number of Teams to Swap</label>
            <input type="number" id="pr-count" class="form-input" min="1" max="4" value="2">
          </div>
          <div id="pr-result" class="modal-hint" style="display:none;margin-top:8px;"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-promote">Cancel</button>
          <button class="btn btn-primary" id="btn-confirm-promote">Execute Swap</button>
        </div>
      </div>
    </div>`;
}

function openCreateTournamentModal() {
  document.getElementById('modal-create-tournament').style.display = 'flex';
}

function closeCreateTournamentModal() {
  document.getElementById('modal-create-tournament').style.display = 'none';
}

function openPromoteRelegateModal() {
  document.getElementById('modal-promote-relegate').style.display = 'flex';
}

function openSetupTeamsModal(names) {
  document.getElementById('modal-create-tournament').style.display = 'none';
  const list = document.getElementById('teams-name-list');
  list.innerHTML = names.map((name, i) => `
    <div class="team-name-item">
      <span class="team-number">${i + 1}.</span>
      <input type="text" class="form-input team-name-input" value="${escapeHtml(name)}" data-index="${i}">
    </div>
  `).join('');
  document.getElementById('modal-setup-teams').style.display = 'flex';
}

function addHomeEventListeners() {
  document.getElementById('close-create-modal').addEventListener('click', closeCreateTournamentModal);
  document.getElementById('btn-cancel-create').addEventListener('click', closeCreateTournamentModal);
  document.getElementById('close-setup-modal').addEventListener('click', () => {
    document.getElementById('modal-setup-teams').style.display = 'none';
  });
  document.getElementById('btn-back-setup').addEventListener('click', () => {
    document.getElementById('modal-setup-teams').style.display = 'none';
    document.getElementById('modal-create-tournament').style.display = 'flex';
  });

  document.getElementById('btn-confirm-create').addEventListener('click', () => {
    const name       = document.getElementById('input-tournament-name').value.trim();
    const type       = document.getElementById('input-tournament-type').value;
    const num        = parseInt(document.getElementById('input-num-teams').value) || 2;
    const seasonName = document.getElementById('input-season-name').value.trim() || String(new Date().getFullYear());

    if (!name) { showToast('Please enter a tournament name', 'error'); return; }
    if (num < 2) { showToast('Minimum 2 teams required', 'error'); return; }

    const defaultNames = [
      'Eagles FC','Lions United','Panthers City','Tigers FC',
      'Wolves Athletic','Bears United','Falcons FC','Sharks SC',
      'Dragons FC','Vipers United','Storm FC','Thunder SC',
      'Blazers FC','Cobras United','Phoenix FC','Rangers SC',
      'Rebels FC','Knights United','Warriors FC','Spartans SC',
      'Storm City','Thunder Bay','Blaze FC','Iron FC',
      'Silver FC','Gold United','Steel City','Prime FC',
      'Royal FC','Crown United','Summit FC','Peak SC'
    ];
    const names = Array.from({ length: num }, (_, i) => defaultNames[i] || 'Team ' + (i + 1));
    window._pendingTournament = { name, type, num, seasonName };
    openSetupTeamsModal(names);
  });

  document.getElementById('btn-confirm-teams').addEventListener('click', () => {
    const inputs = document.querySelectorAll('.team-name-input');
    const rawNames = Array.from(inputs).map(i => i.value.trim() || 'Team');

    /* Validate duplicate team names (case-insensitive) */
    const seen = new Set();
    for (const n of rawNames) {
      const key = n.toLowerCase();
      if (seen.has(key)) { showToast('Duplicate team name: "' + n + '"', 'error'); return; }
      seen.add(key);
    }
    /* Validate no empty names */
    if (rawNames.some(n => !n)) { showToast('All team names must be filled in', 'error'); return; }

    const { name, type, num, seasonName } = window._pendingTournament;
    const tournament = createTournament(name, type, num, seasonName);
    if (!tournament) { showToast('Failed to create tournament', 'error'); return; }
    const season = tournament.seasons[0];

    const teams = rawNames.map(tname => createTeam(tname, tournament.id, season.id)).filter(t => t && !t.error);
    season.teamIds = teams.map(t => t.id);
    saveData();

    teams.forEach((team, index) => generateDefaultPlayers(team, index));

    document.getElementById('modal-setup-teams').style.display = 'none';
    showToast('Tournament created with ' + teams.length + ' teams!', 'success');
    navigate('tournament', { tournamentId: tournament.id, seasonId: season.id });
  });

  document.querySelectorAll('.btn-open-tournament').forEach(btn => {
    btn.addEventListener('click', e => {
      const tid = e.target.dataset.id;
      const t   = getTournament(tid);
      if (!t) { showToast('Tournament not found', 'error'); return; }
      navigate('tournament', { tournamentId: tid, seasonId: t.currentSeasonId });
    });
  });

  document.querySelectorAll('.btn-delete-tournament').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const tid = e.target.dataset.id;
      showConfirmModal('Delete this tournament?', 'All seasons, teams, players and matches will be permanently deleted.', () => {
        const t = getTournament(tid);
        if (t) {
          t.seasons.forEach(s => {
            s.teamIds.forEach(teamId => {
              appData.players = appData.players.filter(p => p.teamId !== teamId);
            });
          });
          const allTeamIds = t.seasons.flatMap(s => s.teamIds);
          appData.teams   = appData.teams.filter(tm => !allTeamIds.includes(tm.id));
          appData.matches = appData.matches.filter(m => m.tournamentId !== tid);
          deleteTournament(tid);
        }
        navigate('home');
      });
    });
  });

  /* Promote / Relegate modal */
  const closePromote = document.getElementById('close-promote-modal');
  const cancelPromote = document.getElementById('btn-cancel-promote');
  const confirmPromote = document.getElementById('btn-confirm-promote');
  if (closePromote)   closePromote.addEventListener('click',  () => document.getElementById('modal-promote-relegate').style.display = 'none');
  if (cancelPromote)  cancelPromote.addEventListener('click', () => document.getElementById('modal-promote-relegate').style.display = 'none');
  if (confirmPromote) confirmPromote.addEventListener('click', () => {
    const higherVal = document.getElementById('pr-higher').value.split('|');
    const lowerVal  = document.getElementById('pr-lower').value.split('|');
    const count     = parseInt(document.getElementById('pr-count').value) || 1;
    const resultEl  = document.getElementById('pr-result');

    if (higherVal.join('|') === lowerVal.join('|')) {
      showToast('Higher and lower leagues must be different', 'error'); return;
    }
    const res = promoteRelegateTeams(higherVal[0], higherVal[1], lowerVal[0], lowerVal[1], count);
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    const promotedNames  = res.promoted.map(id  => { const t = getTeam(id); return t ? t.name : id; });
    const relegatedNames = res.relegated.map(id => { const t = getTeam(id); return t ? t.name : id; });
    resultEl.innerHTML = `<strong>Promoted ↑:</strong> ${promotedNames.join(', ')}<br><strong>Relegated ↓:</strong> ${relegatedNames.join(', ')}`;
    resultEl.style.display = 'block';
    saveData();
    showToast('Promotion/Relegation applied!', 'success');
    setTimeout(() => {
      document.getElementById('modal-promote-relegate').style.display = 'none';
      navigate('home');
    }, 2000);
  });
}
