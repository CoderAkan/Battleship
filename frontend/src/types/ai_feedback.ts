export interface MoveRecord {
    x: number;
    y: number;
    result: 'hit' | 'miss';
    timestamp: number;
}

export interface AICoachFeedback {
    score: number;
    feedbackText: string;
    probabilityMap: number[][];
}