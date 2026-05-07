const STORAGE_KEY = 'footballAppData';

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      appData.tournaments = parsed.tournaments || [];
      appData.teams = parsed.teams || [];
      appData.players = parsed.players || [];
      appData.matches = parsed.matches || [];
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}
