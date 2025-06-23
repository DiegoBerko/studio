






export interface Penalty {
  id: string;
  playerNumber: string;
  remainingTime: number; // in seconds
  initialDuration: number; // in seconds
  _status?: 'running' | 'pending_concurrent' | 'pending_player' | 'pending_puck'; // Transient status for display logic
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

// Data fields for a single Format & Timings Profile
export interface FormatAndTimingsProfileData {
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
}

// Full Format & Timings Profile structure (including id and name)
export interface FormatAndTimingsProfile extends FormatAndTimingsProfileData {
  id: string;
  name: string;
}

// New: Settings for scoreboard visual layout
export interface ScoreboardLayoutSettings {
  scoreboardVerticalPosition: number;
  scoreboardHorizontalPosition: number;
  clockSize: number;
  teamNameSize: number;
  scoreSize: number;
  periodSize: number;
  playersOnIceIconSize: number;
  categorySize: number;
  teamLabelSize: number;
  penaltiesTitleSize: number;
  penaltyPlayerNumberSize: number;
  penaltyTimeSize: number;
  penaltyPlayerIconSize: number;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  mainContentGap: number;
  scoreLabelGap: number;
}

// New: Full Scoreboard Layout Profile structure
export interface ScoreboardLayoutProfile extends ScoreboardLayoutSettings {
  id: string;
  name: string;
}

// --- Game Event Types ---
export interface GoalLog {
  id: string;
  team: Team;
  timestamp: number; // Machine time (Date.now())
  gameTime: number; // Game time in centiseconds
  periodText: string;
  scorer?: {
    playerNumber: string;
    playerName?: string;
  };
}

export interface PenaltyLog {
  id: string; // Matches the penalty's original ID
  team: Team;
  playerNumber: string;
  playerName?: string;
  initialDuration: number;
  // Penalty Add Event
  addTimestamp: number;
  addGameTime: number;
  addPeriodText: string;
  // Penalty End Event
  endTimestamp?: number;
  endGameTime?: number;
  endPeriodText?: string;
  endReason?: 'completed' | 'deleted';
  timeServed?: number;
}

export interface GameSummary {
  home: {
    goals: GoalLog[];
    penalties: PenaltyLog[];
  };
  away: {
    goals: GoalLog[];
    penalties: PenaltyLog[];
  };
  attendance: {
    home: string[]; // Array of player IDs who attended
    away: string[]; // Array of player IDs who attended
  };
}


// Combined ConfigFields - Represents the *active/effective* settings from the selected profile
export interface ConfigFields extends FormatAndTimingsProfileData {
  // Sound & Display settings
  playSoundAtPeriodEnd: boolean;
  customHornSoundDataUrl: string | null;
  enableTeamSelectionInMiniScoreboard: boolean;
  enablePlayerSelectionForPenalties: boolean;
  showAliasInPenaltyPlayerSelector: boolean;
  showAliasInControlsPenaltyList: boolean;
  showAliasInScoreboardPenalties: boolean;

  // Layout settings (the active/live one)
  scoreboardLayout: ScoreboardLayoutSettings;
  // Saved layout profiles
  scoreboardLayoutProfiles: ScoreboardLayoutProfile[];
  selectedScoreboardLayoutProfileId: string | null;

  // Categories settings
  availableCategories: CategoryData[];
  selectedMatchCategory: string;

  // Game Events
  goals: GoalLog[];
  // Game Summary
  gameSummary: GameSummary;
}
