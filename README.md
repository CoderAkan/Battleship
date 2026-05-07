# Battleship

A web version of the classic Battleship game. Play against an AI bot, against a friend on the same device, or against another player online.

## Features

- **Three game modes:** vs. computer bot (Easy / Medium / Hard difficulty), local 2-player on one device, or online multiplayer with invite codes
- **Online multiplayer:** create or join a room with a 4-letter code, real-time WebSocket-based gameplay, server-authoritative game state
- **ELO rating system:** ELO-based ratings that scale with opponent difficulty (bots) and opponent's actual rating (online), tracked across matches
- **Match history & profile:** view your win/loss record, ELO over time, hit accuracy, and a list of recent matches with ELO deltas
- **Country leaderboard:** see your rank within your country (Default is KZ)
- **English and Russian language support** throughout the entire app
- **Sign-up and login** via Supabase auth
- **Bot fallback:** if the AI server is offline, the bot falls back to random moves so the game never freezes
- **Standard rules:** 10×10 board, 5 ships (sizes 5, 4, 3, 3, 2), ships can't touch
- **Responsive design:** works on phone, tablet, and desktop
- **Pass-the-device screen** between turns in local 2-player mode so players don't see each other's ships
- **Disconnect handling:** in online mode, disconnects before 5 hits cancel the match (no ELO change); after that, count as a forfeit loss

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Zustand, React Router
- **Backend:** Python, FastAPI, WebSockets
- **Auth & DB:** Supabase (Postgres + auth + RLS)
- **Hosting:** Vercel (frontend), Fly.io (backend)
- **Frontend Link:** https://battleship-virid.vercel.app/
- **Backend Link:** https://battleship-backend.onfly.dev/

## Project Structure

```
.
├── frontend/                    # React + TypeScript app (Vite)
└── backend/
    ├── api/
    │   ├── main.py              # FastAPI entry point
    │   ├── bot/                 # AI move strategies (easy/medium/hard)
    │   └── multiplayer/         # WebSocket server + room management
    ├── requirements.txt
    └── Dockerfile
```

## Setup

Requires Node.js 18+ and Python 3.10+.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173`.

Create `frontend/.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

For production, set `VITE_API_URL` and `VITE_WS_URL` to the deployed backend URL using `https://` and `wss://` respectively.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

Runs at `http://localhost:8000`.

Create `backend/.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

The service role key bypasses RLS and is only used server-side for recording match results. Never expose it to the frontend.

Start the backend first, then the frontend. If the backend is off, bot mode still works with random moves; online multiplayer requires the backend.

## How to Play

1. Pick a mode from the start menu (login required for Online).
2. Place your ships by tapping the board. Use **Rotate** to flip orientation. Ships can't touch each other.
3. Tap **Confirm Fleet** when all ships are placed (you can still undo before confirming).
4. Tap the enemy board to fire. Hit = fire again. Miss = opponent's turn.
5. Sink all enemy ships to win.

For online play: one player creates a room and shares the 4-letter code; the other joins with that code. Both ELO ratings update based on the result.

## Design Choices

**Two stores with Zustand.** Local game state (`useGameStore`) and online match state (`useMultiplayerStore`) are separate. The flows are different enough — pass-the-device vs. real-time, no opponent vs. live opponent — that mixing them in one store made conditional logic everywhere.

**Server-authoritative online gameplay.** The Python server holds the truth about each online match — turn order, board state, hits, win condition. Clients send actions; the server validates and broadcasts results. This makes the online code straightforward and prevents a class of bugs where two clients disagree about state.

**Bot strategies as separate modules.** Each difficulty (easy = random, medium = hunt & target, hard = probability heatmap) is its own file in `backend/api/bot/`. Adding a new difficulty is a 3-line change.

**Modal vs. URL routing.** Online play uses a URL route (`/online`) but switches sub-pages based on multiplayer phase rather than nested routes. This avoids URL desync if a match ends or the room closes.

**Supabase for auth and persistence.** No custom auth or session code. Match history and profile aggregates are written by the backend using the service role key (which bypasses RLS), since clients can't be trusted to update their own ELO honestly.

**Single Grid component.** The same `Grid` is used for setup, battle, and the result screen — just at different sizes. The component takes a `Board` and renders cells based on each cell's status (`empty`, `ship`, `hit`, `miss`, `sunk`).

**Translations in one file.** All UI strings are in `translations.ts`, keyed by language. Lighter than i18next for just two languages.

## Known Limits

- **No reconnection in online mode.** A page refresh during a match counts as leaving the room. Adding reconnect would require independent session tracking.
- **Single-server in-memory state.** Online matches live in the FastAPI process's memory. A server restart drops all active matches. Acceptable for casual play with a small user base.
- **Trust-the-client ship placement.** The server doesn't validate that a player's submitted ships are legal (no overlap, no touching). The frontend enforces this; cheating a friend by sending invalid ships is a self-own.
- **No public matchmaking.** Online play requires sharing an invite code. ELO-matched random pairing is a planned addition.
