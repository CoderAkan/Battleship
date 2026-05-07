// utils/boardHelpers.ts
import type { Board, Cell } from '../types/board';


export const createEmptyBoard = (): Board => {
    return Array(10).fill(null).map(() =>
        Array(10).fill(null).map(() => ({
            status: 'empty'
        }))
    );
};

