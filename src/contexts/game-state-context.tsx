
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { Penalty } from '@/types';

const PERIOD_DURATION = 20 * 60; // 20 minutes in seconds

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
  periodDisplayOverride: string | null;
  configurableBreakMinutes: number; // Duración del break configurable por el usuario
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
  | { type: 'START_BREAK' } // No necesita payload, usará configurableBreakMinutes
  | { type: 'SET_PERIOD_DISPLAY_OVERRIDE'; payload: string | null }
  | { type: 'SET_CONFIGURABLE_BREAK_MINUTES'; payload: number };

const initialState: GameState = {
  homeScore: 0,
  awayScore: 0,
  currentTime: PERIOD_DURATION,
  currentPeriod: 1,
  isClockRunning: false,
  homePenalties: [],
  awayPenalties: [],
  homeTeamName: 'Local',
  awayTeamName: 'Visitante',
  periodDisplayOverride: null,
  configurableBreakMinutes: 2, // Default break time
};

const GameStateContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | undefined>(undefined);

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'TOGGLE_CLOCK':
      if (state.currentTime <= 0 && !state.isClockRunning) return state;
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
        periodDisplayOverride: null, // Salir de modo Break si estaba activo
        isClockRunning: false,
        currentTime: PERIOD_DURATION, // Resetear tiempo a duración estándar del período
      };
    case 'RESET_PERIOD_CLOCK':
      return { 
        ...state, 
        currentTime: PERIOD_DURATION, 
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
      
      // Solo actualizar penalidades si no estamos en Break
      let homePenalties = state.homePenalties;
      let awayPenalties = state.awayPenalties;
      if (state.periodDisplayOverride !== 'Break') {
        const updatePenalties = (penalties: Penalty[]) =>
          penalties
            .map(p => ({ ...p, remainingTime: p.remainingTime - 1 }))
            .filter(p => p.remainingTime > 0);
        homePenalties = updatePenalties(state.homePenalties);
        awayPenalties = updatePenalties(state.awayPenalties);
      }

      return {
        ...state,
        currentTime: newTime,
        homePenalties,
        awayPenalties,
        isClockRunning: newTime > 0,
      };
    }
    case 'SET_HOME_TEAM_NAME':
      return { ...state, homeTeamName: action.payload || 'Local' };
    case 'SET_AWAY_TEAM_NAME':
      return { ...state, awayTeamName: action.payload || 'Visitante' };
    case 'START_BREAK': {
      const breakDurationSeconds = Math.max(1, state.configurableBreakMinutes) * 60;
      return {
        ...state,
        currentTime: breakDurationSeconds,
        periodDisplayOverride: 'Break',
        isClockRunning: true, // Iniciar el reloj automáticamente para el break
      };
    }
    case 'SET_PERIOD_DISPLAY_OVERRIDE':
      return { ...state, periodDisplayOverride: action.payload };
    case 'SET_CONFIGURABLE_BREAK_MINUTES':
      return { ...state, configurableBreakMinutes: Math.max(1, action.payload) }; // Mínimo 1 minuto
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

export const getActualPeriodText = (period: number, override: string | null): string => {
  if (override) return override;
  if (period <= 0) return "---";
  if (period <= 3) return `${period}${period === 1 ? 'ST' : period === 2 ? 'ND' : 'RD'}`;
  if (period === 4) return 'OT';
  return `OT${period - 3}`;
};

export const getPeriodText = (period: number): string => {
    if (period <= 0) return "---";
    if (period <= 3) return `${period}${period === 1 ? 'ST' : period === 2 ? 'ND' : 'RD'}`;
    if (period === 4) return 'OT';
    return `OT${period - 3}`;
};
