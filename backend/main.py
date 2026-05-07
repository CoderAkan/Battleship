import random
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class BotMoveRequest(BaseModel):
    board: List[List[int]]  # 0=empty, 1=miss, 2=hit
    remaining_ships: List[int]

@app.post("/bot/move")
async def calculate_move(data: BotMoveRequest):
    try:
        heatmap = [[0 for _ in range(10)] for _ in range(10)]
        possible_targets = [(r, c) for r in range(10) for c in range(10) if data.board[r][c] == 0]
        
        if not possible_targets:
            return {"x": 0, "y": 0}
        
        # 1. Target Mode - prioritize shots next to hits
        for r in range(10):
            for c in range(10):
                if data.board[r][c] == 2:  # Hit cell
                    for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < 10 and 0 <= nc < 10 and data.board[nr][nc] == 0:
                            heatmap[nr][nc] += 100
        
        # 2. Probability Mode - place ships to find remaining enemies
        for ship_size in data.remaining_ships:
            # Horizontal placements
            for r in range(10):
                for c in range(10):
                    if can_place_ship(data.board, ship_size, c, r, 'horizontal'):
                        for i in range(ship_size):
                            if c + i < 10 and data.board[r][c + i] == 0:
                                heatmap[r][c + i] += 1
            
            # Vertical placements
            for r in range(10):
                for c in range(10):
                    if can_place_ship(data.board, ship_size, c, r, 'vertical'):
                        for i in range(ship_size):
                            if r + i < 10 and data.board[r + i][c] == 0:
                                heatmap[r + i][c] += 1
        
        # 3. Find Max
        max_heat = -1
        best_move = random.choice(possible_targets)
        for r, c in possible_targets:
            if heatmap[r][c] > max_heat:
                max_heat = heatmap[r][c]
                best_move = (r, c)
        
        return {"x": best_move[1], "y": best_move[0]}  # x=col, y=row
    except Exception as e:
        print(f"Error: {e}")
        # Fallback: random valid move
        possible = [(r, c) for r in range(10) for c in range(10)]
        target = random.choice(possible)
        return {"x": target[1], "y": target[0]}

def can_place_ship(board, ship_size, x, y, orientation):
    """
    Exact same logic as frontend canPlaceShip.
    Board: 0=empty, 1=miss, 2=hit/ship
    orientation: 'horizontal' or 'vertical'
    """
    for i in range(ship_size):
        cur_x = x + i if orientation == 'horizontal' else x
        cur_y = y + i if orientation == 'vertical' else y
        
        # Check bounds
        if cur_x < 0 or cur_x >= 10 or cur_y < 0 or cur_y >= 10:
            return False
        
        # Check 3x3 buffer
        for dy in range(-1, 2):
            for dx in range(-1, 2):
                check_x = cur_x + dx
                check_y = cur_y + dy
                
                if 0 <= check_x < 10 and 0 <= check_y < 10:
                    if board[check_y][check_x] == 2:  # 2 = existing ship
                        return False
    
    return True