
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react';
import type { Penalty, Team } from '@/types';

// --- Constantes para la sincronización local ---
const BROADCAST_CHANNEL_NAME = 'icevision-game-state-channel';
const LOCAL_STORAGE_KEY = 'icevision-game-state';

// TAB_ID: Generado una vez por pestaña/contexto del navegador.
const TAB_ID = typeof window !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

// Duraciones por defecto iniciales, se guardarán en segundos
const INITIAL_PERIOD_DURATION = 20 * 60;
const INITIAL_BREAK_DURATION = 2 * 60;
const INITIAL_PRE_OT_BREAK_DURATION = 1 * 60;
const INITIAL_TIMEOUT_DURATION = 60;
const INITIAL_MAX_CONCURRENT_PENALTIES = 2;
const INITIAL_AUTO_START_BREAKS = true;
const INITIAL_AUTO_START_PRE_OT_BREAKS = false;
const INITIAL_AUTO_START_TIMEOUTS = true; 

type PeriodDisplayOverrideType = "Break" | "Pre-OT Break" | "Time Out" | null;

interface PreTimeoutState {
  period: number;
  time: number;
  isClockRunning: boolean;
  override: PeriodDisplayOverrideType;
}

interface GameState {
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
  defaultPeriodDuration: number;
  defaultBreakDuration: number;
  defaultPreOTBreakDuration: number;
  defaultTimeoutDuration: number;
  maxConcurrentPenalties: number;
  autoStartBreaks: boolean;
  autoStartPreOTBreaks: boolean;
  autoStartTimeouts: boolean;
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
  | { type: 'ADD_PENALTY'; payload: { team: Team; penalty: Omit<Penalty, 'id'> } }
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
  | { type: 'SET_DEFAULT_PERIOD_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_BREAK_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_PRE_OT_BREAK_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_TIMEOUT_DURATION'; payload: number }
  | { type: 'SET_MAX_CONCURRENT_PENALTIES'; payload: number }
  | { type: 'TOGGLE_AUTO_START_BREAKS' }
  | { type: 'TOGGLE_AUTO_START_PRE_OT_BREAKS' }
  | { type: 'TOGGLE_AUTO_START_TIMEOUTS' }
  | { type: 'HYDRATE_FROM_STORAGE'; payload: GameState }
  | { type: 'SET_STATE_FROM_LOCAL_BROADCAST'; payload: GameState };


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
  defaultPeriodDuration: INITIAL_PERIOD_DURATION,
  defaultBreakDuration: INITIAL_BREAK_DURATION,
  defaultPreOTBreakDuration: INITIAL_PRE_OT_BREAK_DURATION,
  defaultTimeoutDuration: INITIAL_TIMEOUT_DURATION,
  maxConcurrentPenalties: INITIAL_MAX_CONCURRENT_PENALTIES,
  autoStartBreaks: INITIAL_AUTO_START_BREAKS,
  autoStartPreOTBreaks: INITIAL_AUTO_START_PRE_OT_BREAKS,
  autoStartTimeouts: INITIAL_AUTO_START_TIMEOUTS,
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
      case 'HYDRATE_FROM_STORAGE':
        // When hydrating, ensure _lastActionOriginator is cleared to avoid conflicts
        // Also, ensure isClockRunning is false on initial load to prevent auto-start from stale state
        return { ...initialGlobalState, ...action.payload, _lastActionOriginator: undefined, isClockRunning: false };
      case 'SET_STATE_FROM_LOCAL_BROADCAST':
        return { ...action.payload, _lastActionOriginator: undefined }; 
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
      case 'SET_PERIOD':
        return {
          ...state,
          currentPeriod: Math.max(1, action.payload),
          periodDisplayOverride: null,
          isClockRunning: false,
          currentTime: state.defaultPeriodDuration,
          preTimeoutState: null,
        };
      case 'RESET_PERIOD_CLOCK':
        return {
          ...state,
          currentTime: state.defaultPeriodDuration,
          isClockRunning: false,
          periodDisplayOverride: null
        };
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

        let homePenalties = state.homePenalties;
        let awayPenalties = state.awayPenalties;

        if (state.periodDisplayOverride === null) {
          const updatePenalties = (penalties: Penalty[], maxConcurrent: number) => {
            let runningCount = 0;
            return penalties.map(p => {
              if (p.remainingTime > 0 && runningCount < maxConcurrent) {
                runningCount++;
                return { ...p, remainingTime: Math.max(0, p.remainingTime - 1) };
              }
              return p;
            }).filter(p => p.remainingTime > 0);
          };
          homePenalties = updatePenalties(state.homePenalties, state.maxConcurrentPenalties);
          awayPenalties = updatePenalties(state.awayPenalties, state.maxConcurrentPenalties);
        }
        
        let newIsClockRunning = state.isClockRunning;
        if (newTime <= 0) {
          newIsClockRunning = false;
        }

        return {
          ...state,
          currentTime: newTime,
          homePenalties,
          awayPenalties,
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
    
        const isPreOT = periodBeforeBreak >= 3;
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
            isClockRunning: false, // Ensure clock is paused when returning from timeout
            periodDisplayOverride: state.preTimeoutState.override,
            preTimeoutState: null,
          };
        }
        return state;
      case 'SET_DEFAULT_PERIOD_DURATION':
        return { ...state, defaultPeriodDuration: Math.max(60, action.payload) };
      case 'SET_DEFAULT_BREAK_DURATION':
        return { ...state, defaultBreakDuration: Math.max(10, action.payload) }; 
      case 'SET_DEFAULT_PRE_OT_BREAK_DURATION':
        return { ...state, defaultPreOTBreakDuration: Math.max(10, action.payload) };
      case 'SET_DEFAULT_TIMEOUT_DURATION':
        return { ...state, defaultTimeoutDuration: Math.max(10, action.payload) };
      case 'SET_MAX_CONCURRENT_PENALTIES':
        return { ...state, maxConcurrentPenalties: Math.max(1, action.payload) };
      case 'TOGGLE_AUTO_START_BREAKS':
        return { ...state, autoStartBreaks: !state.autoStartBreaks };
      case 'TOGGLE_AUTO_START_PRE_OT_BREAKS':
        return { ...state, autoStartPreOTBreaks: !state.autoStartPreOTBreaks };
      case 'TOGGLE_AUTO_START_TIMEOUTS':
        return { ...state, autoStartTimeouts: !state.autoStartTimeouts };
      default:
        return state;
    }
  })();
  
  const nonOriginatorActions: GameAction['type'][] = ['TICK', 'HYDRATE_FROM_STORAGE', 'SET_STATE_FROM_LOCAL_BROADCAST'];
  if (!nonOriginatorActions.includes(action.type)) {
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
    if (typeof window === 'undefined') {
        setIsLoading(false); // No client-side hydration needed on server
        return;
    }

    if (hasHydratedRef.current) {
        setIsLoading(false); // Already hydrated
        return;
    }
    
    hasHydratedRef.current = true;

    try {
      const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedState) {
        const parsedState = JSON.parse(storedState) as GameState;
        // Dispatch HYDRATE, which also sets isClockRunning to false
        dispatch({ type: 'HYDRATE_FROM_STORAGE', payload: parsedState });
      }
    } catch (error) {
      console.error("Error reading state from localStorage for hydration:", error);
    }
    setIsLoading(false);

    if ('BroadcastChannel' in window) {
      if (!channelRef.current) {
        channelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      }
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data._lastActionOriginator && event.data._lastActionOriginator !== TAB_ID) {
          isProcessingBroadcastRef.current = true;
          dispatch({ type: 'SET_STATE_FROM_LOCAL_BROADCAST', payload: event.data });
        }
      };
      channelRef.current.addEventListener('message', handleMessage);

      return () => {
        if (channelRef.current) {
          channelRef.current.removeEventListener('message', handleMessage);
          // Do not close the channel here, as other instances of the provider might still need it.
          // Or, implement a more robust channel management if multiple providers are not expected.
        }
      };
    } else {
      console.warn('BroadcastChannel API not available. Multi-tab sync will not work.');
    }
  }, []); // Empty dependency array ensures this runs once on mount client-side


  useEffect(() => {
    if (isLoading || isProcessingBroadcastRef.current) {
      if (isProcessingBroadcastRef.current) {
          isProcessingBroadcastRef.current = false; 
      }
      return;
    }

    if (state._lastActionOriginator !== TAB_ID) {
      return;
    }
    
    if (typeof window !== 'undefined') {
      try {
        const stateToSave = { ...state };
        delete stateToSave._lastActionOriginator;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));

        if (channelRef.current) {
          channelRef.current.postMessage(state); 
        }
      } catch (error) {
        console.error("Error saving state to localStorage or broadcasting:", error);
      }
    }
  }, [state, isLoading]);

  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (state.isClockRunning && state.currentTime > 0) {
      timerId = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [state.isClockRunning, state.currentTime]);


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

export const getActualPeriodText = (period: number, override: PeriodDisplayOverrideType): string => {
  if (override === "Time Out") return "TIME OUT";
  if (override) return override;
  return getPeriodText(period);
};

export const getPeriodText = (period: number): string => {
    if (period <= 0) return "---";
    if (period <= 3) return `${period}${period === 1 ? 'ST' : period === 2 ? 'ND' : 'RD'}`;
    if (period === 4) return 'OT';
    return `OT${period - 3}`;
};

export const minutesToSeconds = (minutes: number): number => minutes * 60;
export const secondsToMinutes = (seconds: number): number => Math.floor(seconds / 60);
