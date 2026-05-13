import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useGameStore } from '../../store/useGameStore';
import { Grid } from '../../components/Grid';
import { translations } from '../../utils/translations';

/**
 * Online battle page.
 *
 * Reads everything from useMultiplayerStore — boards, turn state, winner.
 * Sends shots via store.fireShot(). UI updates happen automatically when
 * the server's shot_result/your_turn/game_over messages flip store state.
 *
 * The status bar at the top is purely for player feedback. It updates
 * after every shot, with the most recent action.
 */
export const OnlineBattlePage = () => {
    const navigate = useNavigate();
    const { language } = useGameStore();
    const t = translations[language];
    const {
        myBoard,
        enemyBoard,
        isMyTurn,
        phase,
        winner,
        youAre,
        opponentUsername,
        opponentDisconnected,
        gameOverReason,
        eloChange,
        newElo,
        matchCancelledReason,
        myShots,
        myHits,
        fireShot,
        disconnect,
    } = useMultiplayerStore();

    // Last shot — used to drive the status banner. We reset it every turn
    // change so the banner doesn't get stuck showing stale info.
    const [statusKey, setStatusKey] = useState(0);
    const [statusMessage, setStatusMessage] = useState<string>(
        isMyTurn ? t.yourTurn : t.opponentTurn,
    );
    const [flash, setFlash] = useState(false);

    // Update status when turn flips.
    useEffect(() => {
        if (phase !== 'BATTLE') return;
        setStatusMessage(isMyTurn ? t.yourTurn : t.opponentTurn);
        setStatusKey((k) => k + 1);
    }, [isMyTurn, phase, t.yourTurn, t.opponentTurn]);

    // Flash the status banner whenever the message changes.
    useEffect(() => {
        setFlash(true);
        const id = setTimeout(() => setFlash(false), 500);
        return () => clearTimeout(id);
    }, [statusKey]);

    // Handle a click on the enemy grid.
    const handleCellClick = (x: number, y: number) => {
        console.log('[CLICK]', { x, y, isMyTurn, cellStatus: enemyBoard[y][x].status });
        if (!isMyTurn) return;
        const cell = enemyBoard[y][x];
        if (cell.status !== 'empty') return; // already shot
        fireShot(x, y);
    };

    const handleBackToHome = () => {
        disconnect();
        navigate('/');
    };

    // ─── result screen ───
    if (phase === 'RESULT') {
        // Determine outcome from the player's perspective.
        const iWon = winner === youAre;

        // Match-cancelled case (disconnect-before-5-hits rule).
        if (matchCancelledReason) {
            return (
                <div className="min-h-[calc(100dvh-4rem)] bg-slate-950 text-white flex flex-col items-center justify-center px-4 gap-6">
                    <div className="text-center max-w-lg">
                        <p className="text-yellow-500 font-mono tracking-[0.4em] text-xs sm:text-sm uppercase mb-3">
                            {t.matchCancelled}
                        </p>
                        <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter italic mb-4">
                            {t.opponentDisconnected}
                        </h2>
                        <p className="text-slate-400 text-sm sm:text-base">
                            {matchCancelledReason}
                        </p>
                    </div>
                    <button
                        onClick={handleBackToHome}
                        className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase rounded-xl transition-all active:scale-95 text-sm sm:text-base"
                    >
                        {t.backToHome}
                    </button>
                </div>
            );
        }

        // Normal win/loss with ELO change.
        const subtitle = gameOverReason === 'opponent_forfeit'
            ? (iWon ? t.forfeitWin : t.forfeitLoss)
            : '';

        return (
            <div className="min-h-[calc(100dvh-4rem)] bg-slate-950 text-white flex flex-col items-center justify-center px-4 py-8 gap-6">
                <div className="text-center max-w-3xl">
                    <p className="text-blue-500 font-mono tracking-[0.4em] text-xs sm:text-base uppercase mb-3">
                        {t.tacticalReport}
                    </p>
                    <h2 className={`text-5xl sm:text-7xl lg:text-9xl font-black uppercase tracking-tighter italic mb-3 ${iWon ? 'text-white' : 'text-slate-400'
                        }`}>
                        {iWon ? t.youWon : t.youLost}
                    </h2>
                    {subtitle && (
                        <p className="text-yellow-400 font-mono uppercase tracking-widest text-sm sm:text-base mb-3">
                            {subtitle}
                        </p>
                    )}
                    {eloChange !== null && (
                        <p className={`font-mono font-bold text-xl sm:text-2xl lg:text-3xl ${eloChange >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                            {eloChange >= 0 ? '+' : ''}{eloChange} ELO
                            {newElo !== null && (
                                <span className="text-slate-500 text-base sm:text-lg ml-3">
                                    → {newElo}
                                </span>
                            )}
                        </p>
                    )}
                </div>

                {/* Both fleets reveal */}
                <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                    <div className="flex flex-col items-center">
                        <h3 className="mb-2 text-blue-400 text-[10px] sm:text-sm font-bold uppercase tracking-widest">
                            {t.yourFleet}
                        </h3>
                        <div className="aspect-square" style={{ width: 'min(100%, 35vh, 280px)' }}>
                            <Grid board={myBoard} showShips={true} />
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <h3 className="mb-2 text-red-500 text-[10px] sm:text-sm font-bold uppercase tracking-widest">
                            {t.enemyWaters}
                        </h3>
                        <div className="aspect-square" style={{ width: 'min(100%, 35vh, 280px)' }}>
                            <Grid board={enemyBoard} showShips={false} />
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleBackToHome}
                    className="mt-2 px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase rounded-xl transition-all active:scale-95 text-sm sm:text-base"
                >
                    {t.backToHome}
                </button>
            </div>
        );
    }

    // ─── battle UI ───
    return (
        <div className="w-full h-screen bg-slate-950 text-white select-none flex flex-col">
            <header className="shrink-0 px-3 py-2 sm:py-3 text-center border-b border-slate-800 relative">
                <h1 className="text-xs sm:text-base lg:text-xl font-black text-blue-500 uppercase tracking-tighter mb-2">
                    vs <span className="text-white">{opponentUsername}</span>
                </h1>
                {opponentDisconnected && (
                    <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-2 animate-pulse">
                        ⚠ {t.opponentDisconnected}
                    </p>
                )}
                <div className={`min-h-9 sm:min-h-12 flex items-center justify-center px-4 sm:px-6 py-1.5 rounded border-2 transition-all ${isMyTurn
                    ? 'border-green-700 bg-green-950/30'
                    : 'border-blue-900 bg-blue-950/30'
                    } ${flash ? 'scale-105 brightness-125' : ''}`}>
                    <p className={`font-mono font-bold text-[10px] sm:text-sm lg:text-base uppercase tracking-widest text-center ${isMyTurn ? 'text-green-400' : 'text-blue-400'
                        }`}>
                        {statusMessage}
                    </p>
                </div>

                {/* Mid-game stat readout */}
                <p className="mt-2 text-[9px] sm:text-[10px] lg:text-xs text-slate-500 font-mono tracking-widest uppercase">
                    Shots: {myShots} · Hits: {myHits}
                </p>
            </header>

            {/* Boards */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 lg:gap-12 items-center justify-center pt-4 px-3 pb-3 sm:pt-6 sm:px-4 sm:pb-4 lg:pt-8 lg:px-8 lg:pb-8">
                {/* Enemy board — clickable when it's our turn */}
                <div className="flex flex-col items-center justify-center w-full lg:w-auto lg:flex-1 lg:max-w-[90vh] min-h-0">
                    <h2 className="mb-1.5 sm:mb-2 lg:mb-3 text-red-500 text-[9px] sm:text-[10px] lg:text-sm font-bold uppercase tracking-widest shrink-0">
                        {t.enemyWaters}
                    </h2>
                    <div className={`aspect-square board-square ${!isMyTurn ? 'opacity-60' : ''}`}>
                        <Grid
                            board={enemyBoard}
                            showShips={false}
                            onCellClick={isMyTurn ? handleCellClick : undefined}
                        />
                    </div>
                </div>

                {/* Our board */}
                <div className="flex flex-col items-center justify-center w-full lg:w-auto lg:flex-1 lg:max-w-[90vh] min-h-0">
                    <h2 className="mb-1.5 sm:mb-2 lg:mb-3 text-blue-400 text-[9px] sm:text-[10px] lg:text-sm font-bold uppercase tracking-widest shrink-0">
                        {t.yourFleet}
                    </h2>
                    <div className="aspect-square opacity-70 lg:opacity-100 board-square">
                        <Grid board={myBoard} showShips={true} />
                    </div>
                </div>
            </div>

            <style>{`
                .board-square {
                    width: min(100%, 40vh);
                    height: min(100%, 40vh);
                }
                @media (min-width: 1024px) {
                    .board-square {
                        width: min(100%, 61.2vh);
                        height: min(100%, 61.2vh);
                    }
                }
            `}</style>
        </div>
    );
};