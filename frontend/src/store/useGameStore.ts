import { create } from 'zustand';
import type { Board, Ship } from '../types/board';
import type { GameMode, GamePhase } from '../types/game';
import { createEmptyBoard } from '../utils/boardHelpers';

type BotDifficulty = 'easy' | 'medium' | 'hard';

interface GameStore {
    phase: GamePhase;
    turn: 'p1' | 'p2';
    boards: { p1: Board; p2: Board };
    ships: { p1: Ship[]; p2: Ship[] };
    language: 'en' | 'ru';
    mode: GameMode;
    winner: 'p1' | 'p2' | null;
    p1Shots: number;
    p1Hits: number;
    botDifficulty: BotDifficulty;
    setMode: (mode: GameMode) => void;
    toggleLanguage: () => void;
    setPhase: (phase: GamePhase) => void;
    placeShip: (player: 'p1' | 'p2', ship: Ship) => void;
    removeLastShip: (player: 'p1' | 'p2') => void;
    fireShot: (attacker: 'p1' | 'p2', x: number, y: number) => 'hit' | 'miss' | 'sunk';
    switchTurn: () => void;
    resetGame: () => void;
    returnToSetup: () => void;
    setBotDifficulty: (difficulty: BotDifficulty) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
    phase: 'START_MENU',
    turn: 'p1',
    boards: { p1: createEmptyBoard(), p2: createEmptyBoard() },
    ships: { p1: [], p2: [] },
    language: 'en',
    mode: 'BOT',
    p1Shots: 0,
    p1Hits: 0,
    winner: null,
    botDifficulty: 'easy',
    setMode: (mode) => set({ mode }),

    setPhase: (phase) => set({ phase }),

    placeShip: (player, ship) => {
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

    removeLastShip: (player) => {
        const playerShips = get().ships[player];
        if (playerShips.length === 0) return;

        const lastShip = playerShips[playerShips.length - 1];
        const currentBoard = get().boards[player];
        const newBoard = currentBoard.map(row => row.map(cell => ({ ...cell })));

        lastShip.coordinates.forEach(({ x, y }) => {
            newBoard[y][x] = { status: 'empty' };
        });

        set((state) => ({
            boards: { ...state.boards, [player]: newBoard },
            ships: { ...state.ships, [player]: playerShips.slice(0, -1) },
        }));
    },

    fireShot: (attacker, x, y) => {
        const { boards, ships } = get();
        const target = attacker === 'p1' ? 'p2' : 'p1';
        const board = boards[target];
        const cell = board[y][x];

        if (cell.status === 'hit' || cell.status === 'miss' || cell.status === 'sunk') return 'miss';

        const isHit = cell.status === 'ship';
        let finalStatus: 'hit' | 'miss' | 'sunk' = isHit ? 'hit' : 'miss';

        const newBoard = board.map(row => row.map(c => ({ ...c })));
        newBoard[y][x].status = isHit ? 'hit' : 'miss';

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

        const shotsDelta = attacker === 'p1' ? 1 : 0;
        const hitsDelta = attacker === 'p1' && isHit ? 1 : 0;

        set((state) => ({
            boards: { ...state.boards, [target]: newBoard },
            ships: { ...state.ships, [target]: updatedShips },
            p1Shots: state.p1Shots + shotsDelta,
            p1Hits: state.p1Hits + hitsDelta,
        }));

        if (updatedShips.every(s => s.isSunk)) {
            set({ phase: 'RESULT', winner: attacker });
        }

        return finalStatus;
    },

    switchTurn: () => set((state) => ({ turn: state.turn === 'p1' ? 'p2' : 'p1' })),

    toggleLanguage: () => set((state) => ({
        language: state.language === 'en' ? 'ru' : 'en'
    })),

    resetGame: () => set({
        phase: 'START_MENU',
        turn: 'p1',
        boards: { p1: createEmptyBoard(), p2: createEmptyBoard() },
        ships: { p1: [], p2: [] },
        winner: null,
        p1Shots: 0,
        p1Hits: 0,
    }),
    returnToSetup: () => {
        set(() => ({
            phase: 'PLACING',
            turn: 'p1',
            boards: { p1: createEmptyBoard(), p2: createEmptyBoard() },
            ships: { p1: [], p2: [] },
            winner: null,
            p1Shots: 0,
            p1Hits: 0,
        }));
    },
    setBotDifficulty: (botDifficulty) => set({ botDifficulty }),
}));