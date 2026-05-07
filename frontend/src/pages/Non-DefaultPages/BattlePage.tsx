import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Grid } from '../../components/Grid';
import { TurnOverlay } from '../../components/TurnOverlay';
import { translations } from '../../utils/translations';

export const BattlePage = () => {
    const { boards, turn, fireShot, switchTurn, phase, language, toggleLanguage } = useGameStore();
    const t = translations[language];

    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isMissed, setIsMissed] = useState(false);
    const [statusMessage, setStatusMessage] = useState(t.commanderFire);
    const [flash, setFlash] = useState(false);

    const enemy = turn === 'p1' ? 'p2' : 'p1';
    const enemyBoard = boards[enemy];

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';
        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.overscrollBehavior = 'auto';
        };
    }, []);

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
        }
    };

    const handleContinue = () => setIsTransitioning(true);

    const handleTransitionComplete = () => {
        switchTurn();
        setIsMissed(false);
        setStatusMessage(t.commanderFire);
        setIsTransitioning(false);
    };

    const resetLogic = () => {
        localStorage.clear();
        window.location.reload();
    };

    if (isTransitioning) {
        return (
            <TurnOverlay
                nextPlayer={turn === 'p1' ? (language === 'en' ? 'Player 2' : 'Игрок 2') : (language === 'en' ? 'Player 1' : 'Игрок 1')}
                onContinue={handleTransitionComplete}
            />
        );
    }

    return (
        <div className="fixed inset-0 w-full h-full bg-slate-950 text-white overflow-y-auto lg:overflow-hidden select-none z-50 no-bounce">

            <div className="absolute top-4 right-4 z-[110]">
                <button
                    onClick={toggleLanguage}
                    className="px-3 py-1 border border-slate-700 rounded hover:bg-slate-800 transition-colors text-xs font-bold flex items-center gap-x-2 text-white bg-slate-900/80 backdrop-blur-md"
                >
                    <span>{language === 'ru' ? '🇷🇺' : '🇬🇧'}</span>
                    <span>{language === 'ru' ? 'RU' : 'EN'}</span>
                </button>
            </div>

            {phase !== 'RESULT' ? (
                <div className="min-h-full lg:h-full w-full flex flex-col items-center p-4">
                    <header className="mb-4 text-center shrink-0 pt-10 lg:pt-2">
                        <h1 className="text-xl font-black italic text-blue-500 uppercase tracking-tighter">
                            {language === 'en' ? `Player ${turn === 'p1' ? '1' : '2'}'s Turn` : `Ход Игрока ${turn === 'p1' ? '1' : '2'}`}
                        </h1>

                        <div className={`mt-2 mx-auto h-12 flex items-center justify-center max-w-xs px-4 py-2 rounded border-2 transition-all duration-300 ${isMissed ? 'border-red-900 bg-red-950/30' : 'border-blue-900 bg-blue-950/30'} ${flash ? 'scale-105 brightness-150' : 'scale-100'}`}>
                            <p className={`font-mono font-bold text-[10px] sm:text-xs uppercase tracking-widest ${statusMessage === t.sunk ? 'text-orange-400' : isMissed ? 'text-red-500' : 'text-blue-400'}`}>
                                {statusMessage}
                            </p>
                        </div>
                    </header>

                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-center justify-center flex-1 w-full min-h-0 py-4">
                        <div className="flex flex-col items-center shrink-0">
                            <h2 className="mb-2 text-red-500 text-xs font-bold uppercase tracking-[0.2em]">{t.enemyWaters}</h2>
                            <div className="scale-90 sm:scale-100 lg:scale-95 xl:scale-100 transition-transform">
                                <Grid board={enemyBoard} showShips={false} onCellClick={handleCellClick} />
                            </div>
                        </div>
                        <div className="flex flex-col items-center shrink-0">
                            <h2 className="mb-2 text-blue-400 text-xs font-bold uppercase tracking-[0.2em]">{t.yourFleet}</h2>
                            <div className="scale-90 sm:scale-100 lg:scale-95 xl:scale-100 opacity-80 transition-transform">
                                <Grid board={boards[turn]} showShips={true} />
                            </div>
                        </div>
                    </div>

                    <div className="h-20 flex items-center shrink-0">
                        {isMissed && (
                            <button
                                onClick={handleContinue}
                                className="px-10 py-3 bg-white text-black font-black rounded-full hover:bg-blue-400 shadow-[0_0_30_rgba(59,130,246,0.5)] text-base uppercase transition-all transform active:scale-95 animate-bounce"
                            >
                                {t.nextPlayer}
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="min-h-fit lg:h-full w-full bg-slate-950 flex flex-col items-center justify-start lg:justify-between p-4 md:p-8 relative">

                    <div className="text-center mt-12 md:mt-3 mb-4 shrink-0">
                        <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(59,130,246,0.6)] uppercase">
                            {t.victory}
                        </h2>
                        <p className="text-xs md:text-md lg:text-lg font-bold text-blue-400 uppercase tracking-[0.3em] mt-2">
                            {language === 'en'
                                ? `${turn === 'p1' ? 'Player 1' : 'Player 2'} ${t.conquered}`
                                : `${turn === 'p1' ? 'Игрок 1' : 'Игрок 2'} ${t.conquered}`}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 lg:gap-16 items-center justify-center w-full max-w-6xl mx-auto py-2">

                        <div className="flex flex-col items-center shrink-0">
                            <h3 className="mb-[15px] leading-none text-blue-500 font-black uppercase tracking-widest text-[10px] md:text-xs">
                                {language === 'en' ? "Player 1 Fleet" : "Флот Игрока 1"}
                            </h3>
                            <div className="scale-[0.7] sm:scale-75 md:scale-80 lg:scale-80 xl:scale-95 transition-transform origin-top -mb-[60px] sm:mb-0">
                                <Grid board={boards.p1} showShips={true} />
                            </div>
                        </div>

                        <div className="flex flex-col items-center shrink-0">
                            <h3 className="mb-[15px] leading-none text-red-500 font-black uppercase tracking-widest text-[10px] md:text-xs">
                                {language === 'en' ? "Player 2 Fleet" : "Флот Игрока 2"}
                            </h3>
                            <div className="scale-[0.7] sm:scale-75 md:scale-80 lg:scale-80 xl:scale-95 transition-transform origin-top -mb-[60px] sm:mb-0">
                                <Grid board={boards.p2} showShips={true} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            onClick={resetLogic}
                            className="px-7 py-2 md:px-10 lg:py-3 bg-white text-black hover:bg-blue-600 hover:text-white rounded-full font-black text-sm md:text-md lg:text-lg transition-all shadow-2xl active:scale-90"
                        >
                            {t.redeploy}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};