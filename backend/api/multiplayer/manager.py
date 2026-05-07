"""
RoomManager — global registry of active rooms.

Singleton-ish: imported once, used everywhere. In-memory only — server
restart kills all matches. Acceptable for v1 since matches are short
(~5 minutes) and the user base is small.
"""

import secrets
import string
from typing import Dict, Optional

from .room import Room


# 4-letter codes from a curated alphabet (no I, O, 0, 1) — easier to read
# aloud or type. Capacity: 26^4 = 456,976. Plenty for friends.
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"
CODE_LENGTH = 4


class RoomManager:
    def __init__(self) -> None:
        self._rooms: Dict[str, Room] = {}

    def create_room(self) -> Room:
        """Generate a unique room code and create an empty room."""
        for _ in range(50):  # collision retry
            code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
            if code not in self._rooms:
                room = Room(code=code)
                self._rooms[code] = room
                return room
        # 50 collisions in a row means we're either out of codes or something
        # is very wrong. Both warrant an exception rather than silent failure.
        raise RuntimeError("Could not generate a unique room code")

    def get_room(self, code: str) -> Optional[Room]:
        return self._rooms.get(code.upper())

    def remove_room(self, code: str) -> None:
        self._rooms.pop(code.upper(), None)

    def find_room_by_user(self, user_id: str) -> Optional[Room]:
        """
        Find the room a user is currently in, if any. Used so a refreshed
        page can rejoin its own match — though we don't implement reconnect
        in v1, this hook is here for when we do.
        """
        for room in self._rooms.values():
            if room.slot_for(user_id) is not None:
                return room
        return None

    @property
    def active_room_count(self) -> int:
        return len(self._rooms)


# Module-level singleton. Import this from websocket.py.
room_manager = RoomManager()