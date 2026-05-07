# Battleship

A web version of the classic Battleship game. Play against an AI bot or against a friend on the same device.

## Features

- Two game modes: vs. AI bot or local 2-player
- English and Russian language support
- Sign-up and login with Supabase
- Smart AI bot with a fallback if the server is offline
- Standard rules: 10×10 board, 5 ships (sizes 5, 4, 3, 3, 2), ships can't touch
- Works on phone, tablet, and desktop
- Hand-off screen between turns in 2-player mode so players don't see each other's ships

## Tech Stack

**Frontend:** React, TypeScript, Tailwind CSS, Zustand
**Backend:** Python, FastAPI
**Auth and DB:** Supabase

## Project Structure

```
.
├── frontend/   # React + TypeScript app
└── backend/    # Python FastAPI server (AI bot)
```

## Setup

You need Node.js 18+ and Python 3.10+.

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`.

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Runs at `http://localhost:8000`.

Start the backend first, then the frontend. If the backend is off, the bot still works — it just plays random moves.

## How to Play

1. Pick a mode from the start menu
2. Place your ships by tapping the board. Use *Rotate* to flip the ship
3. Tap the enemy board to fire. Hit = fire again. Miss = other player's turn
4. Sink all enemy ships to win

## Design Choices

**One game store with Zustand.** All game data (turn, boards, ships, winner) lives in one place. This keeps the code simple and avoids passing data through many components.

**Bot runs on a Python server.** This way the AI logic is separate from the UI and easy to change later. If the server is slow or off, the frontend waits 2 seconds, then falls back to random moves so the game never freezes.

**Supabase for accounts.** No custom auth code needed. The Python server only handles game logic.

**Grid that scales.** The 10×10 grid fills whatever space its parent gives it. The same Grid component is used for setup, battle, and the win screen — just at different sizes.

**Cover screen between turns.** In 2-player mode, a full-screen overlay appears between turns so the next player can take the device without seeing the other's ships.

**Translations in one file.** All text is in `translations.ts`, keyed by language. Simpler than adding a full translation library for just two languages.

## Limits

- AI plays smartest only when the backend is running
- No online multiplayer (same device only)
- Game resets if you refresh the page