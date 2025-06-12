
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
  let newTimestamp = Date.now(); // Default for actions originating here

  switch (action.type) {
    case 'HYDRATE_FROM_STORAGE': {
       const hydratedBase: GameState = {
        ...initialGlobalState, // Start with compiled-in defaults
        ...(action.payload ?? {}), // Overlay with stored values
      };
      // ALWAYS start with clock paused when hydrating from storage
      hydratedBase.isClockRunning = false; 

      const cleanPenaltiesOnHydrate = (penalties?: Penalty[]) => (penalties || []).map(({ _status, ...p }) => p);
      hydratedBase.homePenalties = cleanPenaltiesOnHydrate(action.payload?.homePenalties);
      hydratedBase.awayPenalties = cleanPenaltiesOnHydrate(action.payload?.awayPenalties);

      const isHydratedOTPeriod = (hydratedBase.currentPeriod ?? initialGlobalState.currentPeriod) > (hydratedBase.numberOfRegularPeriods ?? initialGlobalState.numberOfRegularPeriods);
      const hydratedPeriodDuration = isHydratedOTPeriod ?
          (hydratedBase.defaultOTPeriodDuration ?? initialGlobalState.defaultOTPeriodDuration) :
          (hydratedBase.defaultPeriodDuration ?? initialGlobalState.defaultPeriodDuration);

      // Validate and set currentTime
      if (action.payload?.currentTime === undefined || action.payload.currentTime === null || action.payload.currentTime > hydratedPeriodDuration || action.payload.currentTime < 0) {
          hydratedBase.currentTime = hydratedPeriodDuration;
      } else {
          hydratedBase.currentTime = action.payload.currentTime;
      }
      // Ensure clock is off if time is zero, even if forced off above
      if (hydratedBase.currentTime <= 0) {
          hydratedBase.isClockRunning = false;
      }
      
      const { _lastActionOriginator, _lastUpdatedTimestamp, ...restOfHydrated } = hydratedBase;
      newStateWithoutMeta = restOfHydrated;
      // For hydration, keep the timestamp from storage if it exists, originator is cleared.
      return { ...newStateWithoutMeta, _lastActionOriginator: undefined, _lastUpdatedTimestamp: action.payload?._lastUpdatedTimestamp };
    }
    case 'SET_STATE_FROM_LOCAL_BROADCAST': {
      const incomingTimestamp = action.payload._lastUpdatedTimestamp;
      const currentTimestamp = state._lastUpdatedTimestamp;

      if (incomingTimestamp && currentTimestamp && incomingTimestamp < currentTimestamp) {
        newStateWithoutMeta = state; 
        return { ...newStateWithoutMeta, _lastActionOriginator: undefined, _lastUpdatedTimestamp: currentTimestamp };
      }
      if (incomingTimestamp === undefined && currentTimestamp !== undefined) {
        newStateWithoutMeta = state;
        return { ...newStateWithoutMeta, _lastActionOriginator: undefined, _lastUpdatedTimestamp: currentTimestamp };
      }
      
      const { _lastActionOriginator, ...restOfPayload } = action.payload;
      newStateWithoutMeta = restOfPayload;
      return { ...newStateWithoutMeta, _lastActionOriginator: undefined, _lastUpdatedTimestamp: incomingTimestamp };
    }
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

      if (state.periodDisplayOverride === null) { // Only tick penalties if it's game time
        const updatePenaltiesForTick = (penalties: Penalty[], maxConcurrent: number): Penalty[] => {
          const resultPenalties: Penalty[] = [];
          const activePlayerTickets: Set<string> = new Set();
          let concurrentRunningCount = 0;

          for (const p of penalties) {
            if (p.remainingTime <= 0) { // Skip penalties already at 0
              continue;
            }

            let status: Penalty['_status'] = undefined;
            let newRemainingTimeForPenalty = p.remainingTime;

            if (activePlayerTickets.has(p.playerNumber)) {
              status = 'pending_player';
            } else if (concurrentRunningCount < maxConcurrent) {
              status = 'running';
              newRemainingTimeForPenalty = Math.max(0, p.remainingTime - 1);
              if (newRemainingTimeForPenalty > 0) { 
                  activePlayerTickets.add(p.playerNumber);
              }
              concurrentRunningCount++;
            } else {
              status = 'pending_concurrent';
            }
            
            // Only add to results if it's still running or just finished this tick
            if (newRemainingTimeForPenalty > 0 || (status === 'running' && newRemainingTimeForPenalty === 0 && p.remainingTime > 0) ) {
               resultPenalties.push({ ...p, remainingTime: newRemainingTimeForPenalty, _status: status });
            }
          }
          return resultPenalties;
        };

        homePenaltiesResult = updatePenaltiesForTick(state.homePenalties, state.maxConcurrentPenalties);
        awayPenaltiesResult = updatePenaltiesForTick(state.awayPenalties, state.maxConcurrentPenalties);
      }

      newStateWithoutMeta = {
        ...state,
        currentTime: newTime,
        homePenalties: homePenaltiesResult,
        awayPenalties: awayPenaltiesResult,
        isClockRunning: newTime > 0, 
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
        ...state, // Keep current config (durations, names, etc.)
        homeScore: initialsToKeepConfig.homeScore,
        awayScore: initialsToKeepConfig.awayScore,
        currentTime: initialClockTime,
        currentPeriod: initialsToKeepConfig.currentPeriod,
        isClockRunning: false, // Always start paused on reset
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
      // This case should not be reached if all action types are handled
      // However, to satisfy TypeScript, ensure newStateWithoutMeta is assigned.
      // Reverting to state ensures no unintended modification.
      newStateWithoutMeta = state; 
      newTimestamp = state._lastUpdatedTimestamp || Date.now(); // Preserve timestamp if no change
      break;
  }

  // Determine if this action is a non-originating update
  const nonOriginatingActionTypes: GameAction['type'][] = ['HYDRATE_FROM_STORAGE', 'SET_STATE_FROM_LOCAL_BROADCAST'];
  if (nonOriginatingActionTypes.includes(action.type)) {
    // For HYDRATE_FROM_STORAGE, the timestamp is already handled (taken from payload or undefined)
    // For SET_STATE_FROM_LOCAL_BROADCAST, the timestamp is also handled (taken from payload or current state's)
    // _lastActionOriginator is set to undefined for these.
    // So, we just return what was constructed inside those cases.
    // This logic block is slightly redundant with the return inside HYDRATE/SET_STATE cases but confirms intent.
    if (action.type === 'HYDRATE_FROM_STORAGE') return { ...newStateWithoutMeta, _lastActionOriginator: undefined, _lastUpdatedTimestamp: (newStateWithoutMeta as GameState)._lastUpdatedTimestamp };
    if (action.type === 'SET_STATE_FROM_LOCAL_BROADCAST') return { ...newStateWithoutMeta, _lastActionOriginator: undefined, _lastUpdatedTimestamp: (newStateWithoutMeta as GameState)._lastUpdatedTimestamp };

  } else if (action.type === 'TICK' && !state.isClockRunning) {
    // If TICK was dispatched but clock wasn't (or shouldn't be) running,
    // it's a no-op for timestamp/originator to prevent unnecessary broadcast/storage writes.
    return { ...newStateWithoutMeta, _lastActionOriginator: state._lastActionOriginator, _lastUpdatedTimestamp: state._lastUpdatedTimestamp };
  }
  
  // For all other actions (originated locally or a TICK that ran)
  return { ...newStateWithoutMeta, _lastActionOriginator: TAB_ID, _lastUpdatedTimestamp: newTimestamp };
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
      setIsPageVisible(!document.hidden); // Set initial state
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
    setIsLoading(false); // Hydration complete

    if ('BroadcastChannel' in window) {
      if (!channelRef.current) {
        channelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      }
      const handleMessage = (event: MessageEvent) => {
         if (event.data && event.data._lastActionOriginator && event.data._lastActionOriginator !== TAB_ID) {
            const receivedState = event.data as GameState;
            dispatch({ type: 'SET_STATE_FROM_LOCAL_BROADCAST', payload: receivedState });
        } else if (event.data && !event.data._lastActionOriginator && event.data.type === 'REQUEST_STATE_SYNC') {
            // This case is for a more advanced sync if needed, not currently used.
            // If a new tab requests state, the "master" tab could send its current state.
        }
      };
      channelRef.current.addEventListener('message', handleMessage);

      return () => {
        if (channelRef.current) {
          channelRef.current.removeEventListener('message', handleMessage);
          // Consider closing channel if it's the last tab, but browser usually handles this.
        }
      };
    } else {
      console.warn('BroadcastChannel API not available. Multi-tab sync will not work.');
    }
  }, []); // Runs once on mount


  useEffect(() => {
    // This effect handles saving to localStorage and broadcasting
    if (isLoading || typeof window === 'undefined' || state._lastActionOriginator !== TAB_ID) {
      // Don't save or broadcast if:
      // - Still loading/hydrating
      // - Not in a browser environment
      // - The last action was NOT originated by this tab (i.e., it was from broadcast or hydration)
      return;
    }

    try {
      const stateForStorage = { ...state };
      // Clean transient _status from penalties before saving
      const cleanPenalties = (penalties: Penalty[]) => (penalties || []).map(({ _status, ...p }) => p);
      stateForStorage.homePenalties = cleanPenalties(state.homePenalties);
      stateForStorage.awayPenalties = cleanPenalties(state.awayPenalties);
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateForStorage));

      if (channelRef.current) {
        channelRef.current.postMessage(state); // Broadcast the full state including _lastActionOriginator and _lastUpdatedTimestamp
      }
    } catch (error) {
      console.error("Error saving state to localStorage or broadcasting:", error);
    }
  }, [state, isLoading]); // Depends on the entire state and loading status

  useEffect(() => {
    // This effect handles the game clock TICK interval
    let timerId: NodeJS.Timeout | undefined;
    if (state.isClockRunning && isPageVisible) { // Only run if clock should be running AND page is visible
      timerId = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    }
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [state.isClockRunning, isPageVisible]); // Depends on clock running status and page visibility


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
  if (override) return override; // Covers "Break" and "Pre-OT Break"
  return getPeriodText(period, numberOfRegularPeriods);
};

export const getPeriodText = (period: number, numRegPeriods: number): string => {
    if (period <= 0) return "---"; // Should ideally not happen with validation
    if (period <= numRegPeriods) {
        if (period === 1) return "1ST";
        if (period === 2) return "2ND";
        if (period === 3) return "3RD";
        // For periods beyond 3rd, use ordinal numbers
        if (period % 10 === 1 && period % 100 !== 11) return `${period}ST`;
        if (period % 10 === 2 && period % 100 !== 12) return `${period}ND`;
        if (period % 10 === 3 && period % 100 !== 13) return `${period}RD`;
        return `${period}TH`; // Covers 4th, 5th, etc.
    }
    // Overtime periods
    const overtimeNumber = period - numRegPeriods;
    if (overtimeNumber === 1) return 'OT'; // Standard OT
    return `OT${overtimeNumber}`; // For multiple OTs like OT2, OT3
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
