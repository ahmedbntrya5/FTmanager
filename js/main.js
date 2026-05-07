const VIEWS = ['home', 'tournament', 'team', 'player', 'match'];

let currentRoute = { view: 'home', params: {} };

function navigate(view, params, fromPopstate) {
  params = params || {};
  currentRoute = { view, params };

  if (!fromPopstate) {
    const state = { view, params };
    history.pushState(state, '', '#' + view);
  }

  showView(view);

  switch (view) {
    case 'home':
      renderHome();
      break;
    case 'tournament':
      renderTournament(params.tournamentId, params.seasonId);
      break;
    case 'team':
      renderTeam(params.teamId, params.tournamentId, params.seasonId);
      break;
    case 'player':
      renderPlayer(params.playerId);
      break;
    case 'match':
      renderMatch(params.matchId);
      break;
  }
  addNavLinks();
}

function showView(view) {
  VIEWS.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) el.style.display = v === view ? '' : 'none';
  });
}

function addNavLinks() {
  document.querySelectorAll('[data-nav]').forEach(link => {
    if (link._navBound) return;
    link._navBound = true;
    link.addEventListener('click', e => {
      e.preventDefault();
      const nav = link.dataset.nav;
      const params = {};
      if (link.dataset.tournamentId) params.tournamentId = link.dataset.tournamentId;
      if (link.dataset.seasonId)     params.seasonId     = link.dataset.seasonId;
      if (link.dataset.teamId)       params.teamId       = link.dataset.teamId;
      if (link.dataset.playerId)     params.playerId     = link.dataset.playerId;
      if (link.dataset.matchId)      params.matchId      = link.dataset.matchId;
      navigate(nav, params);
    });
  });
}

function showToast(message, type) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'info');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showConfirmModal(title, message, onConfirm) {
  let overlay = document.getElementById('confirm-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'confirm-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2 id="confirm-modal-title"></h2>
        </div>
        <div class="modal-body">
          <p id="confirm-modal-message"></p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirm-modal-cancel">Cancel</button>
          <button class="btn btn-danger" id="confirm-modal-ok">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  document.getElementById('confirm-modal-title').textContent   = title;
  document.getElementById('confirm-modal-message').textContent = message;
  overlay.style.display = 'flex';

  const okBtn     = document.getElementById('confirm-modal-ok');
  const cancelBtn = document.getElementById('confirm-modal-cancel');
  const newOk     = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  const newCancel = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

  document.getElementById('confirm-modal-ok').addEventListener('click', () => {
    overlay.style.display = 'none';
    if (onConfirm) onConfirm();
  });
  document.getElementById('confirm-modal-cancel').addEventListener('click', () => {
    overlay.style.display = 'none';
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── History API back-button support ── */
window.addEventListener('popstate', e => {
  if (e.state && e.state.view) {
    navigate(e.state.view, e.state.params || {}, true);
  } else {
    navigate('home', {}, true);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  navigate('home');
});
