from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .schemas import BotMoveRequest, BotMoveResponse
from .bot import get_move
from .bot.helpers import random_unknown


app = FastAPI(title="Battleship Bot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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