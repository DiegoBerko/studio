export interface Penalty {
  id: string;
  playerNumber: string;
  remainingTime: number; // in seconds
  initialDuration: number; // in seconds
  _status?: 'running' | 'pending_concurrent' | 'pending_player'; // Transient status for display logic
}

export type Team = 'home' | 'away';
