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

Heavily logged — every meaningful event prints to stdout so we can debug
multiplayer issues from `fly logs`.
"""

import json
import logging
import traceback
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from .auth import verify_token
from .manager import room_manager
from .room import Room, PlayerSlot, PlayerState
from .supabase_client import fetch_profile, record_online_match


router = APIRouter()
log = logging.getLogger("multiplayer")


def _log(tag: str, msg: str) -> None:
    """Centralized log helper — print() goes through stdout for `fly logs`."""
    print(f"[WS][{tag}] {msg}", flush=True)


def _room_state(room: Room) -> str:
    """Compact human-readable room state for log messages."""
    p1 = f"{room.p1.username}({room.p1.successful_hits}h)" if room.p1 else "None"
    p2 = f"{room.p2.username}({room.p2.successful_hits}h)" if room.p2 else "None"
    return (
        f"code={room.code} phase={room.phase} turn={room.turn} "
        f"winner={room.winner} p1={p1} p2={p2}"
    )


# ─────────────────────── helpers ───────────────────────

async def send(ws: WebSocket, payload: dict) -> None:
    """Send a message, swallowing send errors (peer may have disconnected)."""
    try:
        await ws.send_text(json.dumps(payload))
    except Exception as e:
        _log("SEND_FAIL", f"Failed to send {payload.get('type')}: {e}")


async def send_error(ws: WebSocket, message: str) -> None:
    _log("SEND_ERROR", f"→ {message}")
    await send(ws, {"type": "error", "message": message})


async def broadcast(room: Room, payload: dict) -> None:
    """Send the same message to both players."""
    msg_type = payload.get("type", "?")
    _log("BROADCAST", f"{msg_type} to both | {_room_state(room)}")
    if room.p1 and room.p1.connected:
        await send(room.p1.websocket, payload)
    if room.p2 and room.p2.connected:
        await send(room.p2.websocket, payload)


# ─────────────────────── message handlers ───────────────────────

async def handle_create_room(ws: WebSocket, player: PlayerState) -> Room:
    room = room_manager.create_room()
    room.add_player(player)
    _log("CREATE_ROOM", f"{player.username} created room {room.code}")
    await send(ws, {"type": "room_created", "code": room.code})
    return room


async def handle_join_room(
    ws: WebSocket, player: PlayerState, code: str
) -> Optional[Room]:
    _log("JOIN_ATTEMPT", f"{player.username} trying to join {code}")
    room = room_manager.get_room(code)
    if room is None:
        _log("JOIN_FAIL", f"Room {code} not found")
        await send_error(ws, "Room not found")
        return None
    if room.is_full():
        _log("JOIN_FAIL", f"Room {code} is full")
        await send_error(ws, "Room is full")
        return None
    if room.slot_for(player.user_id) is not None:
        _log("JOIN_FAIL", f"{player.username} already in room {code}")
        await send_error(ws, "You're already in this room")
        return None

    room.add_player(player)
    room.phase = "PLACING"
    _log("JOIN_OK", f"{player.username} joined room {code}, both players in")

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
    player = room.get_player(slot)
    pname = player.username if player else "?"
    _log("SUBMIT_BOARD", f"{pname} ({slot}) submitted {len(ships)} ships")

    try:
        room.submit_board(slot, ships)
    except ValueError as e:
        _log("SUBMIT_FAIL", f"{pname}: {e}")
        await send_error(ws, str(e))
        return

    opponent = room.get_opponent(slot)
    if opponent and opponent.connected:
        _log("READY_NOTIFY", f"Telling {opponent.username} that {pname} is ready")
        await send(opponent.websocket, {"type": "opponent_ready"})

    if room.both_boards_submitted():
        room.phase = "BATTLE"
        room.turn = "p1"
        _log("BATTLE_START", f"Both boards submitted | {_room_state(room)}")
        await broadcast(room, {"type": "phase_change", "phase": "BATTLE"})
        if room.p1:
            _log("YOUR_TURN", f"→ {room.p1.username} (p1)")
            await send(room.p1.websocket, {"type": "your_turn"})


async def handle_fire_shot(
    room: Room, slot: PlayerSlot, x: int, y: int, ws: WebSocket
) -> None:
    player = room.get_player(slot)
    pname = player.username if player else "?"

    _log("FIRE_SHOT", f"{pname} ({slot}) → ({x},{y}) | {_room_state(room)}")

    # Split ValueError (legitimate game rejection) from other exceptions
    # (real bugs). Game rejections get sent to the user; bugs are logged
    # with traceback and the user sees a generic "Server error".
    try:
        result, game_over, sunk_cells, surrounding_cells = room.fire_shot(slot, x, y)
    except ValueError as e:
        _log("FIRE_REJECT", f"{pname} ({slot}) at ({x},{y}): {e}")
        await send_error(ws, str(e))
        return
    except Exception as e:
        _log("FIRE_CRASH", f"{pname} ({slot}) at ({x},{y}): {e}")
        _log("FIRE_CRASH_TB", traceback.format_exc())
        await send_error(ws, f"Server error: {e}")
        return

    _log(
        "FIRE_RESULT",
        f"{pname} ({slot}) at ({x},{y}) → {result} | game_over={game_over} | new turn={room.turn} | sunk_cells={sunk_cells} | surrounding={surrounding_cells}"
    )

    payload: dict = {
        "type": "shot_result",
        "attacker": slot,
        "x": x, "y": y,
        "result": result,
    }
    # Only include these fields when they're actually populated (i.e. on
    # a sink). Keeps the message small for plain hits/misses.
    if sunk_cells:
        payload["sunk_cells"] = [{"x": cx, "y": cy} for cx, cy in sunk_cells]
    if surrounding_cells:
        payload["surrounding_cells"] = [{"x": cx, "y": cy} for cx, cy in surrounding_cells]

    await broadcast(room, payload)

    if game_over:
        _log("GAME_OVER", f"Winner: {room.winner} | {_room_state(room)}")
        await finalize_match(room, reason="all_ships_sunk")
        return

    if result == "miss":
        next_player = room.get_player(room.turn)
        if next_player and next_player.connected:
            _log("YOUR_TURN", f"→ {next_player.username} ({room.turn}) (after miss)")
            await send(next_player.websocket, {"type": "your_turn"})
        else:
            _log("YOUR_TURN_FAIL", f"Next player ({room.turn}) is missing or disconnected")


async def finalize_match(
    room: Room,
    reason: str = "all_ships_sunk",
) -> None:
    """Record stats, send game_over to both players, clean up the room."""
    if room.winner is None or room.p1 is None or room.p2 is None:
        _log("FINALIZE_SKIP", f"Missing winner/players | {_room_state(room)}")
        room_manager.remove_room(room.code)
        return

    winner = room.get_player(room.winner)
    loser = room.get_opponent(room.winner)
    if winner is None or loser is None:
        _log("FINALIZE_SKIP", f"get_player returned None | {_room_state(room)}")
        room_manager.remove_room(room.code)
        return

    _log("FINALIZE", f"Recording stats | winner={winner.username} loser={loser.username} reason={reason}")

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
        _log("ELO_OK", f"winner {winner.elo}→{new_winner_elo} loser {loser.elo}→{new_loser_elo}")
    except Exception as e:
        log.exception("Failed to record match: %s", e)
        _log("ELO_FAIL", f"{e}")
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
        await send(loser.websocket, {
            "type": "game_over",
            "winner": room.winner,
            "reason": reason,
            "elo_change": (new_loser_elo or loser.elo) - loser.elo,
            "new_elo": new_loser_elo or loser.elo,
        })

    room_manager.remove_room(room.code)


async def handle_disconnect(room: Room, slot: PlayerSlot) -> None:
    """Apply the disconnect rule (see room.handle_disconnect)."""
    player = room.get_player(slot)
    pname = player.username if player else "?"
    _log("DISCONNECT", f"{pname} ({slot}) | {_room_state(room)}")

    outcome = room.handle_disconnect(slot)
    _log("DISCONNECT_OUTCOME", f"{pname}: {outcome}")

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

    await finalize_match(room, reason="opponent_forfeit")


# ─────────────────────── endpoint ───────────────────────

@router.websocket("/ws")
async def multiplayer_endpoint(ws: WebSocket, token: str = Query(...)):
    claims = verify_token(token)
    if claims is None:
        _log("AUTH_FAIL", "Invalid token")
        await ws.close(code=4001, reason="Invalid token")
        return

    profile = fetch_profile(claims["user_id"])
    if profile is None:
        _log("AUTH_FAIL", f"Profile not found for user {claims['user_id']}")
        await ws.close(code=4002, reason="Profile not found")
        return

    await ws.accept()
    _log("CONNECT", f"{profile['username']} ({profile['user_id']}) connected, elo={profile['elo']}")

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
                _log("BAD_JSON", f"{player.username}: {raw[:200]}")
                await send_error(ws, "Invalid JSON")
                continue

            msg_type = msg.get("type")
            _log("RECV", f"{player.username}: {msg_type} | raw={raw[:200]}")

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
                _log("LEAVE", f"{player.username} sent leave_room")
                break

            else:
                _log("UNKNOWN_MSG", f"{player.username}: {msg_type}")
                await send_error(ws, f"Unknown message type: {msg_type}")

    except WebSocketDisconnect:
        _log("WS_DISCONNECT", f"{player.username} WebSocket closed")
    except Exception as e:
        log.exception("WebSocket error: %s", e)
        _log("WS_ERROR", f"{player.username}: {e}")
    finally:
        if room is not None:
            slot = room.slot_for(player.user_id)
            if slot is not None:
                opponent = room.get_opponent(slot)
                if opponent and opponent.connected:
                    _log("NOTIFY_OPP_DC", f"Telling {opponent.username} that {player.username} disconnected")
                    await send(opponent.websocket, {"type": "opponent_disconnected"})
                await handle_disconnect(room, slot)