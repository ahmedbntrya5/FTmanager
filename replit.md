# Football Tournament Manager

A complete football tournament management web app built with vanilla JavaScript, HTML, and CSS.

## Architecture

Single Page Application (SPA) served via Python HTTP server on port 5000.

### Login
- **index.html** — Login page, access code: `ADMIN2009MORO`
- On success → redirects to `app.html`, stores auth in `sessionStorage`

### Main App
- **app.html** — SPA shell with view containers
- All data stored in `localStorage` via `js/storage.js`

## Project Structure

```
index.html          Login page
app.html            Main SPA
css/Style.css       Dark theme stylesheet
js/
  data.js           Global appData object
  storage.js        loadData() / saveData()
  main.js           Router, navigation, utilities
  modules/
    tournament.js   Tournament / season / schedule logic
    team.js         Team management logic
    player.js       Player management, stats, transfers
    match.js        Match events, scoring logic
    stats.js        Statistics computation
  Ui/
    homeUI.js       Home page rendering
    TournamentUI.js Tournament, standings, bracket, groups
    teamUI.js       Team overview and squad
    playerUI.js     Player profile page
    matchUI.js      Match detail, events timeline
```

## Tournament Types
- **League** — Round-robin schedule with standings table
- **Knockout** — Bracket with 1 or 2-leg support
- **Groups + Knockout** — Group stage then knockout rounds

## Features
- Multi-season support per tournament
- Match events: goals, assists, penalties, own goals, yellow/red cards
- Player stats (goals, assists, cards, appearances) per season and career
- Standings with Short/Full/Form view modes
- Complete statistics page per tournament season
- Player transfers between teams
- Configurable points (win/draw/loss)
- Dark theme, responsive design
- All navigation via SPA (no page reloads)

## Running
The app is served by Python's built-in HTTP server on port 5000.
