import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Grid } from '../../components/Grid';
import { canPlaceShip } from '../../utils/placementLogic';
import { SHIPS_TO_PLACE } from '../../utils/constants';
import { TurnOverlay } from '../../components/TurnOverlay';
import { translations } from '../../utils/translations';
import { toast } from 'react-toastify';

export const SetupPage = () => {
    const { boards, turn, placeShip, setPhase, language, toggleLanguage } = useGameStore();

    const [shipIndex, setShipIndex] = useState(0);
    const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
    const [hoveredCell, setHoveredCell] = useState<{ x: number, y: number } | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const currentShip = SHIPS_TO_PLACE[shipIndex];
    const t = translations[language];
    const currentBoard = boards[turn];

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';
        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.overscrollBehavior = 'auto';
        };
    }, []);

    const getPreviewCells = () => {
        if (!hoveredCell || !currentShip) return [];
        const { x, y } = hoveredCell;
        const { size } = currentShip;
        const cells = [];
        for (let i = 0; i < size; i++) {
            const curX = orientation === 'horizontal' ? x + i : x;
            const curY = orientation === 'vertical' ? y + i : y;
            if (curX < 10 && curY < 10) cells.push({ x: curX, y: curY });
        }
        return cells;
    };

    const previewCells = getPreviewCells();

    const isPreviewValid = !!(
        hoveredCell &&
        currentShip &&
        (orientation === 'horizontal'
            ? hoveredCell.x + currentShip.size <= 10
            : hoveredCell.y + currentShip.size <= 10) &&
        canPlaceShip(currentBoard, currentShip.size, hoveredCell.x, hoveredCell.y, orientation)
    );

    const handleNextPlayerStart = () => {
        useGameStore.getState().switchTurn();
        setShipIndex(0);
        setIsTransitioning(false);
    };

    const handleCellClick = (x: number, y: number) => {
        if (shipIndex >= SHIPS_TO_PLACE.length) return;

        const fitsOnBoard = orientation === 'horizontal'
            ? x + currentShip.size <= 10
            : y + currentShip.size <= 10;

        if (!fitsOnBoard) return;

        if (canPlaceShip(currentBoard, currentShip.size, x, y, orientation)) {
            placeShip(turn, {
                id: window.crypto?.randomUUID() || Math.random().toString(36),
                type: currentShip.type,
                size: currentShip.size,
                orientation,
                hits: 0,
                isSunk: false,
                coordinates: Array.from({ length: currentShip.size }).map((_, i) => ({
                    x: orientation === 'horizontal' ? x + i : x,
                    y: orientation === 'vertical' ? y + i : y,
                })),
            });

            setHoveredCell(null);

            if (shipIndex === SHIPS_TO_PLACE.length - 1) {
                if (turn === 'p1') {
                    setIsTransitioning(true);
                } else {
                    useGameStore.setState({ turn: 'p1' });
                    setPhase('BATTLE');
                }
            } else {
                setShipIndex(prev => prev + 1);
            }
        } else {
            toast.error(t.invalidPlacement);
        }
    };

    if (isTransitioning) {
        return (
            <TurnOverlay
                nextPlayer={language === 'en' ? 'Player 2' : 'Игрок 2'}
                onContinue={handleNextPlayerStart}
            />
        );
    }

    if (!currentBoard || currentBoard.length === 0) {
        return <div className="text-white">Loading Fleet Command...</div>;
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

            <div className="min-h-full lg:h-full w-full flex flex-col items-center justify-start p-4 pt-12 lg:pt-4">
                <header className="mb-2 text-center shrink-0">
                    <h2 className="text-xl md:text-2xl font-black italic text-blue-500 uppercase tracking-tighter">
                        {language === 'en'
                            ? `Player ${turn === 'p1' ? '1' : '2'}'s Setup`
                            : `Настройка Игрока ${turn === 'p1' ? '1' : '2'}`}
                    </h2>
                    <div className="h-1 w-16 bg-blue-500 mx-auto rounded-full mt-1 opacity-50" />
                </header>

                <div className="text-center mb-4 shrink-0">
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-1">
                        {t.commander}
                    </h1>
                    <p className="text-blue-400 font-bold uppercase text-[10px] sm:text-xs tracking-widest">
                        {t.placing}: {currentShip?.type} ({currentShip?.size} {t.cells})
                        <span className="ml-2 text-white/40">[{shipIndex + 1}/{SHIPS_TO_PLACE.length}]</span>
                    </p>
                </div>

                <div className="shrink-0 mb-6">
                    <button
                        onClick={() => setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')}
                        className="px-10 py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-black transition-all shadow-lg text-sm flex items-center gap-2 active:scale-95"
                    >
                        <span>{t.rotate} {orientation === 'horizontal' ? t.vertical : t.horizontal}</span>
                    </button>
                </div>

                <div className="flex-1 flex items-start lg:items-center justify-center w-full min-h-0 pb-8">
                    <div className="scale-90 sm:scale-100 transition-transform shadow-2xl">
                        <Grid
                            board={currentBoard}
                            onCellClick={handleCellClick}
                            onCellHover={(x, y) => setHoveredCell(x === -1 ? null : { x, y })}
                            previewCells={previewCells}
                            isPreviewValid={isPreviewValid}
                            showShips={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};