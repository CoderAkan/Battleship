"""
Medium bot: classic Hunt & Target.

  - Hunt phase: random checkerboard cell. Since the smallest ship is size 2,
    a checkerboard pattern guarantees at least one shot will land on every
    ship without wasting shots.
  - Target phase: when there are unresolved hits, fire at orthogonal
    neighbors — preferring neighbors that line up with another hit (likely
    on the ship's axis).
"""

import random
from typing import List, Tuple

from .helpers import (
    BOARD_SIZE,
    CELL_HIT,
    CELL_UNKNOWN,
    ORTHOGONAL,
    get_unresolved_hits,
    random_unknown,
)


def _targeted_neighbors(board: List[List[int]]) -> List[Tuple[int, int]]:
    """
    Find neighbor cells of any unresolved hit. Returns aligned cells (on the
    ship's likely axis) if any exist, otherwise plain adjacent cells.
    """
    hits = get_unresolved_hits(board)
    if not hits:
        return []

    seen = set()
    aligned: List[Tuple[int, int]] = []
    adjacent: List[Tuple[int, int]] = []

    for (r, c) in hits:
        for dr, dc in ORTHOGONAL:
            nr, nc = r + dr, c + dc
            if not (0 <= nr < BOARD_SIZE and 0 <= nc < BOARD_SIZE):
                continue
            if board[nr][nc] != CELL_UNKNOWN:
                continue
            if (nr, nc) in seen:
                continue
            seen.add((nr, nc))

            # Cell is "aligned" if shooting it extends a known hit pair.
            pr, pc = r - dr, c - dc
            if 0 <= pr < BOARD_SIZE and 0 <= pc < BOARD_SIZE and board[pr][pc] == CELL_HIT:
                aligned.append((nr, nc))
            else:
                adjacent.append((nr, nc))

    return aligned if aligned else adjacent


def _checkerboard_cell(board: List[List[int]]) -> Tuple[int, int] | None:
    """Pick a random untouched cell on the (r+c) % 2 == 0 parity."""
    candidates = [
        (r, c)
        for r in range(BOARD_SIZE)
        for c in range(BOARD_SIZE)
        if board[r][c] == CELL_UNKNOWN and (r + c) % 2 == 0
    ]
    if not candidates:
        return None
    return random.choice(candidates)


def medium_move(board: List[List[int]]) -> Tuple[int, int]:
    targets = _targeted_neighbors(board)
    if targets:
        r, c = random.choice(targets)
        return (c, r)

    checker = _checkerboard_cell(board)
    if checker is not None:
        r, c = checker
        return (c, r)

    return random_unknown(board)