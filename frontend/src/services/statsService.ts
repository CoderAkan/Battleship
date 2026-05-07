import { supabase } from '../lib/supabase';
import type { ProfileSQL } from '../types/user';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

interface RecordMatchParams {
    userId: string;
    profile: ProfileSQL;
    result: 'win' | 'loss';
    shotsFired: number;
    successfulHits: number;
    /**
     * The bot's effective ELO rating for this match. Pulled from
     * BOT_RATINGS based on difficulty — exposed as a parameter so
     * future online PvP can pass the real opponent's rating instead.
     */
    opponentRating: number;
    /**
     * Free-text label written to match_history.opponent. Useful for
     * showing "BOT (Hard)" vs "BOT (Easy)" in the Recent Matches list.
     */
    opponentLabel?: string;
}

/**
 * Per-difficulty bot ratings. Beating a higher-rated bot gives more ELO;
 * losing to an easy bot stings more. Values are deliberately spread so
 * grinding Easy can't carry a player past ~1100-1200 long-term.
 */
export const BOT_RATINGS: Record<BotDifficulty, number> = {
    easy: 600,
    medium: 900,
    hard: 1200,
};

const K_FACTOR = 32;

/**
 * Standard ELO formula. `expected` is the probability the player wins
 * given the rating gap; `actual` is 1 for a win, 0 for a loss.
 */
const calculateEloChange = (
    playerElo: number,
    opponentElo: number,
    didWin: boolean,
): number => {
    const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    const actual = didWin ? 1 : 0;
    return Math.round(K_FACTOR * (actual - expected));
};

export const recordBotMatch = async ({
    userId,
    profile,
    result,
    shotsFired,
    successfulHits,
    opponentRating,
    opponentLabel = 'BOT',
}: RecordMatchParams): Promise<ProfileSQL | null> => {
    const eloBefore = profile.elo ?? 1000;
    const eloChange = calculateEloChange(eloBefore, opponentRating, result === 'win');
    const eloAfter = Math.max(0, eloBefore + eloChange);

    // 1. Insert match history row.
    const { error: historyError } = await supabase
        .from('match_history')
        .insert({
            user_id: userId,
            result,
            elo_before: eloBefore,
            elo_after: eloAfter,
            elo_change: eloChange,
            shots_fired: shotsFired,
            successful_hits: successfulHits,
            opponent: opponentLabel,
        });

    if (historyError) {
        console.error('Failed to record match history:', historyError.message);
        return null;
    }

    // 2. Update aggregated profile stats.
    const newWins = (profile.wins ?? 0) + (result === 'win' ? 1 : 0);
    const newLosses = (profile.losses ?? 0) + (result === 'loss' ? 1 : 0);
    const newTotalShots = (profile.total_shots ?? 0) + shotsFired;
    const newHits = (profile.successful_hits ?? 0) + successfulHits;

    const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
            elo: eloAfter,
            wins: newWins,
            losses: newLosses,
            total_shots: newTotalShots,
            successful_hits: newHits,
        })
        .eq('id', userId)
        .select()
        .single();

    if (updateError) {
        console.error('Failed to update profile stats:', updateError.message);
        return null;
    }

    return data as ProfileSQL;
};