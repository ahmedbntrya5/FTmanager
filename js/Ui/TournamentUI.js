let _standingsSort = { col: 'points', dir: 'desc' };
let _currentTabId = 'standings';

function renderTournament(tournamentId, seasonId) {
  const t = getTournament(tournamentId);
  if (!t) { navigate('home'); return; }
  const season = getSeason(tournamentId, seasonId) || t.seasons[0];
  if (!season) { navigate('home'); return; }

  const firstTab = getTournamentTabs(t.type)[0].id;
  _currentTabId = firstTab;

  const view = document.getElementById('view-tournament');
  view.innerHTML = `
    <div class="tournament-header">
      <button class="btn btn-ghost back-btn" id="btn-back-home">← Home</button>
      <div class="tournament-title-area">
        <h1 class="tournament-name">${escapeHtml(t.name)}</h1>
        <div class="season-selector-wrap">
          <select class="form-input season-select" id="season-select">
            ${t.seasons.map(s => `<option value="${s.id}" ${s.id === season.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-secondary" id="btn-rename-season" title="Rename season">✏</button>
          <button class="btn btn-sm btn-primary" id="btn-add-season">+ Season</button>
          ${t.seasons.length > 1 ? `<button class="btn btn-sm btn-danger" id="btn-delete-season" title="Delete season">🗑</button>` : ''}
        </div>
      </div>
    </div>

    <div class="tabs">
      ${getTournamentTabs(t.type).map((tab, i) => `
        <button class="tab-btn ${i === 0 ? 'active' : ''}" data-tab="${tab.id}">${tab.label}</button>
      `).join('')}
    </div>

    <div class="tab-content" id="tournament-tab-content">
      ${renderTournamentTabContent(t, season, firstTab)}
    </div>

    ${renderPointsConfigModal(season)}
    ${renderGenerateGroupsModal(t, season)}
    ${renderAddMatchModal(t, season)}
    ${renderRenameSeasonModal(season)}
    ${renderGenerateLeagueModal(t, season)}
  `;

  addTournamentEventListeners(t, season);
}

function getTournamentTabs(type) {
  if (type === 'league') {
    return [
      { id: 'standings', label: 'Standings' },
      { id: 'matches', label: 'Matches' },
      { id: 'stats', label: 'Statistics' }
    ];
  } else if (type === 'knockout') {
    return [
      { id: 'bracket', label: 'Bracket' },
      { id: 'matches', label: 'Matches' },
      { id: 'stats', label: 'Statistics' }
    ];
  } else {
    return [
      { id: 'groups', label: 'Groups' },
      { id: 'bracket', label: 'Bracket' },
      { id: 'matches', label: 'Matches' },
      { id: 'stats', label: 'Statistics' }
    ];
  }
}

function renderTournamentTabContent(t, season, tabId) {
  switch (tabId) {
    case 'standings': return renderStandings(t, season);
    case 'groups':    return renderGroupsTab(t, season);
    case 'bracket':   return renderBracketTab(t, season);
    case 'matches':   return renderMatchesTab(t, season);
    case 'stats':     return renderTournamentStats(t, season);
    default: return '';
  }
}

/* ===== STANDINGS ===== */
function renderStandings(t, season) {
  const rows = getLeagueStandings(t.id, season.id);
  return `
    <div class="standings-wrap">
      <div class="standings-controls">
        <div class="table-mode-btns">
          <button class="btn btn-sm table-mode-btn active" data-mode="short">Short</button>
          <button class="btn btn-sm table-mode-btn" data-mode="full">Full</button>
          <button class="btn btn-sm table-mode-btn" data-mode="form">Form</button>
        </div>
        <div class="standings-actions">
          <button class="btn btn-sm btn-secondary" id="btn-config-points">⚙ Points</button>
          <button class="btn btn-sm btn-primary btn-open-gen-league">⚡ Generate Rounds</button>
          <button class="btn btn-sm btn-secondary btn-open-add-match">+ Add Match</button>
        </div>
      </div>
      <div id="standings-table-wrap">
        ${renderStandingsTable(rows, 'short', t, season, _standingsSort)}
      </div>
    </div>`;
}

function renderStandingsTable(rows, mode, t, season, sort) {
  sort = sort || { col: 'points', dir: 'desc' };

  function sortedRows(data) {
    const col = sort.col;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = a[col] !== undefined ? a[col] : 0;
      const bv = b[col] !== undefined ? b[col] : 0;
      if (bv !== av) return dir * (av - bv);
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  }

  function sortArrow(col) {
    if (sort.col !== col) return '<span class="sort-arrow neutral">⇅</span>';
    return sort.dir === 'desc' ? '<span class="sort-arrow">↓</span>' : '<span class="sort-arrow">↑</span>';
  }

  function th(label, col) {
    const active = sort.col === col ? 'sort-active' : '';
    return `<th class="sortable-th ${active}" data-sort-col="${col}">${label} ${sortArrow(col)}</th>`;
  }

  if (rows.length === 0) {
    return `<div class="empty-state">No standings yet. Generate rounds or add matches to get started.</div>`;
  }

  const sorted = sortedRows(rows);
  let headers, cells;

  if (mode === 'short') {
    headers = `<th>#</th><th>Team</th>${th('P','played')}${th('GD','gd')}${th('Pts','points')}`;
    cells = (row, i) => `
      <td>${i + 1}</td>
      <td><a class="link" href="#" data-nav="team" data-team-id="${row.teamId}" data-tournament-id="${t.id}" data-season-id="${season.id}">${escapeHtml(getTeam(row.teamId)?.name || '-')}</a></td>
      <td>${row.played}</td>
      <td class="${row.gd > 0 ? 'text-green' : row.gd < 0 ? 'text-red' : ''}">${row.gd > 0 ? '+' : ''}${row.gd}</td>
      <td class="bold">${row.points}</td>`;
  } else if (mode === 'full') {
    headers = `<th>#</th><th>Team</th>${th('P','played')}${th('W','won')}${th('D','drawn')}${th('L','lost')}${th('GF','gf')}${th('GA','ga')}${th('GD','gd')}${th('Pts','points')}`;
    cells = (row, i) => `
      <td>${i + 1}</td>
      <td><a class="link" href="#" data-nav="team" data-team-id="${row.teamId}" data-tournament-id="${t.id}" data-season-id="${season.id}">${escapeHtml(getTeam(row.teamId)?.name || '-')}</a></td>
      <td>${row.played}</td><td>${row.won}</td><td>${row.drawn}</td><td>${row.lost}</td>
      <td>${row.gf}</td><td>${row.ga}</td>
      <td class="${row.gd > 0 ? 'text-green' : row.gd < 0 ? 'text-red' : ''}">${row.gd > 0 ? '+' : ''}${row.gd}</td>
      <td class="bold">${row.points}</td>`;
  } else {
    headers = `<th>#</th><th>Team</th><th>Form</th>`;
    cells = (row, i) => `
      <td>${i + 1}</td>
      <td><a class="link" href="#" data-nav="team" data-team-id="${row.teamId}" data-tournament-id="${t.id}" data-season-id="${season.id}">${escapeHtml(getTeam(row.teamId)?.name || '-')}</a></td>
      <td>${renderForm(row.form)}</td>`;
  }

  return `
    <div class="table-responsive">
      <table class="data-table standings-table">
        <thead><tr>${headers}</tr></thead>
        <tbody>${sorted.map((row, i) => `<tr>${cells(row, i)}</tr>`).join('')}</tbody>
      </table>
    </div>`;
}

function renderForm(form) {
  return form.map(f => `<span class="form-badge form-${f}">${f}</span>`).join('');
}

/* ===== GROUPS ===== */
function renderGroupsTab(t, season) {
  const hasGroups = season.groups && season.groups.length > 0;
  return `
    <div class="groups-wrap">
      <div class="standings-controls">
        <span></span>
        <div class="standings-actions">
          <button class="btn btn-sm btn-primary btn-open-gen-groups">${hasGroups ? '↺ Regenerate Groups' : '⚡ Set Up Groups'}</button>
          <button class="btn btn-sm btn-secondary btn-open-add-match">+ Add Match</button>
        </div>
      </div>
      ${!hasGroups ? '<div class="empty-state">No groups yet. Click "Set Up Groups" to generate.</div>' : ''}
      ${hasGroups ? season.groups.map(group => {
        const rows = getGroupStandings(t.id, season.id, group.id);
        return `
          <div class="group-block">
            <h3 class="group-label">Group ${group.label}</h3>
            <div class="table-responsive">
              <table class="data-table">
                <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
                <tbody>${rows.map((row, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td><a class="link" href="#" data-nav="team" data-team-id="${row.teamId}" data-tournament-id="${t.id}" data-season-id="${season.id}">${escapeHtml(getTeam(row.teamId)?.name || '-')}</a></td>
                    <td>${row.played}</td><td>${row.won}</td><td>${row.drawn}</td><td>${row.lost}</td>
                    <td>${row.gd > 0 ? '+' : ''}${row.gd}</td>
                    <td class="bold">${row.points}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>`;
      }).join('') : ''}
    </div>`;
}

/* ===== BRACKET ===== */
function renderBracketTab(t, season) {
  const hasBracket = season.bracket && season.bracket.stages && season.bracket.stages.length > 0;
  return `
    <div class="bracket-wrap">
      <div class="standings-controls">
        <span></span>
        <div class="standings-actions">
          <button class="btn btn-sm btn-primary btn-open-gen-bracket">⚡ Generate Bracket</button>
          ${hasBracket ? `<button class="btn btn-sm btn-secondary btn-add-bracket-round">+ Next Round</button>` : ''}
          <button class="btn btn-sm btn-secondary btn-open-add-match">+ Add Match</button>
        </div>
      </div>
      ${!hasBracket ? '<div class="empty-state">No bracket yet. Click "Generate Bracket" to start.</div>' : ''}
      ${hasBracket ? season.bracket.stages.map(stage => `
        <div class="bracket-stage">
          <h3 class="stage-label">${escapeHtml(stage.name)}</h3>
          <div class="bracket-pairs">
            ${stage.pairs.map(pair => {
              const team1 = getTeam(pair.team1);
              const team2 = getTeam(pair.team2);
              const agg = getKnockoutAggregate(pair, stage.legs);
              const winner = agg ? (agg.team1Goals > agg.team2Goals ? pair.team1 : agg.team2Goals > agg.team1Goals ? pair.team2 : null) : null;
              return `
                <div class="bracket-pair">
                  <div class="bracket-team ${winner === pair.team1 ? 'bracket-winner' : winner ? 'bracket-loser' : ''}">
                    <a class="link" href="#" data-nav="team" data-team-id="${pair.team1}" data-tournament-id="${t.id}" data-season-id="${season.id}">${escapeHtml(team1?.name || '-')}</a>
                    ${agg ? `<span class="bracket-score">${agg.team1Goals}</span>` : ''}
                  </div>
                  <div class="bracket-vs">vs</div>
                  <div class="bracket-team ${winner === pair.team2 ? 'bracket-winner' : winner ? 'bracket-loser' : ''}">
                    <a class="link" href="#" data-nav="team" data-team-id="${pair.team2}" data-tournament-id="${t.id}" data-season-id="${season.id}">${escapeHtml(team2?.name || '-')}</a>
                    ${agg ? `<span class="bracket-score">${agg.team2Goals}</span>` : ''}
                  </div>
                  <div class="bracket-matches-links">
                    ${pair.matchIds.map(mid => {
                      const m = getMatch(mid);
                      return `<a class="link" href="#" data-nav="match" data-match-id="${mid}">${m ? (m.played ? m.homeScore + '-' + m.awayScore : (m.stage || 'Match')) : 'Match'}</a>`;
                    }).join(' · ')}
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>`).join('') : ''}
    </div>`;
}

/* ===== MATCHES TAB ===== */
function renderMatchesTab(t, season) {
  const matches = getMatchesByTournamentSeason(t.id, season.id);
  return `
    <div class="matches-section">
      <div class="standings-controls">
        <span class="text-muted">${matches.length} match${matches.length !== 1 ? 'es' : ''}</span>
        <div class="standings-actions">
          ${t.type === 'league' ? `<button class="btn btn-sm btn-primary btn-open-gen-league">⚡ Generate Rounds</button>` : ''}
          <button class="btn btn-sm btn-secondary btn-open-add-match">+ Add Match</button>
        </div>
      </div>
      ${matches.length === 0
        ? '<div class="empty-state">No matches yet. Generate rounds or add matches manually.</div>'
        : renderMatchesList(matches, t, season)}
    </div>`;
}

function renderMatchesList(matches, t, season) {
  const groups = {};
  matches.forEach(m => {
    let key = m.stage || (m.groupId ? 'Group ' + (season.groups?.find(g => g.id === m.groupId)?.label || m.groupId) : m.round != null ? 'Round ' + m.round : 'Other');
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 999;
    const nb = parseInt(b.replace(/\D/g, '')) || 999;
    return na - nb;
  });

  return `
    <div class="matches-list">
      ${sortedKeys.map(label => `
        <div class="match-group">
          <h3 class="match-group-label">${escapeHtml(label)}</h3>
          ${groups[label].sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1).map(m => renderMatchRow(m, t, season)).join('')}
        </div>`).join('')}
    </div>`;
}

function renderMatchRow(m, t, season) {
  const home = getTeam(m.homeTeamId);
  const away = getTeam(m.awayTeamId);
  return `
    <div class="match-row">
      <div class="match-row-inner">
        <div class="match-team match-home">
          <a class="link" href="#" data-nav="team" data-team-id="${m.homeTeamId}" data-tournament-id="${t.id}" data-season-id="${season.id}">${escapeHtml(home?.name || '-')}</a>
        </div>
        <div class="match-score-center">
          ${m.played
            ? `<a class="match-score" href="#" data-nav="match" data-match-id="${m.id}">${m.homeScore} - ${m.awayScore}</a>`
            : `<a class="match-time" href="#" data-nav="match" data-match-id="${m.id}">${m.time || 'vs'}</a>`}
          ${m.date ? `<div class="match-date">${m.date}</div>` : ''}
        </div>
        <div class="match-team match-away">
          <a class="link" href="#" data-nav="team" data-team-id="${m.awayTeamId}" data-tournament-id="${t.id}" data-season-id="${season.id}">${escapeHtml(away?.name || '-')}</a>
        </div>
      </div>
    </div>`;
}

/* ===== STATS TAB ===== */
function renderTournamentStats(t, season) {
  const scorers = getTopScorers(t.id, season.id, 10);
  const assists = getTopAssists(t.id, season.id, 10);
  const contribs = getTopContributions(t.id, season.id, 10);
  const yellows = getYellowCards(t.id, season.id, 10);
  const reds = getRedCards(t.id, season.id, 10);
  const attackStats = getTeamAttackStats(t.id, season.id);
  const cardStats = getTeamCardStats(t.id, season.id);

  function statTable(title, data, colLabel, colKey, extraCols) {
    if (data.length === 0) return `<div class="stat-block"><h3>${title}</h3><div class="empty-state">No data</div></div>`;
    return `<div class="stat-block"><h3>${title}</h3>
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>#</th><th>Player</th><th>Team</th><th>${colLabel}</th>${extraCols ? extraCols.map(c => `<th>${c.label}</th>`).join('') : ''}</tr></thead>
          <tbody>${data.map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><a class="link" href="#" data-nav="player" data-player-id="${d.player.id}">${escapeHtml(d.player.name)}</a></td>
              <td><a class="link" href="#" data-nav="team" data-team-id="${d.player.teamId}" data-tournament-id="${t.id}" data-season-id="${season.id}">${escapeHtml(getTeam(d.player.teamId)?.name || '-')}</a></td>
              <td class="bold">${d.stats[colKey] || 0}</td>
              ${extraCols ? extraCols.map(c => `<td>${d[c.key] !== undefined ? d[c.key] : (d.stats[c.key] || 0)}</td>`).join('') : ''}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function teamStatTable(title, data, cols) {
    if (data.length === 0) return `<div class="stat-block"><h3>${title}</h3><div class="empty-state">No data</div></div>`;
    return `<div class="stat-block"><h3>${title}</h3>
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>#</th><th>Team</th>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
          <tbody>${data.map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><a class="link" href="#" data-nav="team" data-team-id="${d.teamId}" data-tournament-id="${t.id}" data-season-id="${season.id}">${escapeHtml(getTeam(d.teamId)?.name || '-')}</a></td>
              ${cols.map(c => `<td>${d[c.key]}</td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  return `<div class="stats-grid">
    ${statTable('Top Scorers', scorers, 'Goals', 'goals')}
    ${statTable('Top Assists', assists, 'Assists', 'assists')}
    ${statTable('Goal Contributions', contribs, 'Goals', 'goals', [{ label: 'Assists', key: 'assists' }, { label: 'Total', key: 'contributions' }])}
    ${statTable('Yellow Cards', yellows, 'Yellow', 'yellowCards')}
    ${statTable('Red Cards', reds, 'Red', 'redCards')}
    ${teamStatTable('Team Attack', attackStats, [{ label: 'Goals', key: 'goals' }, { label: 'G/Match', key: 'goalsPerMatch' }])}
    ${teamStatTable('Goals Conceded', [...attackStats].sort((a, b) => a.conceded - b.conceded), [{ label: 'Conceded', key: 'conceded' }, { label: 'Per Match', key: 'concededPerMatch' }])}
    ${teamStatTable('Cards / Team', cardStats, [{ label: 'Yellow', key: 'yellowCards' }, { label: 'Red', key: 'redCards' }])}
  </div>`;
}

/* ===== MODALS (rendered once, stay in DOM) ===== */
function renderPointsConfigModal(season) {
  return `
    <div class="modal-overlay" id="modal-points-config" style="display:none">
      <div class="modal">
        <div class="modal-header"><h2>Points Config</h2><button class="modal-close" id="close-points-modal">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Win</label><input type="number" id="input-points-win" class="form-input" value="${season.pointsWin}" min="0"></div>
          <div class="form-group"><label>Draw</label><input type="number" id="input-points-draw" class="form-input" value="${season.pointsDraw}" min="0"></div>
          <div class="form-group"><label>Loss</label><input type="number" id="input-points-loss" class="form-input" value="${season.pointsLoss}" min="0"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-points">Cancel</button>
          <button class="btn btn-primary" id="btn-save-points">Save</button>
        </div>
      </div>
    </div>`;
}

function renderGenerateGroupsModal(t, season) {
  if (t.type !== 'groups_knockout') return '';
  return `
    <div class="modal-overlay" id="modal-generate-groups" style="display:none">
      <div class="modal">
        <div class="modal-header"><h2>Set Up Groups</h2><button class="modal-close" id="close-gen-modal">&times;</button></div>
        <div class="modal-body">
          <div class="form-group">
            <label>Number of Groups</label>
            <input type="number" id="input-num-groups" class="form-input" min="2" max="8" value="${Math.max(2, Math.floor(season.teamIds.length / 4))}">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-gen">Cancel</button>
          <button class="btn btn-primary" id="btn-confirm-gen-groups">Generate</button>
        </div>
      </div>
    </div>`;
}

function renderGenerateLeagueModal(t, season) {
  if (t.type !== 'league') return '';
  const n = season.teamIds.length % 2 === 0 ? season.teamIds.length : season.teamIds.length + 1;
  const maxRounds = (n - 1) * 2;
  const existingRounds = appData.matches.filter(m => m.tournamentId === t.id && m.seasonId === season.id && m.round).map(m => m.round);
  const currentMax = existingRounds.length ? Math.max(...existingRounds) : 0;
  const remaining = Math.max(0, maxRounds - currentMax);

  return `
    <div class="modal-overlay" id="modal-gen-league" style="display:none">
      <div class="modal">
        <div class="modal-header"><h2>Generate League Rounds</h2><button class="modal-close" id="close-gen-league">&times;</button></div>
        <div class="modal-body">
          <p class="modal-hint">
            Teams: ${season.teamIds.length} · Rounds generated: ${currentMax} / ${maxRounds}<br>
            Rounds 1–${n - 1}: First leg · Rounds ${n}–${maxRounds}: Second leg (reversed fixtures)
          </p>
          <div class="form-group">
            <label>Number of rounds to generate</label>
            <input type="number" id="input-gen-rounds" class="form-input" min="1" max="${remaining || 1}" value="1">
          </div>
          <div class="gen-league-actions">
            <button class="btn btn-secondary btn-block" id="btn-gen-next-round">Generate Next Round Only</button>
            <button class="btn btn-secondary btn-block" id="btn-gen-all-remaining">Generate All Remaining</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-gen-league">Cancel</button>
          <button class="btn btn-primary" id="btn-confirm-gen-league">Generate N Rounds</button>
        </div>
      </div>
    </div>`;
}

function renderAddMatchModal(t, season) {
  const teams = season.teamIds.map(id => getTeam(id)).filter(Boolean);
  const roundNum = getNextRoundNumber(t.id, season.id);
  return `
    <div class="modal-overlay" id="modal-add-match" style="display:none">
      <div class="modal">
        <div class="modal-header"><h2>Add Match</h2><button class="modal-close" id="close-add-match">&times;</button></div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Home Team</label>
              <select id="add-match-home" class="form-input">
                ${teams.map(tm => `<option value="${tm.id}">${escapeHtml(tm.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Away Team</label>
              <select id="add-match-away" class="form-input">
                ${teams.map((tm, i) => `<option value="${tm.id}" ${i === 1 ? 'selected' : ''}>${escapeHtml(tm.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          ${t.type === 'league' ? `
          <div class="form-group">
            <label>Round</label>
            <input type="number" id="add-match-round" class="form-input" min="1" value="${roundNum}">
          </div>` : ''}
          ${t.type === 'knockout' || t.type === 'groups_knockout' ? `
          <div class="form-group">
            <label>Stage Name</label>
            <input type="text" id="add-match-stage" class="form-input" placeholder="e.g. Quarter-Final">
          </div>` : ''}
          ${t.type === 'groups_knockout' && season.groups && season.groups.length > 0 ? `
          <div class="form-group">
            <label>Group (optional)</label>
            <select id="add-match-group" class="form-input">
              <option value="">None</option>
              ${season.groups.map(g => `<option value="${g.id}">Group ${g.label}</option>`).join('')}
            </select>
          </div>` : ''}
          <p class="modal-hint" id="add-match-error" style="color: var(--color-danger); display:none;"></p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-add-match">Cancel</button>
          <button class="btn btn-primary" id="btn-confirm-add-match">Add Match</button>
        </div>
      </div>
    </div>`;
}

function renderRenameSeasonModal(season) {
  return `
    <div class="modal-overlay" id="modal-rename-season" style="display:none">
      <div class="modal">
        <div class="modal-header"><h2>Rename Season</h2><button class="modal-close" id="close-rename-season">&times;</button></div>
        <div class="modal-body">
          <div class="form-group">
            <label>Season Name (e.g. year)</label>
            <input type="number" id="input-rename-season" class="form-input" min="1900" max="2100" value="${season.name || new Date().getFullYear()}">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-rename-season">Cancel</button>
          <button class="btn btn-primary" id="btn-confirm-rename-season">Save</button>
        </div>
      </div>
    </div>`;
}

/* ===== ALL EVENT LISTENERS ===== */
function addTournamentEventListeners(t, season) {
  document.getElementById('btn-back-home').addEventListener('click', () => navigate('home'));

  document.getElementById('season-select').addEventListener('change', e => {
    navigate('tournament', { tournamentId: t.id, seasonId: e.target.value });
  });

  /* Rename season */
  document.getElementById('btn-rename-season').addEventListener('click', () => {
    document.getElementById('modal-rename-season').style.display = 'flex';
  });
  document.getElementById('close-rename-season').addEventListener('click', () => document.getElementById('modal-rename-season').style.display = 'none');
  document.getElementById('btn-cancel-rename-season').addEventListener('click', () => document.getElementById('modal-rename-season').style.display = 'none');
  document.getElementById('btn-confirm-rename-season').addEventListener('click', () => {
    const newName = document.getElementById('input-rename-season').value.trim();
    if (!newName) { showToast('Enter a season name', 'error'); return; }
    updateSeason(t.id, season.id, { name: newName });
    season.name = newName;
    document.getElementById('modal-rename-season').style.display = 'none';
    document.querySelectorAll('#season-select option').forEach(opt => {
      if (opt.value === season.id) opt.textContent = newName;
    });
    showToast('Season renamed', 'success');
  });

  /* Add season */
  document.getElementById('btn-add-season').addEventListener('click', () => {
    const yearInput = prompt('Enter season name (e.g. 2025):', String(new Date().getFullYear() + t.seasons.length));
    if (yearInput === null) return;
    const seasonName = yearInput.trim() || String(new Date().getFullYear());
    const newSeason = addSeason(t.id, seasonName);
    const existingTeams = season.teamIds.map(id => getTeam(id)).filter(Boolean);
    existingTeams.forEach((team, idx) => {
      const newTeam = createTeam(team.name, t.id, newSeason.id);
      newSeason.teamIds.push(newTeam.id);
      generateDefaultPlayers(newTeam, idx);
    });
    saveData();
    showToast('Season "' + seasonName + '" added!', 'success');
    navigate('tournament', { tournamentId: t.id, seasonId: newSeason.id });
  });

  /* Delete season */
  const deleteSeasonBtn = document.getElementById('btn-delete-season');
  if (deleteSeasonBtn) {
    deleteSeasonBtn.addEventListener('click', () => {
      showConfirmModal('Delete season "' + season.name + '"?', 'All matches, teams and players in this season will be deleted permanently.', () => {
        const ok = deleteSeason(t.id, season.id);
        if (ok) {
          showToast('Season deleted', 'success');
          const updatedT = getTournament(t.id);
          navigate('tournament', { tournamentId: t.id, seasonId: updatedT.currentSeasonId });
        } else {
          showToast('Cannot delete the only season', 'error');
        }
      });
    });
  }

  /* Tab switching */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _currentTabId = btn.dataset.tab;
      document.getElementById('tournament-tab-content').innerHTML = renderTournamentTabContent(t, season, _currentTabId);
      addTabEventListeners(t, season, _currentTabId);
      addNavLinks();
    });
  });

  /* Points config */
  document.getElementById('close-points-modal').addEventListener('click', () => document.getElementById('modal-points-config').style.display = 'none');
  document.getElementById('btn-cancel-points').addEventListener('click', () => document.getElementById('modal-points-config').style.display = 'none');
  document.getElementById('btn-save-points').addEventListener('click', () => {
    season.pointsWin = parseInt(document.getElementById('input-points-win').value) || 3;
    season.pointsDraw = parseInt(document.getElementById('input-points-draw').value) || 1;
    season.pointsLoss = parseInt(document.getElementById('input-points-loss').value) || 0;
    saveData();
    document.getElementById('modal-points-config').style.display = 'none';
    refreshTabContent(t, season);
    showToast('Points updated', 'success');
  });

  /* League generate modal */
  const genLeagueModal = document.getElementById('modal-gen-league');
  if (genLeagueModal) {
    document.getElementById('close-gen-league').addEventListener('click', () => genLeagueModal.style.display = 'none');
    document.getElementById('btn-cancel-gen-league').addEventListener('click', () => genLeagueModal.style.display = 'none');
    document.getElementById('btn-gen-next-round').addEventListener('click', () => {
      const result = generateLeagueNextRound(t.id, season.id);
      genLeagueModal.style.display = 'none';
      if (result.added > 0) showToast('Round ' + result.round + ' generated (' + result.added + ' matches)', 'success');
      else showToast(result.error || 'No new matches could be generated', 'error');
      refreshTabContent(t, season);
    });
    document.getElementById('btn-gen-all-remaining').addEventListener('click', () => {
      const added = generateLeagueAllRemaining(t.id, season.id);
      genLeagueModal.style.display = 'none';
      if (added > 0) showToast('Generated ' + added + ' matches', 'success');
      else showToast('All rounds already generated', 'info');
      refreshTabContent(t, season);
    });
    document.getElementById('btn-confirm-gen-league').addEventListener('click', () => {
      const n = parseInt(document.getElementById('input-gen-rounds').value) || 1;
      const added = generateLeagueNRounds(t.id, season.id, n);
      genLeagueModal.style.display = 'none';
      if (added > 0) showToast('Generated ' + added + ' matches', 'success');
      else showToast('No new matches could be generated', 'error');
      refreshTabContent(t, season);
    });
  }

  /* Add match modal */
  const addMatchModal = document.getElementById('modal-add-match');
  if (addMatchModal) {
    document.getElementById('close-add-match').addEventListener('click', () => addMatchModal.style.display = 'none');
    document.getElementById('btn-cancel-add-match').addEventListener('click', () => addMatchModal.style.display = 'none');
    document.getElementById('btn-confirm-add-match').addEventListener('click', () => {
      const homeId = document.getElementById('add-match-home').value;
      const awayId = document.getElementById('add-match-away').value;
      const errEl = document.getElementById('add-match-error');
      if (homeId === awayId) {
        errEl.textContent = 'Home and away teams must be different.';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';
      let round = null, stage = null, groupId = null;
      const roundEl = document.getElementById('add-match-round');
      if (roundEl) round = parseInt(roundEl.value) || null;
      const stageEl = document.getElementById('add-match-stage');
      if (stageEl) stage = stageEl.value.trim() || null;
      const groupEl = document.getElementById('add-match-group');
      if (groupEl) groupId = groupEl.value || null;
      const matchType = t.type === 'league' ? 'league' : groupId ? 'group' : 'knockout';
      const result = addManualMatch(t.id, season.id, homeId, awayId, matchType, round, groupId, stage);
      if (result.error) {
        errEl.textContent = result.error;
        errEl.style.display = 'block';
        return;
      }
      if (groupId && season.groups) {
        const group = season.groups.find(g => g.id === groupId);
        if (group) { group.matchIds.push(result.match.id); saveData(); }
      }
      addMatchModal.style.display = 'none';
      showToast('Match added', 'success');
      refreshTabContent(t, season);
    });
  }

  /* Groups generate modal */
  const genGroupsModal = document.getElementById('modal-generate-groups');
  if (genGroupsModal) {
    document.getElementById('close-gen-modal').addEventListener('click', () => genGroupsModal.style.display = 'none');
    document.getElementById('btn-cancel-gen').addEventListener('click', () => genGroupsModal.style.display = 'none');
    document.getElementById('btn-confirm-gen-groups').addEventListener('click', () => {
      const numGroups = parseInt(document.getElementById('input-num-groups').value) || 2;
      season.groups = [];
      appData.matches = appData.matches.filter(m => !(m.tournamentId === t.id && m.seasonId === season.id && m.matchType === 'group'));
      saveData();
      generateGroups(t.id, season.id, numGroups);
      genGroupsModal.style.display = 'none';
      showToast('Groups generated!', 'success');
      refreshTabContent(t, season);
    });
  }

  addTabEventListeners(t, season, getTournamentTabs(t.type)[0].id);
  addNavLinks();
}

function refreshTabContent(t, season) {
  document.getElementById('tournament-tab-content').innerHTML = renderTournamentTabContent(t, season, _currentTabId);
  addTabEventListeners(t, season, _currentTabId);
  addNavLinks();
}

function addTabEventListeners(t, season, tabId) {

  /* Standings mode buttons + sort */
  if (tabId === 'standings') {
    let currentMode = 'short';
    document.querySelectorAll('.table-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.table-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        const rows = getLeagueStandings(t.id, season.id);
        document.getElementById('standings-table-wrap').innerHTML = renderStandingsTable(rows, currentMode, t, season, _standingsSort);
        bindSortHeaders(t, season, currentMode);
        addNavLinks();
      });
    });
    bindSortHeaders(t, season, 'short');

    /* Points config open button (inside standings tab) */
    const pointsBtn = document.getElementById('btn-config-points');
    if (pointsBtn) {
      pointsBtn.addEventListener('click', () => document.getElementById('modal-points-config').style.display = 'flex');
    }
  }

  /* Open generate league modal */
  document.querySelectorAll('.btn-open-gen-league').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById('modal-gen-league');
      if (modal) modal.style.display = 'flex';
    });
  });

  /* Open add match modal */
  document.querySelectorAll('.btn-open-add-match').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById('modal-add-match');
      if (modal) modal.style.display = 'flex';
    });
  });

  /* Open groups modal */
  document.querySelectorAll('.btn-open-gen-groups').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById('modal-generate-groups');
      if (modal) modal.style.display = 'flex';
    });
  });

  /* Bracket generate */
  document.querySelectorAll('.btn-open-gen-bracket').forEach(btn => {
    btn.addEventListener('click', () => {
      showConfirmModal('Generate Bracket?', 'A new bracket stage will be generated for ' + season.teamIds.length + ' teams.', () => {
        generateKnockoutBracket(t.id, season.id, season.teamIds, 'Round of ' + season.teamIds.length, season.bracketLegs || 1);
        showToast('Bracket generated!', 'success');
        refreshTabContent(t, season);
      });
    });
  });

  /* Add next bracket round */
  document.querySelectorAll('.btn-add-bracket-round').forEach(btn => {
    btn.addEventListener('click', () => {
      const lastStage = season.bracket?.stages[season.bracket.stages.length - 1];
      if (!lastStage) return;
      const winners = lastStage.pairs.map(pair => {
        const agg = getKnockoutAggregate(pair, lastStage.legs);
        if (!agg) return null;
        return agg.team1Goals >= agg.team2Goals ? pair.team1 : pair.team2;
      }).filter(Boolean);
      if (winners.length < 2) { showToast('Not enough winners for next round', 'error'); return; }
      const stageName = winners.length === 2 ? 'Final' : winners.length === 4 ? 'Semi-Final' : 'Round of ' + winners.length;
      generateKnockoutBracket(t.id, season.id, winners, stageName, lastStage.legs);
      showToast('Next round added!', 'success');
      refreshTabContent(t, season);
    });
  });
}

function bindSortHeaders(t, season, mode) {
  document.querySelectorAll('.sortable-th').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const col = th.dataset.sortCol;
      if (_standingsSort.col === col) {
        _standingsSort.dir = _standingsSort.dir === 'desc' ? 'asc' : 'desc';
      } else {
        _standingsSort.col = col;
        _standingsSort.dir = 'desc';
      }
      const rows = getLeagueStandings(t.id, season.id);
      document.getElementById('standings-table-wrap').innerHTML = renderStandingsTable(rows, mode, t, season, _standingsSort);
      bindSortHeaders(t, season, mode);
      addNavLinks();
    });
  });
}
