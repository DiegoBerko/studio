

"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react';
import type { Penalty, Team, TeamData, PlayerData, CategoryData, ConfigFields, FormatAndTimingsProfile, FormatAndTimingsProfileData, ScoreboardLayoutSettings, ScoreboardLayoutProfile, GameSummary, GoalLog, PenaltyLog } from '@/types';

// --- Constantes para la sincronización local ---
const BROADCAST_CHANNEL_NAME = 'icevision-game-state-channel';
const LOCAL_STORAGE_KEY = 'icevision-game-state';
const CENTISECONDS_PER_SECOND = 100;
const TICK_INTERVAL_MS = 50;
const DEFAULT_HORN_SOUND_FILE_PATH = '/audio/default-horn.wav'; 


let TAB_ID: string;
if (typeof window !== 'undefined') {
  TAB_ID = crypto.randomUUID();
} else {
  TAB_ID = 'server-tab-id-' + Math.random().toString(36).substring(2);
}


// Initial values (used as fallback if files are not found or are invalid)
const IN_CODE_INITIAL_PROFILE_NAME = "Predeterminado (App)";
const IN_CODE_INITIAL_LAYOUT_PROFILE_NAME = "Diseño Predeterminado (App)";
const IN_CODE_INITIAL_WARM_UP_DURATION = 5 * 60 * CENTISECONDS_PER_SECOND;
const IN_CODE_INITIAL_PERIOD_DURATION = 20 * 60 * CENTISECONDS_PER_SECOND;
const IN_CODE_INITIAL_OT_PERIOD_DURATION = 5 * 60 * CENTISECONDS_PER_SECOND;
const IN_CODE_INITIAL_BREAK_DURATION = 2 * 60 * CENTISECONDS_PER_SECOND;
const IN_CODE_INITIAL_PRE_OT_BREAK_DURATION = 60 * CENTISECONDS_PER_SECOND;
const IN_CODE_INITIAL_TIMEOUT_DURATION = 30 * CENTISECONDS_PER_SECOND;
const IN_CODE_INITIAL_MAX_CONCURRENT_PENALTIES = 2;
const IN_CODE_INITIAL_AUTO_START_WARM_UP = true;
const IN_CODE_INITIAL_AUTO_START_BREAKS = true;
const IN_CODE_INITIAL_AUTO_START_PRE_OT_BREAKS = false;
const IN_CODE_INITIAL_AUTO_START_TIMEOUTS = true;
const IN_CODE_INITIAL_NUMBER_OF_REGULAR_PERIODS = 2;
const IN_CODE_INITIAL_NUMBER_OF_OVERTIME_PERIODS = 0;
const IN_CODE_INITIAL_PLAYERS_PER_TEAM_ON_ICE = 5;

const IN_CODE_INITIAL_PLAY_SOUND_AT_PERIOD_END = true;
const IN_CODE_INITIAL_CUSTOM_HORN_SOUND_DATA_URL = null;
const IN_CODE_INITIAL_ENABLE_TEAM_SELECTION_IN_MINI_SCOREBOARD = true;
const IN_CODE_INITIAL_ENABLE_PLAYER_SELECTION_FOR_PENALTIES = true;
const IN_CODE_INITIAL_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR = true;
const IN_CODE_INITIAL_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST = true;
const IN_CODE_INITIAL_SHOW_ALIAS_IN_SCOREBOARD_PENALTIES = true;

export const IN_CODE_INITIAL_LAYOUT_SETTINGS: ScoreboardLayoutSettings = {
  scoreboardVerticalPosition: -4, // rem
  scoreboardHorizontalPosition: 0, // rem
  clockSize: 12, // rem
  teamNameSize: 3, // rem
  scoreSize: 8, // rem
  periodSize: 4.5, // rem
  playersOnIceIconSize: 1.75, // rem
  categorySize: 1.25, // rem
  teamLabelSize: 1, // rem
  penaltiesTitleSize: 2, // rem
  penaltyPlayerNumberSize: 3.5, // rem
  penaltyTimeSize: 3.5, // rem
  penaltyPlayerIconSize: 2.5, // rem
  primaryColor: '223 65% 33%',
  accentColor: '40 100% 67%',
  backgroundColor: '223 70% 11%',
  mainContentGap: 3, // rem
  scoreLabelGap: -2, // rem
};

const IN_CODE_INITIAL_CATEGORIES_RAW = ['A', 'B', 'C', 'Menores', 'Damas'];
const IN_CODE_INITIAL_AVAILABLE_CATEGORIES: CategoryData[] = IN_CODE_INITIAL_CATEGORIES_RAW.map(name => ({ id: name, name: name }));
const IN_CODE_INITIAL_SELECTED_MATCH_CATEGORY = IN_CODE_INITIAL_AVAILABLE_CATEGORIES[0]?.id || '';

const IN_CODE_INITIAL_GAME_SUMMARY: GameSummary = {
  home: { goals: [], penalties: [] },
  away: { goals: [], penalties: [] },
};

const createDefaultFormatAndTimingsProfile = (id?: string, name?: string): FormatAndTimingsProfile => ({
  id: id || crypto.randomUUID(),
  name: name || IN_CODE_INITIAL_PROFILE_NAME,
  defaultWarmUpDuration: IN_CODE_INITIAL_WARM_UP_DURATION,
  defaultPeriodDuration: IN_CODE_INITIAL_PERIOD_DURATION,
  defaultOTPeriodDuration: IN_CODE_INITIAL_OT_PERIOD_DURATION,
  defaultBreakDuration: IN_CODE_INITIAL_BREAK_DURATION,
  defaultPreOTBreakDuration: IN_CODE_INITIAL_PRE_OT_BREAK_DURATION,
  defaultTimeoutDuration: IN_CODE_INITIAL_TIMEOUT_DURATION,
  maxConcurrentPenalties: IN_CODE_INITIAL_MAX_CONCURRENT_PENALTIES,
  autoStartWarmUp: IN_CODE_INITIAL_AUTO_START_WARM_UP,
  autoStartBreaks: IN_CODE_INITIAL_AUTO_START_BREAKS,
  autoStartPreOTBreaks: IN_CODE_INITIAL_AUTO_START_PRE_OT_BREAKS,
  autoStartTimeouts: IN_CODE_INITIAL_AUTO_START_TIMEOUTS,
  numberOfRegularPeriods: IN_CODE_INITIAL_NUMBER_OF_REGULAR_PERIODS,
  numberOfOvertimePeriods: IN_CODE_INITIAL_NUMBER_OF_OVERTIME_PERIODS,
  playersPerTeamOnIce: IN_CODE_INITIAL_PLAYERS_PER_TEAM_ON_ICE,
});

const createDefaultScoreboardLayoutProfile = (id?: string, name?: string): ScoreboardLayoutProfile => ({
    id: id || crypto.randomUUID(),
    name: name || IN_CODE_INITIAL_LAYOUT_PROFILE_NAME,
    ...IN_CODE_INITIAL_LAYOUT_SETTINGS
});


type PeriodDisplayOverrideType = "Warm-up" | "Break" | "Pre-OT Break" | "Time Out" | "End of Game" | null;

interface PreTimeoutState {
  period: number;
  time: number; 
  isClockRunning: boolean;
  override: PeriodDisplayOverrideType;
  clockStartTimeMs: number | null;
  remainingTimeAtStartCs: number | null; 
}

interface GameState extends ConfigFields {
  homeScore: number;
  awayScore: number;
  currentTime: number; 
  currentPeriod: number; 
  isClockRunning: boolean;
  homePenalties: Penalty[];
  awayPenalties: Penalty[];
  homeTeamName: string;
  homeTeamSubName?: string;
  awayTeamName: string;
  awayTeamSubName?: string;
  periodDisplayOverride: PeriodDisplayOverrideType;
  preTimeoutState: PreTimeoutState | null;
  clockStartTimeMs: number | null;
  remainingTimeAtStartCs: number | null; 
  playHornTrigger: number; 
  teams: TeamData[];
  formatAndTimingsProfiles: FormatAndTimingsProfile[];
  selectedFormatAndTimingsProfileId: string | null;
  _lastActionOriginator?: string;
  _lastUpdatedTimestamp?: number;
  _initialConfigLoadComplete?: boolean; // Flag to ensure initial load happens once
}

export type GameAction =
  | { type: 'TOGGLE_CLOCK' }
  | { type: 'SET_TIME'; payload: { minutes: number; seconds: number } }
  | { type: 'ADJUST_TIME'; payload: number }
  | { type: 'SET_PERIOD'; payload: number }
  | { type: 'RESET_PERIOD_CLOCK' }
  | { type: 'SET_SCORE'; payload: { team: Team; score: number } }
  | { type: 'ADJUST_SCORE'; payload: { team: Team; delta: number; scorer?: { playerNumber: string; playerName?: string } } }
  | { type: 'ADD_PENALTY'; payload: { team: Team; penalty: Omit<Penalty, 'id' | '_status'> } }
  | { type: 'REMOVE_PENALTY'; payload: { team: Team; penaltyId: string } }
  | { type: 'ADJUST_PENALTY_TIME'; payload: { team: Team; penaltyId: string; delta: number } }
  | { type: 'REORDER_PENALTIES'; payload: { team: Team; startIndex: number; endIndex: number } }
  | { type: 'ACTIVATE_PENDING_PUCK_PENALTIES' }
  | { type: 'TICK' }
  | { type: 'SET_HOME_TEAM_NAME'; payload: string }
  | { type: 'SET_HOME_TEAM_SUB_NAME'; payload?: string }
  | { type: 'SET_AWAY_TEAM_NAME'; payload: string }
  | { type: 'SET_AWAY_TEAM_SUB_NAME'; payload?: string }
  | { type: 'START_BREAK' }
  | { type: 'START_PRE_OT_BREAK' }
  | { type: 'START_BREAK_AFTER_PREVIOUS_PERIOD' }
  | { type: 'START_TIMEOUT' }
  | { type: 'END_TIMEOUT' }
  | { type: 'MANUAL_END_GAME' }
  | { type: 'ADD_FORMAT_AND_TIMINGS_PROFILE'; payload: { name: string; profileData?: Partial<FormatAndTimingsProfileData> } }
  | { type: 'UPDATE_FORMAT_AND_TIMINGS_PROFILE_DATA'; payload: { profileId: string; updates: Partial<FormatAndTimingsProfileData> } }
  | { type: 'UPDATE_FORMAT_AND_TIMINGS_PROFILE_NAME'; payload: { profileId: string; newName: string } }
  | { type: 'DELETE_FORMAT_AND_TIMINGS_PROFILE'; payload: { profileId: string } }
  | { type: 'SELECT_FORMAT_AND_TIMINGS_PROFILE'; payload: { profileId: string | null } }
  | { type: 'LOAD_FORMAT_AND_TIMINGS_PROFILES'; payload: FormatAndTimingsProfile[] } 
  | { type: 'SET_DEFAULT_WARM_UP_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_PERIOD_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_OT_PERIOD_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_BREAK_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_PRE_OT_BREAK_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_TIMEOUT_DURATION'; payload: number }
  | { type: 'SET_MAX_CONCURRENT_PENALTIES'; payload: number }
  | { type: 'SET_NUMBER_OF_REGULAR_PERIODS'; payload: number }
  | { type: 'SET_NUMBER_OF_OVERTIME_PERIODS'; payload: number }
  | { type: 'SET_PLAYERS_PER_TEAM_ON_ICE'; payload: number }
  | { type: 'SET_AUTO_START_WARM_UP_VALUE'; payload: boolean }
  | { type: 'SET_AUTO_START_BREAKS_VALUE'; payload: boolean }
  | { type: 'SET_AUTO_START_PRE_OT_BREAKS_VALUE'; payload: boolean }
  | { type: 'SET_AUTO_START_TIMEOUTS_VALUE'; payload: boolean }
  | { type: 'SET_PLAY_SOUND_AT_PERIOD_END'; payload: boolean }
  | { type: 'SET_CUSTOM_HORN_SOUND_DATA_URL'; payload: string | null }
  | { type: 'SET_ENABLE_TEAM_SELECTION_IN_MINI_SCOREBOARD'; payload: boolean }
  | { type: 'SET_ENABLE_PLAYER_SELECTION_FOR_PENALTIES'; payload: boolean }
  | { type: 'SET_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR'; payload: boolean }
  | { type: 'SET_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST'; payload: boolean }
  | { type: 'SET_SHOW_ALIAS_IN_SCOREBOARD_PENALTIES'; payload: boolean }
  | { type: 'UPDATE_LAYOUT_SETTINGS'; payload: Partial<ScoreboardLayoutSettings> }
  | { type: 'ADD_SCOREBOARD_LAYOUT_PROFILE'; payload: { name: string } }
  | { type: 'UPDATE_SCOREBOARD_LAYOUT_PROFILE_NAME'; payload: { profileId: string; newName: string } }
  | { type: 'DELETE_SCOREBOARD_LAYOUT_PROFILE'; payload: { profileId: string } }
  | { type: 'SELECT_SCOREBOARD_LAYOUT_PROFILE'; payload: { profileId: string } }
  | { type: 'SAVE_CURRENT_LAYOUT_TO_PROFILE' }
  | { type: 'LOAD_SOUND_AND_DISPLAY_CONFIG'; payload: Partial<Pick<ConfigFields, 'playSoundAtPeriodEnd' | 'customHornSoundDataUrl' | 'enableTeamSelectionInMiniScoreboard' | 'enablePlayerSelectionForPenalties' | 'showAliasInPenaltyPlayerSelector' | 'showAliasInControlsPenaltyList' | 'showAliasInScoreboardPenalties' | 'scoreboardLayoutProfiles'>> }
  | { type: 'SET_AVAILABLE_CATEGORIES'; payload: CategoryData[] }
  | { type: 'SET_SELECTED_MATCH_CATEGORY'; payload: string }
  | { type: 'HYDRATE_FROM_STORAGE'; payload: Partial<GameState> }
  | { type: 'SET_STATE_FROM_LOCAL_BROADCAST'; payload: GameState }
  | { type: 'RESET_CONFIG_TO_DEFAULTS' } 
  | { type: 'RESET_GAME_STATE' }
  | { type: 'ADD_TEAM'; payload: Omit<TeamData, 'players'> & { id: string; players: PlayerData[] } }
  | { type: 'UPDATE_TEAM_DETAILS'; payload: { teamId: string; name: string; subName?: string; category: string; logoDataUrl?: string | null } }
  | { type: 'DELETE_TEAM'; payload: { teamId: string } }
  | { type: 'ADD_PLAYER_TO_TEAM'; payload: { teamId: string; player: Omit<PlayerData, 'id'> } }
  | { type: 'UPDATE_PLAYER_IN_TEAM'; payload: { teamId: string; playerId: string; updates: Partial<Pick<PlayerData, 'name' | 'number'>> } }
  | { type: 'REMOVE_PLAYER_FROM_TEAM'; payload: { teamId: string; playerId: string } }
  | { type: 'LOAD_TEAMS_FROM_FILE'; payload: TeamData[] };


const defaultInitialProfile = createDefaultFormatAndTimingsProfile();
const defaultInitialLayoutProfile = createDefaultScoreboardLayoutProfile();

// This initialGlobalState is now primarily a fallback if file loading fails or localStorage is empty
const initialGlobalState: GameState = {
  homeScore: 0,
  awayScore: 0,
  currentPeriod: 0,
  currentTime: defaultInitialProfile.defaultWarmUpDuration, 
  isClockRunning: false,
  periodDisplayOverride: 'Warm-up',
  homePenalties: [],
  awayPenalties: [],
  homeTeamName: 'Local',
  homeTeamSubName: undefined,
  awayTeamName: 'Visitante',
  awayTeamSubName: undefined,
  // Format & Timings fields - will be populated by selected profile
  defaultWarmUpDuration: IN_CODE_INITIAL_WARM_UP_DURATION,
  defaultPeriodDuration: IN_CODE_INITIAL_PERIOD_DURATION,
  defaultOTPeriodDuration: IN_CODE_INITIAL_OT_PERIOD_DURATION,
  defaultBreakDuration: IN_CODE_INITIAL_BREAK_DURATION,
  defaultPreOTBreakDuration: IN_CODE_INITIAL_PRE_OT_BREAK_DURATION,
  defaultTimeoutDuration: IN_CODE_INITIAL_TIMEOUT_DURATION,
  maxConcurrentPenalties: IN_CODE_INITIAL_MAX_CONCURRENT_PENALTIES,
  autoStartWarmUp: IN_CODE_INITIAL_AUTO_START_WARM_UP,
  autoStartBreaks: IN_CODE_INITIAL_AUTO_START_BREAKS,
  autoStartPreOTBreaks: IN_CODE_INITIAL_AUTO_START_PRE_OT_BREAKS,
  autoStartTimeouts: IN_CODE_INITIAL_AUTO_START_TIMEOUTS,
  numberOfRegularPeriods: IN_CODE_INITIAL_NUMBER_OF_REGULAR_PERIODS,
  numberOfOvertimePeriods: IN_CODE_INITIAL_NUMBER_OF_OVERTIME_PERIODS,
  playersPerTeamOnIce: IN_CODE_INITIAL_PLAYERS_PER_TEAM_ON_ICE,
  // Format & Timings Profiles
  formatAndTimingsProfiles: [defaultInitialProfile], 
  selectedFormatAndTimingsProfileId: defaultInitialProfile.id, 
  // Sound & Display
  playSoundAtPeriodEnd: IN_CODE_INITIAL_PLAY_SOUND_AT_PERIOD_END,
  customHornSoundDataUrl: IN_CODE_INITIAL_CUSTOM_HORN_SOUND_DATA_URL,
  enableTeamSelectionInMiniScoreboard: IN_CODE_INITIAL_ENABLE_TEAM_SELECTION_IN_MINI_SCOREBOARD,
  enablePlayerSelectionForPenalties: IN_CODE_INITIAL_ENABLE_PLAYER_SELECTION_FOR_PENALTIES,
  showAliasInPenaltyPlayerSelector: IN_CODE_INITIAL_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR,
  showAliasInControlsPenaltyList: IN_CODE_INITIAL_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST,
  showAliasInScoreboardPenalties: IN_CODE_INITIAL_SHOW_ALIAS_IN_SCOREBOARD_PENALTIES,
  scoreboardLayout: IN_CODE_INITIAL_LAYOUT_SETTINGS,
  scoreboardLayoutProfiles: [defaultInitialLayoutProfile],
  selectedScoreboardLayoutProfileId: defaultInitialLayoutProfile.id,
  // Categories
  availableCategories: IN_CODE_INITIAL_AVAILABLE_CATEGORIES, 
  selectedMatchCategory: IN_CODE_INITIAL_SELECTED_MATCH_CATEGORY,
  // Game Summary
  gameSummary: IN_CODE_INITIAL_GAME_SUMMARY,
  // Game Runtime State
  preTimeoutState: null,
  clockStartTimeMs: null,
  remainingTimeAtStartCs: null,
  playHornTrigger: 0,
  teams: [],
  _lastActionOriginator: undefined,
  _lastUpdatedTimestamp: undefined,
  _initialConfigLoadComplete: false,
};

const GameStateContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isLoading: boolean; // Represents loading from localStorage AND initial file defaults
} | undefined>(undefined);


const handleAutoTransition = (currentState: GameState): GameState => {
  let newGameStateAfterTransition: GameState = { ...currentState };
  const numRegPeriods = currentState.numberOfRegularPeriods;
  const totalGamePeriods = numRegPeriods + currentState.numberOfOvertimePeriods;
  let shouldTriggerHorn = true;

  newGameStateAfterTransition.homePenalties = [...currentState.homePenalties];
  newGameStateAfterTransition.awayPenalties = [...currentState.awayPenalties];

  if (currentState.periodDisplayOverride === 'Warm-up') {
    newGameStateAfterTransition.currentPeriod = 1;
    newGameStateAfterTransition.currentTime = currentState.defaultPeriodDuration;
    newGameStateAfterTransition.isClockRunning = false;
    newGameStateAfterTransition.periodDisplayOverride = null;
  } else if (currentState.periodDisplayOverride === 'Break') {
    const nextPeriod = currentState.currentPeriod + 1;
    const nextPeriodDuration = nextPeriod > numRegPeriods ? currentState.defaultOTPeriodDuration : currentState.defaultPeriodDuration;
    newGameStateAfterTransition.currentPeriod = nextPeriod;
    newGameStateAfterTransition.currentTime = nextPeriodDuration;
    newGameStateAfterTransition.isClockRunning = false;
    newGameStateAfterTransition.periodDisplayOverride = null;
  } else if (currentState.periodDisplayOverride === 'Pre-OT Break') {
    const nextPeriod = currentState.currentPeriod + 1;
    newGameStateAfterTransition.currentPeriod = nextPeriod;
    newGameStateAfterTransition.currentTime = nextPeriod > numRegPeriods ? currentState.defaultOTPeriodDuration : currentState.defaultPeriodDuration;
    newGameStateAfterTransition.isClockRunning = false;
    newGameStateAfterTransition.periodDisplayOverride = null;
  } else if (currentState.periodDisplayOverride === 'Time Out') {
    if (currentState.preTimeoutState) {
      const { period, time, isClockRunning: preTimeoutIsRunning, override: preTimeoutOverride, clockStartTimeMs: preTimeoutClockStart, remainingTimeAtStartCs: preTimeoutRemaining } = currentState.preTimeoutState;
      const shouldResumeClock = preTimeoutIsRunning && time > 0;
      newGameStateAfterTransition.currentPeriod = period;
      newGameStateAfterTransition.currentTime = time;
      newGameStateAfterTransition.isClockRunning = shouldResumeClock;
      newGameStateAfterTransition.periodDisplayOverride = preTimeoutOverride;
      newGameStateAfterTransition.clockStartTimeMs = shouldResumeClock ? Date.now() : null;
      newGameStateAfterTransition.remainingTimeAtStartCs = shouldResumeClock ? time : null;
      newGameStateAfterTransition.preTimeoutState = null;
    } else {
      newGameStateAfterTransition.currentTime = currentState.currentTime;
      newGameStateAfterTransition.isClockRunning = false;
      newGameStateAfterTransition.periodDisplayOverride = currentState.periodDisplayOverride; 
    }
  } else if (currentState.periodDisplayOverride === null) { 
    if (currentState.currentPeriod < numRegPeriods) {
      newGameStateAfterTransition.currentTime = currentState.defaultBreakDuration;
      newGameStateAfterTransition.isClockRunning = currentState.autoStartBreaks && currentState.defaultBreakDuration > 0;
      newGameStateAfterTransition.periodDisplayOverride = 'Break';
      newGameStateAfterTransition.clockStartTimeMs = (currentState.autoStartBreaks && currentState.defaultBreakDuration > 0) ? Date.now() : null;
      newGameStateAfterTransition.remainingTimeAtStartCs = (currentState.autoStartBreaks && currentState.defaultBreakDuration > 0) ? currentState.defaultBreakDuration : null;
    } else if (currentState.currentPeriod === numRegPeriods && currentState.numberOfOvertimePeriods > 0) {
      newGameStateAfterTransition.currentTime = currentState.defaultPreOTBreakDuration;
      newGameStateAfterTransition.isClockRunning = currentState.autoStartPreOTBreaks && currentState.defaultPreOTBreakDuration > 0;
      newGameStateAfterTransition.periodDisplayOverride = 'Pre-OT Break';
      newGameStateAfterTransition.clockStartTimeMs = (currentState.autoStartPreOTBreaks && currentState.defaultPreOTBreakDuration > 0) ? Date.now() : null;
      newGameStateAfterTransition.remainingTimeAtStartCs = (currentState.autoStartPreOTBreaks && currentState.defaultPreOTBreakDuration > 0) ? currentState.defaultPreOTBreakDuration : null;
    } else if (currentState.currentPeriod > numRegPeriods && currentState.currentPeriod < totalGamePeriods) {
      newGameStateAfterTransition.currentTime = currentState.defaultPreOTBreakDuration;
      newGameStateAfterTransition.isClockRunning = currentState.autoStartPreOTBreaks && currentState.defaultPreOTBreakDuration > 0;
      newGameStateAfterTransition.periodDisplayOverride = 'Pre-OT Break';
      newGameStateAfterTransition.clockStartTimeMs = (currentState.autoStartPreOTBreaks && currentState.defaultPreOTBreakDuration > 0) ? Date.now() : null;
      newGameStateAfterTransition.remainingTimeAtStartCs = (currentState.autoStartPreOTBreaks && currentState.defaultPreOTBreakDuration > 0) ? currentState.defaultPreOTBreakDuration : null;
    } else if (currentState.currentPeriod >= totalGamePeriods) { 
      newGameStateAfterTransition.currentTime = 0;
      newGameStateAfterTransition.isClockRunning = false;
      newGameStateAfterTransition.periodDisplayOverride = "End of Game";
    } else {
      newGameStateAfterTransition.currentTime = 0;
      newGameStateAfterTransition.isClockRunning = false;
      newGameStateAfterTransition.periodDisplayOverride = "End of Game";
    }
  } else {
    newGameStateAfterTransition.currentTime = 0;
    newGameStateAfterTransition.isClockRunning = false;
    shouldTriggerHorn = false; 
  }

  if (!newGameStateAfterTransition.isClockRunning) {
    newGameStateAfterTransition.clockStartTimeMs = null;
    newGameStateAfterTransition.remainingTimeAtStartCs = null;
  }

  newGameStateAfterTransition.playHornTrigger = shouldTriggerHorn
    ? currentState.playHornTrigger + 1
    : currentState.playHornTrigger;

  const { _lastActionOriginator, _lastUpdatedTimestamp, ...returnState } = newGameStateAfterTransition;
  return returnState;
};


const updatePenaltyStatusesOnly = (penalties: Penalty[], maxConcurrent: number): Penalty[] => {
  const newPenalties: Penalty[] = [];
  const activePlayerTickets: Set<string> = new Set();
  let concurrentRunningCount = 0;

  for (const p of penalties) {
    if (p.remainingTime <= 0 && p._status !== 'pending_puck') {
      continue;
    }
    if (p._status === 'pending_puck') {
      newPenalties.push({ ...p });
      continue;
    }

    let currentStatus: Penalty['_status'] = undefined;
    if (p.playerNumber && activePlayerTickets.has(p.playerNumber)) {
      currentStatus = 'pending_player';
    } else if (concurrentRunningCount < maxConcurrent) {
      currentStatus = 'running';
      if (p.playerNumber) {
          activePlayerTickets.add(p.playerNumber);
      }
      concurrentRunningCount++;
    } else {
      currentStatus = 'pending_concurrent';
    }
    newPenalties.push({ ...p, _status: currentStatus });
  }
  return newPenalties;
};

const statusOrderValues: Record<NonNullable<Penalty['_status']>, number> = {
  running: 1,
  pending_player: 2,
  pending_concurrent: 3,
  pending_puck: 4,
};

const sortPenaltiesByStatus = (penalties: Penalty[]): Penalty[] => {
  const penaltiesToSort = [...penalties];
  return penaltiesToSort.sort((a, b) => {
    const aStatusVal = a._status ? (statusOrderValues[a._status] ?? 5) : 0;
    const bStatusVal = b._status ? (statusOrderValues[b._status] ?? 5) : 0;

    if (aStatusVal !== bStatusVal) {
      return aStatusVal - bStatusVal;
    }
    return 0;
  });
};

const cleanPenaltiesForStorage = (penalties?: Penalty[]): Penalty[] => {
  if (!penalties) return [];
  return penalties.map(p => {
    if (p._status && p._status !== 'pending_puck') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _status, ...rest } = p;
      return rest as Penalty;
    }
    return p;
  });
};


const applyFormatAndTimingsProfileToState = (state: GameState, profileId: string | null): GameState => {
  const profileToApply = state.formatAndTimingsProfiles.find(p => p.id === profileId) || state.formatAndTimingsProfiles[0] || createDefaultFormatAndTimingsProfile();
  if (!profileToApply) return state; 

  return {
    ...state,
    selectedFormatAndTimingsProfileId: profileToApply.id,
    defaultWarmUpDuration: profileToApply.defaultWarmUpDuration,
    defaultPeriodDuration: profileToApply.defaultPeriodDuration,
    defaultOTPeriodDuration: profileToApply.defaultOTPeriodDuration,
    defaultBreakDuration: profileToApply.defaultBreakDuration,
    defaultPreOTBreakDuration: profileToApply.defaultPreOTBreakDuration,
    defaultTimeoutDuration: profileToApply.defaultTimeoutDuration,
    maxConcurrentPenalties: profileToApply.maxConcurrentPenalties,
    autoStartWarmUp: profileToApply.autoStartWarmUp,
    autoStartBreaks: profileToApply.autoStartBreaks,
    autoStartPreOTBreaks: profileToApply.autoStartPreOTBreaks,
    autoStartTimeouts: profileToApply.autoStartTimeouts,
    numberOfRegularPeriods: profileToApply.numberOfRegularPeriods,
    numberOfOvertimePeriods: profileToApply.numberOfOvertimePeriods,
    playersPerTeamOnIce: profileToApply.playersPerTeamOnIce,
  };
};

const applyScoreboardLayoutProfileToState = (state: GameState, profileId: string | null): GameState => {
  const profileToApply = state.scoreboardLayoutProfiles.find(p => p.id === profileId) || state.scoreboardLayoutProfiles[0] || createDefaultScoreboardLayoutProfile();
  if (!profileToApply) return state;

  const { id, name, ...layoutSettings } = profileToApply;

  return {
    ...state,
    selectedScoreboardLayoutProfileId: id,
    scoreboardLayout: layoutSettings,
  };
};


const gameReducer = (state: GameState, action: GameAction): GameState => {
  let newStateWithoutMeta: Omit<GameState, '_lastActionOriginator' | '_lastUpdatedTimestamp' | 'playHornTrigger' | '_initialConfigLoadComplete'>;
  let newPlayHornTrigger = state.playHornTrigger;
  let newTimestamp = Date.now();
  let tempState = { ...state }; 

  switch (action.type) {
    case 'HYDRATE_FROM_STORAGE': {
      let hydratedBasePartial: Partial<GameState> = { ...(action.payload ?? {}) };

      // Hydrate Format & Timings Profiles
      let hydratedFormatProfiles = action.payload?.formatAndTimingsProfiles;
      if (!hydratedFormatProfiles || hydratedFormatProfiles.length === 0) {
        hydratedFormatProfiles = [createDefaultFormatAndTimingsProfile()];
      }
      let hydratedSelectedFormatProfileId = action.payload?.selectedFormatAndTimingsProfileId;
      if (!hydratedSelectedFormatProfileId || !hydratedFormatProfiles.find(p => p.id === hydratedSelectedFormatProfileId)) {
        hydratedSelectedFormatProfileId = hydratedFormatProfiles[0]?.id || null;
      }
      const selectedFormatProfileValues = hydratedFormatProfiles.find(p => p.id === hydratedSelectedFormatProfileId) || hydratedFormatProfiles[0];

      // Hydrate Scoreboard Layout Profiles
      let hydratedLayoutProfiles = action.payload?.scoreboardLayoutProfiles;
      if (!hydratedLayoutProfiles || hydratedLayoutProfiles.length === 0) {
        hydratedLayoutProfiles = [createDefaultScoreboardLayoutProfile()];
      }
      let hydratedSelectedLayoutProfileId = action.payload?.selectedScoreboardLayoutProfileId;
      if (!hydratedSelectedLayoutProfileId || !hydratedLayoutProfiles.find(p => p.id === hydratedSelectedLayoutProfileId)) {
        hydratedSelectedLayoutProfileId = hydratedLayoutProfiles[0]?.id || null;
      }
      const selectedLayoutProfileValues = hydratedLayoutProfiles.find(p => p.id === hydratedSelectedLayoutProfileId) || hydratedLayoutProfiles[0];
      const { id: layoutId, name: layoutName, ...layoutSettings } = selectedLayoutProfileValues || createDefaultScoreboardLayoutProfile();

      // Hydrate Categories
      let hydratedCategories: CategoryData[] = action.payload?.availableCategories || [].concat(IN_CODE_INITIAL_AVAILABLE_CATEGORIES);
      if (Array.isArray(hydratedCategories) && hydratedCategories.length > 0 && typeof hydratedCategories[0] === 'string') {
         hydratedCategories = (hydratedCategories as unknown as string[]).map(name => ({ id: name, name: name }));
      }
      
      const hydratedBase: GameState = {
        ...initialGlobalState, 
        ...selectedFormatProfileValues, 
        ...(action.payload ?? {}), 
        formatAndTimingsProfiles: hydratedFormatProfiles,
        selectedFormatAndTimingsProfileId: hydratedSelectedFormatProfileId,
        scoreboardLayout: layoutSettings,
        scoreboardLayoutProfiles: hydratedLayoutProfiles,
        selectedScoreboardLayoutProfileId: hydratedSelectedLayoutProfileId,
        availableCategories: hydratedCategories, 
        teams: (action.payload?.teams || state.teams).map(t => ({...t, subName: t.subName || undefined })), 
        playHornTrigger: state.playHornTrigger, 
        _initialConfigLoadComplete: true, 
      };
      
      if (!hydratedBase.availableCategories.find(c => c.id === hydratedBase.selectedMatchCategory) && hydratedBase.availableCategories.length > 0) {
        hydratedBase.selectedMatchCategory = hydratedBase.availableCategories[0].id;
      } else if (hydratedBase.availableCategories.length === 0) {
        hydratedBase.selectedMatchCategory = ''; 
      }

      const rawHomePenaltiesFromStorage = action.payload?.homePenalties || [];
      const rawAwayPenaltiesFromStorage = action.payload?.awayPenalties || [];

      hydratedBase.homePenalties = sortPenaltiesByStatus(
        updatePenaltyStatusesOnly(rawHomePenaltiesFromStorage as Penalty[], hydratedBase.maxConcurrentPenalties)
      );
      hydratedBase.awayPenalties = sortPenaltiesByStatus(
        updatePenaltyStatusesOnly(rawAwayPenaltiesFromStorage as Penalty[], hydratedBase.maxConcurrentPenalties)
      );
      
      const { _lastActionOriginator, _lastUpdatedTimestamp, playHornTrigger: hydratedHornTrigger, _initialConfigLoadComplete, ...restOfHydrated } = hydratedBase;
      newStateWithoutMeta = restOfHydrated;
      return { ...newStateWithoutMeta, playHornTrigger: state.playHornTrigger, _lastActionOriginator: undefined, _lastUpdatedTimestamp: action.payload?._lastUpdatedTimestamp, _initialConfigLoadComplete: true };
    }
    case 'SET_STATE_FROM_LOCAL_BROADCAST': {
      const incomingTimestamp = action.payload._lastUpdatedTimestamp;
      const currentTimestamp = state._lastUpdatedTimestamp;

      if (incomingTimestamp && currentTimestamp && incomingTimestamp < currentTimestamp) {
        return { ...state, _lastActionOriginator: undefined };
      }
      if (incomingTimestamp === undefined && currentTimestamp !== undefined) {
         return { ...state, _lastActionOriginator: undefined };
      }

      const { _lastActionOriginator, playHornTrigger: receivedPlayHornTrigger, _initialConfigLoadComplete, ...restOfPayload } = action.payload;
      newStateWithoutMeta = restOfPayload;
      newPlayHornTrigger = receivedPlayHornTrigger !== state.playHornTrigger ? receivedPlayHornTrigger : state.playHornTrigger;
      return { ...newStateWithoutMeta, playHornTrigger: newPlayHornTrigger, _lastActionOriginator: undefined, _lastUpdatedTimestamp: incomingTimestamp, _initialConfigLoadComplete: state._initialConfigLoadComplete };
    }
    case 'TOGGLE_CLOCK': {
      let newCurrentTimeCs = state.currentTime;
      let newIsClockRunning = state.isClockRunning;
      let newClockStartTimeMs = state.clockStartTimeMs;
      let newRemainingTimeAtStartCs = state.remainingTimeAtStartCs;

      if (state.periodDisplayOverride === "End of Game") {
        newStateWithoutMeta = state; 
        break;
      }

      if (state.isClockRunning) {
        if (state.clockStartTimeMs && state.remainingTimeAtStartCs !== null) {
          const elapsedMs = Date.now() - state.clockStartTimeMs;
          const elapsedCs = Math.floor(elapsedMs / 10);
          newCurrentTimeCs = Math.max(0, state.remainingTimeAtStartCs - elapsedCs);
        }
        newIsClockRunning = false;
        newClockStartTimeMs = null;
        newRemainingTimeAtStartCs = null;
        if (newCurrentTimeCs <= 0) {
            newPlayHornTrigger = state.playHornTrigger + 1;
        }
      } else {
        if (state.currentTime > 0) {
          newIsClockRunning = true;
          newClockStartTimeMs = Date.now();
          newRemainingTimeAtStartCs = state.currentTime;
        } else {
          newIsClockRunning = false;
          newClockStartTimeMs = null;
          newRemainingTimeAtStartCs = null;
        }
      }
      newStateWithoutMeta = {
        ...state,
        currentTime: newCurrentTimeCs,
        isClockRunning: newIsClockRunning,
        clockStartTimeMs: newClockStartTimeMs,
        remainingTimeAtStartCs: newRemainingTimeAtStartCs,
      };
      break;
    }
    case 'SET_TIME': {
      if (state.periodDisplayOverride === "End of Game") {
        newStateWithoutMeta = state; break;
      }
      const newTimeCs = Math.max(0, (action.payload.minutes * 60 + action.payload.seconds) * CENTISECONDS_PER_SECOND);
      const newIsClockRunning = newTimeCs > 0 ? state.isClockRunning : false;
      newStateWithoutMeta = {
        ...state,
        currentTime: newTimeCs,
        isClockRunning: newIsClockRunning,
        clockStartTimeMs: newIsClockRunning ? Date.now() : null,
        remainingTimeAtStartCs: newIsClockRunning ? newTimeCs : null,
       };
      if (!newIsClockRunning && newTimeCs <=0 && state.currentTime > 0) {
        newPlayHornTrigger = state.playHornTrigger + 1;
      } else if (!newIsClockRunning) {
        newStateWithoutMeta.clockStartTimeMs = null;
        newStateWithoutMeta.remainingTimeAtStartCs = null;
      }
      break;
    }
    case 'ADJUST_TIME': {
      if (state.periodDisplayOverride === "End of Game") {
        newStateWithoutMeta = state; break;
      }
      let currentTimeSnapshotCs = state.currentTime;
      if (state.isClockRunning && state.clockStartTimeMs && state.remainingTimeAtStartCs !== null) {
        const elapsedMs = Date.now() - state.clockStartTimeMs;
        const elapsedCs = Math.floor(elapsedMs / 10);
        currentTimeSnapshotCs = Math.max(0, state.remainingTimeAtStartCs - elapsedCs);
      }
      const newAdjustedTimeCs = Math.max(0, currentTimeSnapshotCs + action.payload);

      const newIsClockRunning = newAdjustedTimeCs > 0 ? state.isClockRunning : false;
      newStateWithoutMeta = {
        ...state,
        currentTime: newAdjustedTimeCs,
        isClockRunning: newIsClockRunning,
        clockStartTimeMs: newIsClockRunning ? Date.now() : null,
        remainingTimeAtStartCs: newIsClockRunning ? newAdjustedTimeCs : null,
      };
       if (!newIsClockRunning && newAdjustedTimeCs <=0 && state.currentTime > 0) {
        newPlayHornTrigger = state.playHornTrigger + 1;
      } else if (!newIsClockRunning) {
        newStateWithoutMeta.clockStartTimeMs = null;
        newStateWithoutMeta.remainingTimeAtStartCs = null;
      }
      break;
    }
    case 'SET_PERIOD': {
      const newPeriod = Math.max(0, action.payload);
      let periodDurationCs: number;
      let displayOverride: PeriodDisplayOverrideType;
      let autoStartClock: boolean;

      if (newPeriod === 0) {
        periodDurationCs = state.defaultWarmUpDuration;
        displayOverride = 'Warm-up';
        autoStartClock = state.autoStartWarmUp && periodDurationCs > 0;
      } else if (newPeriod > state.numberOfRegularPeriods) {
        periodDurationCs = state.defaultOTPeriodDuration;
        displayOverride = null;
        autoStartClock = false;
      } else {
        periodDurationCs = state.defaultPeriodDuration;
        displayOverride = null;
        autoStartClock = false;
      }

      newStateWithoutMeta = {
        ...state,
        currentPeriod: newPeriod,
        periodDisplayOverride: displayOverride,
        currentTime: periodDurationCs,
        isClockRunning: autoStartClock,
        preTimeoutState: null,
        clockStartTimeMs: autoStartClock ? Date.now() : null,
        remainingTimeAtStartCs: autoStartClock ? periodDurationCs : null,
      };
      break;
    }
    case 'RESET_PERIOD_CLOCK': {
      if (state.periodDisplayOverride === "End of Game") {
        newStateWithoutMeta = state; break;
      }
      let newTimeCs: number;
      let autoStart = false;
      if (state.periodDisplayOverride === 'Warm-up' || (state.currentPeriod === 0 && state.periodDisplayOverride === null)) {
        newTimeCs = state.defaultWarmUpDuration;
        autoStart = state.autoStartWarmUp && newTimeCs > 0;
      } else if (state.periodDisplayOverride === 'Break') {
        newTimeCs = state.defaultBreakDuration;
        autoStart = state.autoStartBreaks && newTimeCs > 0;
      } else if (state.periodDisplayOverride === 'Pre-OT Break') {
        newTimeCs = state.defaultPreOTBreakDuration;
        autoStart = state.autoStartPreOTBreaks && newTimeCs > 0;
      } else if (state.periodDisplayOverride === 'Time Out') {
        newTimeCs = state.defaultTimeoutDuration;
        autoStart = state.autoStartTimeouts && newTimeCs > 0;
      } else if (state.currentPeriod > state.numberOfRegularPeriods) {
        newTimeCs = state.defaultOTPeriodDuration;
      } else {
        newTimeCs = state.defaultPeriodDuration;
      }
      newStateWithoutMeta = {
        ...state,
        currentTime: newTimeCs,
        isClockRunning: autoStart,
        clockStartTimeMs: autoStart ? Date.now() : null,
        remainingTimeAtStartCs: autoStart ? newTimeCs : null,
      };
      break;
    }
    case 'SET_SCORE': {
      const { team, score } = action.payload;
      newStateWithoutMeta = { ...state, [`${team}Score`]: Math.max(0, score) };
      break;
    }
    case 'ADJUST_SCORE': {
      const { team, delta, scorer } = action.payload;
      const currentScore = state[`${team}Score`];
      const newScore = Math.max(0, currentScore + delta);
      newStateWithoutMeta = { ...state, [`${team}Score`]: newScore };

      if (delta > 0) {
        const newGoalLog: GoalLog = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          gameTime: state.currentTime,
          periodText: getActualPeriodText(state.currentPeriod, state.periodDisplayOverride, state.numberOfRegularPeriods),
          scoreAfterGoal: {
            home: team === 'home' ? newScore : state.homeScore,
            away: team === 'away' ? newScore : state.awayScore,
          },
          scorer,
        };
        const newGameSummary = { ...state.gameSummary };
        newGameSummary[team].goals.push(newGoalLog);
        newStateWithoutMeta.gameSummary = newGameSummary;
      }
      break;
    }
    case 'ADD_PENALTY': {
      const newPenaltyId = crypto.randomUUID();
      const newPenalty: Penalty = {
        ...action.payload.penalty,
        initialDuration: action.payload.penalty.initialDuration,
        remainingTime: action.payload.penalty.remainingTime,
        id: newPenaltyId,
        _status: 'pending_puck', 
      };
      let penalties = [...state[`${action.payload.team}Penalties`], newPenalty];
      penalties = updatePenaltyStatusesOnly(penalties, state.maxConcurrentPenalties);
      penalties = sortPenaltiesByStatus(penalties);
      
      const teamDetails = state.teams.find(t => t.name === state[`${action.payload.team}TeamName`]);
      const playerDetails = teamDetails?.players.find(p => p.number === newPenalty.playerNumber);

      const newPenaltyLog: PenaltyLog = {
        id: newPenaltyId,
        team: action.payload.team,
        playerNumber: newPenalty.playerNumber,
        playerName: playerDetails?.name,
        initialDuration: newPenalty.initialDuration,
        addTimestamp: Date.now(),
        addGameTime: state.currentTime,
        addPeriodText: getActualPeriodText(state.currentPeriod, state.periodDisplayOverride, state.numberOfRegularPeriods),
      };
      const newGameSummary = { ...state.gameSummary };
      newGameSummary[action.payload.team].penalties.push(newPenaltyLog);

      newStateWithoutMeta = { 
        ...state, 
        [`${action.payload.team}Penalties`]: penalties,
        gameSummary: newGameSummary,
      };
      break;
    }
    case 'REMOVE_PENALTY': {
      const penaltyToRemove = state[`${action.payload.team}Penalties`].find(p => p.id === action.payload.penaltyId);
      let penalties = state[`${action.payload.team}Penalties`].filter(p => p.id !== action.payload.penaltyId);
      penalties = updatePenaltyStatusesOnly(penalties, state.maxConcurrentPenalties);
      penalties = sortPenaltiesByStatus(penalties);

      let newGameSummary = { ...state.gameSummary };
      if (penaltyToRemove) {
        const timeServed = penaltyToRemove.initialDuration - penaltyToRemove.remainingTime;
        newGameSummary[action.payload.team].penalties = newGameSummary[action.payload.team].penalties.map(p => {
          if (p.id === action.payload.penaltyId) {
            return {
              ...p,
              endTimestamp: Date.now(),
              endGameTime: state.currentTime,
              endPeriodText: getActualPeriodText(state.currentPeriod, state.periodDisplayOverride, state.numberOfRegularPeriods),
              endReason: 'deleted',
              timeServed,
            };
          }
          return p;
        });
      }

      newStateWithoutMeta = { 
        ...state, 
        [`${action.payload.team}Penalties`]: penalties,
        gameSummary: newGameSummary,
      };
      break;
    }
    case 'ADJUST_PENALTY_TIME': {
      const { team, penaltyId, delta } = action.payload;
      let updatedPenalties = state[`${team}Penalties`].map(p => {
        if (p.id === penaltyId) {
          const newRemainingTimeSec = Math.max(0, p.remainingTime + delta);
          const cappedTimeSec = delta > 0 ? Math.min(newRemainingTimeSec, p.initialDuration) : newRemainingTimeSec;
          return { ...p, remainingTime: cappedTimeSec };
        }
        return p;
      });
      updatedPenalties = updatePenaltyStatusesOnly(updatedPenalties, state.maxConcurrentPenalties);
      updatedPenalties = sortPenaltiesByStatus(updatedPenalties);
      newStateWithoutMeta = { ...state, [`${team}Penalties`]: updatedPenalties };
      break;
    }
    case 'REORDER_PENALTIES': {
      const { team, startIndex, endIndex } = action.payload;
      const currentPenalties = [...state[`${team}Penalties`]];
      const [removed] = currentPenalties.splice(startIndex, 1);
      if (removed) {
        currentPenalties.splice(endIndex, 0, removed);
      }
      let reorderedPenalties = updatePenaltyStatusesOnly(currentPenalties, state.maxConcurrentPenalties);
      reorderedPenalties = sortPenaltiesByStatus(reorderedPenalties);
      newStateWithoutMeta = { ...state, [`${team}Penalties`]: reorderedPenalties };
      break;
    }
    case 'ACTIVATE_PENDING_PUCK_PENALTIES': {
      const activate = (penalties: Penalty[]): Penalty[] =>
        penalties.map(p => p._status === 'pending_puck' ? { ...p, _status: undefined } : p);

      let homePenalties = activate(state.homePenalties);
      let awayPenalties = activate(state.awayPenalties);

      homePenalties = updatePenaltyStatusesOnly(homePenalties, state.maxConcurrentPenalties);
      homePenalties = sortPenaltiesByStatus(homePenalties);
      awayPenalties = updatePenaltyStatusesOnly(awayPenalties, state.maxConcurrentPenalties);
      awayPenalties = sortPenaltiesByStatus(awayPenalties);

      newStateWithoutMeta = { ...state, homePenalties, awayPenalties };
      break;
    }
    case 'TICK': {
      let newCalculatedTimeCs = state.currentTime;
      let homePenaltiesResult = [...state.homePenalties];
      let awayPenaltiesResult = [...state.awayPenalties];
      let newGameSummary = state.gameSummary;

      if (state.isClockRunning && state.clockStartTimeMs && state.remainingTimeAtStartCs !== null) {
        const elapsedMs = Date.now() - state.clockStartTimeMs;
        const elapsedCs = Math.floor(elapsedMs / 10);
        newCalculatedTimeCs = Math.max(0, state.remainingTimeAtStartCs - elapsedCs);

        const gameClockWasTickingForPenalties = state.periodDisplayOverride === null && state.currentPeriod > 0;

        if (gameClockWasTickingForPenalties) {
          const oldSecondBoundary = Math.floor(state.currentTime / CENTISECONDS_PER_SECOND);
          const newSecondBoundary = Math.floor(newCalculatedTimeCs / CENTISECONDS_PER_SECOND);
          const secondsDecremented = oldSecondBoundary - newSecondBoundary;
          
          if (secondsDecremented > 0) { 
            const decrementRunningPenalties = (penalties: Penalty[], team: Team): Penalty[] => {
              return penalties.map(p => {
                if (p._status === 'running' && p.remainingTime > 0) {
                  const newRemaining = Math.max(0, p.remainingTime - secondsDecremented);
                  if (p.remainingTime > 0 && newRemaining <= 0) {
                    // Penalty just finished, log it
                    newGameSummary[team].penalties = newGameSummary[team].penalties.map(log => {
                      if (log.id === p.id && !log.endReason) {
                        return {
                          ...log,
                          endTimestamp: Date.now(),
                          endGameTime: state.currentTime,
                          endPeriodText: getActualPeriodText(state.currentPeriod, state.periodDisplayOverride, state.numberOfRegularPeriods),
                          endReason: 'completed',
                          timeServed: log.initialDuration,
                        };
                      }
                      return log;
                    });
                  }
                  return { ...p, remainingTime: newRemaining };
                }
                return p;
              });
            };
            homePenaltiesResult = decrementRunningPenalties(homePenaltiesResult, 'home');
            awayPenaltiesResult = decrementRunningPenalties(awayPenaltiesResult, 'away');
          }
        }
      } else if (state.isClockRunning && state.currentTime <= 0) {
         newCalculatedTimeCs = 0;
      }
      
      homePenaltiesResult = updatePenaltyStatusesOnly(homePenaltiesResult, state.maxConcurrentPenalties);
      homePenaltiesResult = sortPenaltiesByStatus(homePenaltiesResult);
      awayPenaltiesResult = updatePenaltyStatusesOnly(awayPenaltiesResult, state.maxConcurrentPenalties);
      awayPenaltiesResult = sortPenaltiesByStatus(awayPenaltiesResult);

      if (state.isClockRunning && newCalculatedTimeCs <= 0) {
        const stateBeforeTransition: GameState = {
          ...state,
          currentTime: 0,
          isClockRunning: false,
          clockStartTimeMs: null,
          remainingTimeAtStartCs: null,
          homePenalties: homePenaltiesResult,
          awayPenalties: awayPenaltiesResult,
          gameSummary: newGameSummary,
        };
        const transitionResult = handleAutoTransition(stateBeforeTransition);
        newStateWithoutMeta = transitionResult; 
        newPlayHornTrigger = transitionResult.playHornTrigger;
      } else {
        newStateWithoutMeta = {
          ...state,
          currentTime: newCalculatedTimeCs,
          homePenalties: homePenaltiesResult,
          awayPenalties: awayPenaltiesResult,
          gameSummary: newGameSummary,
        };
        if (state.isClockRunning && newCalculatedTimeCs <= 0) { 
            newStateWithoutMeta.isClockRunning = false;
            newStateWithoutMeta.clockStartTimeMs = null;
            newStateWithoutMeta.remainingTimeAtStartCs = null;
            newPlayHornTrigger = state.playHornTrigger + 1;
        }
      }
      break;
    }
    case 'SET_HOME_TEAM_NAME':
      newStateWithoutMeta = { ...state, homeTeamName: action.payload || 'Local' };
      break;
    case 'SET_HOME_TEAM_SUB_NAME':
      newStateWithoutMeta = { ...state, homeTeamSubName: action.payload };
      break;
    case 'SET_AWAY_TEAM_NAME':
      newStateWithoutMeta = { ...state, awayTeamName: action.payload || 'Visitante' };
      break;
    case 'SET_AWAY_TEAM_SUB_NAME':
      newStateWithoutMeta = { ...state, awayTeamSubName: action.payload };
      break;
    case 'START_BREAK': {
      const autoStart = state.autoStartBreaks && state.defaultBreakDuration > 0;
      newStateWithoutMeta = {
        ...state,
        currentTime: state.defaultBreakDuration,
        periodDisplayOverride: 'Break',
        isClockRunning: autoStart,
        preTimeoutState: null,
        clockStartTimeMs: autoStart ? Date.now() : null,
        remainingTimeAtStartCs: autoStart ? state.defaultBreakDuration : null,
      };
      break;
    }
    case 'START_PRE_OT_BREAK': {
      const autoStart = state.autoStartPreOTBreaks && state.defaultPreOTBreakDuration > 0;
      newStateWithoutMeta = {
        ...state,
        currentTime: state.defaultPreOTBreakDuration,
        periodDisplayOverride: 'Pre-OT Break',
        isClockRunning: autoStart,
        preTimeoutState: null,
        clockStartTimeMs: autoStart ? Date.now() : null,
        remainingTimeAtStartCs: autoStart ? state.defaultPreOTBreakDuration : null,
      };
      break;
    }
    case 'START_BREAK_AFTER_PREVIOUS_PERIOD': {
      if (state.currentPeriod <= 0 && state.periodDisplayOverride !== 'Break' && state.periodDisplayOverride !== 'Pre-OT Break') {
          newStateWithoutMeta = state; break;
      }

      const periodBeforeBreak = (state.periodDisplayOverride === 'Break' || state.periodDisplayOverride === 'Pre-OT Break')
                                ? state.currentPeriod
                                : state.currentPeriod -1;

      if (periodBeforeBreak < 1 && periodBeforeBreak !== 0) {
          newStateWithoutMeta = state; break;
      }

      if (periodBeforeBreak === 0) {
        newStateWithoutMeta = state; break;
      }

      const isPreOT = periodBeforeBreak >= state.numberOfRegularPeriods;
      const breakDurationCs = isPreOT ? state.defaultPreOTBreakDuration : state.defaultBreakDuration;
      const autoStart = isPreOT ? state.autoStartPreOTBreaks : state.autoStartBreaks;

      newStateWithoutMeta = {
        ...state,
        currentPeriod: periodBeforeBreak,
        currentTime: breakDurationCs,
        periodDisplayOverride: isPreOT ? 'Pre-OT Break' : 'Break',
        isClockRunning: autoStart && breakDurationCs > 0,
        preTimeoutState: null,
        clockStartTimeMs: autoStart && breakDurationCs > 0 ? Date.now() : null,
        remainingTimeAtStartCs: autoStart && breakDurationCs > 0 ? breakDurationCs : null,
      };
      break;
    }
    case 'START_TIMEOUT': {
      let preciseCurrentTimeCs = state.currentTime;
      let preTimeoutIsRunning = state.isClockRunning;
      let preTimeoutClockStartMs = state.clockStartTimeMs;
      let preTimeoutRemainingCs = state.remainingTimeAtStartCs;

      if (state.isClockRunning && state.clockStartTimeMs && state.remainingTimeAtStartCs !== null) {
        const elapsedMs = Date.now() - state.clockStartTimeMs;
        const elapsedCs = Math.floor(elapsedMs / 10);
        preciseCurrentTimeCs = Math.max(0, state.remainingTimeAtStartCs - elapsedCs);
      }

      const autoStart = state.autoStartTimeouts && state.defaultTimeoutDuration > 0;
      newStateWithoutMeta = {
        ...state,
        preTimeoutState: {
          period: state.currentPeriod,
          time: preciseCurrentTimeCs,
          isClockRunning: preTimeoutIsRunning,
          override: state.periodDisplayOverride,
          clockStartTimeMs: preTimeoutClockStartMs,
          remainingTimeAtStartCs: preTimeoutRemainingCs,
        },
        currentTime: state.defaultTimeoutDuration,
        periodDisplayOverride: 'Time Out',
        isClockRunning: autoStart,
        clockStartTimeMs: autoStart ? Date.now() : null,
        remainingTimeAtStartCs: autoStart ? state.defaultTimeoutDuration : null,
      };
      break;
    }
    case 'END_TIMEOUT':
      if (state.preTimeoutState) {
        const { period, time, isClockRunning: preTimeoutIsRunning, override: preTimeoutOverride, clockStartTimeMs: preTimeoutClockStart, remainingTimeAtStartCs: preTimeoutRemaining } = state.preTimeoutState;
        const shouldResumeClock = preTimeoutIsRunning && time > 0;
        newStateWithoutMeta = {
          ...state,
          currentPeriod: period,
          currentTime: time,
          isClockRunning: shouldResumeClock,
          periodDisplayOverride: preTimeoutOverride,
          clockStartTimeMs: shouldResumeClock ? (preTimeoutClockStart || Date.now()) : null,
          remainingTimeAtStartCs: shouldResumeClock ? (preTimeoutRemaining !== null ? preTimeoutRemaining : time) : null,
          preTimeoutState: null,
        };
         if (shouldResumeClock && newStateWithoutMeta.clockStartTimeMs === preTimeoutClockStart) {
            newStateWithoutMeta.clockStartTimeMs = Date.now();
            newStateWithoutMeta.remainingTimeAtStartCs = time;
        }
      } else {
        newStateWithoutMeta = state;
      }
      break;
    case 'MANUAL_END_GAME':
      newStateWithoutMeta = {
        ...state,
        currentTime: 0,
        isClockRunning: false,
        periodDisplayOverride: 'End of Game',
        clockStartTimeMs: null,
        remainingTimeAtStartCs: null,
        preTimeoutState: null,
      };
      newPlayHornTrigger = state.playHornTrigger + 1;
      break;
    case 'ADD_FORMAT_AND_TIMINGS_PROFILE': {
      const newProfile = createDefaultFormatAndTimingsProfile(crypto.randomUUID(), action.payload.name);
      if (action.payload.profileData) {
        Object.assign(newProfile, action.payload.profileData);
      }
      const newProfiles = [...state.formatAndTimingsProfiles, newProfile];
      tempState = { ...state, formatAndTimingsProfiles: newProfiles };
      newStateWithoutMeta = applyFormatAndTimingsProfileToState(tempState, newProfile.id);
      break;
    }
    case 'UPDATE_FORMAT_AND_TIMINGS_PROFILE_DATA': {
      const { profileId, updates } = action.payload;
      const newProfiles = state.formatAndTimingsProfiles.map(p =>
        p.id === profileId ? { ...p, ...updates } : p
      );
      tempState = { ...state, formatAndTimingsProfiles: newProfiles };
      if (state.selectedFormatAndTimingsProfileId === profileId) {
        newStateWithoutMeta = applyFormatAndTimingsProfileToState(tempState, profileId);
      } else {
        newStateWithoutMeta = tempState;
      }
      break;
    }
    case 'UPDATE_FORMAT_AND_TIMINGS_PROFILE_NAME': {
      const { profileId, newName } = action.payload;
      newStateWithoutMeta = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, name: newName } : p
        ),
      };
      break;
    }
    case 'DELETE_FORMAT_AND_TIMINGS_PROFILE': {
      let newProfiles = state.formatAndTimingsProfiles.filter(p => p.id !== action.payload.profileId);
      let newSelectedId = state.selectedFormatAndTimingsProfileId;

      if (newProfiles.length === 0) {
        const defaultProfile = createDefaultFormatAndTimingsProfile();
        newProfiles = [defaultProfile];
        newSelectedId = defaultProfile.id;
      } else if (state.selectedFormatAndTimingsProfileId === action.payload.profileId) {
        newSelectedId = newProfiles[0].id;
      }
      tempState = { ...state, formatAndTimingsProfiles: newProfiles, selectedFormatAndTimingsProfileId: newSelectedId };
      newStateWithoutMeta = applyFormatAndTimingsProfileToState(tempState, newSelectedId);
      break;
    }
    case 'SELECT_FORMAT_AND_TIMINGS_PROFILE': {
      newStateWithoutMeta = applyFormatAndTimingsProfileToState(state, action.payload.profileId);
      if (state.currentPeriod === 0 && state.periodDisplayOverride === 'Warm-up') {
        newStateWithoutMeta.currentTime = newStateWithoutMeta.defaultWarmUpDuration;
      } else if (state.periodDisplayOverride === null) {
          if (state.currentPeriod > state.numberOfRegularPeriods) {
              newStateWithoutMeta.currentTime = newStateWithoutMeta.defaultOTPeriodDuration;
          } else {
              newStateWithoutMeta.currentTime = newStateWithoutMeta.defaultPeriodDuration;
          }
      }
       newStateWithoutMeta.isClockRunning = false;
       newStateWithoutMeta.clockStartTimeMs = null;
       newStateWithoutMeta.remainingTimeAtStartCs = null;
      break;
    }
    case 'LOAD_FORMAT_AND_TIMINGS_PROFILES': {
      let profilesToLoad = action.payload;
      if (!profilesToLoad || profilesToLoad.length === 0) {
        profilesToLoad = [createDefaultFormatAndTimingsProfile()];
      }
      const newSelectedId = profilesToLoad[0].id;
      tempState = { ...state, formatAndTimingsProfiles: profilesToLoad, selectedFormatAndTimingsProfileId: newSelectedId };
      newStateWithoutMeta = applyFormatAndTimingsProfileToState(tempState, newSelectedId);
      break;
    }
    case 'SET_DEFAULT_PERIOD_DURATION': {
      const profileId = state.selectedFormatAndTimingsProfileId;
      if (!profileId) { newStateWithoutMeta = state; break; }
      const newValue = Math.max(60 * CENTISECONDS_PER_SECOND, action.payload);
      tempState = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, defaultPeriodDuration: newValue } : p
        ),
      };
      newStateWithoutMeta = { ...tempState, defaultPeriodDuration: newValue };
      break;
    }
    case 'SET_DEFAULT_WARM_UP_DURATION': {
      const profileId = state.selectedFormatAndTimingsProfileId;
      if (!profileId) { newStateWithoutMeta = state; break; }
      const newValue = Math.max(60 * CENTISECONDS_PER_SECOND, action.payload);
      tempState = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, defaultWarmUpDuration: newValue } : p
        ),
      };
      newStateWithoutMeta = { ...tempState, defaultWarmUpDuration: newValue };
      break;
    }
     case 'SET_DEFAULT_OT_PERIOD_DURATION': {
      const profileId = state.selectedFormatAndTimingsProfileId;
      if (!profileId) { newStateWithoutMeta = state; break; }
      const newValue = Math.max(60 * CENTISECONDS_PER_SECOND, action.payload);
      tempState = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, defaultOTPeriodDuration: newValue } : p
        ),
      };
      newStateWithoutMeta = { ...tempState, defaultOTPeriodDuration: newValue };
      break;
    }
    case 'SET_DEFAULT_BREAK_DURATION': {
      const profileId = state.selectedFormatAndTimingsProfileId;
      if (!profileId) { newStateWithoutMeta = state; break; }
      const newValue = Math.max(1 * CENTISECONDS_PER_SECOND, action.payload);
      tempState = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, defaultBreakDuration: newValue } : p
        ),
      };
      newStateWithoutMeta = { ...tempState, defaultBreakDuration: newValue };
      break;
    }
    case 'SET_DEFAULT_PRE_OT_BREAK_DURATION': {
      const profileId = state.selectedFormatAndTimingsProfileId;
      if (!profileId) { newStateWithoutMeta = state; break; }
      const newValue = Math.max(1 * CENTISECONDS_PER_SECOND, action.payload);
      tempState = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, defaultPreOTBreakDuration: newValue } : p
        ),
      };
      newStateWithoutMeta = { ...tempState, defaultPreOTBreakDuration: newValue };
      break;
    }
    case 'SET_DEFAULT_TIMEOUT_DURATION': {
      const profileId = state.selectedFormatAndTimingsProfileId;
      if (!profileId) { newStateWithoutMeta = state; break; }
      const newValue = Math.max(1 * CENTISECONDS_PER_SECOND, action.payload);
      tempState = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, defaultTimeoutDuration: newValue } : p
        ),
      };
      newStateWithoutMeta = { ...tempState, defaultTimeoutDuration: newValue };
      break;
    }
    case 'SET_MAX_CONCURRENT_PENALTIES': {
      const profileId = state.selectedFormatAndTimingsProfileId;
      if (!profileId) { newStateWithoutMeta = state; break; }
      const newValue = Math.max(1, action.payload);
      tempState = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, maxConcurrentPenalties: newValue } : p
        ),
      };
      newStateWithoutMeta = { ...tempState, maxConcurrentPenalties: newValue };
      let homePenalties = updatePenaltyStatusesOnly(state.homePenalties, newValue);
      homePenalties = sortPenaltiesByStatus(homePenalties);
      let awayPenalties = updatePenaltyStatusesOnly(state.awayPenalties, newValue);
      awayPenalties = sortPenaltiesByStatus(awayPenalties);
      newStateWithoutMeta.homePenalties = homePenalties;
      newStateWithoutMeta.awayPenalties = awayPenalties;
      break;
    }
    case 'SET_NUMBER_OF_REGULAR_PERIODS': {
      const profileId = state.selectedFormatAndTimingsProfileId;
      if (!profileId) { newStateWithoutMeta = state; break; }
      const newValue = Math.max(1, action.payload);
      tempState = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, numberOfRegularPeriods: newValue } : p
        ),
      };
      newStateWithoutMeta = { ...tempState, numberOfRegularPeriods: newValue };
      break;
    }
    case 'SET_NUMBER_OF_OVERTIME_PERIODS': {
      const profileId = state.selectedFormatAndTimingsProfileId;
      if (!profileId) { newStateWithoutMeta = state; break; }
      const newValue = Math.max(0, action.payload);
      tempState = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, numberOfOvertimePeriods: newValue } : p
        ),
      };
      newStateWithoutMeta = { ...tempState, numberOfOvertimePeriods: newValue };
      break;
    }
    case 'SET_PLAYERS_PER_TEAM_ON_ICE': {
      const profileId = state.selectedFormatAndTimingsProfileId;
      if (!profileId) { newStateWithoutMeta = state; break; }
      const newValue = Math.max(1, action.payload);
      tempState = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, playersPerTeamOnIce: newValue } : p
        ),
      };
      newStateWithoutMeta = { ...tempState, playersPerTeamOnIce: newValue };
      break;
    }
    case 'SET_AUTO_START_WARM_UP_VALUE': {
      const profileId = state.selectedFormatAndTimingsProfileId;
      if (!profileId) { newStateWithoutMeta = state; break; }
      tempState = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, autoStartWarmUp: action.payload } : p
        ),
      };
      newStateWithoutMeta = { ...tempState, autoStartWarmUp: action.payload };
      break;
    }
    case 'SET_AUTO_START_BREAKS_VALUE': {
      const profileId = state.selectedFormatAndTimingsProfileId;
      if (!profileId) { newStateWithoutMeta = state; break; }
      tempState = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, autoStartBreaks: action.payload } : p
        ),
      };
      newStateWithoutMeta = { ...tempState, autoStartBreaks: action.payload };
      break;
    }
    case 'SET_AUTO_START_PRE_OT_BREAKS_VALUE': {
      const profileId = state.selectedFormatAndTimingsProfileId;
      if (!profileId) { newStateWithoutMeta = state; break; }
      tempState = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, autoStartPreOTBreaks: action.payload } : p
        ),
      };
      newStateWithoutMeta = { ...tempState, autoStartPreOTBreaks: action.payload };
      break;
    }
    case 'SET_AUTO_START_TIMEOUTS_VALUE': {
      const profileId = state.selectedFormatAndTimingsProfileId;
      if (!profileId) { newStateWithoutMeta = state; break; }
       tempState = {
        ...state,
        formatAndTimingsProfiles: state.formatAndTimingsProfiles.map(p =>
          p.id === profileId ? { ...p, autoStartTimeouts: action.payload } : p
        ),
      };
      newStateWithoutMeta = { ...tempState, autoStartTimeouts: action.payload };
      break;
    }
    case 'SET_PLAY_SOUND_AT_PERIOD_END':
      newStateWithoutMeta = { ...state, playSoundAtPeriodEnd: action.payload };
      break;
    case 'SET_CUSTOM_HORN_SOUND_DATA_URL':
      newStateWithoutMeta = { ...state, customHornSoundDataUrl: action.payload };
      break;
    case 'UPDATE_LAYOUT_SETTINGS':
      newStateWithoutMeta = { ...state, scoreboardLayout: { ...state.scoreboardLayout, ...action.payload } };
      break;
    case 'ADD_SCOREBOARD_LAYOUT_PROFILE': {
        const newProfile = createDefaultScoreboardLayoutProfile(crypto.randomUUID(), action.payload.name);
        const newProfiles = [...state.scoreboardLayoutProfiles, newProfile];
        tempState = { ...state, scoreboardLayoutProfiles: newProfiles };
        newStateWithoutMeta = applyScoreboardLayoutProfileToState(tempState, newProfile.id);
        break;
    }
    case 'UPDATE_SCOREBOARD_LAYOUT_PROFILE_NAME': {
        const { profileId, newName } = action.payload;
        newStateWithoutMeta = {
            ...state,
            scoreboardLayoutProfiles: state.scoreboardLayoutProfiles.map(p =>
                p.id === profileId ? { ...p, name: newName } : p
            ),
        };
        break;
    }
    case 'DELETE_SCOREBOARD_LAYOUT_PROFILE': {
        let newProfiles = state.scoreboardLayoutProfiles.filter(p => p.id !== action.payload.profileId);
        let newSelectedId = state.selectedScoreboardLayoutProfileId;

        if (newProfiles.length === 0) {
            const defaultProfile = createDefaultScoreboardLayoutProfile();
            newProfiles = [defaultProfile];
            newSelectedId = defaultProfile.id;
        } else if (state.selectedScoreboardLayoutProfileId === action.payload.profileId) {
            newSelectedId = newProfiles[0].id;
        }
        tempState = { ...state, scoreboardLayoutProfiles: newProfiles, selectedScoreboardLayoutProfileId: newSelectedId };
        newStateWithoutMeta = applyScoreboardLayoutProfileToState(tempState, newSelectedId);
        break;
    }
    case 'SELECT_SCOREBOARD_LAYOUT_PROFILE': {
        newStateWithoutMeta = applyScoreboardLayoutProfileToState(state, action.payload.profileId);
        break;
    }
    case 'SAVE_CURRENT_LAYOUT_TO_PROFILE': {
        const profileId = state.selectedScoreboardLayoutProfileId;
        if (!profileId) { newStateWithoutMeta = state; break; }
        newStateWithoutMeta = {
            ...state,
            scoreboardLayoutProfiles: state.scoreboardLayoutProfiles.map(p =>
                p.id === profileId ? { ...p, ...state.scoreboardLayout } : p
            ),
        };
        break;
    }
    case 'SET_ENABLE_TEAM_SELECTION_IN_MINI_SCOREBOARD':
      if (!action.payload) {
        newStateWithoutMeta = {
          ...state,
          enableTeamSelectionInMiniScoreboard: false,
          enablePlayerSelectionForPenalties: false,
          showAliasInPenaltyPlayerSelector: false,
          showAliasInControlsPenaltyList: false,
          showAliasInScoreboardPenalties: false,
        };
      } else {
        newStateWithoutMeta = { ...state, enableTeamSelectionInMiniScoreboard: true };
      }
      break;
    case 'SET_ENABLE_PLAYER_SELECTION_FOR_PENALTIES':
      newStateWithoutMeta = { ...state, enablePlayerSelectionForPenalties: action.payload };
      if (!action.payload) {
        newStateWithoutMeta.showAliasInPenaltyPlayerSelector = false;
        newStateWithoutMeta.showAliasInControlsPenaltyList = false;
        newStateWithoutMeta.showAliasInScoreboardPenalties = false; 
      }
      break;
    case 'SET_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR':
      newStateWithoutMeta = { ...state, showAliasInPenaltyPlayerSelector: action.payload };
      break;
    case 'SET_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST':
      newStateWithoutMeta = { ...state, showAliasInControlsPenaltyList: action.payload };
      break;
    case 'SET_SHOW_ALIAS_IN_SCOREBOARD_PENALTIES':
      newStateWithoutMeta = { ...state, showAliasInScoreboardPenalties: action.payload };
      break;
    case 'LOAD_SOUND_AND_DISPLAY_CONFIG': {
        const config = action.payload;
        let enableTeamUsage = config.enableTeamSelectionInMiniScoreboard ?? state.enableTeamSelectionInMiniScoreboard;
        let enablePlayerSelection = config.enablePlayerSelectionForPenalties ?? state.enablePlayerSelectionForPenalties;
        let showAliasInSelector = config.showAliasInPenaltyPlayerSelector ?? state.showAliasInPenaltyPlayerSelector;
        let showAliasInControls = config.showAliasInControlsPenaltyList ?? state.showAliasInControlsPenaltyList;
        let showAliasInScoreboard = config.showAliasInScoreboardPenalties ?? state.showAliasInScoreboardPenalties;

        if (!enableTeamUsage) {
            enablePlayerSelection = false;
            showAliasInSelector = false;
            showAliasInControls = false;
            showAliasInScoreboard = false;
        }
        if (!enablePlayerSelection){
            showAliasInSelector = false;
            showAliasInControls = false;
            showAliasInScoreboard = false;
        }
        
        let profilesToLoad = config.scoreboardLayoutProfiles;
        if (!profilesToLoad || profilesToLoad.length === 0) {
            profilesToLoad = [createDefaultScoreboardLayoutProfile()];
        }
        const newSelectedId = profilesToLoad[0].id;
        const { id, name, ...layoutSettings } = profilesToLoad[0];

        newStateWithoutMeta = {
            ...state,
            playSoundAtPeriodEnd: config.playSoundAtPeriodEnd ?? state.playSoundAtPeriodEnd,
            customHornSoundDataUrl: config.customHornSoundDataUrl === undefined ? state.customHornSoundDataUrl : config.customHornSoundDataUrl,
            enableTeamSelectionInMiniScoreboard: enableTeamUsage,
            enablePlayerSelectionForPenalties: enablePlayerSelection,
            showAliasInPenaltyPlayerSelector: showAliasInSelector,
            showAliasInControlsPenaltyList: showAliasInControls,
            showAliasInScoreboardPenalties: showAliasInScoreboard,
            scoreboardLayout: layoutSettings,
            scoreboardLayoutProfiles: profilesToLoad,
            selectedScoreboardLayoutProfileId: newSelectedId,
        };
        break;
    }
    case 'SET_AVAILABLE_CATEGORIES': // Used by CategorySettingsCard save
      newStateWithoutMeta = { ...state, availableCategories: action.payload };
      if (!action.payload.find(c => c.id === state.selectedMatchCategory) && action.payload.length > 0) {
        newStateWithoutMeta.selectedMatchCategory = action.payload[0].id;
      } else if (action.payload.length === 0) {
        newStateWithoutMeta.selectedMatchCategory = '';
      }
      break;
    case 'SET_SELECTED_MATCH_CATEGORY':
      newStateWithoutMeta = { ...state, selectedMatchCategory: action.payload };
      break;
    case 'RESET_CONFIG_TO_DEFAULTS': {
      const factoryDefaultFormatProfile = createDefaultFormatAndTimingsProfile();
      let updatedFormatProfiles = state.formatAndTimingsProfiles;
      let selectedFormatProfileId = state.selectedFormatAndTimingsProfileId;
      if (selectedFormatProfileId) {
          updatedFormatProfiles = state.formatAndTimingsProfiles.map(p => p.id === selectedFormatProfileId ? { ...factoryDefaultFormatProfile, id: p.id, name: p.name } : p);
      }
      const activeFormatProfile = updatedFormatProfiles.find(p => p.id === selectedFormatProfileId) || factoryDefaultFormatProfile;

      const factoryDefaultLayoutProfile = createDefaultScoreboardLayoutProfile();
      let updatedLayoutProfiles = state.scoreboardLayoutProfiles;
      let selectedLayoutProfileId = state.selectedScoreboardLayoutProfileId;
      if (selectedLayoutProfileId) {
          updatedLayoutProfiles = state.scoreboardLayoutProfiles.map(p => p.id === selectedLayoutProfileId ? { ...factoryDefaultLayoutProfile, id: p.id, name: p.name } : p);
      }
      const { id, name, ...layoutSettings } = updatedLayoutProfiles.find(p => p.id === selectedLayoutProfileId) || factoryDefaultLayoutProfile;
      
      tempState = {
        ...state,
        ...activeFormatProfile,
        formatAndTimingsProfiles: updatedFormatProfiles,
        selectedFormatAndTimingsProfileId: selectedFormatProfileId,
        scoreboardLayout: layoutSettings,
        scoreboardLayoutProfiles: updatedLayoutProfiles,
        selectedScoreboardLayoutProfileId: selectedLayoutProfileId,
        playSoundAtPeriodEnd: IN_CODE_INITIAL_PLAY_SOUND_AT_PERIOD_END,
        customHornSoundDataUrl: IN_CODE_INITIAL_CUSTOM_HORN_SOUND_DATA_URL,
        enableTeamSelectionInMiniScoreboard: IN_CODE_INITIAL_ENABLE_TEAM_SELECTION_IN_MINI_SCOREBOARD,
        enablePlayerSelectionForPenalties: IN_CODE_INITIAL_ENABLE_PLAYER_SELECTION_FOR_PENALTIES,
        showAliasInPenaltyPlayerSelector: IN_CODE_INITIAL_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR,
        showAliasInControlsPenaltyList: IN_CODE_INITIAL_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST,
        showAliasInScoreboardPenalties: IN_CODE_INITIAL_SHOW_ALIAS_IN_SCOREBOARD_PENALTIES,
        availableCategories: IN_CODE_INITIAL_AVAILABLE_CATEGORIES,
        selectedMatchCategory: IN_CODE_INITIAL_SELECTED_MATCH_CATEGORY,
        gameSummary: IN_CODE_INITIAL_GAME_SUMMARY,
      };
      const newMaxPen = tempState.maxConcurrentPenalties;
      tempState.homePenalties = sortPenaltiesByStatus(updatePenaltyStatusesOnly(state.homePenalties, newMaxPen));
      tempState.awayPenalties = sortPenaltiesByStatus(updatePenaltyStatusesOnly(state.awayPenalties, newMaxPen));
      newStateWithoutMeta = tempState;
      break;
    }
    case 'RESET_GAME_STATE': {
      const activeProfileId = state.selectedFormatAndTimingsProfileId;
      const activeProfile = state.formatAndTimingsProfiles.find(p => p.id === activeProfileId) || state.formatAndTimingsProfiles[0] || createDefaultFormatAndTimingsProfile();
      
      const initialWarmUpDurationCs = activeProfile.defaultWarmUpDuration;
      const autoStartWarmUp = activeProfile.autoStartWarmUp;

      newStateWithoutMeta = {
        ...state, 
        homeScore: 0,
        awayScore: 0,
        currentPeriod: 0,
        currentTime: initialWarmUpDurationCs,
        isClockRunning: autoStartWarmUp && initialWarmUpDurationCs > 0,
        homePenalties: sortPenaltiesByStatus(updatePenaltyStatusesOnly([], state.maxConcurrentPenalties)),
        awayPenalties: sortPenaltiesByStatus(updatePenaltyStatusesOnly([], state.maxConcurrentPenalties)),
        homeTeamName: 'Local',
        homeTeamSubName: undefined,
        awayTeamName: 'Visitante',
        awayTeamSubName: undefined,
        periodDisplayOverride: 'Warm-up',
        preTimeoutState: null,
        clockStartTimeMs: (autoStartWarmUp && initialWarmUpDurationCs > 0) ? Date.now() : null,
        remainingTimeAtStartCs: (autoStartWarmUp && initialWarmUpDurationCs > 0) ? initialWarmUpDurationCs : null,
        gameSummary: IN_CODE_INITIAL_GAME_SUMMARY,
      };
      newPlayHornTrigger = state.playHornTrigger;
      break;
    }
    case 'ADD_TEAM': {
      const newTeamWithId: TeamData = {
        ...action.payload,
        id: action.payload.id || crypto.randomUUID(),
        subName: action.payload.subName || undefined,
        players: action.payload.players || [],
      };
      newStateWithoutMeta = {
        ...state,
        teams: [...state.teams, newTeamWithId],
      };
      break;
    }
    case 'UPDATE_TEAM_DETAILS': {
      newStateWithoutMeta = {
        ...state,
        teams: state.teams.map(team =>
          team.id === action.payload.teamId
            ? {
                ...team,
                name: action.payload.name,
                subName: action.payload.subName || undefined,
                category: action.payload.category,
                logoDataUrl: action.payload.logoDataUrl,
              }
            : team
        ),
      };
      break;
    }
    case 'DELETE_TEAM': {
      newStateWithoutMeta = {
        ...state,
        teams: state.teams.filter(team => team.id !== action.payload.teamId),
      };
      break;
    }
    case 'ADD_PLAYER_TO_TEAM': {
      const newPlayer: PlayerData = {
        ...action.payload.player,
        id: crypto.randomUUID(),
      };
      newStateWithoutMeta = {
        ...state,
        teams: state.teams.map(team => {
          if (team.id === action.payload.teamId) {
            if (newPlayer.number && team.players.some(p => p.number === newPlayer.number)) {
              console.warn(`Duplicate player number ${newPlayer.number} for team ${team.name}`);
              return team; 
            }
            return { ...team, players: [...team.players, newPlayer] };
          }
          return team;
        }),
      };
      break;
    }
    case 'UPDATE_PLAYER_IN_TEAM': {
      const { teamId, playerId, updates } = action.payload;
      newStateWithoutMeta = {
        ...state,
        teams: state.teams.map(team => {
          if (team.id === teamId) {
            if (updates.number && team.players.some(p => p.id !== playerId && p.number === updates.number)) {
              console.warn(`Duplicate player number ${updates.number} for team ${team.name} during update`);
              return { 
                ...team,
                players: team.players.map(player =>
                    player.id === playerId ? { ...player, name: updates.name ?? player.name } : player
                )
              };
            }
            return {
              ...team,
              players: team.players.map(player =>
                player.id === playerId
                  ? { ...player, ...updates }
                  : player
              ),
            };
          }
          return team;
        }),
      };
      break;
    }
    case 'REMOVE_PLAYER_FROM_TEAM': {
      newStateWithoutMeta = {
        ...state,
        teams: state.teams.map(team =>
          team.id === action.payload.teamId
            ? { ...team, players: team.players.filter(player => player.id !== action.payload.playerId) }
            : team
        ),
      };
      break;
    }
    case 'LOAD_TEAMS_FROM_FILE':
      const validTeams = action.payload.map(team => ({
        ...team,
        subName: team.subName || undefined,
        category: team.category || (state.availableCategories[0]?.id || '')
      }));
      newStateWithoutMeta = { ...state, teams: validTeams };
      break;
    default:
      const exhaustiveCheck: never = action; 
      newStateWithoutMeta = state;
      newTimestamp = state._lastUpdatedTimestamp || Date.now();
      newPlayHornTrigger = state.playHornTrigger;
      break;
  }

  const nonOriginatingActionTypes: GameAction['type'][] = ['HYDRATE_FROM_STORAGE', 'SET_STATE_FROM_LOCAL_BROADCAST'];
  if (nonOriginatingActionTypes.includes(action.type)) {
    return { ...newStateWithoutMeta, playHornTrigger: newPlayHornTrigger, _lastActionOriginator: undefined, _lastUpdatedTimestamp: (newStateWithoutMeta as GameState)._lastUpdatedTimestamp, _initialConfigLoadComplete: (newStateWithoutMeta as GameState)._initialConfigLoadComplete };
  } else if (action.type === 'TICK' && !state.isClockRunning && !newStateWithoutMeta.isClockRunning) {
    if (state.currentTime === newStateWithoutMeta.currentTime &&
        JSON.stringify(state.homePenalties) === JSON.stringify(newStateWithoutMeta.homePenalties) &&
        JSON.stringify(state.awayPenalties) === JSON.stringify(newStateWithoutMeta.awayPenalties) ) {
        return { ...newStateWithoutMeta, playHornTrigger: newPlayHornTrigger, _lastActionOriginator: state._lastActionOriginator, _lastUpdatedTimestamp: state._lastUpdatedTimestamp, _initialConfigLoadComplete: state._initialConfigLoadComplete };
    }
  }

  return { ...newStateWithoutMeta, playHornTrigger: newPlayHornTrigger, _lastActionOriginator: TAB_ID, _lastUpdatedTimestamp: newTimestamp, _initialConfigLoadComplete: state._initialConfigLoadComplete };
};


export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialGlobalState);
  const [isLoading, setIsLoading] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined') {
        setIsPageVisible(!document.hidden);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      setIsPageVisible(!document.hidden);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || state._initialConfigLoadComplete) {
       if (state._initialConfigLoadComplete && isLoading) setIsLoading(false);
       if (!state._initialConfigLoadComplete && typeof window === 'undefined' && isLoading) setIsLoading(false);
      return;
    }
    

    const fetchConfig = async (customPath: string, defaultPath: string, fallback: any, validator?: (data: any) => boolean) => {
      try {
        const customRes = await fetch(customPath);
        if (customRes.ok) {
          const customData = await customRes.json();
          if (customData && (!validator || validator(customData))) {
            console.log(`Loaded custom config from ${customPath}`);
            return customData;
          } else {
             console.warn(`Custom config ${customPath} is invalid. Trying default.`);
          }
        } else {
          console.log(`Custom config ${customPath} not found (status: ${customRes.status}). Trying default.`);
        }
      } catch (error) {
        console.warn(`Error fetching custom config ${customPath}:`, error, ". Trying default.");
      }

      try {
        const defaultRes = await fetch(defaultPath);
        if (defaultRes.ok) {
          const defaultData = await defaultRes.json();
           if (defaultData && (!validator || validator(defaultData))) {
            console.log(`Loaded default config from ${defaultPath}`);
            return defaultData;
          } else {
             console.warn(`Default config ${defaultPath} is invalid. Using in-code fallback.`);
          }
        } else {
          console.warn(`Default config ${defaultPath} not found (status: ${defaultRes.status}). Using in-code fallback.`);
        }
      } catch (error) {
        console.warn(`Error fetching default config ${defaultPath}:`, error, ". Using in-code fallback.");
      }
      console.log(`Using in-code fallback for ${defaultPath.replace('default-','').replace('.json','')} config.`);
      return fallback;
    };
    
    const loadInitialState = async () => {
      let loadedStateFromLocalStorage: Partial<GameState> | null = null;
      let loadedFromLocalStorageSuccess = false;

      try {
        const rawStoredState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (rawStoredState) {
          const parsedState = JSON.parse(rawStoredState) as Partial<GameState>;
          if (parsedState && parsedState._lastUpdatedTimestamp) { // Check for a meaningful field
            loadedStateFromLocalStorage = parsedState;
            loadedFromLocalStorageSuccess = true;
            console.log("Successfully parsed state from localStorage.");
          } else {
             console.warn("localStorage state seems incomplete or very old. Will proceed to load defaults from files.");
          }
        } else {
          console.log("localStorage is empty. Will load defaults from files.");
        }
      } catch (error) {
        console.error("Error reading state from localStorage:", error, ". Will load defaults from files.");
      }

      if (loadedFromLocalStorageSuccess && loadedStateFromLocalStorage) {
        dispatch({ type: 'HYDRATE_FROM_STORAGE', payload: loadedStateFromLocalStorage });
        setIsLoading(false);
      } else {
        // localStorage is empty or invalid, load from files or fallbacks
        const [
          loadedFormatTimingsProfiles,
          soundDisplayConfig,
          categoriesConfig,
          teamsConfig
        ] = await Promise.all([
          fetchConfig(
            '/defaults/format-timings.custom.json',
            '/defaults/default-format-timings.json',
            initialGlobalState.formatAndTimingsProfiles,
            (data) => Array.isArray(data) && data.length > 0 && data.every(p => p.id && p.name)
          ),
          fetchConfig(
            '/defaults/sound-display.custom.json',
            '/defaults/default-sound-display.json',
            {
              playSoundAtPeriodEnd: initialGlobalState.playSoundAtPeriodEnd,
              customHornSoundDataUrl: initialGlobalState.customHornSoundDataUrl,
              enableTeamSelectionInMiniScoreboard: initialGlobalState.enableTeamSelectionInMiniScoreboard,
              enablePlayerSelectionForPenalties: initialGlobalState.enablePlayerSelectionForPenalties,
              showAliasInPenaltyPlayerSelector: initialGlobalState.showAliasInPenaltyPlayerSelector,
              showAliasInControlsPenaltyList: initialGlobalState.showAliasInControlsPenaltyList,
              showAliasInScoreboardPenalties: initialGlobalState.showAliasInScoreboardPenalties,
              scoreboardLayoutProfiles: initialGlobalState.scoreboardLayoutProfiles,
            }
          ),
          fetchConfig(
            '/defaults/categories.custom.json',
            '/defaults/default-categories.json',
            initialGlobalState.availableCategories,
            (data) => Array.isArray(data)
          ),
          fetchConfig(
            '/defaults/teams.custom.json',
            '/defaults/default-teams.json',
            initialGlobalState.teams,
            (data) => Array.isArray(data)
          )
        ]);

        const initialPayloadForHydration: Partial<GameState> = {
            formatAndTimingsProfiles: loadedFormatTimingsProfiles,
            ...soundDisplayConfig,
            availableCategories: categoriesConfig,
            teams: teamsConfig.map((t: TeamData) => ({...t, subName: t.subName || undefined})),
            _initialConfigLoadComplete: true,
        };
        dispatch({ type: 'HYDRATE_FROM_STORAGE', payload: initialPayloadForHydration });
        setIsLoading(false);
      }
    };

    loadInitialState();

    if ('BroadcastChannel' in window) {
      if (!channelRef.current) {
        channelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      }
      const handleMessage = (event: MessageEvent) => {
          if (event.data && event.data._lastActionOriginator && event.data._lastActionOriginator !== TAB_ID) {
            const receivedState = event.data as GameState;
            dispatch({ type: 'SET_STATE_FROM_LOCAL_BROADCAST', payload: receivedState });
        }
      };
      channelRef.current.addEventListener('message', handleMessage);

      return () => {
        if (channelRef.current) {
          channelRef.current.removeEventListener('message', handleMessage);
        }
      };
    } else {
      console.warn('BroadcastChannel API not available. Multi-tab sync will not work.');
    }
  }, []); 
  
  useEffect(() => { 
    return () => {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, []);


  useEffect(() => {
    if (isLoading || typeof window === 'undefined' || state._lastActionOriginator !== TAB_ID || !state._initialConfigLoadComplete) {
      return;
    }

    try {
      const stateForStorage: GameState = { ...state };
      stateForStorage.homePenalties = cleanPenaltiesForStorage(state.homePenalties);
      stateForStorage.awayPenalties = cleanPenaltiesForStorage(state.awayPenalties);

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateForStorage));

      if (channelRef.current) {
        channelRef.current.postMessage(state);
      }
    } catch (error) {
      console.error("Error saving state to localStorage or broadcasting:", error);
    }
  }, [state, isLoading]);

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    if (state.isClockRunning && isPageVisible && !isLoading && state._initialConfigLoadComplete) {
      timerId = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, TICK_INTERVAL_MS);
    }
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [state.isClockRunning, state.currentTime, state.homePenalties, state.awayPenalties, isPageVisible, isLoading, state._initialConfigLoadComplete]);


  return (
    <GameStateContext.Provider value={{ state, dispatch, isLoading }}>
      {children}
    </GameStateContext.Provider>
  );
};

export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};

export const formatTime = (
  totalCentiseconds: number,
  options: {
    showTenths?: boolean;
    includeMinutesForTenths?: boolean;
  } = {}
): string => {
  if (isNaN(totalCentiseconds) || totalCentiseconds < 0) totalCentiseconds = 0;

  const isUnderMinute = totalCentiseconds < 6000;

  if (isUnderMinute && options.showTenths) {
    const seconds = Math.floor(totalCentiseconds / 100);
    const tenths = Math.floor((totalCentiseconds % 100) / 10);
    if (options.includeMinutesForTenths) {
      return `00:${seconds.toString().padStart(2, '0')}.${tenths.toString()}`;
    } else {
      return `${seconds.toString().padStart(2, '0')}.${tenths.toString()}`;
    }
  } else {
    const totalSecondsOnly = Math.floor(totalCentiseconds / 100);
    const minutes = Math.floor(totalSecondsOnly / 60);
    const seconds = totalSecondsOnly % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
};


export const getActualPeriodText = (period: number, override: PeriodDisplayOverrideType, numberOfRegularPeriods: number): string => {
  if (override === "Time Out") return "TIME OUT";
  if (override === "End of Game") return "END OF GAME";
  if (override) return override;
  return getPeriodText(period, numberOfRegularPeriods);
};

export const getPeriodText = (period: number, numRegPeriods: number): string => {
    if (period === 0) return "WARM-UP";
    if (period < 0) return "---";
    if (period <= numRegPeriods) {
        if (period === 1) return "1ST";
        if (period === 2) return "2ND";
        if (period === 3) return "3RD";
        if (period % 10 === 1 && period % 100 !== 11) return `${period}ST`;
        if (period % 10 === 2 && period % 100 !== 12) return `${period}ND`;
        if (period % 10 === 3 && period % 100 !== 13) return `${period}RD`;
        return `${period}TH`;
    }
    const overtimeNumber = period - numRegPeriods;
    if (overtimeNumber === 1 && numRegPeriods > 0) return 'OT';
    if (overtimeNumber > 0 && numRegPeriods > 0) return `OT${overtimeNumber}`;
    if (overtimeNumber === 1 && numRegPeriods === 0) return 'OT'; 
    if (overtimeNumber > 1 && numRegPeriods === 0) return `OT${overtimeNumber}`; 
    return "---";
};


export const minutesToSeconds = (minutes: number | string): number => {
  const numMinutes = typeof minutes === 'string' ? parseInt(minutes, 10) : minutes;
  if (isNaN(numMinutes) || numMinutes < 0) return 0;
  return numMinutes * 60;
};
export const secondsToMinutes = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "0";
  return Math.floor(seconds / 60).toString();
};

export const centisecondsToDisplaySeconds = (centiseconds: number): string => {
  if (isNaN(centiseconds) || centiseconds < 0) return "0";
  return Math.floor(centiseconds / CENTISECONDS_PER_SECOND).toString();
};
export const centisecondsToDisplayMinutes = (centiseconds: number): string => {
  if (isNaN(centiseconds) || centiseconds < 0) return "0";
  return Math.floor(centiseconds / (60 * CENTISECONDS_PER_SECOND)).toString();
};

export const DEFAULT_SOUND_PATH = DEFAULT_HORN_SOUND_FILE_PATH;

export const getCategoryNameById = (categoryId: string, availableCategories: CategoryData[]): string | undefined => {
  if (!Array.isArray(availableCategories)) return undefined; 
  const category = availableCategories.find(cat => cat && typeof cat === 'object' && cat.id === categoryId);
  return category ? category.name : undefined;
};

export { createDefaultFormatAndTimingsProfile, createDefaultScoreboardLayoutProfile };
