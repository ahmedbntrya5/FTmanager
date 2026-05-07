function renderPlayer(playerId) {
  const player = getPlayer(playerId);
  if (!player) { navigate('home'); return; }
  const team = player.teamId ? getTeam(player.teamId) : null;

  const view = document.getElementById('view-player');
  view.innerHTML = `
    <div class="page-header">
      <button class="btn btn-ghost back-btn" id="btn-back-player">${team ? '← ' + escapeHtml(team.name) : '← Back'}</button>
      <h1 class="page-title">${escapeHtml(player.name)}</h1>
      <button class="btn btn-sm btn-secondary" id="btn-edit-player-page">Edit</button>
    </div>

    <div class="player-profile">
      <div class="player-profile-card">
        <div class="player-number-badge">${player.number || '?'}</div>
        <div class="player-profile-info">
          <div class="player-meta-grid">
            <div class="player-meta-item">
              <span class="meta-label">Position</span>
              <span class="pos-badge">${player.position || '-'}</span>
            </div>
            <div class="player-meta-item">
              <span class="meta-label">Team</span>
              <span>${team ? `<a class="link" href="#" data-nav="team" data-team-id="${team.id}">${escapeHtml(team.name)}</a>` : 'Free Agent'}</span>
            </div>
            <div class="player-meta-item">
              <span class="meta-label">Nationality</span>
              <span>${escapeHtml(player.nationality || '-')}</span>
            </div>
            <div class="player-meta-item">
              <span class="meta-label">Birth Date</span>
              <span>${player.birthDate ? player.birthDate + ' (Age ' + getPlayerAge(player.birthDate) + ')' : '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="player-stats-section">
        <h3>Career Statistics</h3>
        <div class="stats-cards">
          <div class="stat-card"><div class="stat-value">${player.careerStats?.goals || 0}</div><div class="stat-label">Goals</div></div>
          <div class="stat-card"><div class="stat-value">${player.careerStats?.assists || 0}</div><div class="stat-label">Assists</div></div>
          <div class="stat-card"><div class="stat-value">${player.careerStats?.appearances || 0}</div><div class="stat-label">Apps</div></div>
          <div class="stat-card yellow-card-stat"><div class="stat-value">${player.careerStats?.yellowCards || 0}</div><div class="stat-label">Yellow</div></div>
          <div class="stat-card red-card-stat"><div class="stat-value">${player.careerStats?.redCards || 0}</div><div class="stat-label">Red</div></div>
        </div>
      </div>

      ${renderSeasonStatsSection(player)}

      ${player.history && player.history.length > 0 ? `
        <div class="player-stats-section">
          <h3>Transfer History</h3>
          <div class="transfer-history">
            ${player.history.map(h => `<div class="history-item">→ ${escapeHtml(h.teamName || h.teamId)}</div>`).join('')}
            ${team ? `<div class="history-item current">▶ ${escapeHtml(team.name)} (Current)</div>` : ''}
          </div>
        </div>` : ''}
    </div>

    ${renderEditPlayerPageModal(player)}
  `;

  document.getElementById('btn-back-player').addEventListener('click', () => {
    if (team) {
      const teamTournament = appData.tournaments.find(t => t.seasons.some(s => s.teamIds.includes(team.id)));
      if (teamTournament) {
        const seasonObj = teamTournament.seasons.find(s => s.teamIds.includes(team.id));
        if (seasonObj) {
          navigate('team', { teamId: team.id, tournamentId: teamTournament.id, seasonId: seasonObj.id });
          return;
        }
      }
    }
    navigate('home');
  });

  document.getElementById('btn-edit-player-page').addEventListener('click', () => {
    document.getElementById('modal-edit-player-page').style.display = 'flex';
  });
  document.getElementById('close-edit-player-page').addEventListener('click', () => document.getElementById('modal-edit-player-page').style.display = 'none');
  document.getElementById('btn-cancel-edit-player-page').addEventListener('click', () => document.getElementById('modal-edit-player-page').style.display = 'none');
  document.getElementById('btn-save-edit-player-page').addEventListener('click', () => {
    const name = document.getElementById('epp-name').value.trim();
    if (!name) { showToast('Name required', 'error'); return; }
    updatePlayer(player.id, {
      name,
      number: parseInt(document.getElementById('epp-number').value) || 0,
      position: document.getElementById('epp-position').value,
      nationality: document.getElementById('epp-nationality').value.trim(),
      birthDate: document.getElementById('epp-birthdate').value
    });
    document.getElementById('modal-edit-player-page').style.display = 'none';
    renderPlayer(player.id);
  });

  addNavLinks();
}

function resolveSeasonLabel(key) {
  const allTours = appData.tournaments;
  for (const t of allTours) {
    for (const s of t.seasons) {
      const expectedKey = t.id + '_' + s.id;
      if (expectedKey === key) {
        return escapeHtml(t.name) + ' — ' + escapeHtml(s.name);
      }
    }
  }
  return key;
}

function renderSeasonStatsSection(player) {
  const entries = Object.entries(player.seasonStats || {});
  if (entries.length === 0) return '';
  return `
    <div class="player-stats-section">
      <h3>Season Statistics</h3>
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>Tournament — Season</th><th>Apps</th><th>Goals</th><th>Assists</th><th>Yellow</th><th>Red</th></tr></thead>
          <tbody>
            ${entries.map(([key, stats]) => {
              const label = resolveSeasonLabel(key);
              return `
                <tr>
                  <td>${label}</td>
                  <td>${stats.appearances || 0}</td>
                  <td>${stats.goals || 0}</td>
                  <td>${stats.assists || 0}</td>
                  <td>${stats.yellowCards || 0}</td>
                  <td>${stats.redCards || 0}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderEditPlayerPageModal(player) {
  return `
    <div class="modal-overlay" id="modal-edit-player-page" style="display:none">
      <div class="modal">
        <div class="modal-header"><h2>Edit Player</h2><button class="modal-close" id="close-edit-player-page">&times;</button></div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label>Name</label><input type="text" id="epp-name" class="form-input" value="${escapeHtml(player.name)}"></div>
            <div class="form-group"><label>Number</label><input type="number" id="epp-number" class="form-input" value="${player.number || 0}"></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Position</label>
              <select id="epp-position" class="form-input">
                ${POSITIONS.map(p => `<option value="${p}" ${player.position === p ? 'selected' : ''}>${p}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Nationality</label><input type="text" id="epp-nationality" class="form-input" value="${escapeHtml(player.nationality || '')}"></div>
          </div>
          <div class="form-group"><label>Birth Date</label><input type="date" id="epp-birthdate" class="form-input" value="${player.birthDate || ''}"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-edit-player-page">Cancel</button>
          <button class="btn btn-primary" id="btn-save-edit-player-page">Save</button>
        </div>
      </div>
    </div>`;
}
