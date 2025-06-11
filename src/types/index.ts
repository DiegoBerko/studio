export interface Penalty {
  id: string;
  playerNumber: string;
  remainingTime: number; // in seconds
  initialDuration: number; // in seconds
}

export type Team = 'home' | 'away';
