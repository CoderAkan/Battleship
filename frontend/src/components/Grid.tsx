import type { Board } from "../types/board";

interface GridProps {
    board: Board;
    onCellClick?: (x: number, y: number) => void;
    showShips: boolean;
    previewCells?: { x: number, y: number }[];
    onCellHover?: (x: number, y: number) => void;
}

export const Grid = ({ board, onCellClick, showShips, previewCells, onCellHover }: GridProps) => {
    return (
        <div
            className="grid grid-cols-10 gap-0.5 bg-slate-800 p-1 border-2 border-slate-700 rounded-lg shadow-2xl w-fit mx-auto"
            onMouseLeave={() => onCellHover?.(-1, -1)}
        >
            {board.map((row, y) =>
                row.map((cell, x) => {
                    const isHit = cell.status === 'hit';
                    const isMiss = cell.status === 'miss';
                    const isSunk = cell.status === 'sunk';
                    const isPreview = previewCells?.some(p => p.x === x && p.y === y);
                    const isShipVisible = showShips && cell.status === 'ship';

                    return (
                        <div
                            key={`${x}-${y}`}
                            onClick={() => onCellClick?.(x, y)}
                            onMouseEnter={() => onCellHover?.(x, y)}
                            className={`
                                /* Scaled down by ~10% for better laptop fit */
                                w-[4.5vh] h-[4.5vh] md:w-[5.8vh] md:h-[5.8vh]
                                flex items-center justify-center rounded-sm transition-all duration-200 
                                cursor-pointer text-sm md:text-xl
                                ${isHit ? 'bg-orange-500 animate-pulse' : ''}
                                ${isMiss ? 'bg-slate-700' : ''}
                                ${isSunk ? 'bg-red-700 border border-red-400' : ''}
                                ${isShipVisible ? 'bg-blue-600 border border-blue-400' : ''}
                                ${isPreview ? 'bg-blue-400/40 border border-blue-300' : ''}
                                ${!isShipVisible && !isHit && !isMiss && !isSunk && !isPreview ? 'bg-slate-900 hover:bg-slate-700' : ''}
                            `}
                        >
                            {isHit && "🔥"}
                            {isMiss && <span className="text-red-500 font-bold">X</span>}
                            {isSunk && "💀"}
                        </div>
                    );
                })
            )}
        </div>
    );
};