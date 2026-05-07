from typing import List, Literal
from pydantic import BaseModel, Field


Difficulty = Literal["easy", "medium", "hard"]


class BotMoveRequest(BaseModel):
    board: List[List[int]] = Field(..., description="10x10 grid of cell states")
    remaining_ships: List[int] = Field(..., description="Sizes of opponent ships not yet sunk")
    difficulty: Difficulty = "hard"


class BotMoveResponse(BaseModel):
    x: int  
    y: int  