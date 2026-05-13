/**
 * WebSocket message types for online multiplayer.
 *
 * These MUST stay in sync with backend/api/multiplayer/schemas.py.
 * If you add a message type on the backend, mirror it here and update
 * the discriminated unions below.
 */

import type { Ship } from './board';

export type PlayerSlot = 'p1' | 'p2';
export type OnlinePhase = 'WAITING' | 'PLACING' | 'BATTLE' | 'RESULT';
export type ShotResult = 'hit' | 'miss' | 'sunk';

// ─────────────────────────────────────────────────────────
// Client → Server messages
// ─────────────────────────────────────────────────────────

export interface CreateRoomMsg {
    type: 'create_room';
}

export interface JoinRoomMsg {
    type: 'join_room';
    code: string;
}

export interface ShipPayload {
    type: string;
    size: number;
    coordinates: { x: number; y: number }[];
}

export interface SubmitBoardMsg {
    type: 'submit_board';
    ships: ShipPayload[];
}

export interface FireShotMsg {
    type: 'fire_shot';
    x: number;
    y: number;
}

export interface LeaveRoomMsg {
    type: 'leave_room';
}

export type ClientMessage =
    | CreateRoomMsg
    | JoinRoomMsg
    | SubmitBoardMsg
    | FireShotMsg
    | LeaveRoomMsg;

// ─────────────────────────────────────────────────────────
// Server → Client messages
// ─────────────────────────────────────────────────────────

export interface RoomCreatedEvent {
    type: 'room_created';
    code: string;
}

export interface RoomJoinedEvent {
    type: 'room_joined';
    you_are: PlayerSlot;
    opponent_username: string;
    opponent_elo: number;
}

export interface PhaseChangeEvent {
    type: 'phase_change';
    phase: OnlinePhase;
}

export interface OpponentReadyEvent {
    type: 'opponent_ready';
}

export interface YourTurnEvent {
    type: 'your_turn';
}

export interface ShotResultEvent {
    type: 'shot_result';
    attacker: PlayerSlot;
    x: number;
    y: number;
    result: ShotResult;
    sunk_cells?: { x: number; y: number }[];
    surrounding_cells?: { x: number; y: number }[];
}

export interface GameOverEvent {
    type: 'game_over';
    winner: PlayerSlot;
    reason: 'all_ships_sunk' | 'opponent_forfeit';
    elo_change: number;
    new_elo: number;
}

export interface MatchCancelledEvent {
    type: 'match_cancelled';
    reason: string;
}

export interface OpponentDisconnectedEvent {
    type: 'opponent_disconnected';
}

export interface ErrorEvent {
    type: 'error';
    message: string;
}

export type ServerMessage =
    | RoomCreatedEvent
    | RoomJoinedEvent
    | PhaseChangeEvent
    | OpponentReadyEvent
    | YourTurnEvent
    | ShotResultEvent
    | GameOverEvent
    | MatchCancelledEvent
    | OpponentDisconnectedEvent
    | ErrorEvent;

// ─────────────────────────────────────────────────────────
// Helper: convert a Ship[] to the backend's ShipPayload[] shape.
// Strips the runtime-only fields (id, hits, isSunk, orientation).
// ─────────────────────────────────────────────────────────

export const shipsToPayload = (ships: Ship[]): ShipPayload[] =>
    ships.map((s) => ({
        type: s.type,
        size: s.size,
        coordinates: s.coordinates,
    }));