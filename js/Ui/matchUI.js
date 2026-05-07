function renderMatch(matchId) {
  const match = getMatch(matchId);
  if (!match) { navigate('home'); return; }

  const homeTeam = getTeam(match.homeTeamId);
  const awayTeam = getTeam(match.awayTeamId);
  const t = getTournament(match.tournamentId);
  const season = getSeason(match.tournamentId, match.seasonId);

  const view = document.getElementById('view-match');
  view.innerHTML = `
    <div class="page-header">
      <button class="btn btn-ghost back-btn" id="btn-back-match">${t ? '← ' + escapeHtml(t.name) : '← Back'}</button>
      <h1 class="page-title">${escapeHtml(homeTeam?.name || '?')} vs ${escapeHtml(awayTeam?.name || '?')}</h1>
    </div>

    <div class="match-detail">
      <div class="match-detail-scoreboard">
        <div class="match-detail-team">
          <a class="link team-name-link" href="#" data-nav="team" data-team-id="${match.homeTeamId}" data-tournament-id="${match.tournamentId}" data-season-id="${match.seasonId}">
            ${escapeHtml(homeTeam?.name || '?')}
          </a>
        </div>
        <div class="match-detail-score-center">
          <div class="match-big-score">${match.played ? match.homeScore + ' - ' + match.awayScore : 'vs'}</div>
          ${match.time ? `<div class="match-detail-time">${match.time}</div>` : ''}
          ${match.date ? `<div class="match-detail-date">${match.date}</div>` : ''}
          ${match.stadium ? `<div class="match-detail-stadium">📍 ${escapeHtml(match.stadium)}</div>` : ''}
          ${match.stage ? `<div class="match-detail-stage">${escapeHtml(match.stage)}</div>` : ''}
          ${match.round ? `<div class="match-detail-stage">Round ${match.round}</div>` : ''}
        </div>
        <div class="match-detail-team">
          <a class="link team-name-link" href="#" data-nav="team" data-team-id="${match.awayTeamId}" data-tournament-id="${match.tournamentId}" data-season-id="${match.seasonId}">
            ${escapeHtml(awayTeam?.name || '?')}
          </a>
        </div>
      </div>

      <div class="match-actions-bar">
        <button class="btn btn-secondary" id="btn-edit-match-info">✏ Edit Info</button>
        <button class="btn btn-primary" id="btn-add-event">+ Add Event</button>
        ${!match.played ? `<button class="btn btn-success" id="btn-finalize-match">✓ Finalize Match</button>` : `<button class="btn btn-warning" id="btn-unfinalize-match">↩ Mark as Not Played</button>`}
        <button class="btn btn-secondary" id="btn-set-score">Set Score</button>
      </div>

      <div class="match-events-section">
        <h3>Match Events</h3>
        <div id="match-events-list">
          ${renderMatchEvents(match, homeTeam, awayTeam)}
        </div>
      </div>
    </div>

    ${renderEditMatchInfoModal(match)}
    ${renderAddEventModal(match, homeTeam, awayTeam)}
    ${renderSetScoreModal(match)}
  `;

  addMatchEventListeners(match, homeTeam, awayTeam, t, season);
}

function renderMatchEvents(match, homeTeam, awayTeam) {
  if (!match.events || match.events.length === 0) {
    return '<div class="empty-state">No events yet.</div>';
  }

  const sorted = [...match.events].sort((a, b) => (a.minute || 0) - (b.minute || 0));
  return `
    <div class="events-timeline">
      ${sorted.map(ev => {
        const player = ev.playerId ? getPlayer(ev.playerId) : null;
        const assist = ev.assistId ? getPlayer(ev.assistId) : null;
        const isHome = ev.teamId === match.homeTeamId;
        const icon = { goal: '⚽', penalty: '⚽ (P)', yellow: '🟨', red: '🟥', ownGoal: '⚽ (OG)' }[ev.type] || ev.type;
        return `
          <div class="event-row ${isHome ? 'event-home' : 'event-away'}">
            ${isHome ? `
              <div class="event-detail">
                <span class="event-icon">${icon}</span>
                <span>${player ? `<a class="link" href="#" data-nav="player" data-player-id="${ev.playerId}">${escapeHtml(player.name)}</a>` : '?'}</span>
                ${assist ? `<span class="event-assist"> ← <a class="link" href="#" data-nav="player" data-player-id="${ev.assistId}">${escapeHtml(assist.name)}</a></span>` : ''}
              </div>
              <div class="event-minute">${ev.minute || '?'}'</div>
              <div class="event-spacer"></div>
            ` : `
              <div class="event-spacer"></div>
              <div class="event-minute">${ev.minute || '?'}'</div>
              <div class="event-detail">
                <span class="event-icon">${icon}</span>
                <span>${player ? `<a class="link" href="#" data-nav="player" data-player-id="${ev.playerId}">${escapeHtml(player.name)}</a>` : '?'}</span>
                ${assist ? `<span class="event-assist"> ← <a class="link" href="#" data-nav="player" data-player-id="${ev.assistId}">${escapeHtml(assist.name)}</a></span>` : ''}
              </div>
            `}
            <button class="btn btn-xs btn-danger event-remove-btn" data-event-id="${ev.id}" title="Remove event">×</button>
          </div>`;
      }).join('')}
    </div>`;
}

function renderEditMatchInfoModal(match) {
  return `
    <div class="modal-overlay" id="modal-edit-match-info" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2>Edit Match Info</h2>
          <button class="modal-close" id="close-edit-match-info">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Date</label>
              <input type="date" id="match-date" class="form-input" value="${match.date || ''}">
            </div>
            <div class="form-group">
              <label>Time</label>
              <input type="time" id="match-time" class="form-input" value="${match.time || ''}">
            </div>
          </div>
          <div class="form-group">
            <label>Stadium</label>
            <input type="text" id="match-stadium" class="form-input" value="${escapeHtml(match.stadium || '')}" placeholder="Stadium name">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-edit-match-info">Cancel</button>
          <button class="btn btn-primary" id="btn-save-edit-match-info">Save</button>
        </div>
      </div>
    </div>`;
}

function renderAddEventModal(match, homeTeam, awayTeam) {
  const homePlayers = getTeamPlayers(match.homeTeamId);
  const awayPlayers = getTeamPlayers(match.awayTeamId);

  function playerOptions(players) {
    return players.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (#${p.number || '?'})</option>`).join('');
  }

  return `
    <div class="modal-overlay" id="modal-add-event" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2>Add Match Event</h2>
          <button class="modal-close" id="close-add-event">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Event Type</label>
              <select id="event-type" class="form-input">
                <option value="goal">Goal</option>
                <option value="penalty">Penalty Goal</option>
                <option value="ownGoal">Own Goal</option>
                <option value="yellow">Yellow Card</option>
                <option value="red">Red Card</option>
              </select>
            </div>
            <div class="form-group">
              <label>Minute</label>
              <input type="number" id="event-minute" class="form-input" min="1" max="120" placeholder="45">
            </div>
          </div>
          <div class="form-group">
            <label>Team</label>
            <select id="event-team" class="form-input">
              <option value="${match.homeTeamId}">${escapeHtml(homeTeam?.name || 'Home')}</option>
              <option value="${match.awayTeamId}">${escapeHtml(awayTeam?.name || 'Away')}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Player</label>
            <select id="event-player" class="form-input">
              <option value="">-- Select Player --</option>
              <optgroup label="${escapeHtml(homeTeam?.name || 'Home')}">${playerOptions(homePlayers)}</optgroup>
              <optgroup label="${escapeHtml(awayTeam?.name || 'Away')}">${playerOptions(awayPlayers)}</optgroup>
            </select>
          </div>
          <div class="form-group" id="assist-group">
            <label>Assist (optional)</label>
            <select id="event-assist" class="form-input">
              <option value="">-- None --</option>
              <optgroup label="${escapeHtml(homeTeam?.name || 'Home')}">${playerOptions(homePlayers)}</optgroup>
              <optgroup label="${escapeHtml(awayTeam?.name || 'Away')}">${playerOptions(awayPlayers)}</optgroup>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-add-event">Cancel</button>
          <button class="btn btn-primary" id="btn-confirm-add-event">Add Event</button>
        </div>
      </div>
    </div>`;
}

function renderSetScoreModal(match) {
  return `
    <div class="modal-overlay" id="modal-set-score" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2>Set Score Directly</h2>
          <button class="modal-close" id="close-set-score">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-hint">⚠ This will override the event-based score and mark the match as played.</p>
          <div class="form-row">
            <div class="form-group">
              <label>Home Score</label>
              <input type="number" id="score-home" class="form-input" min="0" value="${match.homeScore}">
            </div>
            <div class="form-group">
              <label>Away Score</label>
              <input type="number" id="score-away" class="form-input" min="0" value="${match.awayScore}">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-set-score">Cancel</button>
          <button class="btn btn-primary" id="btn-confirm-set-score">Set Score</button>
        </div>
      </div>
    </div>`;
}

function addMatchEventListeners(match, homeTeam, awayTeam, t, season) {
  document.getElementById('btn-back-match').addEventListener('click', () => {
    navigate('tournament', { tournamentId: match.tournamentId, seasonId: match.seasonId });
  });

  document.getElementById('btn-edit-match-info').addEventListener('click', () => {
    document.getElementById('modal-edit-match-info').style.display = 'flex';
  });
  document.getElementById('close-edit-match-info').addEventListener('click', () => document.getElementById('modal-edit-match-info').style.display = 'none');
  document.getElementById('btn-cancel-edit-match-info').addEventListener('click', () => document.getElementById('modal-edit-match-info').style.display = 'none');
  document.getElementById('btn-save-edit-match-info').addEventListener('click', () => {
    updateMatch(match.id, {
      date: document.getElementById('match-date').value,
      time: document.getElementById('match-time').value,
      stadium: document.getElementById('match-stadium').value.trim()
    });
    document.getElementById('modal-edit-match-info').style.display = 'none';
    renderMatch(match.id);
    showToast('Match info updated', 'success');
  });

  document.getElementById('btn-add-event').addEventListener('click', () => {
    document.getElementById('modal-add-event').style.display = 'flex';
  });
  document.getElementById('close-add-event').addEventListener('click', () => document.getElementById('modal-add-event').style.display = 'none');
  document.getElementById('btn-cancel-add-event').addEventListener('click', () => document.getElementById('modal-add-event').style.display = 'none');

  document.getElementById('event-type').addEventListener('change', e => {
    const isGoalType = ['goal', 'penalty'].includes(e.target.value);
    document.getElementById('assist-group').style.display = isGoalType ? '' : 'none';
  });

  document.getElementById('btn-confirm-add-event').addEventListener('click', () => {
    const type = document.getElementById('event-type').value;
    const minute = parseInt(document.getElementById('event-minute').value) || 0;
    const teamId = document.getElementById('event-team').value;
    const playerId = document.getElementById('event-player').value || null;
    const assistId = document.getElementById('event-assist').value || null;
    addMatchEvent(match.id, { type, minute, teamId, playerId, assistId });
    document.getElementById('modal-add-event').style.display = 'none';
    renderMatch(match.id);
    showToast('Event added', 'success');
  });

  const finalizeBtn = document.getElementById('btn-finalize-match');
  if (finalizeBtn) {
    finalizeBtn.addEventListener('click', () => {
      showConfirmModal('Finalize match?', 'This will mark the match as played.', () => {
        finalizeMatch(match.id);
        renderMatch(match.id);
        showToast('Match finalized!', 'success');
      });
    });
  }

  const unfinalizeBtn = document.getElementById('btn-unfinalize-match');
  if (unfinalizeBtn) {
    unfinalizeBtn.addEventListener('click', () => {
      showConfirmModal('Unfinalize match?', 'This will mark the match as not played.', () => {
        updateMatch(match.id, { played: false });
        renderMatch(match.id);
        showToast('Match unmarked as played', 'success');
      });
    });
  }

  document.getElementById('btn-set-score').addEventListener('click', () => {
    document.getElementById('modal-set-score').style.display = 'flex';
  });
  document.getElementById('close-set-score').addEventListener('click', () => document.getElementById('modal-set-score').style.display = 'none');
  document.getElementById('btn-cancel-set-score').addEventListener('click', () => document.getElementById('modal-set-score').style.display = 'none');
  document.getElementById('btn-confirm-set-score').addEventListener('click', () => {
    const hs = parseInt(document.getElementById('score-home').value) || 0;
    const as = parseInt(document.getElementById('score-away').value) || 0;
    setMatchScore(match.id, hs, as);
    document.getElementById('modal-set-score').style.display = 'none';
    renderMatch(match.id);
    showToast('Score set', 'success');
  });

  document.querySelectorAll('.event-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showConfirmModal('Remove event?', 'This will undo the event stats.', () => {
        removeMatchEvent(match.id, btn.dataset.eventId);
        renderMatch(match.id);
        showToast('Event removed', 'success');
      });
    });
  });

  addNavLinks();
}
