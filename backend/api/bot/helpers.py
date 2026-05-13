from typing import List, Tuple

BOARD_SIZE = 10
CELL_UNKNOWN = 0
CELL_MISS = 1
CELL_HIT = 2
CELL_SUNK = 3  # part of a ship that's been fully destroyed

ORTHOGONAL = [(0, 1), (0, -1), (1, 0), (-1, 0)]

# Cells that block a hypothetical ship from being placed somewhere.
# Misses and sunk cells both count — a ship can't pass through either.
BLOCKING_CELLS = {CELL_MISS, CELL_SUNK}


def get_unknown_cells(board: List[List[int]]) -> List[Tuple[int, int]]:
    return [
        (r, c)
        for r in range(BOARD_SIZE)
        for c in range(BOARD_SIZE)
        if board[r][c] == CELL_UNKNOWN
    ]


def get_unresolved_hits(board: List[List[int]]) -> List[Tuple[int, int]]:
    """
    Return cells marked CELL_HIT — hits on ships that aren't sunk yet.
    Excludes CELL_SUNK, since those ships are already finished.
    """
    return [
        (r, c)
        for r in range(BOARD_SIZE)
        for c in range(BOARD_SIZE)
        if board[r][c] == CELL_HIT
    ]


def can_place_ship(
    board: List[List[int]],
    ship_size: int,
    x: int,
    y: int,
    orientation: str,
) -> bool:
    """
    Could a ship of the given size fit here without overlapping a known
    miss or a sunk-ship cell? Hits are OK — the ship might explain them.
    """
    for i in range(ship_size):
        cur_x = x + i if orientation == "horizontal" else x
        cur_y = y + i if orientation == "vertical" else y

        if cur_x < 0 or cur_x >= BOARD_SIZE or cur_y < 0 or cur_y >= BOARD_SIZE:
            return False

        if board[cur_y][cur_x] in BLOCKING_CELLS:
            return False

    return True


def random_unknown(board: List[List[int]]) -> Tuple[int, int]:
    import random
    candidates = get_unknown_cells(board)
    if not candidates:
        return (0, 0)
    r, c = random.choice(candidates)
    return (c, r)


def find_collinear_hit_axis(
    board: List[List[int]],
) -> Tuple[str | None, List[Tuple[int, int]]]:
    """
    Look at the unresolved hits and see if 2+ of them line up on a row
    or column with no MISS / SUNK break between them. If yes, return the
    axis ('horizontal' or 'vertical') and the list of unknown cells along
    that axis worth shooting: the two ends of the line, plus any unknown
    cells in the middle (gaps).

    Returns (None, []) when no such pair exists — caller should fall
    back to heatmap behavior.

    Why we care about the "no break" condition: two hits on the same
    row could belong to two different ships. Only if everything between
    them is also CELL_HIT (or CELL_UNKNOWN gap) can they plausibly be
    one ship.
    """
    hits = get_unresolved_hits(board)
    if len(hits) < 2:
        return (None, [])

    # Group hits by row, then by column.
    by_row: dict[int, List[int]] = {}
    by_col: dict[int, List[int]] = {}
    for r, c in hits:
        by_row.setdefault(r, []).append(c)
        by_col.setdefault(c, []).append(r)

    def horizontal_candidates(row: int, cols: List[int]) -> List[Tuple[int, int]]:
        cols = sorted(cols)
        lo, hi = cols[0], cols[-1]
        # Check the span between hits — no MISS/SUNK allowed.
        for c in range(lo, hi + 1):
            if board[row][c] in BLOCKING_CELLS:
                return []
        candidates: List[Tuple[int, int]] = []
        # Fill any unknown gaps between the outermost hits.
        for c in range(lo + 1, hi):
            if board[row][c] == CELL_UNKNOWN:
                candidates.append((row, c))
        # Try to extend left and right.
        if lo - 1 >= 0 and board[row][lo - 1] == CELL_UNKNOWN:
            candidates.append((row, lo - 1))
        if hi + 1 < BOARD_SIZE and board[row][hi + 1] == CELL_UNKNOWN:
            candidates.append((row, hi + 1))
        return candidates

    def vertical_candidates(col: int, rows: List[int]) -> List[Tuple[int, int]]:
        rows = sorted(rows)
        lo, hi = rows[0], rows[-1]
        for r in range(lo, hi + 1):
            if board[r][col] in BLOCKING_CELLS:
                return []
        candidates: List[Tuple[int, int]] = []
        for r in range(lo + 1, hi):
            if board[r][col] == CELL_UNKNOWN:
                candidates.append((r, col))
        if lo - 1 >= 0 and board[lo - 1][col] == CELL_UNKNOWN:
            candidates.append((lo - 1, col))
        if hi + 1 < BOARD_SIZE and board[hi + 1][col] == CELL_UNKNOWN:
            candidates.append((hi + 1, col))
        return candidates

    # Prefer horizontal-line discoveries (arbitrary — deterministic order).
    for row, cols in by_row.items():
        if len(cols) >= 2:
            cells = horizontal_candidates(row, cols)
            if cells:
                return ("horizontal", cells)

    for col, rows in by_col.items():
        if len(rows) >= 2:
            cells = vertical_candidates(col, rows)
            if cells:
                return ("vertical", cells)

    return (None, [])