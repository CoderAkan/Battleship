from typing import List, Literal, Optional
from pydantic import BaseModel


class ShipPlacement(BaseModel):
    type: str
    size: int
    coordinates: List[dict]  



class CreateRoomMsg(BaseModel):
    type: Literal["create_room"]


class JoinRoomMsg(BaseModel):
    type: Literal["join_room"]
    code: str


class SubmitBoardMsg(BaseModel):
    type: Literal["submit_board"]
    ships: List[ShipPlacement]


class FireShotMsg(BaseModel):
    type: Literal["fire_shot"]
    x: int
    y: int


class LeaveRoomMsg(BaseModel):
    type: Literal["leave_room"]

class RoomCreatedMsg(BaseModel):
    type: Literal["room_created"] = "room_created"
    code: str


class RoomJoinedMsg(BaseModel):
    type: Literal["room_joined"] = "room_joined"
    you_are: Literal["p1", "p2"]
    opponent_username: str
    opponent_elo: int


class PhaseChangeMsg(BaseModel):
    type: Literal["phase_change"] = "phase_change"
    phase: Literal["PLACING", "BATTLE", "RESULT"]


class OpponentReadyMsg(BaseModel):
    type: Literal["opponent_ready"] = "opponent_ready"


class YourTurnMsg(BaseModel):
    type: Literal["your_turn"] = "your_turn"


class ShotResultMsg(BaseModel):
    type: Literal["shot_result"] = "shot_result"
    attacker: Literal["p1", "p2"]
    x: int
    y: int
    result: Literal["hit", "miss", "sunk"]


class GameOverMsg(BaseModel):
    type: Literal["game_over"] = "game_over"
    winner: Literal["p1", "p2"]
    reason: Literal["all_ships_sunk", "opponent_forfeit"] = "all_ships_sunk"
    elo_change: int  # this player's ELO delta
    new_elo: int


class MatchCancelledMsg(BaseModel):
    type: Literal["match_cancelled"] = "match_cancelled"
    reason: str


class OpponentDisconnectedMsg(BaseModel):
    """Sent when the opponent's WebSocket closes mid-match."""
    type: Literal["opponent_disconnected"] = "opponent_disconnected"


class ErrorMsg(BaseModel):
    type: Literal["error"] = "error"
    message: str