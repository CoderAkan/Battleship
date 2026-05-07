import type { Board, Ship } from "./board";

export type GamePhase = 'AUTH' | 'LOBBY' | 'PLACING' | 'BATTLE' | 'RESULT';

export interface MatchState {
    id: string;
    phase: GamePhase;
    turn: 'p1' | 'p2';
    winnerId?: string;
    players: {
        p1: PlayerData;
        p2: PlayerData;
    };
}

export interface PlayerData {
    userId: string;
    username: string;
    board: Board;
    ships: Ship[];
    points: number;
    country: string;
}