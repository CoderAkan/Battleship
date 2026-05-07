import type { Board } from '../types/board';

export const canPlaceShip = (
    board: Board,
    shipLength: number,
    x: number,
    y: number,
    orientation: 'horizontal' | 'vertical'
): boolean => {
    for (let i = 0; i < shipLength; i++) {
        const curX = orientation === 'horizontal' ? x + i : x;
        const curY = orientation === 'vertical' ? y + i : y;

        // 1. Check bounds
        if (curX < 0 || curX >= 10 || curY < 0 || curY >= 10) return false;

        // 2. Check 3x3 area around each cell (No-Touching Rule)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const checkX = curX + dx;
                const checkY = curY + dy;

                if (checkX >= 0 && checkX < 10 && checkY >= 0 && checkY < 10) {
                    if (board[checkY][checkX].status === 'ship') return false;
                }
            }
        }
    }
    return true;
};