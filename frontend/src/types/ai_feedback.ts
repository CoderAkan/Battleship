export interface MoveRecord {
    x: number;
    y: number;
    result: 'hit' | 'miss';
    timestamp: number;
}

export interface AICoachFeedback {
    score: number; // Strategy rating 0-100
    feedbackText: string; // e.g., "You tend to ignore the edges of the board."
    probabilityMap: number[][]; // 10x10 heatmap for the "Great" level UI
}