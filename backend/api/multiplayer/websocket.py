"""
WebSocket endpoint for multiplayer.

One socket per player. Connection flow:
  1. Client opens ws://server/ws?token=<supabase_jwt>
  2. Server verifies JWT, fetches profile, holds the connection
  3. Client sends `create_room` or `join_room`
  4. Once both players are in, server sends `room_joined` to both
  5. Both submit boards → phase transitions to BATTLE
  6. Players take turns firing shots until someone wins or disconnects

All server-pushed messages are broadcast to BOTH players unless otherwise
noted, so each side has a consistent view of the match.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from .auth import verify_token
from .manager import room_manager
from .room import Room, PlayerSlot, PlayerState
from .supabase_client import fetch_profile, record_online_match


router = APIRouter()
log = logging.getLogger("multiplayer")


# ─────────────────────── helpers ───────────────────────

async def send(ws: WebSocket, payload: dict) -> None:
    """Send a message, swallowing send errors (peer may have disconnected)."""
    try:
        await ws.send_text(json.dumps(payload))
    except Exception:
        pass


async def send_error(ws: WebSocket, message: str) -> None:
    await send(ws, {"type": "error", "message": message})


async def broadcast(room: Room, payload: dict) -> None:
    """Send the same message to both players."""
    if room.p1 and room.p1.connected:
        await send(room.p1.websocket, payload)
    if room.p2 and room.p2.connected:
        await send(room.p2.websocket, payload)


# ─────────────────────── message handlers ───────────────────────

async def handle_create_room(ws: WebSocket, player: PlayerState) -> Room:
    room = room_manager.create_room()
    room.add_player(player)
    await send(ws, {"type": "room_created", "code": room.code})
    return room


async def handle_join_room(
    ws: WebSocket, player: PlayerState, code: str
) -> Optional[Room]:
    room = room_manager.get_room(code)
    if room is None:
        await send_error(ws, "Room not found")
        return None
    if room.is_full():
        await send_error(ws, "Room is full")
        return None
    if room.slot_for(player.user_id) is not None:
        await send_error(ws, "You're already in this room")
        return None

    room.add_player(player)
    room.phase = "PLACING"

    # Tell each player about their slot and their opponent.
    if room.p1 and room.p2:
        await send(room.p1.websocket, {
            "type": "room_joined",
            "you_are": "p1",
            "opponent_username": room.p2.username,
            "opponent_elo": room.p2.elo,
        })
        await send(room.p2.websocket, {
            "type": "room_joined",
            "you_are": "p2",
            "opponent_username": room.p1.username,
            "opponent_elo": room.p1.elo,
        })
        await broadcast(room, {"type": "phase_change", "phase": "PLACING"})

    return room


async def handle_submit_board(
    room: Room, slot: PlayerSlot, ships: list, ws: WebSocket
) -> None:
    try:
        room.submit_board(slot, ships)
    except ValueError as e:
        await send_error(ws, str(e))
        return

    # Notify opponent that we're ready.
    opponent = room.get_opponent(slot)
    if opponent and opponent.connected:
        await send(opponent.websocket, {"type": "opponent_ready"})

    # Both ready → start battle.
    if room.both_boards_submitted():
        room.phase = "BATTLE"
        room.turn = "p1"
        await broadcast(room, {"type": "phase_change", "phase": "BATTLE"})
        # Tell P1 it's their turn.
        if room.p1:
            await send(room.p1.websocket, {"type": "your_turn"})


async def handle_fire_shot(
    room: Room, slot: PlayerSlot, x: int, y: int, ws: WebSocket
) -> None:
    try:
        result, game_over, sunk_cells = room.fire_shot(slot, x, y)
    except ValueError as e:
        await send_error(ws, str(e))
        return

    payload = {
        "type": "shot_result",
        "attacker": slot,
        "x": x, "y": y,
        "result": result,
    }
    # Only present on sunk events — keeps normal hits/misses small.
    if sunk_cells:
        payload["sunk_cells"] = [{"x": cx, "y": cy} for cx, cy in sunk_cells]

    await broadcast(room, payload)

    if game_over:
        await finalize_match(room, reason="all_ships_sunk")
        return

    if result == "miss":
        next_player = room.get_player(room.turn)
        if next_player and next_player.connected:
            await send(next_player.websocket, {"type": "your_turn"})

async def finalize_match(
    room: Room,
    reason: str = "all_ships_sunk",
) -> None:
    """
    Record stats, send game_over to both players, clean up the room.
    """
    if room.winner is None or room.p1 is None or room.p2 is None:
        room_manager.remove_room(room.code)
        return

    winner = room.get_player(room.winner)
    loser = room.get_opponent(room.winner)
    if winner is None or loser is None:
        room_manager.remove_room(room.code)
        return

    # Record both sides. Failures don't stop the message from going out —
    # the players still need to see the result.
    try:
        new_winner_elo = record_online_match(
            user_id=winner.user_id,
            opponent_username=loser.username,
            opponent_elo=loser.elo,
            won=True,
            shots_fired=winner.shots_fired,
            successful_hits=winner.successful_hits,
        )
        new_loser_elo = record_online_match(
            user_id=loser.user_id,
            opponent_username=winner.username,
            opponent_elo=winner.elo,
            won=False,
            shots_fired=loser.shots_fired,
            successful_hits=loser.successful_hits,
        )
    except Exception as e:
        log.exception("Failed to record match: %s", e)
        new_winner_elo = winner.elo
        new_loser_elo = loser.elo

    if winner.connected:
        await send(winner.websocket, {
            "type": "game_over",
            "winner": room.winner,
            "reason": reason,
            "elo_change": (new_winner_elo or winner.elo) - winner.elo,
            "new_elo": new_winner_elo or winner.elo,
        })
    if loser.connected:
        loser_slot = "p2" if room.winner == "p1" else "p1"
        await send(loser.websocket, {
            "type": "game_over",
            "winner": room.winner,
            "reason": reason,
            "elo_change": (new_loser_elo or loser.elo) - loser.elo,
            "new_elo": new_loser_elo or loser.elo,
        })

    room_manager.remove_room(room.code)


async def handle_disconnect(room: Room, slot: PlayerSlot) -> None:
    """
    Apply the disconnect rule:
      - < 5 hits → match cancelled, no ELO recorded
      - >= 5 hits → forfeit loss for the disconnector
    """
    outcome = room.handle_disconnect(slot)

    opponent = room.get_opponent(slot)

    if outcome == "ignore":
        room_manager.remove_room(room.code)
        return

    if outcome == "cancelled":
        if opponent and opponent.connected:
            await send(opponent.websocket, {
                "type": "match_cancelled",
                "reason": "Opponent disconnected before the match was decided",
            })
        room_manager.remove_room(room.code)
        return

    # Forfeit: room.winner was set inside handle_disconnect.
    await finalize_match(room, reason="opponent_forfeit")


# ─────────────────────── endpoint ───────────────────────

@router.websocket("/ws")
async def multiplayer_endpoint(ws: WebSocket, token: str = Query(...)):
    # Auth before accepting the connection.
    claims = verify_token(token)
    if claims is None:
        await ws.close(code=4001, reason="Invalid token")
        return

    profile = fetch_profile(claims["user_id"])
    if profile is None:
        await ws.close(code=4002, reason="Profile not found")
        return

    await ws.accept()

    player = PlayerState(
        user_id=profile["user_id"],
        username=profile["username"],
        elo=profile["elo"],
        websocket=ws,
    )
    room: Optional[Room] = None

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await send_error(ws, "Invalid JSON")
                continue

            msg_type = msg.get("type")

            if msg_type == "create_room":
                if room is not None:
                    await send_error(ws, "Already in a room")
                    continue
                room = await handle_create_room(ws, player)

            elif msg_type == "join_room":
                if room is not None:
                    await send_error(ws, "Already in a room")
                    continue
                code = msg.get("code", "").strip().upper()
                if not code:
                    await send_error(ws, "Missing room code")
                    continue
                room = await handle_join_room(ws, player, code)

            elif msg_type == "submit_board":
                if room is None:
                    await send_error(ws, "Not in a room")
                    continue
                slot = room.slot_for(player.user_id)
                if slot is None:
                    await send_error(ws, "Not in this room")
                    continue
                ships = msg.get("ships", [])
                await handle_submit_board(room, slot, ships, ws)

            elif msg_type == "fire_shot":
                if room is None:
                    await send_error(ws, "Not in a room")
                    continue
                slot = room.slot_for(player.user_id)
                if slot is None:
                    await send_error(ws, "Not in this room")
                    continue
                await handle_fire_shot(
                    room, slot, msg.get("x", -1), msg.get("y", -1), ws
                )

            elif msg_type == "leave_room":
                break

            else:
                await send_error(ws, f"Unknown message type: {msg_type}")

    except WebSocketDisconnect:
        pass
    except Exception as e:
        log.exception("WebSocket error: %s", e)
    finally:
        if room is not None:
            slot = room.slot_for(player.user_id)
            if slot is not None:
                # Notify opponent immediately, then apply the disconnect rule.
                opponent = room.get_opponent(slot)
                if opponent and opponent.connected:
                    await send(opponent.websocket, {"type": "opponent_disconnected"})
                await handle_disconnect(room, slot)