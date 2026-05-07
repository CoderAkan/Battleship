from typing import Callable, List, Tuple

from .easy import easy_move
from .medium import medium_move
from .hard import hard_move

# Each strategy returns (x, y). Hard takes remaining_ships, the others ignore it.
StrategyFn = Callable[[List[List[int]], List[int]], Tuple[int, int]]

STRATEGIES: dict[str, StrategyFn] = {
    "easy": lambda board, _ships: easy_move(board),
    "medium": lambda board, _ships: medium_move(board),
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