from dotenv import load_dotenv
import os

# MUST be before any other imports — multiplayer.auth reads env vars at module load
load_dotenv()

print("─" * 50)
print("SUPABASE_URL:", os.getenv("SUPABASE_URL", "❌ NOT SET"))
print("SUPABASE_JWT_SECRET:", "✅ SET" if os.getenv("SUPABASE_JWT_SECRET") else "❌ NOT SET")
print("SUPABASE_SERVICE_ROLE_KEY:", "✅ SET" if os.getenv("SUPABASE_SERVICE_ROLE_KEY") else "❌ NOT SET")
print("─" * 50)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .schemas import BotMoveRequest, BotMoveResponse
from .bot import get_move
from .bot.helpers import random_unknown
from .multiplayer import router as multiplayer_router    # ← note the dot

app = FastAPI(title="Battleship API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(multiplayer_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/bot/move", response_model=BotMoveResponse)
async def calculate_move(data: BotMoveRequest) -> BotMoveResponse:
    try:
        x, y = get_move(data.difficulty, data.board, data.remaining_ships)
        return BotMoveResponse(x=x, y=y)
    except Exception as e:
        print(f"Bot error: {e}")
        x, y = random_unknown(data.board)
        return BotMoveResponse(x=x, y=y)