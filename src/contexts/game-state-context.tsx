
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { Penalty } from '@/types';

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
  
  // Nuevos campos de configuración
  defaultPeriodDuration: number; // en segundos
  defaultBreakDuration: number; // en segundos
  defaultPreOTBreakDuration: number; // en segundos
  maxConcurrentPenalties: number;
  autoStartBreaks: boolean;
  autoStartPreOTBreaks: boolean;
}

type GameAction =
  | { type: 'TOGGLE_CLOCK' }
  | { type: 'SET_TIME'; payload: { minutes: number; seconds: number } }
  | { type: 'ADJUST_TIME'; payload: number }
  | { type: 'SET_PERIOD'; payload: number } 
  | { type: 'RESET_PERIOD_CLOCK' } 
  | { type: 'SET_SCORE'; payload: { team: 'home' | 'away'; score: number } }
  | { type: 'ADJUST_SCORE'; payload: { team: 'home' | 'away'; delta: number } }
  | { type: 'ADD_PENALTY'; payload: { team: 'home' | 'away'; penalty: Omit<Penalty, 'id'> } }
  | { type: 'REMOVE_PENALTY'; payload: { team: 'home' | 'away'; penaltyId: string } }
  | { type: 'TICK' }
  | { type: 'SET_HOME_TEAM_NAME'; payload: string }
  | { type: 'SET_AWAY_TEAM_NAME'; payload: string }
  | { type: 'START_BREAK' } // Inicia un descanso regular
  | { type: 'START_PRE_OT_BREAK' } // Inicia un descanso antes de OT o entre OTs
  | { type: 'START_BREAK_AFTER_PREVIOUS_PERIOD' }
  | { type: 'SET_DEFAULT_PERIOD_DURATION'; payload: number } // en segundos
  | { type: 'SET_DEFAULT_BREAK_DURATION'; payload: number } // en segundos
  | { type: 'SET_DEFAULT_PRE_OT_BREAK_DURATION'; payload: number } // en segundos
  | { type: 'SET_MAX_CONCURRENT_PENALTIES'; payload: number }
  | { type: 'TOGGLE_AUTO_START_BREAKS' }
  | { type: 'TOGGLE_AUTO_START_PRE_OT_BREAKS' };


const initialState: GameState = {
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
} | undefined>(undefined);

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'TOGGLE_CLOCK':
      if (state.currentTime <= 0 && !state.isClockRunning) { // No iniciar si el tiempo es 0
        // Si es un break y no auto-inicia, o un periodo terminado, no hacer nada.
        if (state.periodDisplayOverride !== null) { // Estamos en un break
          const autoStart = state.periodDisplayOverride === "Break" ? state.autoStartBreaks : state.autoStartPreOTBreaks;
          if (!autoStart && state.currentTime === 0) return state;
        } else if (state.currentTime === 0) { // Periodo terminado
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
      const newPenalty: Penalty = { ...action.payload.penalty, id: Date.now().toString() };
      const penalties = [...state[`${action.payload.team}Penalties`], newPenalty];
      return { ...state, [`${action.payload.team}Penalties`]: penalties };
    }
    case 'REMOVE_PENALTY': {
      const penalties = state[`${action.payload.team}Penalties`].filter(p => p.id !== action.payload.penaltyId);
      return { ...state, [`${action.payload.team}Penalties`]: penalties };
    }
    case 'TICK': {
      if (!state.isClockRunning || state.currentTime <= 0) {
        return { ...state, isClockRunning: false };
      }
      const newTime = state.currentTime - 1;
      
      let homePenalties = state.homePenalties;
      let awayPenalties = state.awayPenalties;

      if (state.periodDisplayOverride === null) { // Penalties only run if not in any kind of break
        const updatePenalties = (penalties: Penalty[], maxConcurrent: number) => {
          let runningCount = 0;
          return penalties.map(p => {
            if (runningCount < maxConcurrent) {
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
      if (newTime <= 0) { // Time reached zero
        newIsClockRunning = false; // Stop the clock
        // If it was a break, check autoStart for the *next* phase (which isn't directly handled here, but clock stops)
        // For simplicity, clock stops. User manually advances or starts.
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

      const isPreOT = periodBeforeBreak >= 3; // Break after P3 or any OT is considered Pre-OT for duration/auto-start
      
      return {
        ...state,
        currentPeriod: periodBeforeBreak, 
        currentTime: isPreOT ? state.defaultPreOTBreakDuration : state.defaultBreakDuration,
        periodDisplayOverride: isPreOT ? 'Pre-OT Break' : 'Break',
        isClockRunning: isPreOT ? state.autoStartPreOTBreaks : state.autoStartBreaks,
      };
    }
    case 'SET_DEFAULT_PERIOD_DURATION':
      return { ...state, defaultPeriodDuration: Math.max(60, action.payload) }; // Min 1 minuto
    case 'SET_DEFAULT_BREAK_DURATION':
      return { ...state, defaultBreakDuration: Math.max(10, action.payload) }; // Min 10 segundos
    case 'SET_DEFAULT_PRE_OT_BREAK_DURATION':
      return { ...state, defaultPreOTBreakDuration: Math.max(10, action.payload) }; // Min 10 segundos
    case 'SET_MAX_CONCURRENT_PENALTIES':
      return { ...state, maxConcurrentPenalties: Math.max(1, action.payload) }; // Min 1
    case 'TOGGLE_AUTO_START_BREAKS':
      return { ...state, autoStartBreaks: !state.autoStartBreaks };
    case 'TOGGLE_AUTO_START_PRE_OT_BREAKS':
      return { ...state, autoStartPreOTBreaks: !state.autoStartPreOTBreaks };
    default:
      return state;
  }
};

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

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
    <GameStateContext.Provider value={{ state, dispatch }}>
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

// Helper para convertir minutos a segundos para el estado
export const minutesToSeconds = (minutes: number): number => minutes * 60;
// Helper para convertir segundos a minutos para mostrar en inputs
export const secondsToMinutes = (seconds: number): number => Math.floor(seconds / 60);

    