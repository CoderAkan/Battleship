import type { ShipType } from '../types/board';

export interface ShipConfig {
    type: ShipType;
    size: number;
    count: number;
}

export const FLEET_CONFIG: ShipConfig[] = [
    { type: 'Carrier', size: 5, count: 1 },
    { type: 'Battleship', size: 4, count: 1 },
    { type: 'Cruiser', size: 3, count: 2 },
    { type: 'Destroyer', size: 2, count: 1 },
    { type: 'Submarine', size: 1, count: 1 },
];

export const SHIPS_TO_PLACE = FLEET_CONFIG.flatMap((ship) =>
    Array.from({ length: ship.count }, () => ({
        type: ship.type,
        size: ship.size
    }))
);

export const BOARD_SIZE = 10;