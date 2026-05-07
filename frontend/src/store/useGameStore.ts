import { create } from 'zustand';
import type { Board, Ship } from '../types/board';
import type { GamePhase } from '../types/game';
import { createEmptyBoard } from '../utils/boardHelpers';

interface GameStore {
    phase: GamePhase;
    turn: 'p1' | 'p2';
    boards: { p1: Board; p2: Board };
    ships: { p1: Ship[]; p2: Ship[] };
    language: 'en' | 'ru';

    // Actions
    toggleLanguage: () => void;
    setPhase: (phase: GamePhase) => void;
    placeShip: (player: 'p1' | 'p2', ship: Ship) => void;
    fireShot: (targetPlayer: 'p1' | 'p2', x: number, y: number) => 'hit' | 'miss' | 'sunk';
    switchTurn: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
    phase: 'PLACING',
    turn: 'p1',
    boards: { p1: createEmptyBoard(), p2: createEmptyBoard() },
    ships: { p1: [], p2: [] },
    language: 'en',

    setPhase: (phase) => set({ phase }),

    placeShip: (player, ship) => {
        // Deep copy the 2D array
        const currentBoard = get().boards[player];
        const newBoard = currentBoard.map(row => row.map(cell => ({ ...cell })));

        ship.coordinates.forEach(({ x, y }) => {
            newBoard[y][x] = { status: 'ship', shipId: ship.id };
        });

        set((state) => ({
            boards: { ...state.boards, [player]: newBoard },
            ships: { ...state.ships, [player]: [...state.ships[player], ship] }
        }));
    },

    fireShot: (target, x, y) => {
        const { boards, ships } = get();
        const board = boards[target];
        const cell = board[y][x];

        if (cell.status === 'hit' || cell.status === 'miss' || cell.status === 'sunk') return 'miss';

        const isHit = cell.status === 'ship';
        let finalStatus: 'hit' | 'miss' | 'sunk' = isHit ? 'hit' : 'miss';

        // 1. Deep copy the target's board
        const newBoard = board.map(row => row.map(c => ({ ...c })));
        newBoard[y][x].status = isHit ? 'hit' : 'miss';

        // 2. Update ships and handle sinking
        const updatedShips = ships[target].map(ship => {
            if (ship.id === cell.shipId) {
                const newHits = ship.hits + 1;
                const isSunk = newHits === ship.size;
                if (isSunk) {
                    finalStatus = 'sunk';
                    ship.coordinates.forEach(coord => {
                        newBoard[coord.y][coord.x].status = 'sunk';
                    });
                }
                return { ...ship, hits: newHits, isSunk };
            }
            return ship;
        });

        // 3. Update the state
        set((state) => ({
            boards: {
                ...state.boards,
                [target]: newBoard
            },
            ships: {
                ...state.ships,
                [target]: updatedShips
            }
        }));

        // 4. Win Condition Check
        if (updatedShips.every(s => s.isSunk)) {
            set({ phase: 'RESULT' });
        }

        return finalStatus;
    },

    switchTurn: () => set((state) => ({ turn: state.turn === 'p1' ? 'p2' : 'p1' })),

    toggleLanguage: () => set((state) => ({
        language: state.language === 'en' ? 'ru' : 'en'
    })),
}));