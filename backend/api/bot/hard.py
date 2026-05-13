"""
Hard bot: same heatmap logic as Medium, plus directional locking.

When the unresolved hits form a line of 2+ collinear hits on the same
row or column, the ship's axis is known. The bot locks in on that axis
and only fires along it — extending past the line's ends or filling
any unknown gaps in the middle.

With just one isolated hit, Hard behaves identically to Medium (heatmap
+ adjacency bonus). The skill bump over Medium is purely the locking
step.

Sunk-ship cells are encoded separately by the frontend (CELL_SUNK),
so the directional-lock logic doesn't get tricked by already-finished
ships that happen to be collinear with a fresh hit.
"""

import logging
import random
from typing import List, Tuple

from .helpers import (
    BOARD_SIZE,
    CELL_HIT,
    CELL_UNKNOWN,
    ORTHOGONAL,
    can_place_ship,
    find_collinear_hit_axis,
    get_unknown_cells,
    get_unresolved_hits,
)

log = logging.getLogger("bot.hard")

HIT_ADJACENCY_BONUS = 100


def _build_heatmap(
    board: List[List[int]],
    remaining_ships: List[int],
) -> List[List[int]]:
    heatmap = [[0 for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]

    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            if board[r][c] != CELL_HIT:
                continue
            for dr, dc in ORTHOGONAL:
                nr, nc = r + dr, c + dc
                if 0 <= nr < BOARD_SIZE and 0 <= nc < BOARD_SIZE and board[nr][nc] == CELL_UNKNOWN:
                    heatmap[nr][nc] += HIT_ADJACENCY_BONUS

    for ship_size in remaining_ships:
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                if can_place_ship(board, ship_size, c, r, "horizontal"):
                    for i in range(ship_size):
                        if c + i < BOARD_SIZE and board[r][c + i] == CELL_UNKNOWN:
                            heatmap[r][c + i] += 1
                if can_place_ship(board, ship_size, c, r, "vertical"):
                    for i in range(ship_size):
                        if r + i < BOARD_SIZE and board[r + i][c] == CELL_UNKNOWN:
                            heatmap[r + i][c] += 1

    return heatmap


def hard_move(board: List[List[int]], remaining_ships: List[int]) -> Tuple[int, int]:
    # Diagnostic: log what the bot sees and decides. Visible in your
    # backend terminal — if Hard misbehaves again, this output tells us
    # exactly why.
    hits = get_unresolved_hits(board)
    # print(f"[HARD] unresolved hits: {hits}")

    # ─── Step 1: directional lock ───
    axis, candidates = find_collinear_hit_axis(board)
    # print(f"[HARD] axis={axis} candidates={candidates}")

    if axis is not None and candidates:
        # Fast path: only one candidate, no tie-breaking needed.
        if len(candidates) == 1:
            r, c = candidates[0]
            # print(f"[HARD] locked → single candidate ({r},{c}) → returning (x={c}, y={r})")
            return (c, r)

        heatmap = _build_heatmap(board, remaining_ships)
        best = max(candidates, key=lambda rc: heatmap[rc[0]][rc[1]])
        # print(f"[HARD] locked → best of {candidates} is {best} → returning (x={best[1]}, y={best[0]})")
        return (best[1], best[0])

    # ─── Step 2: fall back to heatmap behavior ───
    unknown = get_unknown_cells(board)
    if not unknown:
        return (0, 0)

    heatmap = _build_heatmap(board, remaining_ships)

    max_heat = -1
    best_move = random.choice(unknown)
    for r, c in unknown:
        if heatmap[r][c] > max_heat:
            max_heat = heatmap[r][c]
            best_move = (r, c)

    # print(f"[HARD] no lock → heatmap pick {best_move} → returning (x={best_move[1]}, y={best_move[0]})")
    return (best_move[1], best_move[0])