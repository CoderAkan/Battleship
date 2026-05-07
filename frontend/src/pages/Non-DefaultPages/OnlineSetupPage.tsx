import { useState } from 'react';
import { toast } from 'react-toastify';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useGameStore } from '../../store/useGameStore';
import { Grid } from '../../components/Grid';
import { canPlaceShip } from '../../utils/placementLogic';
import { SHIPS_TO_PLACE } from '../../utils/constants';
import { translations } from '../../utils/translations';
import { createEmptyBoard } from '../../utils/boardHelpers';
import type { Board, Ship } from '../../types/board';

/**
 * Online ship placement.
 *
 * Differs from local SetupPage in three ways:
 *   1. No turn switching — only the current player places their ships.
 *   2. After all ships are placed, sends them to the server via the store
 *      and waits for the opponent to do the same.
 *   3. No back-to-menu button mid-placement — leaving forfeits the room.
 *
 * Ship placement state is local to this component (board + ship list)
 * until submitted; only then does it land in the multiplayer store.
 */
export const OnlineSetupPage = () => {
    const { language } = useGameStore();
    const t = translations[language];
    const {
        boardSubmitted,
        opponentReady,
        opponentUsername,
        submitBoard,
    } = useMultiplayerStore();

    // Local placement state. Mirrors what SetupPage does but on a board
    // that lives in this component, not in useGameStore. We hand it off
    // to the store only when fully placed and submitted.
    const [board, setBoard] = useState<Board>(createEmptyBoard());
    const [ships, setShips] = useState<Ship[]>([]);
    const [shipIndex, setShipIndex] = useState(0);
    const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
    const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

    const currentShip = SHIPS_TO_PLACE[shipIndex];
    const allPlaced = shipIndex >= SHIPS_TO_PLACE.length;

    // ─── preview ───
    const getPreviewCells = () => {
        if (!hoveredCell || !currentShip) return [];
        const { x, y } = hoveredCell;
        const cells: { x: number; y: number }[] = [];
        for (let i = 0; i < currentShip.size; i++) {
            const cx = orientation === 'horizontal' ? x + i : x;
            const cy = orientation === 'vertical' ? y + i : y;
            if (cx < 10 && cy < 10) cells.push({ x: cx, y: cy });
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
        canPlaceShip(board, currentShip.size, hoveredCell.x, hoveredCell.y, orientation)
    );

    // ─── handlers ───
    const handleCellClick = (x: number, y: number) => {
        if (allPlaced) return;
        const fitsOnBoard = orientation === 'horizontal'
            ? x + currentShip.size <= 10
            : y + currentShip.size <= 10;
        if (!fitsOnBoard) return;
        if (!canPlaceShip(board, currentShip.size, x, y, orientation)) {
            toast.error(t.invalidPlacement);
            return;
        }

        // Build the ship and update local state.
        const coordinates = Array.from({ length: currentShip.size }).map((_, i) => ({
            x: orientation === 'horizontal' ? x + i : x,
            y: orientation === 'vertical' ? y + i : y,
        }));
        const ship: Ship = {
            id: window.crypto?.randomUUID() || Math.random().toString(36),
            type: currentShip.type,
            size: currentShip.size,
            orientation,
            hits: 0,
            isSunk: false,
            coordinates,
        };

        const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));
        coordinates.forEach(({ x, y }) => {
            newBoard[y][x] = { status: 'ship', shipId: ship.id };
        });

        setBoard(newBoard);
        setShips([...ships, ship]);
        setShipIndex(shipIndex + 1);
        setHoveredCell(null);
    };

    const handleUndo = () => {
        if (ships.length === 0) return;
        const lastShip = ships[ships.length - 1];
        const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));
        lastShip.coordinates.forEach(({ x, y }) => {
            newBoard[y][x] = { status: 'empty' };
        });
        setBoard(newBoard);
        setShips(ships.slice(0, -1));
        setShipIndex(shipIndex - 1);
        setHoveredCell(null);
    };

    const handleSubmit = () => {
        submitBoard(board, ships);
    };

    // ─── waiting screen after submission ───
    if (boardSubmitted) {
        return (
            <div className="min-h-[calc(100dvh-4rem)] bg-slate-950 text-white flex flex-col items-center justify-center px-4 gap-8">
                <div className="text-center">
                    <p className="text-blue-500 font-mono tracking-[0.4em] text-xs sm:text-sm uppercase mb-3">
                        {t.youArePlaced}
                    </p>
                    <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter italic">
                        {opponentReady ? t.bothReady : t.opponentPlacing}
                    </h2>
                    {opponentUsername && (
                        <p className="text-slate-400 mt-3 text-sm sm:text-base">
                            vs <span className="font-bold text-white">{opponentUsername}</span>
                        </p>
                    )}
                </div>

                <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                </div>

                <div className="aspect-square w-full max-w-md opacity-60">
                    <Grid board={board} showShips={true} />
                </div>
            </div>
        );
    }

    // ─── placement screen ───
    return (
        <div className="min-h-[calc(100dvh-4rem)] bg-slate-950 text-white flex flex-col select-none">
            <div className="shrink-0 pt-4 pb-3 px-3 sm:px-4 text-center border-b border-slate-800">
                <h2 className="text-base sm:text-2xl font-black italic text-blue-500 uppercase tracking-tighter">
                    {t.placeYourFleet}
                </h2>
                {opponentReady && (
                    <p className="text-green-400 text-xs font-bold uppercase tracking-widest mt-1 animate-pulse">
                        ✓ {t.opponentReady}
                    </p>
                )}
                {!allPlaced && (
                    <p className="text-blue-400 font-bold uppercase text-[10px] sm:text-xs tracking-widest mt-2">
                        {t.placing}: {currentShip.type} ({currentShip.size} {t.cells})
                        <span className="ml-2 text-white/40">
                            [{shipIndex + 1}/{SHIPS_TO_PLACE.length}]
                        </span>
                    </p>
                )}
            </div>

            {/* Controls row */}
            <div className="shrink-0 p-2 sm:p-3 flex justify-center items-center gap-2 sm:gap-3">
                {!allPlaced && (
                    <button
                        onClick={() => setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')}
                        className="px-5 py-2 sm:px-8 sm:py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-black transition-all shadow-lg text-[11px] sm:text-sm active:scale-95 uppercase tracking-wider"
                    >
                        {t.rotate} {orientation === 'horizontal' ? t.vertical : t.horizontal}
                    </button>
                )}
                {ships.length > 0 && !allPlaced && (
                    <button
                        onClick={handleUndo}
                        className="px-4 py-2 sm:px-5 sm:py-3 bg-slate-700 hover:bg-slate-600 rounded-full font-black transition-all text-[11px] sm:text-sm active:scale-95 uppercase tracking-wider"
                    >
                        ← {t.undo}
                    </button>
                )}
            </div>

            {/* Grid */}
            <div className="flex-1 flex items-center justify-center px-3 pb-4 sm:pb-6">
                <div
                    className="relative aspect-square w-full"
                    style={{ maxWidth: 'min(100%, 60vh, 540px)' }}
                >
                    <Grid
                        board={board}
                        onCellClick={!allPlaced ? handleCellClick : undefined}
                        onCellHover={(x, y) => setHoveredCell(x === -1 ? null : { x, y })}
                        previewCells={previewCells}
                        isPreviewValid={isPreviewValid}
                        showShips={true}
                    />
                </div>
            </div>

            {/* Submit fleet button — only visible once all ships are placed */}
            {allPlaced && (
                <div className="shrink-0 p-4 sm:p-6 flex justify-center">
                    <button
                        onClick={handleSubmit}
                        className="px-12 py-4 sm:px-16 sm:py-5 bg-green-600 hover:bg-green-500 text-white font-black uppercase rounded-xl transition-all active:scale-95 shadow-[0_10px_40px_rgba(34,197,94,0.4)] text-sm sm:text-base tracking-wider"
                    >
                        Submit Fleet →
                    </button>
                </div>
            )}
        </div>
    );
};