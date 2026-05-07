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
    elo?: string;
    country?: string;
    avatar_url?: string;
}
