from typing import List, Tuple

BOARD_SIZE = 10
CELL_UNKNOWN = 0
CELL_MISS = 1
CELL_HIT = 2

ORTHOGONAL = [(0, 1), (0, -1), (1, 0), (-1, 0)]


def get_unknown_cells(board: List[List[int]]) -> List[Tuple[int, int]]:
    return [
        (r, c)
        for r in range(BOARD_SIZE)
        for c in range(BOARD_SIZE)
        if board[r][c] == CELL_UNKNOWN
    ]


def get_unresolved_hits(board: List[List[int]]) -> List[Tuple[int, int]]:
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
    for i in range(ship_size):
        cur_x = x + i if orientation == "horizontal" else x
        cur_y = y + i if orientation == "vertical" else y

        if cur_x < 0 or cur_x >= BOARD_SIZE or cur_y < 0 or cur_y >= BOARD_SIZE:
            return False

        if board[cur_y][cur_x] == CELL_MISS:
            return False

    return True


def random_unknown(board: List[List[int]]) -> Tuple[int, int]:
    import random
    candidates = get_unknown_cells(board)
    if not candidates:
        return (0, 0)
    r, c = random.choice(candidates)
    return (c, r)