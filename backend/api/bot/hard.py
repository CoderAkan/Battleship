import random
from typing import List, Tuple

from .helpers import (
    BOARD_SIZE,
    CELL_HIT,
    CELL_UNKNOWN,
    ORTHOGONAL,
    can_place_ship,
    get_unknown_cells,
)

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
    candidates = get_unknown_cells(board)
    if not candidates:
        return (0, 0)

    heatmap = _build_heatmap(board, remaining_ships)

    max_heat = -1
    best_move = random.choice(candidates)
    for r, c in candidates:
        if heatmap[r][c] > max_heat:
            max_heat = heatmap[r][c]
            best_move = (r, c)

    return (best_move[1], best_move[0]) 