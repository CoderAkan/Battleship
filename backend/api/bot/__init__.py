from typing import Callable, List, Tuple

from .easy import easy_move
from .medium import medium_move
from .hard import hard_move

StrategyFn = Callable[[List[List[int]], List[int]], Tuple[int, int]]

STRATEGIES: dict[str, StrategyFn] = {
    "easy": lambda board, _ships: easy_move(board),
    "medium": lambda board, ships: medium_move(board, ships),
    "hard": lambda board, ships: hard_move(board, ships),
}


def get_move(
    difficulty: str,
    board: List[List[int]],
    remaining_ships: List[int],
) -> Tuple[int, int]:
    strategy = STRATEGIES.get(difficulty, STRATEGIES["hard"])
    return strategy(board, remaining_ships)


__all__ = ["get_move", "STRATEGIES"]