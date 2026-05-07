"""
Room — a single multiplayer match.

Holds both players' boards, ships, shot history, and whose turn it is.
Game logic mirrors the frontend (hit/miss/sunk detection, win condition)
so the server is the source of truth for what's happened.

NOT thread-safe. The RoomManager serializes access if we ever need it,
but for invite-code play with 2 players, asyncio's single-threaded nature
makes this a non-issue.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional, Set, Tuple
from fastapi import WebSocket


PlayerSlot = Literal["p1", "p2"]
Phase = Literal["WAITING", "PLACING", "BATTLE", "RESULT"]
ShotResult = Literal["hit", "miss", "sunk"]

# Threshold: if a player who had < this many hits disconnects, the match is
# cancelled with no ELO change. Otherwise it's a forfeit loss.
FORFEIT_HITS_THRESHOLD = 5


@dataclass
class PlayerState:
    user_id: str
    username: str
    elo: int
    websocket: WebSocket
    ships: List[dict] = field(default_factory=list)  # [{type, size, coordinates: [{x,y}]}]
    ship_cells: Set[Tuple[int, int]] = field(default_factory=set)  # flat (x, y) for fast lookup
    hits_taken: Set[Tuple[int, int]] = field(default_factory=set)  # opponent's hits on us
    shots_fired: int = 0
    successful_hits: int = 0
    board_submitted: bool = False
    connected: bool = True


@dataclass
class Room:
    code: str
    p1: Optional[PlayerState] = None
    p2: Optional[PlayerState] = None
    phase: Phase = "WAITING"
    turn: PlayerSlot = "p1"
    winner: Optional[PlayerSlot] = None

    # ─────────────────────── lifecycle ───────────────────────

    def is_full(self) -> bool:
        return self.p1 is not None and self.p2 is not None

    def slot_for(self, user_id: str) -> Optional[PlayerSlot]:
        if self.p1 and self.p1.user_id == user_id:
            return "p1"
        if self.p2 and self.p2.user_id == user_id:
            return "p2"
        return None

    def get_player(self, slot: PlayerSlot) -> Optional[PlayerState]:
        return self.p1 if slot == "p1" else self.p2

    def get_opponent(self, slot: PlayerSlot) -> Optional[PlayerState]:
        return self.p2 if slot == "p1" else self.p1

    def add_player(self, player: PlayerState) -> PlayerSlot:
        """
        Place player into the next open slot. Raises if room is full.
        """
        if self.p1 is None:
            self.p1 = player
            return "p1"
        if self.p2 is None:
            self.p2 = player
            return "p2"
        raise ValueError("Room is full")

    # ─────────────────────── ship placement ───────────────────────

    def submit_board(self, slot: PlayerSlot, ships: List[dict]) -> None:
        """
        Store the player's ship layout. We trust the client's coordinates
        per the "casual, friends-only" decision — no validation that ships
        don't overlap or touch. The frontend already enforces this; cheating
        a friend by sending invalid ships is a self-own.
        """
        player = self.get_player(slot)
        if player is None:
            raise ValueError(f"No player in slot {slot}")
        if player.board_submitted:
            raise ValueError("Board already submitted")

        player.ships = ships
        player.ship_cells = {
            (coord["x"], coord["y"])
            for ship in ships
            for coord in ship["coordinates"]
        }
        player.board_submitted = True

    def both_boards_submitted(self) -> bool:
        return (
            self.p1 is not None and self.p1.board_submitted
            and self.p2 is not None and self.p2.board_submitted
        )

    # ─────────────────────── shooting ───────────────────────

    def fire_shot(self, attacker_slot: PlayerSlot, x: int, y: int) -> Tuple[ShotResult, bool, Optional[List[Tuple[int, int]]]]:
        """
        Process a shot. Returns (result, game_over, sunk_ship_cells).

        sunk_ship_cells is None unless result == 'sunk', in which case it's
        the list of (x, y) coordinates of the just-sunk ship — used by the
        WS layer to reveal those cells on the attacker's enemy-board view.
        """
        if self.phase != "BATTLE":
            raise ValueError("Not in battle phase")
        if attacker_slot != self.turn:
            raise ValueError("Not your turn")
        if not (0 <= x < 10 and 0 <= y < 10):
            raise ValueError("Out of bounds")

        attacker = self.get_player(attacker_slot)
        defender = self.get_opponent(attacker_slot)
        if attacker is None or defender is None:
            raise ValueError("Missing player")

        if (x, y) in defender.hits_taken:
            raise ValueError("Cell already targeted")

        defender.hits_taken.add((x, y))
        attacker.shots_fired += 1

        is_hit = (x, y) in defender.ship_cells
        if not is_hit:
            self.turn = "p2" if self.turn == "p1" else "p1"
            return ("miss", False, None)

        attacker.successful_hits += 1

        sunk_ship = self._find_sunk_ship(defender, x, y)
        result: ShotResult = "sunk" if sunk_ship else "hit"
        sunk_cells: Optional[List[Tuple[int, int]]] = None
        if sunk_ship:
            sunk_cells = [(c["x"], c["y"]) for c in sunk_ship["coordinates"]]

        all_sunk = defender.ship_cells.issubset(defender.hits_taken)
        if all_sunk:
            self.phase = "RESULT"
            self.winner = attacker_slot
            return (result, True, sunk_cells)

        return (result, False, sunk_cells)

    def _find_sunk_ship(
        self, defender: PlayerState, x: int, y: int
    ) -> Optional[dict]:
        """Return the ship that was just sunk by hitting (x, y), or None."""
        for ship in defender.ships:
            ship_cells = {(c["x"], c["y"]) for c in ship["coordinates"]}
            if (x, y) not in ship_cells:
                continue
            if ship_cells.issubset(defender.hits_taken):
                return ship
        return None

    # ─────────────────────── disconnect handling ───────────────────────

    def handle_disconnect(self, slot: PlayerSlot) -> Literal["forfeit", "cancelled", "ignore"]:
        """
        Decide what happens when a player disconnects.

        Per your rule: if the disconnector has < 5 successful hits, the match
        is cancelled (no ELO change). Otherwise it's a forfeit loss for them.

        Returns one of:
          - "forfeit"   → opponent wins, record stats with ELO change
          - "cancelled" → no winner, no stats recorded
          - "ignore"    → match wasn't in BATTLE, nothing to do
        """
        player = self.get_player(slot)
        if player is None:
            return "ignore"

        player.connected = False

        # Disconnects in WAITING/PLACING just kill the room with no penalty.
        if self.phase != "BATTLE":
            return "cancelled"

        if player.successful_hits < FORFEIT_HITS_THRESHOLD:
            self.phase = "RESULT"
            return "cancelled"

        # Forfeit: opponent wins.
        self.phase = "RESULT"
        self.winner = "p2" if slot == "p1" else "p1"
        return "forfeit"