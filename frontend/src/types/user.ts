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

