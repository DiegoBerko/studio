
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
const INITIAL_TIMEOUT_DURATION = 60; // 1 minuto por defecto para Time Out
const INITIAL_MAX_CONCURRENT_PENALTIES = 2;
const INITIAL_AUTO_START_BREAKS = true;
const INITIAL_AUTO_START_PRE_OT_BREAKS = false;
const INITIAL_AUTO_START_TIMEOUTS = true; // Timeouts suelen empezar automáticamente

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

type GameAction =
  | { type: 'TOGGLE_CLOCK' }
  | { type: 'SET_TIME'; payload: { minutes: number; seconds: number } }
  | { type: 'ADJUST_TIME'; payload: number }
  | { type: 'SET_PERIOD'; payload: number } // Usado para iniciar un período específico
  | { type: 'RESET_PERIOD_CLOCK' } // No usado actualmente, pero podría ser útil
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
  | { type: 'START_BREAK_AFTER_PREVIOUS_PERIOD' } // Inicia break DESPUÉS del período anterior al actual
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
};

const GameStateContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isLoading: boolean; 
} | undefined>(undefined);

const TAB_ID = typeof window !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

const gameReducer = (state: GameState, action: GameAction): GameState => {
  const newState = ((): GameState => {
    switch (action.type) {
      case 'SET_STATE_FROM_LOCAL_BROADCAST':
        if (action.payload._lastActionOriginator && action.payload._lastActionOriginator !== TAB_ID) {
          return { ...action.payload, _lastActionOriginator: undefined }; 
        }
        return state; 
      case 'TOGGLE_CLOCK':
        if (state.currentTime <= 0 && !state.isClockRunning) {
          // Prevenir inicio si el tiempo es 0, a menos que sea un break/timeout y auto-start esté desactivado
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
      case 'SET_PERIOD': // Usado para avanzar a un período normal desde un break/timeout o directamente
        return {
          ...state,
          currentPeriod: Math.max(1, action.payload),
          periodDisplayOverride: null,
          isClockRunning: false,
          currentTime: state.defaultPeriodDuration,
          preTimeoutState: null, // Limpiar estado de timeout si se salta a un período
        };
      case 'RESET_PERIOD_CLOCK': // No usado actualmente, pero limpia el reloj del período actual
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

        // Penalties only run during normal periods, not breaks or timeouts
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
          preTimeoutState: null, // Clear preTimeoutState if starting a regular break
        };
      case 'START_PRE_OT_BREAK':
          return {
            ...state,
            currentTime: state.defaultPreOTBreakDuration,
            periodDisplayOverride: 'Pre-OT Break',
            isClockRunning: state.autoStartPreOTBreaks,
            preTimeoutState: null, // Clear preTimeoutState
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
          preTimeoutState: null, // Clear preTimeoutState
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
            isClockRunning: state.preTimeoutState.isClockRunning, // Mantener el estado del reloj anterior
            periodDisplayOverride: state.preTimeoutState.override,
            preTimeoutState: null,
          };
        }
        return state; // No hacer nada si no hay preTimeoutState
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

  if (action.type !== 'TICK' && action.type !== 'SET_STATE_FROM_LOCAL_BROADCAST') {
    return { ...newState, _lastActionOriginator: TAB_ID };
  }
  return newState;
};


export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = React.useState(true); 
  const isProcessingBroadcastRef = useRef(false);

  const getInitialState = (): GameState => {
    if (typeof window !== 'undefined') {
      try {
        const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedState) {
          const parsedState = JSON.parse(storedState);
           // Asegurarse de que todos los campos, incluidos los nuevos, estén presentes
          return { ...initialGlobalState, ...parsedState, _lastActionOriginator: undefined, isLoading: false };
        }
      } catch (error) {
        console.error("Error reading state from localStorage:", error);
      }
    }
    return {...initialGlobalState, _lastActionOriginator: undefined, isLoading: false};
  };
  
  const [state, dispatch] = useReducer(gameReducer, undefined, getInitialState);
  
  useEffect(() => {
    setIsLoading(false); // Marcar como cargado después del primer renderizado del estado
  }, []);


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
      
      return () => {
        if (channel) {
          channel.removeEventListener('message', handleMessage);
          channel.close();
        }
      };
    } else {
      console.warn('BroadcastChannel API not available. Multi-tab sync will not work.');
    }
  }, []);


  useEffect(() => {
    if (isProcessingBroadcastRef.current || !state._lastActionOriginator || state._lastActionOriginator !== TAB_ID) {
      return;
    }
    
    if (typeof window !== 'undefined') {
      try {
        const stateToSave = { ...state };
        delete stateToSave._lastActionOriginator; 
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));

        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.postMessage({ ...stateToSave, _lastActionOriginator: TAB_ID }); 
        channel.close(); 
      } catch (error) {
        console.error("Error saving state to localStorage or broadcasting:", error);
      }
    }
  }, [state]); 

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
  if (override) return override; // For "Break" or "Pre-OT Break"
  return getPeriodText(period);
};

export const getPeriodText = (period: number): string => {
    if (period <= 0) return "---";
    if (period <= 3) return `${period}${period === 1 ? 'ST' : period === 2 ? 'ND' : 'RD'}`;
    if (period === 4) return 'OT'; // Primer OT
    return `OT${period - 3}`; // Siguientes OTs: OT2, OT3, etc. (ej. period 5 es OT2)
};

export const minutesToSeconds = (minutes: number): number => minutes * 60;
export const secondsToMinutes = (seconds: number): number => Math.floor(seconds / 60);
    
