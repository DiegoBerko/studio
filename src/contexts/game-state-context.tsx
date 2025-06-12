
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
};

const GameStateContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isLoading: boolean;
} | undefined>(undefined);


const gameReducer = (state: GameState, action: GameAction): GameState => {
  const newState = ((): GameState => {
    switch (action.type) {
      case 'HYDRATE_FROM_STORAGE': {
         const hydratedBase: GameState = {
          ...initialGlobalState, 
          ...(action.payload ?? {}),     
        };
        
        hydratedBase.isClockRunning = action.payload?.isClockRunning ?? initialGlobalState.isClockRunning;
        hydratedBase._lastActionOriginator = undefined;
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
        // Ensure clock is not running if time is 0 after hydration
        if (hydratedBase.currentTime <= 0) {
            hydratedBase.isClockRunning = false;
        }

        return hydratedBase;
      }
      case 'SET_STATE_FROM_LOCAL_BROADCAST':
        const receivedState = {
          ...action.payload,
          _lastActionOriginator: undefined, 
        };
        return receivedState;

      case 'TOGGLE_CLOCK':
        if (state.currentTime <= 0 && !state.isClockRunning) {
            if (state.periodDisplayOverride === "Break" && !state.autoStartBreaks) return state;
            if (state.periodDisplayOverride === "Pre-OT Break" && !state.autoStartPreOTBreaks) return state;
            if (state.periodDisplayOverride === "Time Out" && !state.autoStartTimeouts) return state;
            if (state.periodDisplayOverride === null && state.currentTime === 0) return state;
        }
        return { ...state, isClockRunning: !state.isClockRunning };
      case 'SET_TIME': {
        const newTime = Math.max(0, action.payload.minutes * 60 + action.payload.seconds);
        return { ...state, currentTime: newTime, isClockRunning: newTime > 0 ? state.isClockRunning : false };
      }
      case 'ADJUST_TIME': {
        const newTime = Math.max(0, state.currentTime + action.payload);
        return { ...state, currentTime: newTime, isClockRunning: newTime > 0 ? state.isClockRunning : false };
      }
      case 'SET_PERIOD': {
        const newPeriod = Math.max(1, action.payload);
        const isOTPeriod = newPeriod > state.numberOfRegularPeriods;
        const periodDuration = isOTPeriod ? state.defaultOTPeriodDuration : state.defaultPeriodDuration;
        return {
          ...state,
          currentPeriod: newPeriod,
          periodDisplayOverride: null,
          isClockRunning: false,
          currentTime: periodDuration,
          preTimeoutState: null,
        };
      }
      case 'RESET_PERIOD_CLOCK': {
        const isOTPeriod = state.currentPeriod > state.numberOfRegularPeriods;
        const periodDuration = isOTPeriod ? state.defaultOTPeriodDuration : state.defaultPeriodDuration;
        return {
          ...state,
          currentTime: periodDuration,
          isClockRunning: false,
          periodDisplayOverride: null
        };
      }
      case 'SET_SCORE':
        return { ...state, [`${action.payload.team}Score`]: Math.max(0, action.payload.score) };
      case 'ADJUST_SCORE': {
        const currentScore = state[`${action.payload.team}Score`];
        return { ...state, [`${action.payload.team}Score`]: Math.max(0, currentScore + action.payload.delta) };
      }
      case 'ADD_PENALTY': {
        const newPenalty: Penalty = {
          ...action.payload.penalty,
          id: (typeof window !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).slice(2))
        };
        const penalties = [...state[`${action.payload.team}Penalties`], newPenalty];
        return { ...state, [`${action.payload.team}Penalties`]: penalties };
      }
      case 'REMOVE_PENALTY': {
        const penalties = state[`${action.payload.team}Penalties`].filter(p => p.id !== action.payload.penaltyId);
        return { ...state, [`${action.payload.team}Penalties`]: penalties };
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
        return { ...state, [`${team}Penalties`]: updatedPenalties };
      }
      case 'REORDER_PENALTIES': {
        const { team, startIndex, endIndex } = action.payload;
        const currentPenalties = [...state[`${team}Penalties`]];
        const [removed] = currentPenalties.splice(startIndex, 1);
        if (removed) {
          currentPenalties.splice(endIndex, 0, removed);
        }
        return { ...state, [`${team}Penalties`]: currentPenalties };
      }
      case 'TICK': {
        if (!state.isClockRunning || state.currentTime <= 0) {
          return { ...state, isClockRunning: false }; 
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
              let newRemainingTime = p.remainingTime;

              if (activePlayerTickets.has(p.playerNumber)) {
                status = 'pending_player';
              } else if (concurrentRunningCount < maxConcurrent) {
                status = 'running';
                newRemainingTime = Math.max(0, p.remainingTime - 1);
                activePlayerTickets.add(p.playerNumber);
                concurrentRunningCount++;
              } else {
                status = 'pending_concurrent';
              }
              
              if (newRemainingTime > 0 || (status === 'running' && newRemainingTime === 0)) {
                 resultPenalties.push({ ...p, remainingTime: newRemainingTime, _status: status });
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
        
        return {
          ...state,
          currentTime: newTime,
          homePenalties: homePenaltiesResult,
          awayPenalties: awayPenaltiesResult,
          isClockRunning: newIsClockRunning,
        };
      }
      case 'SET_HOME_TEAM_NAME':
        return { ...state, homeTeamName: action.payload || 'Local' };
      case 'SET_AWAY_TEAM_NAME':
        return { ...state, awayTeamName: action.payload || 'Visitante' };
      case 'START_BREAK':
        return {
          ...state,
          currentTime: state.defaultBreakDuration,
          periodDisplayOverride: 'Break',
          isClockRunning: state.autoStartBreaks,
          preTimeoutState: null,
        };
      case 'START_PRE_OT_BREAK':
        return {
          ...state,
          currentTime: state.defaultPreOTBreakDuration,
          periodDisplayOverride: 'Pre-OT Break',
          isClockRunning: state.autoStartPreOTBreaks,
          preTimeoutState: null,
        };
      case 'START_BREAK_AFTER_PREVIOUS_PERIOD': {
        if (state.currentPeriod <= 1 && state.periodDisplayOverride === null) return state;

        const periodBeforeBreak = state.periodDisplayOverride !== null ? state.currentPeriod : state.currentPeriod - 1;
        if (periodBeforeBreak < 1) return state;
        
        const isPreOT = periodBeforeBreak >= state.numberOfRegularPeriods;
        return {
          ...state,
          currentPeriod: periodBeforeBreak,
          currentTime: isPreOT ? state.defaultPreOTBreakDuration : state.defaultBreakDuration,
          periodDisplayOverride: isPreOT ? 'Pre-OT Break' : 'Break',
          isClockRunning: isPreOT ? state.autoStartPreOTBreaks : state.autoStartBreaks,
          preTimeoutState: null,
        };
      }
      case 'START_TIMEOUT':
        return {
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
      case 'END_TIMEOUT':
        if (state.preTimeoutState) {
          return {
            ...state,
            currentPeriod: state.preTimeoutState.period,
            currentTime: state.preTimeoutState.time,
            isClockRunning: false, 
            periodDisplayOverride: state.preTimeoutState.override,
            preTimeoutState: null,
          };
        }
        return state;
      case 'SET_CONFIG_NAME':
        return { ...state, configName: action.payload || initialGlobalState.configName };
      case 'SET_DEFAULT_PERIOD_DURATION':
        return { ...state, defaultPeriodDuration: Math.max(60, action.payload) }; 
      case 'SET_DEFAULT_OT_PERIOD_DURATION':
        return { ...state, defaultOTPeriodDuration: Math.max(60, action.payload) };
      case 'SET_DEFAULT_BREAK_DURATION':
        return { ...state, defaultBreakDuration: Math.max(1, action.payload) };
      case 'SET_DEFAULT_PRE_OT_BREAK_DURATION':
        return { ...state, defaultPreOTBreakDuration: Math.max(1, action.payload) };
      case 'SET_DEFAULT_TIMEOUT_DURATION':
        return { ...state, defaultTimeoutDuration: Math.max(1, action.payload) };
      case 'SET_MAX_CONCURRENT_PENALTIES':
        return { ...state, maxConcurrentPenalties: Math.max(1, action.payload) };
      case 'SET_NUMBER_OF_REGULAR_PERIODS':
        return { ...state, numberOfRegularPeriods: Math.max(1, action.payload) };
      case 'SET_NUMBER_OF_OVERTIME_PERIODS':
        return { ...state, numberOfOvertimePeriods: Math.max(0, action.payload) };
      case 'TOGGLE_AUTO_START_BREAKS':
        return { ...state, autoStartBreaks: !state.autoStartBreaks };
      case 'TOGGLE_AUTO_START_PRE_OT_BREAKS':
        return { ...state, autoStartPreOTBreaks: !state.autoStartPreOTBreaks };
      case 'TOGGLE_AUTO_START_TIMEOUTS':
        return { ...state, autoStartTimeouts: !state.autoStartTimeouts };
      case 'SET_AUTO_START_BREAKS_VALUE':
        return { ...state, autoStartBreaks: action.payload };
      case 'SET_AUTO_START_PRE_OT_BREAKS_VALUE':
        return { ...state, autoStartPreOTBreaks: action.payload };
      case 'SET_AUTO_START_TIMEOUTS_VALUE':
        return { ...state, autoStartTimeouts: action.payload };
      case 'LOAD_CONFIG_FROM_FILE': {
        const config = action.payload;
        return {
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
      }
      case 'RESET_GAME_STATE': {
        const isOT = (initialGlobalState.currentPeriod) > (state.numberOfRegularPeriods ?? initialGlobalState.numberOfRegularPeriods);
        const initialClockTime = isOT 
            ? (state.defaultOTPeriodDuration ?? initialGlobalState.defaultOTPeriodDuration) 
            : (state.defaultPeriodDuration ?? initialGlobalState.defaultPeriodDuration);
        return {
          ...state, 
          homeScore: initialGlobalState.homeScore,
          awayScore: initialGlobalState.awayScore,
          currentTime: initialClockTime, 
          currentPeriod: initialGlobalState.currentPeriod,
          isClockRunning: initialGlobalState.isClockRunning,
          homePenalties: initialGlobalState.homePenalties,
          awayPenalties: initialGlobalState.awayPenalties,
          homeTeamName: initialGlobalState.homeTeamName, 
          awayTeamName: initialGlobalState.awayTeamName, 
          periodDisplayOverride: initialGlobalState.periodDisplayOverride,
          preTimeoutState: initialGlobalState.preTimeoutState,
        };
      }
      default:
        return state;
    }
  })();

  const nonOriginatorActions: GameAction['type'][] = ['TICK', 'HYDRATE_FROM_STORAGE', 'SET_STATE_FROM_LOCAL_BROADCAST'];
  if (!nonOriginatorActions.includes(action.type) && typeof window !== 'undefined') {
    return { ...newState, _lastActionOriginator: TAB_ID };
  }
  return newState;
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
            if (isProcessingBroadcastRef.current) return;
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
      if (state._lastActionOriginator !== TAB_ID && state._lastActionOriginator !== undefined) {
          return; 
      }
      try {
        const stateForStorage = { ...state };
        delete stateForStorage._lastActionOriginator;
        stateForStorage.homePenalties = (state.homePenalties || []).map(({ _status, ...p }) => p);
        stateForStorage.awayPenalties = (state.awayPenalties || []).map(({ _status, ...p }) => p);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateForStorage));

        if (channelRef.current && state._lastActionOriginator === TAB_ID) { 
          channelRef.current.postMessage(state); 
        }
      } catch (error) {
        console.error("Error saving state to localStorage or broadcasting:", error);
      }
    }
  }, [state, isLoading]);

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    if (state.isClockRunning) { // Only depend on isClockRunning to start/stop
      timerId = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    }
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [state.isClockRunning]); // Only depend on isClockRunning


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
    

    