import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Grid } from '../../components/Grid';
import { TurnOverlay } from '../../components/TurnOverlay';
import { toast } from 'react-toastify';
import { translations } from '../../utils/translations';

export const BattlePage = () => {
    const { boards, turn, fireShot, switchTurn, phase, language } = useGameStore();
    const t = translations[language]; // Get current translations

    // Local UI states
    const [hasFired, setHasFired] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [lastResult, setLastResult] = useState<'hit' | 'miss' | 'sunk' | null>(null);

    const enemy = turn === 'p1' ? 'p2' : 'p1';

    const handleCellClick = (x: number, y: number) => {
        // 1. Existing guards
        if (hasFired || phase === 'RESULT') return;

        // 2. NEW: Check if cell was already targeted
        const cell = boards[enemy][y][x];
        if (cell.status !== 'empty' && cell.status !== 'ship') {
            toast.warn(language === 'en' ? 'Choose another cell!' : 'Выберите другую клетку!');
            return;
        }

        // 3. Proceed with shot if cell is fresh
        const result = fireShot(enemy, x, y);
        setLastResult(result);
        setHasFired(true);

        if (result === 'hit') toast.success(language === 'en' ? 'DIRECT HIT! 🔥' : 'ПРЯМОЕ ПОПАДАНИЕ! 🔥');
        if (result === 'sunk') toast.error(language === 'en' ? 'SHIP DESTROYED! 💀' : 'КОРАБЛЬ УНИЧТОЖЕН! 💀');
        if (result === 'miss') toast.info(language === 'en' ? 'Splash... Missed. 💧' : 'Мимо... 💧');
    };

    const handleEndTurn = () => {
        if (lastResult === 'miss') {
            setIsTransitioning(true); // Show pass-the-device screen
        } else {
            // Player hit a ship, they get to fire again
            setHasFired(false);
            setLastResult(null);
        }
    };

    const handleContinue = () => {
        switchTurn();
        setHasFired(false);
        setLastResult(null);
        setIsTransitioning(false);
    };

    if (isTransitioning) {
        return (
            <TurnOverlay
                nextPlayer={
                    turn === 'p1'
                        ? (language === 'en' ? 'Player 2' : 'Игрок 2')
                        : (language === 'en' ? 'Player 1' : 'Игрок 1')
                }
                onContinue={handleContinue}
            />
        );
    }

    const resetLogic = () => {
        // 1. Clear the persisted state from the browser
        localStorage.clear();
        // 2. Refresh the page to reset the Zustand store to defaults
        window.location.reload();
    };

    return (
        <div className="h-full w-full flex flex-col items-center p-4 bg-slate-950 text-white overflow-hidden">
            <header className="mb-4">
                <h1 className="text-2xl md:text-3xl font-black italic text-blue-500 uppercase tracking-tighter">
                    {language === 'en' ? `Player ${turn === 'p1' ? '1' : '2'}'s Turn` : `Ход Игрока ${turn === 'p1' ? '1' : '2'}`}
                </h1>
            </header>

            <div className="flex flex-col lg:flex-row gap-8 items-center justify-center flex-1 w-full min-h-0">
                <div className="flex flex-col items-center">
                    <h2 className="mb-2 text-red-500 text-xs font-bold uppercase tracking-widest">{t.enemyWaters}</h2>
                    <Grid board={boards[enemy]} showShips={false} onCellClick={handleCellClick} />
                </div>
                <div className="flex flex-col items-center">
                    <h2 className="mb-2 text-blue-400 text-xs font-bold uppercase tracking-widest">{t.yourFleet}</h2>
                    <Grid board={boards[turn]} showShips={true} />
                </div>
            </div>

            <div className="mt-8 mb-4 min-h-[60px]">
                {hasFired && phase !== 'RESULT' && (
                    <button
                        onClick={handleEndTurn}
                        /* RESTORED: bg-white for visibility, text-black for contrast, and the bounce animation */
                        className="px-12 py-4 bg-white text-black font-black rounded-full hover:bg-blue-400 transition-all transform active:scale-95 shadow-2xl animate-bounce text-lg uppercase"
                    >
                        {lastResult === 'miss' ? t.nextPlayer : t.fireAgain}
                    </button>
                )}
            </div>

            {phase === 'RESULT' && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center z-[100] animate-in fade-in duration-500">

                    {/* Language Toggle for Victory Screen */}
                    <div className="absolute top-4 right-4">
                        <button
                            onClick={useGameStore.getState().toggleLanguage}
                            className="px-3 py-1 border border-slate-500 rounded hover:bg-slate-700 transition-colors text-sm font-bold flex items-center gap-x-2 text-white"
                        >
                            <span>{language === 'ru' ? '🇷🇺' : '🇬🇧'}</span>
                            <span>{language === 'ru' ? 'RU' : 'EN'}</span>
                        </button>
                    </div>

                    <div className="text-center space-y-4">
                        <h2 className="text-8xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                            {t.victory}
                        </h2>
                        <p className="text-3xl font-bold text-blue-400 uppercase tracking-[0.2em]">
                            {language === 'en'
                                ? `${turn === 'p1' ? 'Player 1' : 'Player 2'} ${t.conquered}`
                                : `${turn === 'p1' ? 'Игрок 1' : 'Игрок 2'} ${t.conquered}`}
                        </p>
                    </div>

                    <button
                        onClick={resetLogic}
                        className="mt-12 px-12 py-4 bg-white text-black hover:bg-blue-500 hover:text-white rounded-full font-black text-xl transition-all transform hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                        {t.redeploy}
                    </button>
                </div>
            )}
        </div>
    );
};