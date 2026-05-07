import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Grid } from '../../components/Grid';
import { TurnOverlay } from '../../components/TurnOverlay';
import { translations } from '../../utils/translations';

export const BattlePage = () => {
    const { boards, turn, fireShot, switchTurn, phase, language, mode, resetGame, winner } = useGameStore();
    const t = translations[language];

    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isMissed, setIsMissed] = useState(false);
    const [statusMessage, setStatusMessage] = useState(t.commanderFire);
    const [flash, setFlash] = useState(false);
    const [isBotThinking, setIsBotThinking] = useState(false);

    const enemy = turn === 'p1' ? 'p2' : 'p1';
    const enemyBoard = boards[enemy];

    useEffect(() => {
        if (phase === 'BATTLE' && turn === 'p2' && mode === 'BOT' && !isTransitioning && !isMissed) {

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const triggerBot = async () => {
                setIsBotThinking(true);
                await new Promise(res => setTimeout(res, 600));

                try {
                    const response = await fetch('http://localhost:8000/bot/move', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            board: boards.p1.map(row => row.map(cell => {
                                if (cell.status === 'hit' || cell.status === 'sunk') return 2;
                                if (cell.status === 'miss') return 1;
                                return 0;
                            })),
                            remaining_ships: [5, 4, 3, 3, 2]
                        }),
                        signal: controller.signal
                    });

                    if (!response.ok) throw new Error('API Error');

                    const move = await response.json();
                    clearTimeout(timeoutId);
                    setIsBotThinking(false);
                    handleCellClick(move.x, move.y);

                } catch (error: any) {
                    console.warn("Bot logic failed or timed out. Firing random shot.");
                    clearTimeout(timeoutId);
                    setIsBotThinking(false);

                    const validMoves: { x: number, y: number }[] = [];
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
    }, [turn, phase, mode, isTransitioning, isMissed, boards.p1]);

    useEffect(() => {
        setFlash(true);
        const timer = setTimeout(() => setFlash(false), 500);
        return () => clearTimeout(timer);
    }, [statusMessage]);

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
        <div className="w-full min-h-full bg-slate-950 text-white select-none flex flex-col">
            {phase !== 'RESULT' ? (
                <>
                    <header className="shrink-0 px-3 py-2 sm:p-4 text-center border-b border-slate-800">
                        <h1 className="text-xs sm:text-base md:text-xl font-black text-blue-500 uppercase tracking-tighter mb-1.5 sm:mb-2">
                            {mode === 'BOT' && turn === 'p2'
                                ? (language === 'en' ? "AI BOT'S TURN" : "ХОД ИИ БОТА")
                                : (language === 'en' ? `Player ${turn === 'p1' ? '1' : '2'}'s Turn` : `Ход Игрока ${turn === 'p1' ? '1' : '2'}`)}
                        </h1>
                        <div className={`min-h-9 sm:min-h-12 flex items-center justify-center px-3 sm:px-6 py-1.5 rounded border-2 transition-all ${isMissed ? 'border-red-900 bg-red-950/30' : 'border-blue-900 bg-blue-950/30'} ${flash ? 'scale-105 brightness-125' : ''}`}>
                            <p className="font-mono font-bold text-[9px] sm:text-xs uppercase tracking-widest text-blue-400 text-center">
                                {statusMessage}
                            </p>
                        </div>
                    </header>


                    <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-12 items-center justify-center p-3 sm:p-4 lg:p-8">
                        <div className="flex flex-col items-center w-full lg:w-auto lg:flex-1 lg:max-w-[50vh]">
                            <h2 className="mb-1.5 sm:mb-2 text-red-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                                {t.enemyWaters}
                            </h2>
                            <div
                                className="aspect-square w-full"
                                style={{ maxWidth: 'min(100%, 60vh, 500px)' }}
                            >
                                <Grid
                                    board={enemyBoard}
                                    showShips={false}
                                    onCellClick={(mode === 'MULTIPLAYER' || turn === 'p1') ? handleCellClick : undefined}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col items-center w-full lg:w-auto lg:flex-1 lg:max-w-[50vh]">
                            <h2 className="mb-1.5 sm:mb-2 text-blue-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                                {mode === 'BOT' && turn === 'p2' ? (language === 'en' ? 'ENEMY RADAR' : 'РАДАР ПРОТИВНИКА') : t.yourFleet}
                            </h2>
                            <div
                                className="aspect-square w-full opacity-70 lg:opacity-100"
                                style={{ maxWidth: 'min(100%, 60vh, 500px)' }}
                            >
                                <Grid
                                    board={boards[turn]}
                                    showShips={mode === 'BOT' && turn === 'p2' ? false : true}
                                />
                            </div>

                            {isBotThinking && (
                                <div className="mt-3 sm:mt-4 flex flex-col items-center">
                                    <p className="text-[9px] sm:text-[10px] font-mono text-blue-500 animate-pulse uppercase tracking-[0.3em]">
                                        {language === 'en' ? 'AI ANALYZING...' : 'ИИ АНАЛИЗИРУЕТ...'}
                                    </p>
                                    <div className="mt-1.5 sm:mt-2 flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {isMissed && mode === 'MULTIPLAYER' && (
                        <div className="shrink-0 py-3 flex items-center justify-center px-4 border-t border-slate-800">
                            <button
                                onClick={handleContinue}
                                className="px-6 sm:px-10 py-2.5 sm:py-4 bg-white text-black font-black rounded-full hover:bg-blue-400 transition-all shadow-lg text-[11px] sm:text-sm uppercase tracking-widest active:scale-95"
                            >
                                {t.nextPlayer}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-start py-6 sm:py-10 px-3 sm:px-6 gap-6 sm:gap-8">
                    <div className="text-center w-full max-w-3xl">
                        <div className="mb-2 text-blue-500 text-[10px] sm:text-xs font-mono tracking-[0.5em] uppercase">
                            {t.tacticalReport}
                        </div>
                        <h2 className="text-4xl sm:text-6xl md:text-8xl font-black text-white uppercase tracking-tighter mb-2 italic">
                            {t.victory}
                        </h2>
                        <p className="text-blue-500 font-mono text-sm sm:text-xl md:text-2xl font-bold tracking-[0.2em] text-center">
                            {getWinnerSubtitle()}
                        </p>
                    </div>

                    {winner && (
                        <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10">
                            <div className="flex flex-col items-center w-full lg:w-auto lg:flex-1 lg:max-w-[40vh]">
                                <h3 className="mb-2 text-blue-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                                    {t.winnersFleet}
                                </h3>
                                <div
                                    className="aspect-square w-full"
                                    style={{ maxWidth: 'min(100%, 45vh, 360px)' }}
                                >
                                    <Grid board={boards[winner]} showShips={true} />
                                </div>
                            </div>

                            <div className="flex flex-col items-center w-full lg:w-auto lg:flex-1 lg:max-w-[40vh]">
                                <h3 className="mb-2 text-red-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                                    {t.defeatedFleet}
                                </h3>
                                <div
                                    className="aspect-square w-full"
                                    style={{ maxWidth: 'min(100%, 45vh, 360px)' }}
                                >
                                    <Grid
                                        board={boards[winner === 'p1' ? 'p2' : 'p1']}
                                        showShips={true}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={resetLogic}
                        className="px-10 sm:px-14 py-3 sm:py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase rounded-xl transition-transform active:scale-95 shadow-[0_10px_40px_rgba(37,99,235,0.4)] text-xs sm:text-sm"
                    >
                        {t.redeploy}
                    </button>
                </div>
            )}
        </div>
    );
};