
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import type { Penalty, Team } from '@/types';

// --- Constantes para la sincronización local ---
const BROADCAST_CHANNEL_NAME = 'icevision-game-state-channel';
const LOCAL_STORAGE_KEY = 'icevision-game-state';

// Duraciones por defecto iniciales, se guardarán en segundos
const INITIAL_PERIOD_DURATION = 20 * 60;
const INITIAL_BREAK_DURATION = 2 * 60;
const INITIAL_PRE_OT_BREAK_DURATION = 1 * 60;
const INITIAL_MAX_CONCURRENT_PENALTIES = 2;
const INITIAL_AUTO_START_BREAKS = true;
const INITIAL_AUTO_START_PRE_OT_BREAKS = false;

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
  periodDisplayOverride: "Break" | "Pre-OT Break" | null;
  defaultPeriodDuration: number;
  defaultBreakDuration: number;
  defaultPreOTBreakDuration: number;
  maxConcurrentPenalties: number;
  autoStartBreaks: boolean;
  autoStartPreOTBreaks: boolean;
  _lastActionOriginator?: string; // Internal: to help identify if the current tab originated the last state update
}

type GameAction =
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
  | { type: 'SET_DEFAULT_PERIOD_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_BREAK_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_PRE_OT_BREAK_DURATION'; payload: number }
  | { type: 'SET_MAX_CONCURRENT_PENALTIES'; payload: number }
  | { type: 'TOGGLE_AUTO_START_BREAKS' }
  | { type: 'TOGGLE_AUTO_START_PRE_OT_BREAKS' }
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
  maxConcurrentPenalties: INITIAL_MAX_CONCURRENT_PENALTIES,
  autoStartBreaks: INITIAL_AUTO_START_BREAKS,
  autoStartPreOTBreaks: INITIAL_AUTO_START_PRE_OT_BREAKS,
};

const GameStateContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isLoading: boolean; // Kept for potential future use, but local storage is sync
} | undefined>(undefined);

// Helper to generate a unique ID for this tab session for broadcast differentiation
const TAB_ID = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

const gameReducer = (state: GameState, action: GameAction): GameState => {
  // All actions that modify state should set _lastActionOriginator if they are user-initiated
  const newState = ((): GameState => {
    switch (action.type) {
      case 'SET_STATE_FROM_LOCAL_BROADCAST':
        // Only update if the broadcast came from a different tab
        if (action.payload._lastActionOriginator && action.payload._lastActionOriginator !== TAB_ID) {
          return { ...action.payload, _lastActionOriginator: undefined }; // Clear originator after processing
        }
        return state; // Ignore if it's from the same tab or originator is missing
      case 'TOGGLE_CLOCK':
        if (state.currentTime <= 0 && !state.isClockRunning) {
          if (state.periodDisplayOverride !== null) {
            const autoStart = state.periodDisplayOverride === "Break" ? state.autoStartBreaks : state.autoStartPreOTBreaks;
            if (!autoStart && state.currentTime === 0) return state;
          } else if (state.currentTime === 0) {
              return state;
          }
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
          id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).slice(2))
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
      case 'TICK': { // TICK is purely local, does not set originator
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
        };
      case 'START_PRE_OT_BREAK':
          return {
            ...state,
            currentTime: state.defaultPreOTBreakDuration,
            periodDisplayOverride: 'Pre-OT Break',
            isClockRunning: state.autoStartPreOTBreaks,
          };
      case 'START_BREAK_AFTER_PREVIOUS_PERIOD': {
        if (state.currentPeriod <= 1 && state.periodDisplayOverride === null) return state;
        const periodBeforeBreak = state.periodDisplayOverride !== null ? state.currentPeriod : state.currentPeriod -1;
        if (periodBeforeBreak < 1) return state;
        const isPreOT = periodBeforeBreak >= 3;
        return {
          ...state,
          currentPeriod: periodBeforeBreak,
          currentTime: isPreOT ? state.defaultPreOTBreakDuration : state.defaultBreakDuration,
          periodDisplayOverride: isPreOT ? 'Pre-OT Break' : 'Break',
          isClockRunning: isPreOT ? state.autoStartPreOTBreaks : state.autoStartBreaks,
        };
      }
      case 'SET_DEFAULT_PERIOD_DURATION':
        return { ...state, defaultPeriodDuration: Math.max(60, action.payload) };
      case 'SET_DEFAULT_BREAK_DURATION':
        return { ...state, defaultBreakDuration: Math.max(10, action.payload) };
      case 'SET_DEFAULT_PRE_OT_BREAK_DURATION':
        return { ...state, defaultPreOTBreakDuration: Math.max(10, action.payload) };
      case 'SET_MAX_CONCURRENT_PENALTIES':
        return { ...state, maxConcurrentPenalties: Math.max(1, action.payload) };
      case 'TOGGLE_AUTO_START_BREAKS':
        return { ...state, autoStartBreaks: !state.autoStartBreaks };
      case 'TOGGLE_AUTO_START_PRE_OT_BREAKS':
        return { ...state, autoStartPreOTBreaks: !state.autoStartPreOTBreaks };
      default:
        return state;
    }
  })();

  // If action is not TICK or SET_STATE_FROM_LOCAL_BROADCAST, it's user-initiated
  if (action.type !== 'TICK' && action.type !== 'SET_STATE_FROM_LOCAL_BROADCAST') {
    return { ...newState, _lastActionOriginator: TAB_ID };
  }
  return newState;
};


export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = React.useState(true); // Can set to false if local storage is quick enough

  const getInitialState = (): GameState => {
    if (typeof window !== 'undefined') {
      try {
        const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedState) {
          return { ...initialGlobalState, ...JSON.parse(storedState), _lastActionOriginator: undefined };
        }
      } catch (error) {
        console.error("Error reading state from localStorage:", error);
      }
    }
    return {...initialGlobalState, _lastActionOriginator: undefined};
  };
  
  const [state, dispatch] = useReducer(gameReducer, undefined, getInitialState);
  const isProcessingBroadcastRef = useRef(false);

  // BroadcastChannel setup
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data._lastActionOriginator && event.data._lastActionOriginator !== TAB_ID) {
          isProcessingBroadcastRef.current = true;
          dispatch({ type: 'SET_STATE_FROM_LOCAL_BROADCAST', payload: event.data });
          isProcessingBroadcastRef.current = false;
        }
      };
      
      channel.addEventListener('message', handleMessage);
      
      // Initial load complete
      setIsLoading(false);

      return () => {
        if (channel) {
          channel.removeEventListener('message', handleMessage);
          channel.close();
        }
      };
    } else {
      console.warn('BroadcastChannel API not available. Multi-tab sync will not work.');
      setIsLoading(false); // Still finish loading even if BC isn't available
    }
  }, []);


  // Effect to save state to localStorage and broadcast changes
  useEffect(() => {
    // Don't save or broadcast if the change came from a broadcast itself or if it's the initial TICK
    if (isProcessingBroadcastRef.current || !state._lastActionOriginator) {
      return;
    }
    
    if (typeof window !== 'undefined') {
      try {
        const stateToSave = { ...state };
        // Remove internal originator before saving/broadcasting to avoid issues
        delete stateToSave._lastActionOriginator; 
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));

        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME); // Re-open or ensure open
        // We need to re-add _lastActionOriginator specifically for the broadcast message
        channel.postMessage({ ...stateToSave, _lastActionOriginator: TAB_ID }); 
        channel.close(); // Close after posting, or manage a single instance more carefully
      } catch (error) {
        console.error("Error saving state to localStorage or broadcasting:", error);
      }
    }
  }, [state]); // Run whenever state changes

  // Effect for the 1-second tick
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
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const getActualPeriodText = (period: number, override: "Break" | "Pre-OT Break" | null): string => {
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

    