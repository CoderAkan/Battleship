import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Grid } from '../../components/Grid';
import type { ShipType } from '../../types/board';
import { canPlaceShip } from '../../utils/placementLogic';
import { SHIPS_TO_PLACE } from '../../utils/constants';
import { TurnOverlay } from '../../components/TurnOverlay';
import { translations } from '../../utils/translations';


export const SetupPage = () => {
    const { boards, turn, placeShip, setPhase, language } = useGameStore();

    const t = translations[language];
    const currentBoard = boards[turn];

    if (!currentBoard || currentBoard.length === 0) {
        return <div className="text-white">Loading Fleet Command...</div>;
    }

    const [shipIndex, setShipIndex] = useState(0);
    const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
    const [hoveredCell, setHoveredCell] = useState<{ x: number, y: number } | null>(null);

    const [isTransitioning, setIsTransitioning] = useState(false);

    const currentShip = SHIPS_TO_PLACE[shipIndex];

    const getPreviewCells = () => {
        if (!hoveredCell || shipIndex >= SHIPS_TO_PLACE.length) return [];

        const { x, y } = hoveredCell;
        const { size } = currentShip;

        const cells = [];
        for (let i = 0; i < size; i++) {
            const curX = orientation === 'horizontal' ? x + i : x;
            const curY = orientation === 'vertical' ? y + i : y;
            if (curX < 10 && curY < 10) {
                cells.push({ x: curX, y: curY });
            }
        }
        return cells;
    };

    const handlePlacementComplete = () => {
        if (turn === 'p1') {
            setIsTransitioning(true);
        } else {
            setPhase('BATTLE');
        }
    };

    const handleNextPlayerStart = () => {
        useGameStore.getState().switchTurn();
        setShipIndex(0);
        setIsTransitioning(false);
    };

    if (isTransitioning) {
        return (
            <TurnOverlay
                nextPlayer={language === 'en' ? 'Player 2' : 'Игрок 2'}
                onContinue={handleNextPlayerStart}
            />
        );
    }

    const handleCellClick = (x: number, y: number) => {
        if (shipIndex >= SHIPS_TO_PLACE.length) return;

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

            // Check if this was the LAST ship for the current player
            if (shipIndex === SHIPS_TO_PLACE.length - 1) {
                if (turn === 'p1') {
                    // Show the "Pass the Device" screen first
                    setIsTransitioning(true);
                } else {
                    // Player 2 is done, let's fight!
                    setPhase('BATTLE');
                }
            } else {
                setShipIndex(shipIndex + 1);
            }
        } else {
            alert("Invalid placement! Ships cannot touch.");
        }
    };

    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-2 bg-slate-900 text-white overflow-hidden">
            <div className="text-center mb-4">
                <h1 className="text-3xl font-black uppercase tracking-tight mb-1">
                    {t.commander}
                </h1>
                <p className="text-blue-400 font-bold uppercase text-xs tracking-widest">
                    {t.placing}: {currentShip?.type} ({currentShip?.size} {t.cells})
                </p>
            </div>

            <button
                onClick={() => setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')}
                className="mb-6 px-10 py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-black transition-all shadow-lg text-sm flex items-center gap-1"
            >
                {/* Label: "ROTATE SHIP" or "ПОВЕРНУТЬ" */}
                <span>{t.rotate}</span>

                {/* Dynamic Orientation Text and Arrow */}
                <span>
                    {orientation === 'horizontal'
                        ? `${t.vertical}`
                        : `${t.horizontal}`}
                </span>
            </button>

            <div className="flex-none shadow-2xl">
                <Grid
                    board={currentBoard}
                    onCellClick={handleCellClick}
                    onCellHover={(x, y) => setHoveredCell(x === -1 ? null : { x, y })}
                    previewCells={getPreviewCells()}
                    showShips={true}
                />
            </div>
        </div>
    );
};