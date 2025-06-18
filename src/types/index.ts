
export interface Penalty {
  id: string;
  playerNumber: string;
  remainingTime: number; // in seconds
  initialDuration: number; // in seconds
  _status?: 'running' | 'pending_concurrent' | 'pending_player'; // Transient status for display logic
}

export type Team = 'home' | 'away';

// New types for Team Management
export type PlayerType = 'player' | 'goalkeeper';

export interface PlayerData {
  id: string;
  number: string;
  type: PlayerType;
  name: string; // Combined field for Apellido, Nombre o Apodo
}

export interface TeamData {
  id: string;
  name: string;
  subName?: string; // Optional sub-name for the team
  logoDataUrl?: string | null; // Optional: string (Data URL) or null
  players: PlayerData[];
  category: string; // New mandatory field for team category
}

// For category management
export interface CategoryData {
  id: string; // Could be same as name if names are unique, or a separate UUID
  name: string;
}

// Combined ConfigFields
export interface ConfigFields {
  configName: string;
  defaultWarmUpDuration: number;
  defaultPeriodDuration: number;
  defaultOTPeriodDuration: number;
  defaultBreakDuration: number;
  defaultPreOTBreakDuration: number;
  defaultTimeoutDuration: number;
  maxConcurrentPenalties: number;
  autoStartWarmUp: boolean;
  autoStartBreaks: boolean;
  autoStartPreOTBreaks: boolean;
  autoStartTimeouts: boolean;
  numberOfRegularPeriods: number;
  numberOfOvertimePeriods: number;
  playersPerTeamOnIce: number;
  playSoundAtPeriodEnd: boolean;
  customHornSoundDataUrl: string | null;
  enableTeamSelectionInMiniScoreboard: boolean;
  enablePlayerSelectionForPenalties: boolean;
  showAliasInPenaltyPlayerSelector: boolean;
  showAliasInControlsPenaltyList: boolean;
  showAliasInScoreboardPenalties: boolean;
  availableCategories: CategoryData[];
  selectedMatchCategory: string;
  isMonitorModeEnabled: boolean; // New field for Monitor Mode
}
