export interface LeaderboardEntry {
    username: string;
    country: string;
    points: number;
    isOnline: boolean;
}

export interface FriendActivity {
    username: string;
    status: 'idle' | 'playing' | 'searching';
    currentMatchId?: string;
}