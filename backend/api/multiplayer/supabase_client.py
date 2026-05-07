"""
Supabase service-role client.

Used for two things:
  1. Looking up player profile (username, ELO) on WS connect.
  2. Recording match results when a game ends.

We use the SERVICE ROLE key here (not the anon key) so we can write to
profiles and match_history bypassing RLS. Service role key MUST be kept
secret — it's read from env and never sent to clients.
"""

import os
from typing import Optional, TypedDict

from supabase import create_client, Client


SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


_client: Optional[Client] = None


def get_client() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
            )
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


class ProfileSummary(TypedDict):
    user_id: str
    username: str
    elo: int


def fetch_profile(user_id: str) -> Optional[ProfileSummary]:
    """Get the data we need to start a match."""
    try:
        result = (
            get_client()
            .table("profiles")
            .select("id, username, elo")
            .eq("id", user_id)
            .single()
            .execute()
        )
    except Exception as e:
        print(f"Failed to fetch profile {user_id}: {e}")
        return None

    if not result.data:
        return None

    return ProfileSummary(
        user_id=result.data["id"],
        username=result.data["username"],
        elo=result.data.get("elo") or 1000,
    )


# ─────────────────────── ELO + stats ───────────────────────

K_FACTOR = 32


def calculate_elo_change(player_elo: int, opponent_elo: int, won: bool) -> int:
    expected = 1 / (1 + 10 ** ((opponent_elo - player_elo) / 400))
    actual = 1 if won else 0
    return round(K_FACTOR * (actual - expected))


def record_online_match(
    user_id: str,
    opponent_username: str,
    opponent_elo: int,
    won: bool,
    shots_fired: int,
    successful_hits: int,
) -> Optional[int]:
    """
    Write the match_history row and update profile aggregate stats.
    Returns the new ELO, or None on failure.
    """
    client = get_client()

    # 1. Read current profile to get ELO before.
    profile_resp = (
        client.table("profiles")
        .select("elo, wins, losses, total_shots, successful_hits")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not profile_resp.data:
        return None

    elo_before = profile_resp.data.get("elo") or 1000
    elo_change = calculate_elo_change(elo_before, opponent_elo, won)
    elo_after = max(0, elo_before + elo_change)

    # 2. Insert match history.
    client.table("match_history").insert({
        "user_id": user_id,
        "result": "win" if won else "loss",
        "elo_before": elo_before,
        "elo_after": elo_after,
        "elo_change": elo_change,
        "shots_fired": shots_fired,
        "successful_hits": successful_hits,
        "opponent": f"PLAYER ({opponent_username})",
    }).execute()

    # 3. Update profile aggregates.
    new_wins = (profile_resp.data.get("wins") or 0) + (1 if won else 0)
    new_losses = (profile_resp.data.get("losses") or 0) + (0 if won else 1)
    new_shots = (profile_resp.data.get("total_shots") or 0) + shots_fired
    new_hits = (profile_resp.data.get("successful_hits") or 0) + successful_hits

    client.table("profiles").update({
        "elo": elo_after,
        "wins": new_wins,
        "losses": new_losses,
        "total_shots": new_shots,
        "successful_hits": new_hits,
    }).eq("id", user_id).execute()

    return elo_after