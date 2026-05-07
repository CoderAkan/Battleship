import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Grid } from '../../components/Grid';
import { canPlaceShip } from '../../utils/placementLogic';
import { SHIPS_TO_PLACE } from '../../utils/constants';
import { TurnOverlay } from '../../components/TurnOverlay';
import { translations } from '../../utils/translations';
import { toast } from 'react-toastify';

export const SetupPage = () => {
    const { boards, turn, placeShip, removeLastShip, setPhase, language, mode, resetGame } = useGameStore();

    const [shipIndex, setShipIndex] = useState(0);
    const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
    const [hoveredCell, setHoveredCell] = useState<{ x: number, y: number } | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const currentShip = SHIPS_TO_PLACE[shipIndex];
    const t = translations[language];
    const currentBoard = boards[turn];

    // Once shipIndex passes the end of the ship list, every ship has been
    // placed but NOT YET committed. The user can still undo and re-place.
    // The transition only happens when they click Confirm Fleet.
    const allPlaced = shipIndex >= SHIPS_TO_PLACE.length;

    const autoPlaceBotShips = () => {
        const placedCoords = new Set<string>();

        SHIPS_TO_PLACE.forEach((shipConfig) => {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 200) {
                const x = Math.floor(Math.random() * 10);
                const y = Math.floor(Math.random() * 10);
                const orient = Math.random() > 0.5 ? 'horizontal' : 'vertical';

                const shipCoords: { x: number; y: number }[] = [];
                for (let i = 0; i < shipConfig.size; i++) {
                    shipCoords.push({
                        x: orient === 'horizontal' ? x + i : x,
                        y: orient === 'vertical' ? y + i : y,
                    });
                }

                const fitsOnBoard = shipCoords.every(
                    (coord) => coord.x >= 0 && coord.x < 10 && coord.y >= 0 && coord.y < 10
                );

                if (!fitsOnBoard) {
                    attempts++;
                    continue;
                }

                let canPlace = true;
                for (const { x: shipX, y: shipY } of shipCoords) {
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const checkKey = `${shipX + dx},${shipY + dy}`;
                            if (placedCoords.has(checkKey)) {
                                canPlace = false;
                                break;
                            }
                        }
                        if (!canPlace) break;
                    }
                    if (!canPlace) break;
                }

                if (canPlace) {
                    placeShip('p2', {
                        id: Math.random().toString(36),
                        type: shipConfig.type,
                        size: shipConfig.size,
                        orientation: orient,
                        hits: 0,
                        isSunk: false,
                        coordinates: shipCoords,
                    });

                    shipCoords.forEach(({ x: sx, y: sy }) => {
                        placedCoords.add(`${sx},${sy}`);
                    });

                    placed = true;
                }
                attempts++;
            }
        });
    };

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

    const handleBack = () => {
        // resetGame() sets phase back to 'START_MENU' and clears all boards/ships,
        // so the user lands on the BOT vs MULTIPLAYER selection screen with a
        // clean slate.
        resetGame();
    };

    /**
     * Undo the most recent ship placement for the current player.
     * Forward-redo is intentionally NOT supported — the user requested back-only.
     *
     * Disabled when shipIndex === 0 (nothing to undo yet for this player).
     * Available even after all ships are placed (shipIndex === SHIPS_TO_PLACE.length)
     * so the user can fix the last placement before clicking Confirm Fleet.
     */
    const handleUndo = () => {
        if (shipIndex === 0) return;

        removeLastShip(turn);
        setShipIndex(prev => prev - 1);
        setHoveredCell(null);
    };

    const canUndo = shipIndex > 0;

    /**
     * Commit the current placement and advance phases.
     * Called only when the user explicitly clicks Confirm Fleet — never
     * automatically — so undo is always possible up until this moment.
     */
    const handleConfirmFleet = () => {
        if (turn === 'p1') {
            if (mode === 'BOT') {
                autoPlaceBotShips();
                setPhase('BATTLE');
            } else {
                setIsTransitioning(true);
            }
        } else {
            setPhase('BATTLE');
            useGameStore.setState({ turn: 'p1' });
        }
    };

    const handleCellClick = (x: number, y: number) => {
        if (allPlaced) return;

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
            setShipIndex(prev => prev + 1);
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
        return <div className="text-white text-center mt-20">Loading Fleet Command...</div>;
    }

    return (
        <div className="w-full min-h-full bg-slate-950 text-white select-none flex flex-col">
            {/* Header */}
            <div className="shrink-0 pt-2 pb-2 sm:pt-4 sm:pb-3 px-3 sm:px-4 text-center border-b border-slate-800 relative">
                <button
                    onClick={handleBack}
                    className="absolute top-2 left-2 sm:top-3 sm:left-3 lg:top-4 lg:left-4 group flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 lg:px-4 lg:py-2 border border-slate-600 rounded hover:bg-slate-800 hover:border-slate-400 transition-colors text-[10px] sm:text-xs lg:text-sm font-bold uppercase tracking-wider"
                    aria-label={t.back ?? (language === 'en' ? 'Back' : 'Назад')}
                >
                    <span className="leading-none transition-transform group-hover:-translate-x-0.5">←</span>
                    <span>{t.back ?? (language === 'en' ? 'Back' : 'Назад')}</span>
                </button>

                <h2 className="text-sm sm:text-lg md:text-2xl font-black italic text-blue-500 uppercase tracking-tighter leading-tight">
                    {language === 'en' ? `Player ${turn === 'p1' ? '1' : '2'}'s Setup` : `Настройка Игрока ${turn === 'p1' ? '1' : '2'}`}
                </h2>
                <h1 className="hidden sm:block text-xl sm:text-2xl font-black uppercase tracking-tight mb-1 sm:mb-2">{t.commander}</h1>
                {!allPlaced ? (
                    <p className="text-blue-400 font-bold uppercase text-[8px] sm:text-[10px] tracking-widest mt-1">
                        {t.placing}: {currentShip?.type} ({currentShip?.size} {t.cells})
                        <span className="ml-2 text-white/40">[{shipIndex + 1}/{SHIPS_TO_PLACE.length}]</span>
                    </p>
                ) : (
                    <p className="text-green-400 font-bold uppercase text-[8px] sm:text-[10px] tracking-widest mt-1">
                        {language === 'en' ? 'All ships placed — confirm to begin' : 'Все корабли расставлены — подтвердите'}
                    </p>
                )}
            </div>

            {/* Controls — Rotate (only while placing) */}
            <div className="shrink-0 p-2 sm:p-3 flex justify-center items-center gap-2 sm:gap-3">
                {!allPlaced && (
                    <button
                        onClick={() => setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')}
                        className="px-5 py-2 sm:px-8 sm:py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-black transition-all shadow-lg text-[11px] sm:text-sm active:scale-95 uppercase tracking-wider"
                    >
                        {t.rotate} {orientation === 'horizontal' ? t.vertical : t.horizontal}
                    </button>
                )}
                {canUndo && (
                    <button
                        onClick={handleUndo}
                        className="px-4 py-2 sm:px-5 sm:py-3 bg-slate-700 hover:bg-slate-600 rounded-full font-black transition-all text-[11px] sm:text-sm active:scale-95 uppercase tracking-wider"
                    >
                        ← {t.undo}
                    </button>
                )}
            </div>

            {/* Grid + side undo */}
            <div className="flex-1 flex items-center justify-center px-3 pb-4 sm:pb-6">
                <div
                    className="relative aspect-square w-full"
                    style={{ maxWidth: 'min(100%, 60vh, 540px)' }}
                >
                    <Grid
                        board={currentBoard}
                        onCellClick={!allPlaced ? handleCellClick : undefined}
                        onCellHover={(x, y) => setHoveredCell(x === -1 ? null : { x, y })}
                        previewCells={previewCells}
                        isPreviewValid={isPreviewValid}
                        showShips={true}
                    />
                </div>
            </div>

            {/* Confirm Fleet — only visible once all ships are placed */}
            {allPlaced && (
                <div className="shrink-0 p-4 sm:p-6 flex justify-center">
                    <button
                        onClick={handleConfirmFleet}
                        className="px-12 py-4 sm:px-16 sm:py-5 bg-green-600 hover:bg-green-500 text-white font-black uppercase rounded-xl transition-all active:scale-95 shadow-[0_10px_40px_rgba(34,197,94,0.4)] text-sm sm:text-base tracking-wider"
                    >
                        {language === 'en' ? 'Confirm Fleet →' : 'Подтвердить флот →'}
                    </button>
                </div>
            )}
        </div>
    );
};