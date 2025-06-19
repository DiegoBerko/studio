
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react';
import type { Penalty, Team, TeamData, PlayerData, CategoryData, ConfigFields, FormatAndTimingsProfile, FormatAndTimingsProfileData } from '@/types';

// --- Constantes para la sincronización local ---
const BROADCAST_CHANNEL_NAME = 'icevision-game-state-channel';
const LOCAL_STORAGE_KEY = 'icevision-game-state';
const CENTISECONDS_PER_SECOND = 100;
const TICK_INTERVAL_MS = 50;
const DEFAULT_HORN_SOUND_FILE_PATH = '/audio/default-horn.wav'; // User needs to place this file

// TAB_ID: Generado una vez por pestaña/contexto del navegador.
let TAB_ID: string;
if (typeof window !== 'undefined') {
  TAB_ID = crypto.randomUUID();
} else {
  TAB_ID = 'server-tab-id-' + Math.random().toString(36).substring(2);
}


// Duraciones por defecto iniciales, se guardarán en centésimas de segundo
const INITIAL_PROFILE_NAME = "Predeterminado"; // Used for the first default profile
const INITIAL_WARM_UP_DURATION = 5 * 60 * CENTISECONDS_PER_SECOND;
const INITIAL_PERIOD_DURATION = 20 * 60 * CENTISECONDS_PER_SECOND;
const INITIAL_OT_PERIOD_DURATION = 5 * 60 * CENTISECONDS_PER_SECOND;
const INITIAL_BREAK_DURATION = 2 * 60 * CENTISECONDS_PER_SECOND;
const INITIAL_PRE_OT_BREAK_DURATION = 60 * CENTISECONDS_PER_SECOND;
const INITIAL_TIMEOUT_DURATION = 30 * CENTISECONDS_PER_SECOND;
const INITIAL_MAX_CONCURRENT_PENALTIES = 2;
const INITIAL_AUTO_START_WARM_UP = true;
const INITIAL_AUTO_START_BREAKS = true;
const INITIAL_AUTO_START_PRE_OT_BREAKS = false;
const INITIAL_AUTO_START_TIMEOUTS = true;
const INITIAL_NUMBER_OF_REGULAR_PERIODS = 2;
const INITIAL_NUMBER_OF_OVERTIME_PERIODS = 0;
const INITIAL_PLAYERS_PER_TEAM_ON_ICE = 5;

// Sound & Display Defaults
const INITIAL_PLAY_SOUND_AT_PERIOD_END = true;
const INITIAL_CUSTOM_HORN_SOUND_DATA_URL = null;
const INITIAL_ENABLE_TEAM_SELECTION_IN_MINI_SCOREBOARD = true;
const INITIAL_ENABLE_PLAYER_SELECTION_FOR_PENALTIES = true;
const INITIAL_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR = true;
const INITIAL_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST = true;
const INITIAL_SHOW_ALIAS_IN_SCOREBOARD_PENALTIES = true;
const INITIAL_IS_MONITOR_MODE_ENABLED = false;

// Category Defaults
const INITIAL_AVAILABLE_CATEGORIES_RAW = ['A', 'B', 'C', 'Menores', 'Damas'];
const INITIAL_AVAILABLE_CATEGORIES: CategoryData[] = INITIAL_AVAILABLE_CATEGORIES_RAW.map(name => ({ id: name, name: name }));
const INITIAL_SELECTED_MATCH_CATEGORY = INITIAL_AVAILABLE_CATEGORIES[0]?.id || '';


const createDefaultFormatAndTimingsProfile = (id?: string, name?: string): FormatAndTimingsProfile => ({
  id: id || crypto.randomUUID(),
  name: name || INITIAL_PROFILE_NAME,
  defaultWarmUpDuration: INITIAL_WARM_UP_DURATION,
  defaultPeriodDuration: INITIAL_PERIOD_DURATION,
  defaultOTPeriodDuration: INITIAL_OT_PERIOD_DURATION,
  defaultBreakDuration: INITIAL_BREAK_DURATION,
  defaultPreOTBreakDuration: INITIAL_PRE_OT_BREAK_DURATION,
  defaultTimeoutDuration: INITIAL_TIMEOUT_DURATION,
  maxConcurrentPenalties: INITIAL_MAX_CONCURRENT_PENALTIES,
  autoStartWarmUp: INITIAL_AUTO_START_WARM_UP,
  autoStartBreaks: INITIAL_AUTO_START_BREAKS,
  autoStartPreOTBreaks: INITIAL_AUTO_START_PRE_OT_BREAKS,
  autoStartTimeouts: INITIAL_AUTO_START_TIMEOUTS,
  numberOfRegularPeriods: INITIAL_NUMBER_OF_REGULAR_PERIODS,
  numberOfOvertimePeriods: INITIAL_NUMBER_OF_OVERTIME_PERIODS,
  playersPerTeamOnIce: INITIAL_PLAYERS_PER_TEAM_ON_ICE,
});


type PeriodDisplayOverrideType = "Warm-up" | "Break" | "Pre-OT Break" | "Time Out" | "End of Game" | null;

interface PreTimeoutState {
  period: number;
  time: number; // Stored in centiseconds
  isClockRunning: boolean;
  override: PeriodDisplayOverrideType;
  clockStartTimeMs: number | null;
  remainingTimeAtStartCs: number | null; // Stored in centiseconds
}

interface GameState extends ConfigFields {
  homeScore: number;
  awayScore: number;
  currentTime: number; // in centiseconds
  currentPeriod: number; // 0 for Warm-up, 1-N for regular, N+ for OT
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
  remainingTimeAtStartCs: number | null; // in centiseconds
  playHornTrigger: number; // Increments to trigger sound effect
  teams: TeamData[];
  formatAndTimingsProfiles: FormatAndTimingsProfile[];
  selectedFormatAndTimingsProfileId: string | null;
  _lastActionOriginator?: string;
  _lastUpdatedTimestamp?: number;
}

export type GameAction =
  | { type: 'TOGGLE_CLOCK' }
  | { type: 'SET_TIME'; payload: { minutes: number; seconds: number } }
  | { type: 'ADJUST_TIME'; payload: number }
  | { type: 'SET_PERIOD'; payload: number }
  | { type: 'RESET_PERIOD_CLOCK' }
  | { type: 'SET_SCORE'; payload: { team: Team; score: number } }
  | { type: 'ADJUST_SCORE'; payload: { team: Team; delta: number } }
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
  // Format & Timings Profile Actions
  | { type: 'ADD_FORMAT_AND_TIMINGS_PROFILE'; payload: { name: string; profileData?: Partial<FormatAndTimingsProfileData> } }
  | { type: 'UPDATE_FORMAT_AND_TIMINGS_PROFILE_DATA'; payload: { profileId: string; updates: Partial<FormatAndTimingsProfileData> } }
  | { type: 'UPDATE_FORMAT_AND_TIMINGS_PROFILE_NAME'; payload: { profileId: string; newName: string } }
  | { type: 'DELETE_FORMAT_AND_TIMINGS_PROFILE'; payload: { profileId: string } }
  | { type: 'SELECT_FORMAT_AND_TIMINGS_PROFILE'; payload: { profileId: string | null } }
  | { type: 'LOAD_FORMAT_AND_TIMINGS_PROFILES'; payload: FormatAndTimingsProfile[] } // Replaces LOAD_FORMAT_AND_TIMINGS_CONFIG
  // Actions for individual fields (will now also update selected profile)
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
  // Sound & Display Actions
  | { type: 'SET_PLAY_SOUND_AT_PERIOD_END'; payload: boolean }
  | { type: 'SET_CUSTOM_HORN_SOUND_DATA_URL'; payload: string | null }
  | { type: 'SET_ENABLE_TEAM_SELECTION_IN_MINI_SCOREBOARD'; payload: boolean }
  | { type: 'SET_ENABLE_PLAYER_SELECTION_FOR_PENALTIES'; payload: boolean }
  | { type: 'SET_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR'; payload: boolean }
  | { type: 'SET_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST'; payload: boolean }
  | { type: 'SET_SHOW_ALIAS_IN_SCOREBOARD_PENALTIES'; payload: boolean }
  | { type: 'SET_MONITOR_MODE_ENABLED'; payload: boolean }
  | { type: 'LOAD_SOUND_AND_DISPLAY_CONFIG'; payload: Partial<ConfigFields> }
  // Category Actions
  | { type: 'SET_AVAILABLE_CATEGORIES'; payload: CategoryData[] }
  | { type: 'SET_SELECTED_MATCH_CATEGORY'; payload: string }
  // General State Actions
  | { type: 'HYDRATE_FROM_STORAGE'; payload: Partial<GameState> }
  | { type: 'SET_STATE_FROM_LOCAL_BROADCAST'; payload: GameState }
  | { type: 'RESET_CONFIG_TO_DEFAULTS' } // Will now reset current profile to defaults, and other sections
  | { type: 'RESET_GAME_STATE' }
  // Team Actions
  | { type: 'ADD_TEAM'; payload: Omit<TeamData, 'players'> & { id: string; players: PlayerData[] } }
  | { type: 'UPDATE_TEAM_DETAILS'; payload: { teamId: string; name: string; subName?: string; category: string; logoDataUrl?: string | null } }
  | { type: 'DELETE_TEAM'; payload: { teamId: string } }
  | { type: 'ADD_PLAYER_TO_TEAM'; payload: { teamId: string; player: Omit<PlayerData, 'id'> } }
  | { type: 'UPDATE_PLAYER_IN_TEAM'; payload: { teamId: string; playerId: string; updates: Partial<Pick<PlayerData, 'name' | 'number'>> } }
  | { type: 'REMOVE_PLAYER_FROM_TEAM'; payload: { teamId: string; playerId: string } }
  | { type: 'LOAD_TEAMS_FROM_FILE'; payload: TeamData[] };


const defaultInitialProfile = createDefaultFormatAndTimingsProfile();

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
  // Format & Timings - reflects selected profile
  defaultWarmUpDuration: defaultInitialProfile.defaultWarmUpDuration,
  defaultPeriodDuration: defaultInitialProfile.defaultPeriodDuration,
  defaultOTPeriodDuration: defaultInitialProfile.defaultOTPeriodDuration,
  defaultBreakDuration: defaultInitialProfile.defaultBreakDuration,
  defaultPreOTBreakDuration: defaultInitialProfile.defaultPreOTBreakDuration,
  defaultTimeoutDuration: defaultInitialProfile.defaultTimeoutDuration,
  maxConcurrentPenalties: defaultInitialProfile.maxConcurrentPenalties,
  autoStartWarmUp: defaultInitialProfile.autoStartWarmUp,
  autoStartBreaks: defaultInitialProfile.autoStartBreaks,
  autoStartPreOTBreaks: defaultInitialProfile.autoStartPreOTBreaks,
  autoStartTimeouts: defaultInitialProfile.autoStartTimeouts,
  numberOfRegularPeriods: defaultInitialProfile.numberOfRegularPeriods,
  numberOfOvertimePeriods: defaultInitialProfile.numberOfOvertimePeriods,
  playersPerTeamOnIce: defaultInitialProfile.playersPerTeamOnIce,
  // Format & Timings Profiles
  formatAndTimingsProfiles: [defaultInitialProfile],
  selectedFormatAndTimingsProfileId: defaultInitialProfile.id,
  // Sound & Display
  playSoundAtPeriodEnd: INITIAL_PLAY_SOUND_AT_PERIOD_END,
  customHornSoundDataUrl: INITIAL_CUSTOM_HORN_SOUND_DATA_URL,
  enableTeamSelectionInMiniScoreboard: INITIAL_ENABLE_TEAM_SELECTION_IN_MINI_SCOREBOARD,
  enablePlayerSelectionForPenalties: INITIAL_ENABLE_PLAYER_SELECTION_FOR_PENALTIES,
  showAliasInPenaltyPlayerSelector: INITIAL_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR,
  showAliasInControlsPenaltyList: INITIAL_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST,
  showAliasInScoreboardPenalties: INITIAL_SHOW_ALIAS_IN_SCOREBOARD_PENALTIES,
  isMonitorModeEnabled: INITIAL_IS_MONITOR_MODE_ENABLED,
  // Categories
  availableCategories: INITIAL_AVAILABLE_CATEGORIES,
  selectedMatchCategory: INITIAL_SELECTED_MATCH_CATEGORY,
  // Game Runtime State
  preTimeoutState: null,
  clockStartTimeMs: null,
  remainingTimeAtStartCs: null,
  playHornTrigger: 0,
  teams: [],
  _lastActionOriginator: undefined,
  _lastUpdatedTimestamp: undefined,
};

const GameStateContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isLoading: boolean;
} | undefined>(undefined);


// Helper function for automatic transitions, placed outside the reducer
const handleAutoTransition = (currentState: GameState): GameState => {
  let newGameStateAfterTransition: GameState = { ...currentState };
  const numRegPeriods = currentState.numberOfRegularPeriods;
  const totalGamePeriods = numRegPeriods + currentState.numberOfOvertimePeriods;
  let shouldTriggerHorn = true;

  // Preserve penalties from current state for the new state
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
      // Should not happen if timeout was started correctly, but as a fallback:
      newGameStateAfterTransition.currentTime = currentState.currentTime;
      newGameStateAfterTransition.isClockRunning = false;
      newGameStateAfterTransition.periodDisplayOverride = currentState.periodDisplayOverride; // Keep as Time Out
    }
  } else if (currentState.periodDisplayOverride === null) { // Active game period just ended
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
    } else if (currentState.currentPeriod >= totalGamePeriods) { // Game ended
      newGameStateAfterTransition.currentTime = 0;
      newGameStateAfterTransition.isClockRunning = false;
      newGameStateAfterTransition.periodDisplayOverride = "End of Game";
    } else {
      // Safety: game ends if no OT configured after regular periods
      newGameStateAfterTransition.currentTime = 0;
      newGameStateAfterTransition.isClockRunning = false;
      newGameStateAfterTransition.periodDisplayOverride = "End of Game";
    }
  } else {
    // If already 'End of Game' or other unexpected override, don't change further
    newGameStateAfterTransition.currentTime = 0;
    newGameStateAfterTransition.isClockRunning = false;
    shouldTriggerHorn = false; // Don't re-trigger horn if already ended or in unexpected state
  }

  if (!newGameStateAfterTransition.isClockRunning) {
    newGameStateAfterTransition.clockStartTimeMs = null;
    newGameStateAfterTransition.remainingTimeAtStartCs = null;
  }

  newGameStateAfterTransition.playHornTrigger = shouldTriggerHorn
    ? currentState.playHornTrigger + 1
    : currentState.playHornTrigger;

  // Strip meta fields before returning, TICK reducer will add them
  const { _lastActionOriginator, _lastUpdatedTimestamp, ...returnState } = newGameStateAfterTransition;
  return returnState;
};


const updatePenaltyStatusesOnly = (penalties: Penalty[], maxConcurrent: number): Penalty[] => {
  const newPenalties: Penalty[] = [];
  const activePlayerTickets: Set<string> = new Set();
  let concurrentRunningCount = 0;

  for (const p of penalties) {
    if (p._status === 'pending_puck') {
      newPenalties.push({ ...p });
      continue;
    }
    if (p.remainingTime <= 0) { 
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


const applyProfileToState = (state: GameState, profileId: string | null): GameState => {
  const profileToApply = state.formatAndTimingsProfiles.find(p => p.id === profileId) || state.formatAndTimingsProfiles[0] || createDefaultFormatAndTimingsProfile();
  if (!profileToApply) return state; // Should not happen if profiles always exist

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


const gameReducer = (state: GameState, action: GameAction): GameState => {
  let newStateWithoutMeta: Omit<GameState, '_lastActionOriginator' | '_lastUpdatedTimestamp' | 'playHornTrigger'>;
  let newPlayHornTrigger = state.playHornTrigger;
  let newTimestamp = Date.now();
  let tempState = { ...state }; // For multi-step operations before final state assignment

  switch (action.type) {
    case 'HYDRATE_FROM_STORAGE': {
      const hydratedBasePartial: Partial<GameState> = {
        ...(action.payload ?? {}),
      };
      
      let hydratedProfiles = action.payload?.formatAndTimingsProfiles;
      if (!hydratedProfiles || hydratedProfiles.length === 0) {
        hydratedProfiles = [createDefaultFormatAndTimingsProfile()];
      }
      
      let hydratedSelectedProfileId = action.payload?.selectedFormatAndTimingsProfileId;
      if (!hydratedSelectedProfileId || !hydratedProfiles.find(p => p.id === hydratedSelectedProfileId)) {
        hydratedSelectedProfileId = hydratedProfiles[0].id;
      }

      const selectedProfileValues = hydratedProfiles.find(p => p.id === hydratedSelectedProfileId) || hydratedProfiles[0];

      let hydratedCategories: CategoryData[];
      const storedCategories = action.payload?.availableCategories;

      if (Array.isArray(storedCategories) && storedCategories.length > 0) {
        if (typeof storedCategories[0] === 'string') {
          hydratedCategories = (storedCategories as string[]).map(name => ({ id: name, name: name }));
        } else if (typeof storedCategories[0] === 'object' && storedCategories[0] !== null && 'id' in storedCategories[0] && 'name' in storedCategories[0]) {
          hydratedCategories = storedCategories as CategoryData[];
        } else {
          hydratedCategories = initialGlobalState.availableCategories;
        }
      } else {
        hydratedCategories = initialGlobalState.availableCategories;
      }
      
      const hydratedBase: GameState = {
        ...initialGlobalState, // Start with system defaults for non-profile/non-core fields
        ...selectedProfileValues, // Apply selected profile's F&T settings
        ...hydratedBasePartial, // Override with anything explicitly in payload
        formatAndTimingsProfiles: hydratedProfiles,
        selectedFormatAndTimingsProfileId: hydratedSelectedProfileId,
        availableCategories: hydratedCategories, 
        teams: (action.payload?.teams || initialGlobalState.teams).map(t => ({...t, subName: t.subName || undefined })), 
        playHornTrigger: initialGlobalState.playHornTrigger, 
        homeTeamSubName: action.payload?.homeTeamSubName,
        awayTeamSubName: action.payload?.awayTeamSubName,
        isMonitorModeEnabled: action.payload?.isMonitorModeEnabled ?? initialGlobalState.isMonitorModeEnabled,
      };
      
      if (!hydratedBase.availableCategories.find(c => c.id === hydratedBase.selectedMatchCategory) && hydratedBase.availableCategories.length > 0) {
        hydratedBase.selectedMatchCategory = hydratedBase.availableCategories[0].id;
      } else if (hydratedBase.availableCategories.length === 0) {
        hydratedBase.selectedMatchCategory = ''; 
      }

      hydratedBase.isClockRunning = false;
      hydratedBase.clockStartTimeMs = null;
      hydratedBase.remainingTimeAtStartCs = null;

      const rawHomePenaltiesFromStorage = action.payload?.homePenalties || [];
      const rawAwayPenaltiesFromStorage = action.payload?.awayPenalties || [];

      hydratedBase.homePenalties = sortPenaltiesByStatus(
        updatePenaltyStatusesOnly(rawHomePenaltiesFromStorage as Penalty[], hydratedBase.maxConcurrentPenalties)
      );
      hydratedBase.awayPenalties = sortPenaltiesByStatus(
        updatePenaltyStatusesOnly(rawAwayPenaltiesFromStorage as Penalty[], hydratedBase.maxConcurrentPenalties)
      );

      let initialHydratedTimeCs: number;
      const hydratedPeriod = hydratedBase.currentPeriod ?? initialGlobalState.currentPeriod;
      
      if (hydratedBase.periodDisplayOverride === 'Warm-up' || (hydratedPeriod === 0 && hydratedBase.periodDisplayOverride === null) ) {
        initialHydratedTimeCs = hydratedBase.defaultWarmUpDuration;
        hydratedBase.periodDisplayOverride = 'Warm-up';
        hydratedBase.currentPeriod = 0;
      } else if (hydratedBase.periodDisplayOverride === 'Break') {
        initialHydratedTimeCs = hydratedBase.defaultBreakDuration;
      } else if (hydratedBase.periodDisplayOverride === 'Pre-OT Break') {
         initialHydratedTimeCs = hydratedBase.defaultPreOTBreakDuration;
      } else if (hydratedBase.periodDisplayOverride === 'Time Out') {
         if (hydratedBase.preTimeoutState) {
            initialHydratedTimeCs = hydratedBase.defaultTimeoutDuration;
         } else {
            initialHydratedTimeCs = hydratedBase.defaultTimeoutDuration;
         }
      } else if (hydratedBase.periodDisplayOverride === 'End of Game') {
        initialHydratedTimeCs = 0; 
      } else if (hydratedPeriod > hydratedBase.numberOfRegularPeriods) {
        initialHydratedTimeCs = hydratedBase.defaultOTPeriodDuration;
        hydratedBase.periodDisplayOverride = null;
      } else {
        initialHydratedTimeCs = hydratedBase.defaultPeriodDuration;
        hydratedBase.periodDisplayOverride = null;
      }

      if(action.payload?.currentTime === undefined || action.payload.currentTime === null || action.payload.currentTime < 0 || action.payload.currentTime > initialHydratedTimeCs ) {
          hydratedBase.currentTime = initialHydratedTimeCs;
      } else {
          hydratedBase.currentTime = action.payload.currentTime;
      }

      if(hydratedBase.currentTime <=0 && hydratedBase.periodDisplayOverride !== 'Time Out' && !(hydratedBase.periodDisplayOverride === null && hydratedBase.currentPeriod === 0)) {
        hydratedBase.isClockRunning = false;
      } else if (hydratedBase.periodDisplayOverride === 'Time Out' && hydratedBase.currentTime <= 0) {
        hydratedBase.isClockRunning = false;
      } else if (hydratedBase.periodDisplayOverride === 'End of Game') {
        hydratedBase.isClockRunning = false;
        hydratedBase.currentTime = 0;
      }

      if (!hydratedBase.enableTeamSelectionInMiniScoreboard) {
        hydratedBase.enablePlayerSelectionForPenalties = false;
        hydratedBase.showAliasInPenaltyPlayerSelector = false;
        hydratedBase.showAliasInControlsPenaltyList = false;
        hydratedBase.showAliasInScoreboardPenalties = false;
      }

      const { _lastActionOriginator, _lastUpdatedTimestamp, playHornTrigger: hydratedHornTrigger, ...restOfHydrated } = hydratedBase;
      newStateWithoutMeta = restOfHydrated;
      return { ...newStateWithoutMeta, playHornTrigger: state.playHornTrigger, _lastActionOriginator: undefined, _lastUpdatedTimestamp: action.payload?._lastUpdatedTimestamp };
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

      const { _lastActionOriginator, playHornTrigger: receivedPlayHornTrigger, ...restOfPayload } = action.payload;
      newStateWithoutMeta = restOfPayload;
      newPlayHornTrigger = receivedPlayHornTrigger !== state.playHornTrigger ? receivedPlayHornTrigger : state.playHornTrigger;
      return { ...newStateWithoutMeta, playHornTrigger: newPlayHornTrigger, _lastActionOriginator: undefined, _lastUpdatedTimestamp: incomingTimestamp };
    }
    case 'TOGGLE_CLOCK': {
      let newCurrentTimeCs = state.currentTime;
      let newIsClockRunning = state.isClockRunning;
      let newClockStartTimeMs = state.clockStartTimeMs;
      let newRemainingTimeAtStartCs = state.remainingTimeAtStartCs;

      if (state.periodDisplayOverride === "End of Game") {
        newStateWithoutMeta = state; // No clock changes if game ended
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
    case 'SET_SCORE':
      newStateWithoutMeta = { ...state, [`${action.payload.team}Score`]: Math.max(0, action.payload.score) };
      break;
    case 'ADJUST_SCORE': {
      const currentScore = state[`${action.payload.team}Score`];
      newStateWithoutMeta = { ...state, [`${action.payload.team}Score`]: Math.max(0, currentScore + action.payload.delta) };
      break;
    }
    case 'ADD_PENALTY': {
      const newPenalty: Penalty = {
        ...action.payload.penalty,
        initialDuration: action.payload.penalty.initialDuration,
        remainingTime: action.payload.penalty.remainingTime,
        id: (typeof window !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).slice(2)),
        _status: 'pending_puck', 
      };
      let penalties = [...state[`${action.payload.team}Penalties`], newPenalty];
      penalties = updatePenaltyStatusesOnly(penalties, state.maxConcurrentPenalties);
      penalties = sortPenaltiesByStatus(penalties);
      newStateWithoutMeta = { ...state, [`${action.payload.team}Penalties`]: penalties };
      break;
    }
    case 'REMOVE_PENALTY': {
      let penalties = state[`${action.payload.team}Penalties`].filter(p => p.id !== action.payload.penaltyId);
      penalties = updatePenaltyStatusesOnly(penalties, state.maxConcurrentPenalties);
      penalties = sortPenaltiesByStatus(penalties);
      newStateWithoutMeta = { ...state, [`${action.payload.team}Penalties`]: penalties };
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
      let homePenaltiesResult = state.homePenalties;
      let awayPenaltiesResult = state.awayPenalties;

      if (state.isClockRunning && state.clockStartTimeMs && state.remainingTimeAtStartCs !== null) {
        const elapsedMs = Date.now() - state.clockStartTimeMs;
        const elapsedCs = Math.floor(elapsedMs / 10);
        newCalculatedTimeCs = Math.max(0, state.remainingTimeAtStartCs - elapsedCs);

        
        const gameClockWasTickingForPenalties =
          state.periodDisplayOverride === null &&
          state.currentPeriod > 0;

        if (gameClockWasTickingForPenalties) {
          const oldSecondBoundary = Math.floor(state.currentTime / CENTISECONDS_PER_SECOND);
          const newSecondBoundary = Math.floor(newCalculatedTimeCs / CENTISECONDS_PER_SECOND);

          if (newSecondBoundary < oldSecondBoundary) { 
            const decrementRunningPenalties = (penalties: Penalty[]): Penalty[] => {
              return penalties.map(p => {
                if (p._status === 'running' && p.remainingTime > 0) {
                  return { ...p, remainingTime: Math.max(0, p.remainingTime - 1) };
                }
                return p;
              });
            };
            homePenaltiesResult = decrementRunningPenalties(state.homePenalties);
            awayPenaltiesResult = decrementRunningPenalties(state.awayPenalties);
          } else {
            homePenaltiesResult = state.homePenalties;
            awayPenaltiesResult = state.awayPenalties;
          }
        } else {
          homePenaltiesResult = state.homePenalties;
          awayPenaltiesResult = state.awayPenalties;
        }
      } else if (state.isClockRunning && state.currentTime <= 0) {
         newCalculatedTimeCs = 0;
         homePenaltiesResult = state.homePenalties;
         awayPenaltiesResult = state.awayPenalties;
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
    // Format & Timings Profile Actions
    case 'ADD_FORMAT_AND_TIMINGS_PROFILE': {
      const newProfile = createDefaultFormatAndTimingsProfile(crypto.randomUUID(), action.payload.name);
      if (action.payload.profileData) {
        Object.assign(newProfile, action.payload.profileData);
      }
      const newProfiles = [...state.formatAndTimingsProfiles, newProfile];
      tempState = { ...state, formatAndTimingsProfiles: newProfiles };
      newStateWithoutMeta = applyProfileToState(tempState, newProfile.id);
      break;
    }
    case 'UPDATE_FORMAT_AND_TIMINGS_PROFILE_DATA': {
      const { profileId, updates } = action.payload;
      const newProfiles = state.formatAndTimingsProfiles.map(p =>
        p.id === profileId ? { ...p, ...updates } : p
      );
      tempState = { ...state, formatAndTimingsProfiles: newProfiles };
      if (state.selectedFormatAndTimingsProfileId === profileId) {
        newStateWithoutMeta = applyProfileToState(tempState, profileId);
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
      newStateWithoutMeta = applyProfileToState(tempState, newSelectedId);
      break;
    }
    case 'SELECT_FORMAT_AND_TIMINGS_PROFILE': {
      newStateWithoutMeta = applyProfileToState(state, action.payload.profileId);
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
      newStateWithoutMeta = applyProfileToState(tempState, newSelectedId);
      break;
    }
    // Field-specific setters now update the selected profile and root state
    // Example for one field, others follow the same pattern
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
    // Add similar cases for all other FormatAndTimingsProfileData fields
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
    // Sound & Display Actions
    case 'SET_PLAY_SOUND_AT_PERIOD_END':
      newStateWithoutMeta = { ...state, playSoundAtPeriodEnd: action.payload };
      break;
    case 'SET_CUSTOM_HORN_SOUND_DATA_URL':
      newStateWithoutMeta = { ...state, customHornSoundDataUrl: action.payload };
      break;
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
    case 'SET_MONITOR_MODE_ENABLED':
      newStateWithoutMeta = { ...state, isMonitorModeEnabled: action.payload };
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
        newStateWithoutMeta = {
            ...state,
            playSoundAtPeriodEnd: config.playSoundAtPeriodEnd ?? state.playSoundAtPeriodEnd,
            customHornSoundDataUrl: config.customHornSoundDataUrl === undefined ? state.customHornSoundDataUrl : config.customHornSoundDataUrl,
            enableTeamSelectionInMiniScoreboard: enableTeamUsage,
            enablePlayerSelectionForPenalties: enablePlayerSelection,
            showAliasInPenaltyPlayerSelector: showAliasInSelector,
            showAliasInControlsPenaltyList: showAliasInControls,
            showAliasInScoreboardPenalties: showAliasInScoreboard,
            isMonitorModeEnabled: config.isMonitorModeEnabled ?? state.isMonitorModeEnabled,
        };
        break;
    }
    case 'SET_AVAILABLE_CATEGORIES':
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
      const defaultProfileData = createDefaultFormatAndTimingsProfile();
      let updatedProfiles = state.formatAndTimingsProfiles;
      let selectedProfileId = state.selectedFormatAndTimingsProfileId;

      if (selectedProfileId) {
        updatedProfiles = state.formatAndTimingsProfiles.map(p =>
          p.id === selectedProfileId ? { ...defaultProfileData, id: p.id, name: p.name } : p
        );
      } else if (state.formatAndTimingsProfiles.length > 0) {
         selectedProfileId = state.formatAndTimingsProfiles[0].id;
         updatedProfiles = state.formatAndTimingsProfiles.map(p =>
            p.id === selectedProfileId ? { ...defaultProfileData, id: p.id, name: p.name } : p
         );
      } else {
        const newDefaultProfile = createDefaultFormatAndTimingsProfile();
        updatedProfiles = [newDefaultProfile];
        selectedProfileId = newDefaultProfile.id;
      }
      
      tempState = {
        ...state,
        // Reset F&T section to selected profile's (now default) values
        ... (updatedProfiles.find(p => p.id === selectedProfileId) || defaultProfileData),
        formatAndTimingsProfiles: updatedProfiles,
        selectedFormatAndTimingsProfileId: selectedProfileId,
        // Reset Sound & Display section
        playSoundAtPeriodEnd: INITIAL_PLAY_SOUND_AT_PERIOD_END,
        customHornSoundDataUrl: INITIAL_CUSTOM_HORN_SOUND_DATA_URL,
        enableTeamSelectionInMiniScoreboard: INITIAL_ENABLE_TEAM_SELECTION_IN_MINI_SCOREBOARD,
        enablePlayerSelectionForPenalties: INITIAL_ENABLE_PLAYER_SELECTION_FOR_PENALTIES,
        showAliasInPenaltyPlayerSelector: INITIAL_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR,
        showAliasInControlsPenaltyList: INITIAL_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST,
        showAliasInScoreboardPenalties: INITIAL_SHOW_ALIAS_IN_SCOREBOARD_PENALTIES,
        isMonitorModeEnabled: INITIAL_IS_MONITOR_MODE_ENABLED,
        // Reset Categories section
        availableCategories: INITIAL_AVAILABLE_CATEGORIES,
        selectedMatchCategory: INITIAL_SELECTED_MATCH_CATEGORY,
      };
      const newMaxPen = tempState.maxConcurrentPenalties;
      tempState.homePenalties = sortPenaltiesByStatus(updatePenaltyStatusesOnly(state.homePenalties, newMaxPen));
      tempState.awayPenalties = sortPenaltiesByStatus(updatePenaltyStatusesOnly(state.awayPenalties, newMaxPen));
      newStateWithoutMeta = tempState;
      break;
    }
    case 'RESET_GAME_STATE': {
      const { _lastActionOriginator, _lastUpdatedTimestamp, playHornTrigger: initialHornTrigger, teams: currentTeams, ...initialsToKeepConfigAndTeams } = initialGlobalState;

      const activeProfileId = state.selectedFormatAndTimingsProfileId;
      const activeProfile = state.formatAndTimingsProfiles.find(p => p.id === activeProfileId) || state.formatAndTimingsProfiles[0] || defaultInitialProfile;
      
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
            // Check for duplicate number only if number is provided
            if (newPlayer.number && team.players.some(p => p.number === newPlayer.number)) {
              // Optionally, show a toast or handle error here instead of silently not adding
              console.warn(`Duplicate player number ${newPlayer.number} for team ${team.name}`);
              return team; // Return team unchanged
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
            // Check for duplicate number only if number is being updated and is provided
            if (updates.number && team.players.some(p => p.id !== playerId && p.number === updates.number)) {
              console.warn(`Duplicate player number ${updates.number} for team ${team.name} during update`);
              return { // Return team with player unchanged regarding number if duplicate
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
      // Ensure newStateWithoutMeta is always assigned by falling back to current state
      // This handles unlisted actions or if a specific field setter wasn't matched above
      const exhaustiveCheck: never = action; // Should cause a type error if a case is missed
      newStateWithoutMeta = state;
      newTimestamp = state._lastUpdatedTimestamp || Date.now();
      newPlayHornTrigger = state.playHornTrigger;
      break;
  }

  const nonOriginatingActionTypes: GameAction['type'][] = ['HYDRATE_FROM_STORAGE', 'SET_STATE_FROM_LOCAL_BROADCAST'];
  if (nonOriginatingActionTypes.includes(action.type)) {
    return { ...newStateWithoutMeta, playHornTrigger: newPlayHornTrigger, _lastActionOriginator: undefined, _lastUpdatedTimestamp: (newStateWithoutMeta as GameState)._lastUpdatedTimestamp };
  } else if (action.type === 'TICK' && !state.isClockRunning && !newStateWithoutMeta.isClockRunning) {
    if (state.currentTime === newStateWithoutMeta.currentTime &&
        JSON.stringify(state.homePenalties) === JSON.stringify(newStateWithoutMeta.homePenalties) &&
        JSON.stringify(state.awayPenalties) === JSON.stringify(newStateWithoutMeta.awayPenalties) ) {
        return { ...newStateWithoutMeta, playHornTrigger: newPlayHornTrigger, _lastActionOriginator: state._lastActionOriginator, _lastUpdatedTimestamp: state._lastUpdatedTimestamp };
    }
  }

  return { ...newStateWithoutMeta, playHornTrigger: newPlayHornTrigger, _lastActionOriginator: TAB_ID, _lastUpdatedTimestamp: newTimestamp };
};


export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialGlobalState);
  const [isLoading, setIsLoading] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const hasHydratedRef = useRef(false);
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
    if (typeof window === 'undefined' || hasHydratedRef.current) {
      if (!hasHydratedRef.current && typeof window === 'undefined') setIsLoading(false);
      return;
    }
    hasHydratedRef.current = true;

    const loadInitialState = async () => {
      let finalPayloadForHydration: Partial<GameState> = {};
      let loadedFromLocalStorage = false;

      try {
        const rawStoredState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (rawStoredState) {
          const parsedState = JSON.parse(rawStoredState) as Partial<GameState>;
           // Check for a meaningful field
          if (parsedState && parsedState.formatAndTimingsProfiles && parsedState.formatAndTimingsProfiles.length > 0 && parsedState._lastUpdatedTimestamp) {
            finalPayloadForHydration = { ...parsedState };
            loadedFromLocalStorage = true;
            console.log("Loaded state from localStorage.");
          } else {
            console.warn("localStorage state seems incomplete or very old. Will attempt to load from default files.");
          }
        }
      } catch (error) {
        console.error("Error reading state from localStorage:", error);
      }

      if (!loadedFromLocalStorage) {
        console.log("localStorage is empty or invalid. Attempting to load defaults from files...");
        let formatTimingsProfilesFromFile: FormatAndTimingsProfile[] | null = null;
        let soundDisplayConfigFromFile: Partial<ConfigFields> | null = null;
        let teamsFromFile: TeamData[] | null = null;

        try {
          const ftRes = await fetch('/defaults/default-format-timings.json');
          if (ftRes.ok) {
            const ftProfiles = await ftRes.json();
            if (Array.isArray(ftProfiles) && ftProfiles.length > 0) {
                 formatTimingsProfilesFromFile = ftProfiles;
                 console.log("Loaded default format-timings profiles from file.");
            } else {
                console.warn("Default format-timings.json is not a valid array or is empty.");
            }
          } else {
             console.warn(`Default format-timings file '/defaults/default-format-timings.json' not found (status: ${ftRes.status}) or failed to load.`);
          }
        } catch (error) {
            console.error('Error fetching default-format-timings.json:', error);
        }

        try {
          const sdRes = await fetch('/defaults/default-sound-display.json');
          if (sdRes.ok) {
            const sdConfig = await sdRes.json();
            if (sdConfig) soundDisplayConfigFromFile = sdConfig;
            console.log("Loaded default sound-display config from file.");
          } else {
            console.warn(`Default sound-display file '/defaults/default-sound-display.json' not found (status: ${sdRes.status}) or failed to load.`);
          }
        } catch (error) {
             console.error('Error fetching default-sound-display.json:', error);
        }
        
        try {
          const teamsRes = await fetch('/defaults/default-teams.json');
          if (teamsRes.ok) {
            teamsFromFile = await teamsRes.json();
            console.log("Loaded default teams from file.");
          } else {
            console.warn(`Default teams file '/defaults/default-teams.json' not found (status: ${teamsRes.status}) or failed to load. Using system defaults for teams.`);
          }
        } catch (error) {
          console.error('Error fetching default-teams.json:', error);
        }
        
        finalPayloadForHydration = { ...initialGlobalState }; 

        if (formatTimingsProfilesFromFile) {
            finalPayloadForHydration.formatAndTimingsProfiles = formatTimingsProfilesFromFile;
            finalPayloadForHydration.selectedFormatAndTimingsProfileId = formatTimingsProfilesFromFile[0].id;
            // Apply the first profile's data to root state
            const firstProfile = formatTimingsProfilesFromFile[0];
            Object.assign(finalPayloadForHydration, firstProfile);
        }
        if (soundDisplayConfigFromFile) {
          finalPayloadForHydration = { ...finalPayloadForHydration, ...soundDisplayConfigFromFile };
        }
        if (teamsFromFile) {
          finalPayloadForHydration.teams = teamsFromFile.map(t => ({...t, subName: t.subName || undefined}));
        }
        
        if (!finalPayloadForHydration.availableCategories || finalPayloadForHydration.availableCategories.length === 0) {
            finalPayloadForHydration.availableCategories = initialGlobalState.availableCategories;
            finalPayloadForHydration.selectedMatchCategory = initialGlobalState.selectedMatchCategory;
        }

        delete finalPayloadForHydration._lastUpdatedTimestamp;
      }
      
      dispatch({ type: 'HYDRATE_FROM_STORAGE', payload: finalPayloadForHydration });
      setIsLoading(false);
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
    if (isLoading || typeof window === 'undefined' || state._lastActionOriginator !== TAB_ID) {
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
    if (state.isClockRunning && isPageVisible) {
      timerId = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, TICK_INTERVAL_MS);
    }
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [state.isClockRunning, state.clockStartTimeMs, state.remainingTimeAtStartCs, isPageVisible]);


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
  if (!Array.isArray(availableCategories)) return undefined; // Guard against non-array
  const category = availableCategories.find(cat => cat && typeof cat === 'object' && cat.id === categoryId);
  return category ? category.name : undefined;
};

export { createDefaultFormatAndTimingsProfile };
