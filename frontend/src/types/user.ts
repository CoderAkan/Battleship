export interface UserProfile {
    id: string;
    username: string;
    avatarUrl?: string;
    country: string;
    points: number;
    gamesPlayed: number;
    createdAt: string;
    friendIds: string[];
}


export interface ProfileSQL {
    id: string;
    username: string;
    elo?: number;
    country?: string;
    avatar_url?: string;
    wins?: number;
    losses?: number;
    total_shots?: number;
    successful_hits?: number;
}

export interface MatchRecord {
    id: string;
    user_id: string;
    result: 'win' | 'loss';
    elo_before: number;
    elo_after: number;
    elo_change: number;
    shots_fired: number;
    successful_hits: number;
    opponent: string;
    created_at: string;
}