
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react';
import type { Penalty, Team } from '@/types';

// --- Constantes para la sincronización local ---
const BROADCAST_CHANNEL_NAME = 'icevision-game-state-channel';
const LOCAL_STORAGE_KEY = 'icevision-game-state';

// TAB_ID: Generado una vez por pestaña/contexto del navegador.
let TAB_ID: string;
if (typeof window !== 'undefined') {
  TAB_ID = crypto.randomUUID();
} else {
  TAB_ID = 'server-tab-id-' + Math.random().toString(36).substring(2);
}


// Duraciones por defecto iniciales, se guardarán en segundos
const INITIAL_CONFIG_NAME = "Configuración Predeterminada";
const INITIAL_PERIOD_DURATION = 20 * 60;
const INITIAL_OT_PERIOD_DURATION = 5 * 60;
const INITIAL_BREAK_DURATION = 120;
const INITIAL_PRE_OT_BREAK_DURATION = 60;
const INITIAL_TIMEOUT_DURATION = 30;
const INITIAL_MAX_CONCURRENT_PENALTIES = 2;
const INITIAL_AUTO_START_BREAKS = true;
const INITIAL_AUTO_START_PRE_OT_BREAKS = false;
const INITIAL_AUTO_START_TIMEOUTS = true;
const INITIAL_NUMBER_OF_REGULAR_PERIODS = 3;
const INITIAL_NUMBER_OF_OVERTIME_PERIODS = 1;

type PeriodDisplayOverrideType = "Break" | "Pre-OT Break" | "Time Out" | null;

interface PreTimeoutState {
  period: number;
  time: number;
  isClockRunning: boolean;
  override: PeriodDisplayOverrideType;
}

export interface ConfigFields {
  configName: string;
  defaultPeriodDuration: number;
  defaultOTPeriodDuration: number;
  defaultBreakDuration: number;
  defaultPreOTBreakDuration: number;
  defaultTimeoutDuration: number;
  maxConcurrentPenalties: number;
  autoStartBreaks: boolean;
  autoStartPreOTBreaks: boolean;
  autoStartTimeouts: boolean;
  numberOfRegularPeriods: number;
  numberOfOvertimePeriods: number;
}

interface GameState extends ConfigFields {
  homeScore: number;
  awayScore: number;
  currentTime: number; // in seconds
  currentPeriod: number;
  isClockRunning: boolean;
  homePenalties: Penalty[];
  awayPenalties: Penalty[];
  homeTeamName: string;
  awayTeamName: string;
  periodDisplayOverride: PeriodDisplayOverrideType;
  preTimeoutState: PreTimeoutState | null;
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
  | { type: 'TICK' }
  | { type: 'SET_HOME_TEAM_NAME'; payload: string }
  | { type: 'SET_AWAY_TEAM_NAME'; payload: string }
  | { type: 'START_BREAK' }
  | { type: 'START_PRE_OT_BREAK' }
  | { type: 'START_BREAK_AFTER_PREVIOUS_PERIOD' }
  | { type: 'START_TIMEOUT' }
  | { type: 'END_TIMEOUT' }
  | { type: 'SET_CONFIG_NAME'; payload: string }
  | { type: 'SET_DEFAULT_PERIOD_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_OT_PERIOD_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_BREAK_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_PRE_OT_BREAK_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_TIMEOUT_DURATION'; payload: number }
  | { type: 'SET_MAX_CONCURRENT_PENALTIES'; payload: number }
  | { type: 'SET_NUMBER_OF_REGULAR_PERIODS'; payload: number }
  | { type: 'SET_NUMBER_OF_OVERTIME_PERIODS'; payload: number }
  | { type: 'TOGGLE_AUTO_START_BREAKS' }
  | { type: 'TOGGLE_AUTO_START_PRE_OT_BREAKS' }
  | { type: 'TOGGLE_AUTO_START_TIMEOUTS' }
  | { type: 'SET_AUTO_START_BREAKS_VALUE'; payload: boolean }
  | { type: 'SET_AUTO_START_PRE_OT_BREAKS_VALUE'; payload: boolean }
  | { type: 'SET_AUTO_START_TIMEOUTS_VALUE'; payload: boolean }
  | { type: 'LOAD_CONFIG_FROM_FILE'; payload: Partial<ConfigFields> }
  | { type: 'HYDRATE_FROM_STORAGE'; payload: Partial<GameState> }
  | { type: 'SET_STATE_FROM_LOCAL_BROADCAST'; payload: GameState }
  | { type: 'RESET_GAME_STATE' };


const initialGlobalState: GameState = {
  homeScore: 0,
  awayScore: 0,
  currentTime: INITIAL_PERIOD_DURATION,
  currentPeriod: 1,
  isClockRunning: false,
  homePenalties: [],
  awayPenalties: [],
  homeTeamName: 'Local',
  awayTeamName: 'Visitante',
  periodDisplayOverride: null,
  configName: INITIAL_CONFIG_NAME,
  defaultPeriodDuration: INITIAL_PERIOD_DURATION,
  defaultOTPeriodDuration: INITIAL_OT_PERIOD_DURATION,
  defaultBreakDuration: INITIAL_BREAK_DURATION,
  defaultPreOTBreakDuration: INITIAL_PRE_OT_BREAK_DURATION,
  defaultTimeoutDuration: INITIAL_TIMEOUT_DURATION,
  maxConcurrentPenalties: INITIAL_MAX_CONCURRENT_PENALTIES,
  autoStartBreaks: INITIAL_AUTO_START_BREAKS,
  autoStartPreOTBreaks: INITIAL_AUTO_START_PRE_OT_BREAKS,
  autoStartTimeouts: INITIAL_AUTO_START_TIMEOUTS,
  numberOfRegularPeriods: INITIAL_NUMBER_OF_REGULAR_PERIODS,
  numberOfOvertimePeriods: INITIAL_NUMBER_OF_OVERTIME_PERIODS,
  preTimeoutState: null,
  _lastActionOriginator: undefined,
  _lastUpdatedTimestamp: undefined,
};

const GameStateContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isLoading: boolean;
} | undefined>(undefined);


const gameReducer = (state: GameState, action: GameAction): GameState => {
  let newStateWithoutMeta: Omit<GameState, '_lastActionOriginator' | '_lastUpdatedTimestamp'>;

  switch (action.type) {
    case 'HYDRATE_FROM_STORAGE': {
       const hydratedBase: GameState = {
        ...initialGlobalState, // Start with all defaults
        ...(action.payload ?? {}), // Overlay stored values
      };
      // Ensure specific fields are correctly initialized if missing or need transformation
      hydratedBase.isClockRunning = action.payload?.isClockRunning ?? initialGlobalState.isClockRunning;
      hydratedBase.homePenalties = (action.payload?.homePenalties || []).map(({ _status, ...p }: Penalty) => p);
      hydratedBase.awayPenalties = (action.payload?.awayPenalties || []).map(({ _status, ...p }: Penalty) => p);

      const isHydratedOTPeriod = (hydratedBase.currentPeriod ?? initialGlobalState.currentPeriod) > (hydratedBase.numberOfRegularPeriods ?? initialGlobalState.numberOfRegularPeriods);
      const hydratedPeriodDuration = isHydratedOTPeriod ?
          (hydratedBase.defaultOTPeriodDuration ?? initialGlobalState.defaultOTPeriodDuration) :
          (hydratedBase.defaultPeriodDuration ?? initialGlobalState.defaultPeriodDuration);

      if (action.payload?.currentTime === 0 || (action.payload?.currentTime && action.payload.currentTime > hydratedPeriodDuration)) {
          hydratedBase.currentTime = hydratedPeriodDuration;
      } else if (action.payload?.currentTime !== undefined) {
          hydratedBase.currentTime = action.payload.currentTime;
      } else {
          hydratedBase.currentTime = hydratedPeriodDuration;
      }
      
      if (hydratedBase.currentTime <= 0) {
          hydratedBase.isClockRunning = false;
      }
      
      // Preserve _lastUpdatedTimestamp from storage if it exists, otherwise it remains undefined
      // _lastActionOriginator is always reset on hydration for this tab.
      const { _lastActionOriginator, _lastUpdatedTimestamp, ...restOfHydrated } = hydratedBase;
      newStateWithoutMeta = restOfHydrated;
      // We specifically want to return here because meta fields are handled differently for hydration
      return { ...newStateWithoutMeta, _lastActionOriginator: undefined, _lastUpdatedTimestamp: action.payload?._lastUpdatedTimestamp };
    }
    case 'SET_STATE_FROM_LOCAL_BROADCAST': {
      // Compare timestamps to prevent applying an older state
      if (action.payload._lastUpdatedTimestamp && state._lastUpdatedTimestamp && action.payload._lastUpdatedTimestamp < state._lastUpdatedTimestamp) {
        // Incoming state is older, ignore it but clear originator for this tab
        return { ...state, _lastActionOriginator: undefined };
      }
      // Incoming state is newer or timestamps are inconclusive, apply it
      const { _lastActionOriginator, ...restOfPayload } = action.payload;
      newStateWithoutMeta = restOfPayload;
      // _lastActionOriginator is cleared for this tab as it's applying an external state
      return { ...newStateWithoutMeta, _lastActionOriginator: undefined, _lastUpdatedTimestamp: action.payload._lastUpdatedTimestamp };
    }
    // Default handling for other actions:
    // Calculate newStateWithoutMeta first, then append meta fields.
    // This structure allows meta fields to be consistently applied based on action type.
    case 'TOGGLE_CLOCK':
      if (state.currentTime <= 0 && !state.isClockRunning) {
          if (state.periodDisplayOverride === "Break" && !state.autoStartBreaks) { newStateWithoutMeta = state; break; }
          if (state.periodDisplayOverride === "Pre-OT Break" && !state.autoStartPreOTBreaks) { newStateWithoutMeta = state; break; }
          if (state.periodDisplayOverride === "Time Out" && !state.autoStartTimeouts) { newStateWithoutMeta = state; break; }
          if (state.periodDisplayOverride === null && state.currentTime === 0) { newStateWithoutMeta = state; break; }
      }
      newStateWithoutMeta = { ...state, isClockRunning: !state.isClockRunning };
      break;
    case 'SET_TIME': {
      const newTime = Math.max(0, action.payload.minutes * 60 + action.payload.seconds);
      newStateWithoutMeta = { ...state, currentTime: newTime, isClockRunning: newTime > 0 ? state.isClockRunning : false };
      break;
    }
    case 'ADJUST_TIME': {
      const newTime = Math.max(0, state.currentTime + action.payload);
      newStateWithoutMeta = { ...state, currentTime: newTime, isClockRunning: newTime > 0 ? state.isClockRunning : false };
      break;
    }
    case 'SET_PERIOD': {
      const newPeriod = Math.max(1, action.payload);
      const isOTPeriod = newPeriod > state.numberOfRegularPeriods;
      const periodDuration = isOTPeriod ? state.defaultOTPeriodDuration : state.defaultPeriodDuration;
      newStateWithoutMeta = {
        ...state,
        currentPeriod: newPeriod,
        periodDisplayOverride: null,
        isClockRunning: false,
        currentTime: periodDuration,
        preTimeoutState: null,
      };
      break;
    }
    case 'RESET_PERIOD_CLOCK': {
      const isOTPeriod = state.currentPeriod > state.numberOfRegularPeriods;
      const periodDuration = isOTPeriod ? state.defaultOTPeriodDuration : state.defaultPeriodDuration;
      newStateWithoutMeta = {
        ...state,
        currentTime: periodDuration,
        isClockRunning: false,
        periodDisplayOverride: null
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
        id: (typeof window !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).slice(2))
      };
      const penalties = [...state[`${action.payload.team}Penalties`], newPenalty];
      newStateWithoutMeta = { ...state, [`${action.payload.team}Penalties`]: penalties };
      break;
    }
    case 'REMOVE_PENALTY': {
      const penalties = state[`${action.payload.team}Penalties`].filter(p => p.id !== action.payload.penaltyId);
      newStateWithoutMeta = { ...state, [`${action.payload.team}Penalties`]: penalties };
      break;
    }
    case 'ADJUST_PENALTY_TIME': {
      const { team, penaltyId, delta } = action.payload;
      const updatedPenalties = state[`${team}Penalties`].map(p => {
        if (p.id === penaltyId) {
          const newRemainingTime = Math.max(0, p.remainingTime + delta);
          const cappedTime = delta > 0 ? Math.min(newRemainingTime, p.initialDuration) : newRemainingTime;
          return { ...p, remainingTime: cappedTime };
        }
        return p;
      });
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
      newStateWithoutMeta = { ...state, [`${team}Penalties`]: currentPenalties };
      break;
    }
    case 'TICK': {
      if (!state.isClockRunning || state.currentTime <= 0) {
        newStateWithoutMeta = { ...state, isClockRunning: false };
        break;
      }
      const newTime = state.currentTime - 1;

      let homePenaltiesResult = state.homePenalties;
      let awayPenaltiesResult = state.awayPenalties;

      if (state.periodDisplayOverride === null) {
        const updatePenaltiesForTick = (penalties: Penalty[], maxConcurrent: number): Penalty[] => {
          const resultPenalties: Penalty[] = [];
          const activePlayerTickets: Set<string> = new Set();
          let concurrentRunningCount = 0;

          for (const p of penalties) {
            if (p.remainingTime <= 0) { 
              continue;
            }

            let status: Penalty['_status'] = undefined;
            let newRemainingTimeForPenalty = p.remainingTime;

            if (activePlayerTickets.has(p.playerNumber)) {
              status = 'pending_player';
            } else if (concurrentRunningCount < maxConcurrent) {
              status = 'running';
              newRemainingTimeForPenalty = Math.max(0, p.remainingTime - 1);
              if (newRemainingTimeForPenalty > 0) { // Only add to activePlayerTickets if it's still running after tick
                  activePlayerTickets.add(p.playerNumber);
              }
              concurrentRunningCount++;
            } else {
              status = 'pending_concurrent';
            }
            
            if (newRemainingTimeForPenalty > 0 || (status === 'running' && newRemainingTimeForPenalty === 0)) {
               resultPenalties.push({ ...p, remainingTime: newRemainingTimeForPenalty, _status: status });
            }
          }
          return resultPenalties;
        };

        homePenaltiesResult = updatePenaltiesForTick(state.homePenalties, state.maxConcurrentPenalties);
        awayPenaltiesResult = updatePenaltiesForTick(state.awayPenalties, state.maxConcurrentPenalties);
      }

      let newIsClockRunning = state.isClockRunning;
      if (newTime <= 0) {
        newIsClockRunning = false;
      }

      newStateWithoutMeta = {
        ...state,
        currentTime: newTime,
        homePenalties: homePenaltiesResult,
        awayPenalties: awayPenaltiesResult,
        isClockRunning: newIsClockRunning,
      };
      break;
    }
    case 'SET_HOME_TEAM_NAME':
      newStateWithoutMeta = { ...state, homeTeamName: action.payload || 'Local' };
      break;
    case 'SET_AWAY_TEAM_NAME':
      newStateWithoutMeta = { ...state, awayTeamName: action.payload || 'Visitante' };
      break;
    case 'START_BREAK':
      newStateWithoutMeta = {
        ...state,
        currentTime: state.defaultBreakDuration,
        periodDisplayOverride: 'Break',
        isClockRunning: state.autoStartBreaks,
        preTimeoutState: null,
      };
      break;
    case 'START_PRE_OT_BREAK':
      newStateWithoutMeta = {
        ...state,
        currentTime: state.defaultPreOTBreakDuration,
        periodDisplayOverride: 'Pre-OT Break',
        isClockRunning: state.autoStartPreOTBreaks,
        preTimeoutState: null,
      };
      break;
    case 'START_BREAK_AFTER_PREVIOUS_PERIOD': {
      if (state.currentPeriod <= 1 && state.periodDisplayOverride === null) { newStateWithoutMeta = state; break; }

      const periodBeforeBreak = state.periodDisplayOverride !== null ? state.currentPeriod : state.currentPeriod - 1;
      if (periodBeforeBreak < 1) { newStateWithoutMeta = state; break; }

      const isPreOT = periodBeforeBreak >= state.numberOfRegularPeriods;
      newStateWithoutMeta = {
        ...state,
        currentPeriod: periodBeforeBreak,
        currentTime: isPreOT ? state.defaultPreOTBreakDuration : state.defaultBreakDuration,
        periodDisplayOverride: isPreOT ? 'Pre-OT Break' : 'Break',
        isClockRunning: isPreOT ? state.autoStartPreOTBreaks : state.autoStartBreaks,
        preTimeoutState: null,
      };
      break;
    }
    case 'START_TIMEOUT':
      newStateWithoutMeta = {
        ...state,
        preTimeoutState: {
          period: state.currentPeriod,
          time: state.currentTime,
          isClockRunning: state.isClockRunning,
          override: state.periodDisplayOverride,
        },
        currentTime: state.defaultTimeoutDuration,
        periodDisplayOverride: 'Time Out',
        isClockRunning: state.autoStartTimeouts,
      };
      break;
    case 'END_TIMEOUT':
      if (state.preTimeoutState) {
        newStateWithoutMeta = {
          ...state,
          currentPeriod: state.preTimeoutState.period,
          currentTime: state.preTimeoutState.time,
          isClockRunning: false, 
          periodDisplayOverride: state.preTimeoutState.override,
          preTimeoutState: null,
        };
      } else {
        newStateWithoutMeta = state;
      }
      break;
    case 'SET_CONFIG_NAME':
      newStateWithoutMeta = { ...state, configName: action.payload || initialGlobalState.configName };
      break;
    case 'SET_DEFAULT_PERIOD_DURATION':
      newStateWithoutMeta = { ...state, defaultPeriodDuration: Math.max(60, action.payload) };
      break;
    case 'SET_DEFAULT_OT_PERIOD_DURATION':
      newStateWithoutMeta = { ...state, defaultOTPeriodDuration: Math.max(60, action.payload) };
      break;
    case 'SET_DEFAULT_BREAK_DURATION':
      newStateWithoutMeta = { ...state, defaultBreakDuration: Math.max(1, action.payload) };
      break;
    case 'SET_DEFAULT_PRE_OT_BREAK_DURATION':
      newStateWithoutMeta = { ...state, defaultPreOTBreakDuration: Math.max(1, action.payload) };
      break;
    case 'SET_DEFAULT_TIMEOUT_DURATION':
      newStateWithoutMeta = { ...state, defaultTimeoutDuration: Math.max(1, action.payload) };
      break;
    case 'SET_MAX_CONCURRENT_PENALTIES':
      newStateWithoutMeta = { ...state, maxConcurrentPenalties: Math.max(1, action.payload) };
      break;
    case 'SET_NUMBER_OF_REGULAR_PERIODS':
      newStateWithoutMeta = { ...state, numberOfRegularPeriods: Math.max(1, action.payload) };
      break;
    case 'SET_NUMBER_OF_OVERTIME_PERIODS':
      newStateWithoutMeta = { ...state, numberOfOvertimePeriods: Math.max(0, action.payload) };
      break;
    case 'TOGGLE_AUTO_START_BREAKS':
      newStateWithoutMeta = { ...state, autoStartBreaks: !state.autoStartBreaks };
      break;
    case 'TOGGLE_AUTO_START_PRE_OT_BREAKS':
      newStateWithoutMeta = { ...state, autoStartPreOTBreaks: !state.autoStartPreOTBreaks };
      break;
    case 'TOGGLE_AUTO_START_TIMEOUTS':
      newStateWithoutMeta = { ...state, autoStartTimeouts: !state.autoStartTimeouts };
      break;
    case 'SET_AUTO_START_BREAKS_VALUE':
      newStateWithoutMeta = { ...state, autoStartBreaks: action.payload };
      break;
    case 'SET_AUTO_START_PRE_OT_BREAKS_VALUE':
      newStateWithoutMeta = { ...state, autoStartPreOTBreaks: action.payload };
      break;
    case 'SET_AUTO_START_TIMEOUTS_VALUE':
      newStateWithoutMeta = { ...state, autoStartTimeouts: action.payload };
      break;
    case 'LOAD_CONFIG_FROM_FILE': {
      const config = action.payload;
      newStateWithoutMeta = {
        ...state,
        configName: config.configName ?? state.configName,
        defaultPeriodDuration: config.defaultPeriodDuration ?? state.defaultPeriodDuration,
        defaultOTPeriodDuration: config.defaultOTPeriodDuration ?? state.defaultOTPeriodDuration,
        defaultBreakDuration: config.defaultBreakDuration ?? state.defaultBreakDuration,
        defaultPreOTBreakDuration: config.defaultPreOTBreakDuration ?? state.defaultPreOTBreakDuration,
        defaultTimeoutDuration: config.defaultTimeoutDuration ?? state.defaultTimeoutDuration,
        maxConcurrentPenalties: config.maxConcurrentPenalties ?? state.maxConcurrentPenalties,
        autoStartBreaks: config.autoStartBreaks ?? state.autoStartBreaks,
        autoStartPreOTBreaks: config.autoStartPreOTBreaks ?? state.autoStartPreOTBreaks,
        autoStartTimeouts: config.autoStartTimeouts ?? state.autoStartTimeouts,
        numberOfRegularPeriods: config.numberOfRegularPeriods ?? state.numberOfRegularPeriods,
        numberOfOvertimePeriods: config.numberOfOvertimePeriods ?? state.numberOfOvertimePeriods,
      };
      break;
    }
    case 'RESET_GAME_STATE': {
      const { _lastActionOriginator, _lastUpdatedTimestamp, ...initialsToKeepConfig } = initialGlobalState;
      const isOT = (initialsToKeepConfig.currentPeriod) > (state.numberOfRegularPeriods ?? initialsToKeepConfig.numberOfRegularPeriods);
      const initialClockTime = isOT
          ? (state.defaultOTPeriodDuration ?? initialsToKeepConfig.defaultOTPeriodDuration)
          : (state.defaultPeriodDuration ?? initialsToKeepConfig.defaultPeriodDuration);
      newStateWithoutMeta = {
        ...state, // Keep current config values
        homeScore: initialsToKeepConfig.homeScore,
        awayScore: initialsToKeepConfig.awayScore,
        currentTime: initialClockTime,
        currentPeriod: initialsToKeepConfig.currentPeriod,
        isClockRunning: initialsToKeepConfig.isClockRunning,
        homePenalties: initialsToKeepConfig.homePenalties,
        awayPenalties: initialsToKeepConfig.awayPenalties,
        homeTeamName: initialsToKeepConfig.homeTeamName,
        awayTeamName: initialsToKeepConfig.awayTeamName,
        periodDisplayOverride: initialsToKeepConfig.periodDisplayOverride,
        preTimeoutState: initialsToKeepConfig.preTimeoutState,
      };
      break;
    }
    default:
      // Should not happen if all action types are covered
      // For type safety, we can assign state to newStateWithoutMeta
      newStateWithoutMeta = state; 
      break;
  }

  // Common logic for setting meta fields for most actions
  if (typeof window !== 'undefined') {
    const nonOriginatingActionTypes: GameAction['type'][] = ['HYDRATE_FROM_STORAGE', 'SET_STATE_FROM_LOCAL_BROADCAST'];

    if (nonOriginatingActionTypes.includes(action.type)) {
      // Meta fields are handled within these cases specifically.
      // This return was already done for HYDRATE_FROM_STORAGE,
      // and SET_STATE_FROM_LOCAL_BROADCAST will also return from its block.
      // This path shouldn't be hit if those cases return.
      // For safety, return newStateWithoutMeta with its current meta (which should be undefined for originator).
      return { ...newStateWithoutMeta, _lastActionOriginator: undefined, _lastUpdatedTimestamp: state._lastUpdatedTimestamp }; 
    } else if (action.type === 'TICK') {
      if (state.isClockRunning) { // Check the state *before* this tick
        return { ...newStateWithoutMeta, _lastActionOriginator: TAB_ID, _lastUpdatedTimestamp: Date.now() };
      } else {
        return { ...newStateWithoutMeta, _lastActionOriginator: undefined, _lastUpdatedTimestamp: state._lastUpdatedTimestamp }; // No new timestamp if tick is a no-op
      }
    } else {
      // For all other user-initiated actions
      return { ...newStateWithoutMeta, _lastActionOriginator: TAB_ID, _lastUpdatedTimestamp: Date.now() };
    }
  }
  // For server-side rendering or if window is not defined (should not happen for most actions post-hydration)
  const { _lastActionOriginator, _lastUpdatedTimestamp, ...restOfState } = state; // preserve existing meta if no window
  return { ...newStateWithoutMeta, _lastActionOriginator, _lastUpdatedTimestamp };
};


export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialGlobalState);
  const [isLoading, setIsLoading] = useState(true);
  const isProcessingBroadcastRef = useRef(false);
  const hasHydratedRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);


  useEffect(() => {
    if (typeof window === 'undefined' || hasHydratedRef.current) {
      if (!hasHydratedRef.current && typeof window === 'undefined') setIsLoading(false);
      return;
    }

    hasHydratedRef.current = true;
    let payloadForHydration: Partial<GameState> = {};

    try {
      const rawStoredState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (rawStoredState) {
        const parsedState = JSON.parse(rawStoredState) as Partial<GameState>;
        payloadForHydration = { ...parsedState };
      }
    } catch (error) {
      console.error("Error reading state from localStorage for hydration:", error);
    }

    dispatch({ type: 'HYDRATE_FROM_STORAGE', payload: payloadForHydration });
    setIsLoading(false);

    if ('BroadcastChannel' in window) {
      if (!channelRef.current) {
        channelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      }
      const handleMessage = (event: MessageEvent) => {
         if (event.data && event.data._lastActionOriginator && event.data._lastActionOriginator !== TAB_ID) {
            isProcessingBroadcastRef.current = true; 
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
    if (isLoading) return; 

    if (isProcessingBroadcastRef.current) {
        isProcessingBroadcastRef.current = false;
        return;
    }

    if (typeof window !== 'undefined') {
      if (state._lastActionOriginator && state._lastActionOriginator !== TAB_ID) {
          return;
      }

      try {
        const stateForStorage = { ...state };
        // Do not persist _lastActionOriginator in localStorage
        delete stateForStorage._lastActionOriginator; 
        
        stateForStorage.homePenalties = (state.homePenalties || []).map(({ _status, ...p }) => p);
        stateForStorage.awayPenalties = (state.awayPenalties || []).map(({ _status, ...p }) => p);

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateForStorage));

        if (channelRef.current && state._lastActionOriginator === TAB_ID) {
          // Transmit the full state including _lastActionOriginator and _lastUpdatedTimestamp
          channelRef.current.postMessage(state); 
        }
      } catch (error) {
        console.error("Error saving state to localStorage or broadcasting:", error);
      }
    }
  }, [state, isLoading]); 

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    if (state.isClockRunning) {
      timerId = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    }
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [state.isClockRunning]);


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

export const formatTime = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const getActualPeriodText = (period: number, override: PeriodDisplayOverrideType, numberOfRegularPeriods: number): string => {
  if (override === "Time Out") return "TIME OUT";
  if (override) return override;
  return getPeriodText(period, numberOfRegularPeriods);
};

export const getPeriodText = (period: number, numRegPeriods: number): string => {
    if (period <= 0) return "---";
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
    if (overtimeNumber === 1) return 'OT';
    return `OT${overtimeNumber}`;
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
    

    


