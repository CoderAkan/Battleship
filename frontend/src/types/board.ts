export type CellStatus = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

export interface Cell {
    status: CellStatus;
    shipId?: string; // Links the cell to a specific ship object
}

export type Board = Cell[][];

export type ShipType = 'Carrier' | 'Battleship' | 'Cruiser' | 'Destroyer' | 'Submarine';

export interface Ship {
    id: string;
    type: ShipType;
    size: number;
    hits: number;
    isSunk: boolean;
    orientation: 'horizontal' | 'vertical';
    coordinates: { x: number; y: number }[]; // Array of occupied cells
}