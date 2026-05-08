import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Grid } from '../../components/Grid';
import { TurnOverlay } from '../../components/TurnOverlay';
import { translations } from '../../utils/translations';
import { recordBotMatch, BOT_RATINGS } from '../../services/statsService';

export const BattlePage = () => {
    const {
        boards,
        turn,
        fireShot,
        switchTurn,
        phase,
        language,
        mode,
        resetGame,
        winner,
        toggleLanguage,
        returnToSetup,
        p1Shots,
        p1Hits,
        botDifficulty,
    } = useGameStore();
    const { user, profile, fetchProfile } = useAuthStore();
    const t = translations[language];

    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isMissed, setIsMissed] = useState(false);
    const [statusMessage, setStatusMessage] = useState(t.commanderFire);
    const [flash, setFlash] = useState(false);
    const [isBotThinking, setIsBotThinking] = useState(false);

    const [matchRecorded, setMatchRecorded] = useState(false);
    const [eloDelta, setEloDelta] = useState<number | null>(null);

    const enemy = turn === 'p1' ? 'p2' : 'p1';
    const enemyBoard = boards[enemy];

    const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

    useEffect(() => {
        if (phase === 'BATTLE' && turn === 'p2' && mode === 'BOT' && !isTransitioning && !isMissed) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const triggerBot = async () => {
                setIsBotThinking(true);
                await new Promise(res => setTimeout(res, 600));

                try {
                    const response = await fetch(`${API_URL}/api/bot/move`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            board: boards.p1.map(row => row.map(cell => {
                                if (cell.status === 'hit' || cell.status === 'sunk') return 2;
                                if (cell.status === 'miss') return 1;
                                return 0;
                            })),
                            remaining_ships: [5, 4, 3, 3, 2],
                            difficulty: botDifficulty,
                        }),
                        signal: controller.signal,
                    });

                    if (!response.ok) throw new Error('API Error');

                    const move = await response.json();
                    clearTimeout(timeoutId);
                    setIsBotThinking(false);
                    handleCellClick(move.x, move.y);
                } catch {
                    console.warn('Bot logic failed or timed out. Firing random shot.');
                    clearTimeout(timeoutId);
                    setIsBotThinking(false);

                    const validMoves: { x: number; y: number }[] = [];
                    boards.p1.forEach((row, y) => {
                        row.forEach((cell, x) => {
                            if (cell.status === 'empty' || cell.status === 'ship') {
                                validMoves.push({ x, y });
                            }
                        });
                    });

                    if (validMoves.length > 0) {
                        const randomChoice = validMoves[Math.floor(Math.random() * validMoves.length)];
                        handleCellClick(randomChoice.x, randomChoice.y);
                    }
                }
            };
            triggerBot();
        }
    }, [turn, phase, mode, isTransitioning, isMissed, boards.p1, botDifficulty]);

    useEffect(() => {
        setFlash(true);
        const timer = setTimeout(() => setFlash(false), 500);
        return () => clearTimeout(timer);
    }, [statusMessage]);

    useEffect(() => {
        if (
            phase !== 'RESULT' ||
            mode !== 'BOT' ||
            !winner ||
            !user ||
            !profile ||
            matchRecorded
        ) {
            return;
        }

        setMatchRecorded(true);
        const eloBefore = profile.elo ?? 1000;
        const opponentRating = BOT_RATINGS[botDifficulty];
        const opponentLabel = `BOT (${botDifficulty.charAt(0).toUpperCase()}${botDifficulty.slice(1)})`;

        recordBotMatch({
            userId: user.id,
            profile,
            result: winner === 'p1' ? 'win' : 'loss',
            shotsFired: p1Shots,
            successfulHits: p1Hits,
            opponentRating,
            opponentLabel,
        }).then((updated) => {
            if (updated) {
                setEloDelta((updated.elo ?? eloBefore) - eloBefore);
                fetchProfile(user.id);
            }
        });
    }, [phase, mode, winner, user, profile, p1Shots, p1Hits, matchRecorded, botDifficulty, fetchProfile]);

    const handleCellClick = (x: number, y: number) => {
        if (isMissed || (enemyBoard[y][x].status !== 'empty' && enemyBoard[y][x].status !== 'ship')) return;

        const result = fireShot(turn, x, y);

        if (result === 'hit') {
            setStatusMessage(t.fireAgain);
        } else if (result === 'sunk') {
            setStatusMessage(t.sunk);
        } else {
            setIsMissed(true);
            setStatusMessage(t.missed);

            if (mode === 'BOT') {
                setTimeout(() => handleTransitionComplete(), 1000);
            }
        }
    };

    const handleTransitionComplete = () => {
        switchTurn();
        setIsMissed(false);
        setStatusMessage(t.commanderFire);
        setIsTransitioning(false);
    };

    const handleContinue = () => {
        setIsTransitioning(true);
    };

    const resetLogic = () => {
        resetGame();
        window.location.reload();
    };

    const handleBackToSetup = () => {
        returnToSetup();
    };

    const getWinnerSubtitle = () => {
        if (winner === 'p1') return t.player1Wins;
        if (winner === 'p2') return mode === 'BOT' ? t.botWins : t.player2Wins;
        return '';
    };

    if (isTransitioning && mode === 'MULTIPLAYER') {
        return (
            <TurnOverlay
                nextPlayer={turn === 'p1' ? (language === 'en' ? 'Player 2' : 'Игрок 2') : (language === 'en' ? 'Player 1' : 'Игрок 1')}
                onContinue={handleTransitionComplete}
            />
        );
    }

    return (
        <div className="w-full h-screen bg-slate-950 text-white select-none flex flex-col">
            {phase !== 'RESULT' ? (
                <>
                    <header className="shrink-0 px-3 py-2 sm:px-4 sm:pt-4 sm:pb-3 lg:pt-5 lg:pb-4 text-center border-b border-slate-800 relative">
                        <button
                            onClick={handleBackToSetup}
                            className="absolute top-2 left-2 sm:top-3 sm:left-3 lg:top-4 lg:left-4 group flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 lg:px-4 lg:py-2 border border-slate-600 rounded hover:bg-slate-800 hover:border-slate-400 transition-colors text-[10px] sm:text-xs lg:text-sm font-bold uppercase tracking-wider"
                            aria-label={t.back}
                        >
                            <span className="leading-none transition-transform group-hover:-translate-x-0.5">←</span>
                            <span>{t.back}</span>
                        </button>

                        <button
                            onClick={toggleLanguage}
                            className="absolute top-2 right-2 sm:top-3 sm:right-3 lg:top-4 lg:right-4 px-2 py-1 sm:px-3 sm:py-1 lg:px-4 lg:py-1.5 border border-slate-600 rounded hover:bg-slate-800 transition-colors text-[10px] sm:text-xs lg:text-sm font-bold"
                            aria-label="Toggle language"
                        >
                            {language === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN'}
                        </button>

                        <h1 className="text-xs sm:text-base md:text-xl lg:text-2xl xl:text-3xl font-black text-blue-500 uppercase tracking-tighter mb-1.5 sm:mb-2 lg:mb-3">
                            {mode === 'BOT' && turn === 'p2'
                                ? (language === 'en' ? "AI BOT'S TURN" : "ХОД ИИ БОТА")
                                : (language === 'en' ? `Player ${turn === 'p1' ? '1' : '2'}'s Turn` : `Ход Игрока ${turn === 'p1' ? '1' : '2'}`)}
                        </h1>
                        <div className={`min-h-9 sm:min-h-12 lg:min-h-14 flex items-center justify-center px-3 sm:px-6 lg:px-8 py-1.5 lg:py-2 rounded border-2 transition-all ${isMissed ? 'border-red-900 bg-red-950/30' : 'border-blue-900 bg-blue-950/30'} ${flash ? 'scale-105 brightness-125' : ''}`}>
                            <p className="font-mono font-bold text-[9px] sm:text-xs lg:text-base xl:text-lg uppercase tracking-widest text-blue-400 text-center">
                                {statusMessage}
                            </p>
                        </div>
                    </header>

                    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-12 items-center justify-center pt-4 px-3 pb-3 sm:pt-6 sm:px-4 sm:pb-4 lg:pt-8 lg:px-8 lg:pb-8">
                        <div className="flex flex-col items-center justify-center w-full lg:w-auto lg:flex-1 lg:max-w-[90vh] min-h-0">
                            <h2 className="mb-1.5 sm:mb-2 lg:mb-3 text-red-500 text-[9px] sm:text-[10px] lg:text-sm xl:text-base font-bold uppercase tracking-widest shrink-0">
                                {t.enemyWaters}
                            </h2>
                            <div className="aspect-square board-square">
                                <Grid
                                    board={enemyBoard}
                                    showShips={false}
                                    onCellClick={(mode === 'MULTIPLAYER' || turn === 'p1') ? handleCellClick : undefined}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center w-full lg:w-auto lg:flex-1 lg:max-w-[90vh] min-h-0">
                            <h2 className="mb-1.5 sm:mb-2 lg:mb-3 text-blue-400 text-[9px] sm:text-[10px] lg:text-sm xl:text-base font-bold uppercase tracking-widest shrink-0">
                                {mode === 'BOT' && turn === 'p2' ? (language === 'en' ? 'ENEMY RADAR' : 'РАДАР ПРОТИВНИКА') : t.yourFleet}
                            </h2>
                            <div className="aspect-square opacity-70 lg:opacity-100 board-square">
                                <Grid
                                    board={boards[turn]}
                                    showShips={mode === 'BOT' && turn === 'p2' ? false : true}
                                />
                            </div>

                            {isBotThinking && (
                                <div className="mt-3 sm:mt-4 lg:mt-5 flex flex-col items-center shrink-0">
                                    <p className="text-[9px] sm:text-[10px] lg:text-sm font-mono text-blue-500 animate-pulse uppercase tracking-[0.3em]">
                                        {language === 'en' ? 'AI ANALYZING...' : 'ИИ АНАЛИЗИРУЕТ...'}
                                    </p>
                                    <div className="mt-1.5 sm:mt-2 flex gap-1 lg:gap-1.5">
                                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full animate-bounce" />
                                    </div>
                                </div>
                            )}
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

                    {mode === 'MULTIPLAYER' && isMissed && (
                        <button
                            onClick={handleContinue}
                            className="fixed top-5750/10000 lg:top-6300/10000 -translate-y-1/2 right-4 sm:right-6 lg:right-8 z-50 group flex items-center gap-1 sm:gap-1 lg:gap-1.5 pl-2 pr-1.5 sm:pl-2.5 sm:pr-2 lg:pl-4 lg:pr-3 py-2 sm:py-2.5 lg:py-3 bg-white text-black font-black rounded-full hover:bg-blue-400 transition-all shadow-2xl text-[8px] sm:text-[9px] lg:text-xs uppercase tracking-wider active:scale-95 ring-2 ring-blue-500/40 hover:ring-blue-400/60"
                        >
                            <span>{t.nextPlayer}</span>
                            <span className="text-[10px] sm:text-xs lg:text-base leading-none transition-transform group-hover:translate-x-0.5">→</span>
                        </button>
                    )}
                </>
            ) : (
                <div className="flex-1 flex flex-col lg:justify-center items-center py-6 sm:py-10 lg:py-8 px-3 sm:px-6 gap-6 sm:gap-8 lg:gap-10 relative overflow-y-auto">
                    <button
                        onClick={toggleLanguage}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 lg:top-6 lg:right-6 px-2 py-1 sm:px-3 sm:py-1 lg:px-4 lg:py-1.5 border border-slate-600 rounded hover:bg-slate-800 transition-colors text-[10px] sm:text-xs lg:text-sm font-bold z-10"
                        aria-label="Toggle language"
                    >
                        {language === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN'}
                    </button>

                    <div className="w-full max-w-7xl flex flex-col lg:grid lg:grid-cols-[1fr_auto] lg:gap-12 xl:gap-20 items-center lg:items-center justify-center gap-6 sm:gap-8">

                        <div className="flex flex-col items-center lg:items-start text-center lg:text-left order-1 lg:order-1">
                            <div className="mb-2 lg:mb-3 text-blue-500 text-[10px] sm:text-xs lg:text-base font-mono tracking-[0.5em] uppercase">
                                {t.tacticalReport}
                            </div>
                            <h2 className="text-4xl sm:text-6xl md:text-8xl lg:text-7xl xl:text-8xl font-black text-white uppercase tracking-tighter mb-2 lg:mb-3 italic leading-none">
                                {t.victory}
                            </h2>
                            <p className="text-blue-500 font-mono text-sm sm:text-xl md:text-2xl lg:text-xl xl:text-2xl font-bold tracking-[0.2em]">
                                {getWinnerSubtitle()}
                            </p>
                            {eloDelta !== null && (
                                <p className={`mt-3 lg:mt-4 font-mono font-bold text-lg sm:text-xl lg:text-2xl ${eloDelta >= 0 ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                    {eloDelta >= 0 ? '+' : ''}{eloDelta} ELO
                                </p>
                            )}

                            <button
                                onClick={resetLogic}
                                className="mt-6 lg:mt-10 px-10 sm:px-14 lg:px-16 py-3 sm:py-5 lg:py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase rounded-xl transition-transform active:scale-95 shadow-[0_10px_40px_rgba(37,99,235,0.4)] text-xs sm:text-sm lg:text-base"
                            >
                                {t.redeploy}
                            </button>
                        </div>

                        {winner && (
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-8 order-2 lg:order-2">
                                <div className="flex flex-col items-center">
                                    <h3 className="mb-2 lg:mb-3 text-blue-400 text-[9px] sm:text-[10px] lg:text-sm font-bold uppercase tracking-widest">
                                        {t.winnersFleet}
                                    </h3>
                                    <div className="aspect-square result-square">
                                        <Grid board={boards[winner]} showShips={true} />
                                    </div>
                                </div>

                                <div className="flex flex-col items-center">
                                    <h3 className="mb-2 lg:mb-3 text-red-500 text-[9px] sm:text-[10px] lg:text-sm font-bold uppercase tracking-widest">
                                        {t.defeatedFleet}
                                    </h3>
                                    <div className="aspect-square result-square">
                                        <Grid
                                            board={boards[winner === 'p1' ? 'p2' : 'p1']}
                                            showShips={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <style>{`
                        .result-square {
                            width: min(100%, 42vh, 320px);
                            height: min(100%, 42vh, 320px);
                        }
                        @media (min-width: 1024px) {
                            .result-square {
                                width: min(100%, 32vh, 280px);
                                height: min(100%, 32vh, 280px);
                            }
                        }
                        @media (min-width: 1280px) {
                            .result-square {
                                width: min(100%, 38vh, 340px);
                                height: min(100%, 38vh, 340px);
                            }
                        }
                    `}</style>
                </div>
            )
            }
        </div>
    );
};