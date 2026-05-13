import { create } from 'zustand';
import { multiplayerService } from '../services/multiplayerService';
import { createEmptyBoard } from '../utils/boardHelpers';
import type { Board, Ship } from '../types/board';
import type {
    OnlinePhase,
    PlayerSlot,
    ServerMessage,
    ShotResult,
} from '../types/multiplayer';
import { shipsToPayload } from '../types/multiplayer';
import { useAuthStore } from './useAuthStore';


interface MultiplayerState {
    // ─── connection ───
    connected: boolean;
    connecting: boolean;
    connectionError: string | null;

    // ─── room ───
    roomCode: string | null;
    youAre: PlayerSlot | null;
    opponentUsername: string | null;
    opponentElo: number | null;

    // ─── match ───
    phase: OnlinePhase;
    isMyTurn: boolean;
    opponentReady: boolean;
    boardSubmitted: boolean;

    // ─── boards ───
    myBoard: Board;
    myShips: Ship[];
    enemyBoard: Board;

    // ─── result ───
    winner: PlayerSlot | null;
    gameOverReason: 'all_ships_sunk' | 'opponent_forfeit' | null;
    eloChange: number | null;
    newElo: number | null;
    matchCancelledReason: string | null;
    opponentDisconnected: boolean;

    // ─── stats (for display only — server already records them) ───
    myShots: number;
    myHits: number;

    // ─── transient UI state ───
    lastError: string | null;

    // ─── actions ───
    connect: () => Promise<void>;
    disconnect: () => void;
    createRoom: () => void;
    joinRoom: (code: string) => void;
    submitBoard: (board: Board, ships: Ship[]) => void;
    fireShot: (x: number, y: number) => void;
    reset: () => void;
    clearError: () => void;
}

const initialState = {
    connected: false,
    connecting: false,
    connectionError: null,
    roomCode: null,
    youAre: null,
    opponentUsername: null,
    opponentElo: null,
    phase: 'WAITING' as OnlinePhase,
    isMyTurn: false,
    opponentReady: false,
    boardSubmitted: false,
    myBoard: createEmptyBoard(),
    myShips: [],
    enemyBoard: createEmptyBoard(),
    winner: null,
    gameOverReason: null,
    eloChange: null,
    newElo: null,
    matchCancelledReason: null,
    opponentDisconnected: false,
    myShots: 0,
    myHits: 0,
    lastError: null,
};

export const useMultiplayerStore = create<MultiplayerState>((set, get) => {
    /**
     * Apply a shot result to one of the two boards.
     *
     * The "attacker" tells us whose grid to update:
     *   - if WE attacked → update enemyBoard (our radar)
     *   - if OPPONENT attacked → update myBoard (cells they hit on us)
     */
    const applyShot = (
        attacker: PlayerSlot,
        x: number,
        y: number,
        result: ShotResult,
        sunkCells?: { x: number; y: number }[],
        surroundingCells?: { x: number; y: number }[],
    ) => {
        const youAre = get().youAre;
        if (!youAre) return;

        const isMyShot = attacker === youAre;
        const targetKey = isMyShot ? 'enemyBoard' : 'myBoard';
        const board = get()[targetKey];

        const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));
        const existing = newBoard[y][x];
        newBoard[y][x] = { ...existing, status: result };

        if (result === 'sunk') {
            if (isMyShot && sunkCells) {
                // We sunk the enemy's ship — server sent us its coordinates so
                // we can mark every cell as sunk on our enemy-board view.
                sunkCells.forEach((c) => {
                    newBoard[c.y][c.x] = {
                        ...newBoard[c.y][c.x],
                        status: 'sunk',
                    };
                });
            } else if (!isMyShot) {
                // Opponent sunk our ship — look it up in our own ship list.
                const ship = get().myShips.find((s) =>
                    s.coordinates.some((c) => c.x === x && c.y === y),
                );
                if (ship) {
                    ship.coordinates.forEach((c) => {
                        newBoard[c.y][c.x] = {
                            ...newBoard[c.y][c.x],
                            status: 'sunk',
                        };
                    });
                }
            }
            if (surroundingCells) {
                surroundingCells.forEach((c) => {
                    if (newBoard[c.y][c.x].status === 'empty') {
                        newBoard[c.y][c.x] = { status: 'miss' };
                    }
                });
            }
        }

        set({ [targetKey]: newBoard } as Pick<MultiplayerState, 'myBoard' | 'enemyBoard'>);

        if (isMyShot) {
            set((s) => ({
                myShots: s.myShots + 1,
                myHits: result !== 'miss' ? s.myHits + 1 : s.myHits,
            }));
        }
    };

    /**
     * Single dispatch table for every server message. Keeping all the
     * state transitions in one place makes the protocol easier to reason
     * about than scattering handlers across components.
     */
    const handleMessage = (msg: ServerMessage) => {
        switch (msg.type) {
            case 'room_created':
                set({ roomCode: msg.code, phase: 'WAITING' });
                break;

            case 'room_joined':
                set({
                    youAre: msg.you_are,
                    opponentUsername: msg.opponent_username,
                    opponentElo: msg.opponent_elo,
                });
                break;

            case 'phase_change':
                set({ phase: msg.phase });
                break;

            case 'opponent_ready':
                set({ opponentReady: true });
                break;

            case 'your_turn':
                set({ isMyTurn: true });
                break;

            case 'shot_result': {
                applyShot(msg.attacker, msg.x, msg.y, msg.result, msg.sunk_cells, msg.surrounding_cells);
                const youAre = get().youAre;
                if (msg.attacker === youAre && msg.result === 'miss') {
                    set({ isMyTurn: false });
                }
                break;
            }

            case 'game_over':
                set({
                    phase: 'RESULT',
                    winner: msg.winner,
                    gameOverReason: msg.reason,
                    eloChange: msg.elo_change,
                    newElo: msg.new_elo,
                    isMyTurn: false,
                });
                break;

            case 'match_cancelled':
                set({
                    phase: 'RESULT',
                    matchCancelledReason: msg.reason,
                    isMyTurn: false,
                });
                break;

            case 'opponent_disconnected':
                set({ opponentDisconnected: true });
                break;

            case 'error':
                set({ lastError: msg.message });
                break;
        }
    };

    // Subscribe once at module load. The handler reads `get()` at call time,
    // so it always sees the current store snapshot.
    multiplayerService.onMessage(handleMessage);
    multiplayerService.onStatusChange((status) => {
        set({
            connected: status === 'connected',
            connecting: status === 'connecting',
            connectionError: status === 'error' ? 'Connection error' : null,
        });
    });

    return {
        ...initialState,

        connect: async () => {

            const token = useAuthStore.getState().accessToken;
            if (!token) {
                set({ connectionError: 'Not logged in' });
                throw new Error('Not logged in');
            }
            try {
                await multiplayerService.connect(token);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Connection failed';
                set({ connectionError: message });
                throw err;
            }
        },

        disconnect: () => {
            multiplayerService.disconnect();
            set({ ...initialState });
        },

        createRoom: () => {
            try {
                multiplayerService.createRoom();
            } catch (err) {
                set({ lastError: 'Not connected' });
            }
        },

        joinRoom: (code) => {
            try {
                multiplayerService.joinRoom(code);
            } catch {
                set({ lastError: 'Not connected' });
            }
        },

        submitBoard: (board, ships) => {
            try {
                multiplayerService.submitBoard(shipsToPayload(ships));
                set({ myBoard: board, myShips: ships, boardSubmitted: true });
            } catch {
                set({ lastError: 'Not connected' });
            }
        },

        fireShot: (x, y) => {
            if (!get().isMyTurn) return;
            try {
                multiplayerService.fireShot(x, y);
            } catch {
                set({ lastError: 'Not connected' });
            }
        },

        reset: () => set({ ...initialState }),
        clearError: () => set({ lastError: null }),
    };
});