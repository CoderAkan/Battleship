import { useState } from 'react';
import { toast } from 'react-toastify';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useGameStore } from '../../store/useGameStore';
import { translations } from '../../utils/translations';

interface OnlineLobbyPageProps {
    onBack: () => void;
}

/**
 * Online lobby — three states managed inline:
 *   1. menu: "Create Room" or "Join Room" buttons (default)
 *   2. joining: typing in a 4-letter code
 *   3. waiting: room created, displaying code while waiting for opponent
 *
 * Once the opponent joins (room_joined message), the parent OnlinePage
 * navigates us to OnlineSetupPage based on phase changing to PLACING.
 * That logic lives in OnlinePage, not here.
 */
export const OnlineLobbyPage = ({ onBack }: OnlineLobbyPageProps) => {
    const {
        connected,
        connecting,
        connectionError,
        roomCode,
        opponentUsername,
        lastError,
        connect,
        createRoom,
        joinRoom,
        clearError,
    } = useMultiplayerStore();
    const { language } = useGameStore();
    const t = translations[language];

    const [view, setView] = useState<'menu' | 'joining'>('menu');
    const [codeInput, setCodeInput] = useState('');

    // Toast errors from the server (room not found, etc.) and clear them.
    if (lastError) {
        toast.error(lastError);
        clearError();
    }

    // ─── handlers ───
    const ensureConnected = async () => {
        if (connected) return true;
        try {
            await connect();
            return true;
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : t.connectionError,
            );
            return false;
        }
    };

    const handleCreate = async () => {
        if (await ensureConnected()) {
            createRoom();
        }
    };

    const handleJoin = async () => {
        const code = codeInput.trim().toUpperCase();
        if (code.length !== 4) {
            toast.error(t.enterCode);
            return;
        }
        if (await ensureConnected()) {
            joinRoom(code);
        }
    };

    const handleCopy = async () => {
        if (!roomCode) return;
        try {
            await navigator.clipboard.writeText(roomCode);
            toast.success(t.codeCopied);
        } catch {
            // Older browsers — fallback to selection prompt
            toast.info(roomCode);
        }
    };

    // ─── waiting state: we created a room, opponent hasn't joined ───
    // We get into this state because roomCode is set but opponentUsername
    // is still null. Once the opponent joins, the store fills in
    // opponentUsername and the parent navigates us away.
    if (roomCode && !opponentUsername) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] bg-slate-950 px-4 gap-8">
                <button
                    onClick={onBack}
                    className="absolute top-20 left-4 sm:left-6 group flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 border border-slate-600 rounded hover:bg-slate-800 hover:border-slate-400 transition-colors text-xs sm:text-sm font-bold uppercase tracking-wider"
                >
                    <span className="leading-none transition-transform group-hover:-translate-x-0.5">←</span>
                    <span>{t.back}</span>
                </button>

                <div className="text-center">
                    <p className="text-blue-500 font-mono tracking-[0.4em] text-xs sm:text-sm uppercase mb-3">
                        {t.roomCode}
                    </p>
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="bg-slate-900 border-2 border-blue-500 rounded-xl px-8 py-6 sm:px-12 sm:py-8">
                            <span className="font-mono font-black text-5xl sm:text-7xl text-white tracking-[0.3em]">
                                {roomCode}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest transition-colors"
                    >
                        {t.copyCode} ⧉
                    </button>
                </div>

                <p className="text-slate-400 text-sm sm:text-base text-center max-w-sm">
                    {t.shareCode}
                </p>

                <div className="flex flex-col items-center gap-3">
                    <p className="text-blue-500 font-mono uppercase text-xs sm:text-sm tracking-[0.3em] animate-pulse">
                        {t.waitingForOpponent}
                    </p>
                    <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                    </div>
                </div>
            </div>
        );
    }

    // ─── joining state: typing in a code ───
    if (view === 'joining') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] bg-slate-950 px-4 gap-6">
                <button
                    onClick={() => setView('menu')}
                    className="absolute top-20 left-4 sm:left-6 group flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 border border-slate-600 rounded hover:bg-slate-800 hover:border-slate-400 transition-colors text-xs sm:text-sm font-bold uppercase tracking-wider"
                >
                    <span className="leading-none transition-transform group-hover:-translate-x-0.5">←</span>
                    <span>{t.back}</span>
                </button>

                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">
                    {t.joinRoom}
                </h2>

                <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase().slice(0, 4))}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    placeholder="ABCD"
                    autoFocus
                    maxLength={4}
                    className="w-64 bg-slate-900 border-2 border-slate-700 focus:border-blue-500 rounded-xl text-center font-mono font-black text-4xl sm:text-5xl text-white tracking-[0.3em] py-4 outline-none transition-colors"
                />

                <button
                    onClick={handleJoin}
                    disabled={codeInput.length !== 4 || connecting}
                    className="px-12 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black uppercase rounded-lg transition-all active:scale-95 text-sm sm:text-base"
                >
                    {connecting ? t.connecting : t.joinRoom}
                </button>
            </div>
        );
    }

    // ─── menu state (default): Create or Join ───
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] bg-slate-950 px-4 gap-8">
            <button
                onClick={onBack}
                className="absolute top-20 left-4 sm:left-6 group flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 border border-slate-600 rounded hover:bg-slate-800 hover:border-slate-400 transition-colors text-xs sm:text-sm font-bold uppercase tracking-wider"
            >
                <span className="leading-none transition-transform group-hover:-translate-x-0.5">←</span>
                <span>{t.back}</span>
            </button>

            <div className="text-center">
                <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter italic mb-2">
                    {t.online}
                </h1>
                <p className="text-slate-400 text-sm sm:text-base">{t.onlineSubtitle}</p>
            </div>

            {connectionError && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded px-4 py-2">
                    {connectionError}
                </p>
            )}

            <div className="flex flex-col gap-3 w-full max-w-sm">
                <button
                    onClick={handleCreate}
                    disabled={connecting}
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black uppercase rounded-lg transition-all active:scale-95 tracking-wider"
                >
                    {connecting ? t.connecting : t.createRoom}
                </button>

                <button
                    onClick={() => setView('joining')}
                    className="px-8 py-4 border-2 border-slate-700 hover:border-slate-500 hover:bg-slate-900 text-white font-black uppercase rounded-lg transition-all active:scale-95 tracking-wider"
                >
                    {t.joinRoom}
                </button>
            </div>
        </div>
    );
};