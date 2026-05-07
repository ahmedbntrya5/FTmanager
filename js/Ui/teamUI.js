function renderTeam(teamId, tournamentId, seasonId) {
  const team = getTeam(teamId);
  if (!team) { navigate('home'); return; }
  const t = getTournament(tournamentId);
  const season = getSeason(tournamentId, seasonId);

  const view = document.getElementById('view-team');
  view.innerHTML = `
    <div class="page-header">
      <button class="btn btn-ghost back-btn" id="btn-back-tournament">← ${t ? escapeHtml(t.name) : 'Back'}</button>
      <h1 class="page-title">${escapeHtml(team.name)}</h1>
      <button class="btn btn-sm btn-secondary" id="btn-edit-team">Edit Team</button>
    </div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="overview">Overview</button>
      <button class="tab-btn" data-tab="matches">Matches</button>
    </div>

    <div class="tab-content" id="team-tab-content">
      ${renderTeamOverview(team, tournamentId, seasonId)}
    </div>

    ${renderEditTeamModal(team)}
    ${renderAddPlayerModal(team)}
    ${renderEditPlayerModal()}
    ${renderTransferModal(team, tournamentId, seasonId)}
  `;

  addTeamEventListeners(team, tournamentId, seasonId);
}

function renderTeamOverview(team, tournamentId, seasonId) {
  const players = getTeamPlayers(team.id);
  const last5 = getTeamLast5(team.id, tournamentId, seasonId);

  const groups = { Coach: [], Goalkeepers: [], Defenders: [], Midfielders: [], Attackers: [] };
  players.forEach(p => {
    if (p.role === 'coach') { groups.Coach.push(p); return; }
    const g = POSITION_GROUPS[p.position] || 'Midfielders';
    groups[g].push(p);
  });

  return `
    <div class="team-overview">
      ${team.stadium ? `<div class="team-info-row"><div class="team-info-item"><span class="info-label">Stadium</span><span>${escapeHtml(team.stadium)}</span></div></div>` : ''}

      <div class="form-section">
        <h3>Last 5 Results</h3>
        <div class="last5-results">
          ${last5.length
            ? last5.map(r => `
              <a class="last5-item" href="#" data-nav="match" data-match-id="${r.matchId}">
                <span class="form-badge form-${r.result}">${r.result}</span>
                <span class="last5-score">${r.teamScore}–${r.oppScore}</span>
                <span class="last5-opponent">${r.isHome ? 'vs' : '@'} ${escapeHtml(r.opponent)}</span>
              </a>`).join('')
            : '<span class="text-muted">No results yet</span>'}
        </div>
      </div>

      <div class="squad-section">
        <div class="squad-header">
          <h3>Squad</h3>
          <button class="btn btn-sm btn-primary" id="btn-add-player">+ Add Player</button>
        </div>
        ${Object.entries(groups).map(([groupName, groupPlayers]) => {
          if (groupPlayers.length === 0) return '';
          return `
            <div class="position-group">
              <h4 class="position-group-label">${groupName}</h4>
              <div class="table-responsive">
                <table class="data-table">
                  <thead><tr><th>#</th><th>Name</th><th>Pos</th><th>Age</th><th>Nat</th><th>Goals</th><th>Assists</th><th>Actions</th></tr></thead>
                  <tbody>
                    ${groupPlayers.sort((a, b) => (a.number || 99) - (b.number || 99)).map(p => {
                      const stats = getPlayerSeasonStats(p.id, tournamentId, seasonId);
                      return `
                        <tr>
                          <td>${p.number || '-'}</td>
                          <td><a class="link" href="#" data-nav="player" data-player-id="${p.id}">${escapeHtml(p.name)}</a></td>
                          <td><span class="pos-badge">${p.position || '-'}</span></td>
                          <td>${getPlayerAge(p.birthDate)}</td>
                          <td>${escapeHtml(p.nationality || '-')}</td>
                          <td>${stats.goals || 0}</td>
                          <td>${stats.assists || 0}</td>
                          <td class="actions-cell">
                            <button class="btn btn-xs btn-secondary btn-edit-player" data-id="${p.id}">Edit</button>
                            <button class="btn btn-xs btn-secondary btn-transfer-player" data-id="${p.id}">Transfer</button>
                            <button class="btn btn-xs btn-danger btn-delete-player" data-id="${p.id}">Del</button>
                          </td>
                        </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>`;
        }).join('')}
        ${players.length === 0 ? '<div class="empty-state">No players yet. Add your first player!</div>' : ''}
      </div>
    </div>`;
}

function renderTeamMatches(team, tournamentId, seasonId) {
  const t = getTournament(tournamentId);
  const season = getSeason(tournamentId, seasonId);
  const matches = getTeamMatches(team.id, tournamentId, seasonId);
  if (matches.length === 0) return '<div class="empty-state">No matches found for this team.</div>';
  return `<div class="matches-list">${matches.sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1).map(m => renderMatchRow(m, t, season)).join('')}</div>`;
}

function renderEditTeamModal(team) {
  return `
    <div class="modal-overlay" id="modal-edit-team" style="display:none">
      <div class="modal">
        <div class="modal-header"><h2>Edit Team</h2><button class="modal-close" id="close-edit-team">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Team Name</label><input type="text" id="edit-team-name" class="form-input" value="${escapeHtml(team.name)}"></div>
          <div class="form-group"><label>Stadium</label><input type="text" id="edit-team-stadium" class="form-input" value="${escapeHtml(team.stadium || '')}"></div>
          <div class="form-group"><label>Short Name (3 chars)</label><input type="text" id="edit-team-short" class="form-input" maxlength="3" value="${escapeHtml(team.shortName || '')}"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-edit-team">Cancel</button>
          <button class="btn btn-primary" id="btn-save-edit-team">Save</button>
        </div>
      </div>
    </div>`;
}

function renderAddPlayerModal(team) {
  return `
    <div class="modal-overlay" id="modal-add-player" style="display:none">
      <div class="modal">
        <div class="modal-header"><h2>Add Player</h2><button class="modal-close" id="close-add-player">&times;</button></div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label>Name</label><input type="text" id="add-player-name" class="form-input" placeholder="Player Name"></div>
            <div class="form-group"><label>Number</label><input type="number" id="add-player-number" class="form-input" min="1" max="99" placeholder="0"></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Position</label>
              <select id="add-player-position" class="form-input">
                <option value="coach">Coach</option>
                ${POSITIONS.map(p => `<option value="${p}">${p}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Nationality</label><input type="text" id="add-player-nationality" class="form-input" placeholder="e.g. Spain"></div>
          </div>
          <div class="form-group"><label>Birth Date</label><input type="date" id="add-player-birthdate" class="form-input"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-add-player">Cancel</button>
          <button class="btn btn-primary" id="btn-confirm-add-player">Add Player</button>
        </div>
      </div>
    </div>`;
}

function renderEditPlayerModal() {
  return `
    <div class="modal-overlay" id="modal-edit-player" style="display:none">
      <div class="modal">
        <div class="modal-header"><h2>Edit Player</h2><button class="modal-close" id="close-edit-player">&times;</button></div>
        <div class="modal-body">
          <input type="hidden" id="edit-player-id">
          <div class="form-row">
            <div class="form-group"><label>Name</label><input type="text" id="edit-player-name" class="form-input"></div>
            <div class="form-group"><label>Number</label><input type="number" id="edit-player-number" class="form-input" min="1" max="99"></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Position</label>
              <select id="edit-player-position" class="form-input">
                <option value="coach">Coach</option>
                ${POSITIONS.map(p => `<option value="${p}">${p}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Nationality</label><input type="text" id="edit-player-nationality" class="form-input"></div>
          </div>
          <div class="form-group"><label>Birth Date</label><input type="date" id="edit-player-birthdate" class="form-input"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-edit-player">Cancel</button>
          <button class="btn btn-primary" id="btn-confirm-edit-player">Save</button>
        </div>
      </div>
    </div>`;
}

function renderTransferModal(team, tournamentId, seasonId) {
  const season = getSeason(tournamentId, seasonId);
  const allTeams = season ? season.teamIds.map(id => getTeam(id)).filter(tm => tm && tm.id !== team.id) : [];
  return `
    <div class="modal-overlay" id="modal-transfer" style="display:none">
      <div class="modal">
        <div class="modal-header"><h2>Transfer Player</h2><button class="modal-close" id="close-transfer">&times;</button></div>
        <div class="modal-body">
          <input type="hidden" id="transfer-player-id">
          <div class="form-group">
            <label>Transfer to Team</label>
            <select id="transfer-team-select" class="form-input">
              ${allTeams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-transfer">Cancel</button>
          <button class="btn btn-primary" id="btn-confirm-transfer">Transfer</button>
        </div>
      </div>
    </div>`;
}

function addTeamEventListeners(team, tournamentId, seasonId) {
  document.getElementById('btn-back-tournament').addEventListener('click', () => {
    navigate('tournament', { tournamentId, seasonId });
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const content = document.getElementById('team-tab-content');
      if (btn.dataset.tab === 'overview') {
        content.innerHTML = renderTeamOverview(team, tournamentId, seasonId);
        attachSquadListeners(team, tournamentId, seasonId);
      } else {
        content.innerHTML = renderTeamMatches(team, tournamentId, seasonId);
      }
      addNavLinks();
    });
  });

  /* Edit team */
  document.getElementById('btn-edit-team').addEventListener('click', () => document.getElementById('modal-edit-team').style.display = 'flex');
  document.getElementById('close-edit-team').addEventListener('click', () => document.getElementById('modal-edit-team').style.display = 'none');
  document.getElementById('btn-cancel-edit-team').addEventListener('click', () => document.getElementById('modal-edit-team').style.display = 'none');
  document.getElementById('btn-save-edit-team').addEventListener('click', () => {
    const name = document.getElementById('edit-team-name').value.trim();
    if (!name) { showToast('Name required', 'error'); return; }
    const stadium = document.getElementById('edit-team-stadium').value.trim();
    const shortName = document.getElementById('edit-team-short').value.trim().toUpperCase();
    updateTeam(team.id, { name, stadium, shortName });
    team.name = name; team.stadium = stadium; team.shortName = shortName;
    document.getElementById('modal-edit-team').style.display = 'none';
    document.querySelector('.page-title').textContent = name;
    showToast('Team updated', 'success');
  });

  /* Add player */
  document.getElementById('close-add-player').addEventListener('click', () => document.getElementById('modal-add-player').style.display = 'none');
  document.getElementById('btn-cancel-add-player').addEventListener('click', () => document.getElementById('modal-add-player').style.display = 'none');
  document.getElementById('btn-confirm-add-player').addEventListener('click', () => {
    const name = document.getElementById('add-player-name').value.trim();
    if (!name) { showToast('Name required', 'error'); return; }
    const pos = document.getElementById('add-player-position').value;
    createPlayer({
      name,
      number: parseInt(document.getElementById('add-player-number').value) || 0,
      position: pos === 'coach' ? 'CM' : pos,
      role: pos === 'coach' ? 'coach' : 'player',
      nationality: document.getElementById('add-player-nationality').value.trim(),
      birthDate: document.getElementById('add-player-birthdate').value,
      teamId: team.id
    });
    document.getElementById('modal-add-player').style.display = 'none';
    const content = document.getElementById('team-tab-content');
    content.innerHTML = renderTeamOverview(team, tournamentId, seasonId);
    attachSquadListeners(team, tournamentId, seasonId);
    addNavLinks();
    showToast('Player added', 'success');
  });

  /* Edit player */
  document.getElementById('close-edit-player').addEventListener('click', () => document.getElementById('modal-edit-player').style.display = 'none');
  document.getElementById('btn-cancel-edit-player').addEventListener('click', () => document.getElementById('modal-edit-player').style.display = 'none');
  document.getElementById('btn-confirm-edit-player').addEventListener('click', () => {
    const pid = document.getElementById('edit-player-id').value;
    const name = document.getElementById('edit-player-name').value.trim();
    if (!name) { showToast('Name required', 'error'); return; }
    const pos = document.getElementById('edit-player-position').value;
    updatePlayer(pid, {
      name,
      number: parseInt(document.getElementById('edit-player-number').value) || 0,
      position: pos === 'coach' ? 'CM' : pos,
      role: pos === 'coach' ? 'coach' : 'player',
      nationality: document.getElementById('edit-player-nationality').value.trim(),
      birthDate: document.getElementById('edit-player-birthdate').value
    });
    document.getElementById('modal-edit-player').style.display = 'none';
    const content = document.getElementById('team-tab-content');
    content.innerHTML = renderTeamOverview(team, tournamentId, seasonId);
    attachSquadListeners(team, tournamentId, seasonId);
    addNavLinks();
    showToast('Player updated', 'success');
  });

  /* Transfer */
  document.getElementById('close-transfer').addEventListener('click', () => document.getElementById('modal-transfer').style.display = 'none');
  document.getElementById('btn-cancel-transfer').addEventListener('click', () => document.getElementById('modal-transfer').style.display = 'none');
  document.getElementById('btn-confirm-transfer').addEventListener('click', () => {
    const pid = document.getElementById('transfer-player-id').value;
    const newTeamId = document.getElementById('transfer-team-select').value;
    if (!newTeamId) { showToast('Select a team', 'error'); return; }
    transferPlayer(pid, newTeamId);
    document.getElementById('modal-transfer').style.display = 'none';
    const content = document.getElementById('team-tab-content');
    content.innerHTML = renderTeamOverview(team, tournamentId, seasonId);
    attachSquadListeners(team, tournamentId, seasonId);
    addNavLinks();
    showToast('Player transferred', 'success');
  });

  attachSquadListeners(team, tournamentId, seasonId);
}

function attachSquadListeners(team, tournamentId, seasonId) {
  const addBtn = document.getElementById('btn-add-player');
  if (addBtn) addBtn.addEventListener('click', () => document.getElementById('modal-add-player').style.display = 'flex');

  document.querySelectorAll('.btn-edit-player').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = getPlayer(btn.dataset.id);
      if (!p) return;
      document.getElementById('edit-player-id').value = p.id;
      document.getElementById('edit-player-name').value = p.name;
      document.getElementById('edit-player-number').value = p.number;
      document.getElementById('edit-player-position').value = p.role === 'coach' ? 'coach' : (p.position || 'CM');
      document.getElementById('edit-player-nationality').value = p.nationality || '';
      document.getElementById('edit-player-birthdate').value = p.birthDate || '';
      document.getElementById('modal-edit-player').style.display = 'flex';
    });
  });

  document.querySelectorAll('.btn-transfer-player').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('transfer-player-id').value = btn.dataset.id;
      document.getElementById('modal-transfer').style.display = 'flex';
    });
  });

  document.querySelectorAll('.btn-delete-player').forEach(btn => {
    btn.addEventListener('click', () => {
      showConfirmModal('Delete player?', 'This will remove the player from the squad.', () => {
        deletePlayer(btn.dataset.id);
        const content = document.getElementById('team-tab-content');
        content.innerHTML = renderTeamOverview(team, tournamentId, seasonId);
        attachSquadListeners(team, tournamentId, seasonId);
        addNavLinks();
        showToast('Player deleted', 'success');
      });
    });
  });
}
