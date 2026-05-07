/**
 * Multiplayer WebSocket client.
 *
 * Thin wrapper around the native WebSocket API. Responsibilities:
 *   - Open the connection with a Supabase JWT
 *   - Serialize/deserialize JSON messages
 *   - Dispatch incoming server events to subscribers
 *   - Provide typed send helpers
 *
 * The store (useMultiplayerStore) is the only consumer — it subscribes
 * to events on connect and translates them into store updates.
 *
 * Configure the WS URL via VITE_WS_URL in your .env. Defaults to
 * ws://localhost:8000 for local dev.
 */

import type {
    ClientMessage,
    ServerMessage,
    ShipPayload,
} from '../types/multiplayer';

type MessageHandler = (msg: ServerMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

export type ConnectionStatus =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'error';

const WS_BASE_URL =
    (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:8000';

class MultiplayerService {
    private socket: WebSocket | null = null;
    private status: ConnectionStatus = 'disconnected';
    private messageHandlers: Set<MessageHandler> = new Set();
    private statusHandlers: Set<StatusHandler> = new Set();

    // ─────────────────────────── connection ───────────────────────────

    /**
     * Open the WebSocket. Resolves once `open` fires. Rejects on close
     * before open, or on socket error during the handshake.
     */
    connect(token: string): Promise<void> {
        if (this.socket && this.status !== 'disconnected') {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const url = `${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`;
            this.setStatus('connecting');

            const ws = new WebSocket(url);
            this.socket = ws;

            ws.addEventListener('open', () => {
                this.setStatus('connected');
                resolve();
            });

            ws.addEventListener('message', (event) => {
                try {
                    const msg = JSON.parse(event.data) as ServerMessage;
                    this.messageHandlers.forEach((h) => h(msg));
                } catch (err) {
                    console.error('Failed to parse server message:', err);
                }
            });

            ws.addEventListener('error', () => {
                this.setStatus('error');
                if (this.status !== 'connected') reject(new Error('WS error'));
            });

            ws.addEventListener('close', (event) => {
                this.setStatus('disconnected');
                this.socket = null;
                if (event.code === 4001) {
                    reject(new Error('Invalid token — please log in again'));
                } else if (event.code === 4002) {
                    reject(new Error('Profile not found'));
                }
                // Normal closes don't reject — connect() already resolved.
            });
        });
    }

    disconnect(): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            // Polite leave_room first, then close. Backend handles either path.
            try {
                this.send({ type: 'leave_room' });
            } catch {
                // ignore
            }
        }
        this.socket?.close();
        this.socket = null;
        this.setStatus('disconnected');
    }

    getStatus(): ConnectionStatus {
        return this.status;
    }

    private setStatus(status: ConnectionStatus): void {
        this.status = status;
        this.statusHandlers.forEach((h) => h(status));
    }

    // ─────────────────────────── subscriptions ───────────────────────────

    onMessage(handler: MessageHandler): () => void {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    onStatusChange(handler: StatusHandler): () => void {
        this.statusHandlers.add(handler);
        return () => this.statusHandlers.delete(handler);
    }

    // ─────────────────────────── send ───────────────────────────

    private send(msg: ClientMessage): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        this.socket.send(JSON.stringify(msg));
    }

    createRoom(): void {
        this.send({ type: 'create_room' });
    }

    joinRoom(code: string): void {
        this.send({ type: 'join_room', code: code.toUpperCase() });
    }

    submitBoard(ships: ShipPayload[]): void {
        this.send({ type: 'submit_board', ships });
    }

    fireShot(x: number, y: number): void {
        this.send({ type: 'fire_shot', x, y });
    }
}

// Singleton — there's only ever one active multiplayer connection per tab.
export const multiplayerService = new MultiplayerService();