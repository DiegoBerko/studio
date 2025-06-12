
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
const INITIAL_PERIOD_DURATION = 20 * 60;
const INITIAL_BREAK_DURATION = 120;
const INITIAL_PRE_OT_BREAK_DURATION = 60;
const INITIAL_TIMEOUT_DURATION = 30;
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
  | { type: 'SET_DEFAULT_PERIOD_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_BREAK_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_PRE_OT_BREAK_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_TIMEOUT_DURATION'; payload: number }
  | { type: 'SET_MAX_CONCURRENT_PENALTIES'; payload: number }
  | { type: 'TOGGLE_AUTO_START_BREAKS' } 
  | { type: 'TOGGLE_AUTO_START_PRE_OT_BREAKS' } 
  | { type: 'TOGGLE_AUTO_START_TIMEOUTS' } 
  | { type: 'SET_AUTO_START_BREAKS_VALUE'; payload: boolean }
  | { type: 'SET_AUTO_START_PRE_OT_BREAKS_VALUE'; payload: boolean }
  | { type: 'SET_AUTO_START_TIMEOUTS_VALUE'; payload: boolean }
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
      case 'HYDRATE_FROM_STORAGE': {
        const hydratedState = {
          ...initialGlobalState,
          ...action.payload,
          _lastActionOriginator: undefined,
          isClockRunning: false,
          currentTime: (action.payload && action.payload.defaultPeriodDuration) ? action.payload.defaultPeriodDuration : initialGlobalState.defaultPeriodDuration,
        };
        // Ensure penalties from storage don't have _status
        hydratedState.homePenalties = (action.payload?.homePenalties || []).map(({ _status, ...p }) => p);
        hydratedState.awayPenalties = (action.payload?.awayPenalties || []).map(({ _status, ...p }) => p);
        return hydratedState;
      }
      case 'SET_STATE_FROM_LOCAL_BROADCAST':
        if (JSON.stringify(state) === JSON.stringify(action.payload)) {
          return state;
        }
        // Ensure penalties from broadcast don't have _status upon direct setting
        const receivedState = { ...action.payload, _lastActionOriginator: undefined };
        receivedState.homePenalties = (action.payload.homePenalties || []).map(({ _status, ...p }) => p);
        receivedState.awayPenalties = (action.payload.awayPenalties || []).map(({ _status, ...p }) => p);
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
          return { ...state, isClockRunning: state.currentTime > 0 && state.isClockRunning };
        }
        const newTime = state.currentTime - 1;

        let homePenaltiesResult = state.homePenalties;
        let awayPenaltiesResult = state.awayPenalties;

        if (state.periodDisplayOverride === null) { // Penalties only run during regular play
          const updatePenaltiesForTick = (penalties: Penalty[], maxConcurrent: number): Penalty[] => {
            const resultPenalties: Penalty[] = [];
            const activePlayerTickets: Set<string> = new Set(); // Players who have a penalty running in THIS tick
            let concurrentRunningCount = 0;

            for (const p of penalties) {
              // Penalties that were 0 at the start of this tick are already effectively expired
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
              
              // Add to results if it's still active or just expired while running
              if (newRemainingTime > 0) {
                resultPenalties.push({ ...p, remainingTime: newRemainingTime, _status: status });
              } else if (status === 'running') { // Just expired while running
                resultPenalties.push({ ...p, remainingTime: 0, _status: status });
              } else {
                // If it was pending and initial time was 0 (or became 0 without running),
                // it means it shouldn't have been in the list or is an edge case.
                // Or, if it was pending and now newRemainingTime is 0 (because initial was 0)
                // We only keep it if it has remaining time OR it just expired *while running*.
                // So, if newRemainingTime is 0 and it wasn't 'running', it's effectively gone.
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
        
        // Filter out penalties that are truly done (remainingTime is 0) for the *next* state
        // The `updatePenaltiesForTick` already returns penalties that might have just hit 0 but were running.
        // These will be filtered out at the beginning of the *next* tick.
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
            isClockRunning: false, 
            periodDisplayOverride: state.preTimeoutState.override,
            preTimeoutState: null,
          };
        }
        return state;
      case 'SET_DEFAULT_PERIOD_DURATION':
        return { ...state, defaultPeriodDuration: Math.max(60, action.payload) }; // Min 1 minute
      case 'SET_DEFAULT_BREAK_DURATION':
        return { ...state, defaultBreakDuration: Math.max(1, action.payload) };
      case 'SET_DEFAULT_PRE_OT_BREAK_DURATION':
        return { ...state, defaultPreOTBreakDuration: Math.max(1, action.payload) };
      case 'SET_DEFAULT_TIMEOUT_DURATION':
        return { ...state, defaultTimeoutDuration: Math.max(1, action.payload) };
      case 'SET_MAX_CONCURRENT_PENALTIES':
        return { ...state, maxConcurrentPenalties: Math.max(1, action.payload) };
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
      case 'RESET_GAME_STATE':
        return {
          ...state, 
          homeScore: initialGlobalState.homeScore,
          awayScore: initialGlobalState.awayScore,
          currentTime: state.defaultPeriodDuration, 
          currentPeriod: initialGlobalState.currentPeriod,
          isClockRunning: initialGlobalState.isClockRunning,
          homePenalties: initialGlobalState.homePenalties,
          awayPenalties: initialGlobalState.awayPenalties,
          homeTeamName: initialGlobalState.homeTeamName,
          awayTeamName: initialGlobalState.awayTeamName,
          periodDisplayOverride: initialGlobalState.periodDisplayOverride,
          preTimeoutState: initialGlobalState.preTimeoutState,
        };
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
    let storedState = null;
    try {
      const rawStoredState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (rawStoredState) {
        storedState = JSON.parse(rawStoredState) as Partial<GameState>;
        if (storedState && storedState.defaultPeriodDuration) {
            storedState.currentTime = storedState.defaultPeriodDuration;
        } else {
            storedState.currentTime = initialGlobalState.defaultPeriodDuration;
        }
        storedState.isClockRunning = false; 
        // Ensure penalties from storage don't have _status
        if (storedState.homePenalties) {
          storedState.homePenalties = storedState.homePenalties.map(({ _status, ...p }) => p);
        }
        if (storedState.awayPenalties) {
          storedState.awayPenalties = storedState.awayPenalties.map(({ _status, ...p }) => p);
        }
      }
    } catch (error) {
      console.error("Error reading state from localStorage for hydration:", error);
    }

    dispatch({ type: 'HYDRATE_FROM_STORAGE', payload: storedState || {} });
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
        // Strip _status before saving
        stateToSave.homePenalties = stateToSave.homePenalties.map(({ _status, ...p }) => p);
        stateToSave.awayPenalties = stateToSave.awayPenalties.map(({ _status, ...p }) => p);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));

        if (channelRef.current) {
          const stateToBroadcast = { ...state }; // Original state with _status
          // For broadcast, we can also strip _status if other tabs recalculate it or if it's not strictly needed there.
          // However, if other tabs also display it, they might benefit from receiving it.
          // For now, let's send the state as is, including _status, as other tabs might also be display instances.
          // Correction: to be consistent with HYDRATE_FROM_STORAGE and SET_STATE_FROM_LOCAL_BROADCAST, _status should be stripped
          // if it's only a runtime calculation within the current tab's reducer.
          // But the TICK action *generates* it, so it's part of the state for *this tick*.
          // Let's send state including _status, as it's the result of the reducer for the current tick.
          // Other tabs receiving it via SET_STATE_FROM_LOCAL_BROADCAST will correctly use it.
          // The HYDRATE_FROM_STORAGE only strips it on initial load from persistent storage.
          // Re-evaluating: SET_STATE_FROM_LOCAL_BROADCAST also strips _status. So, it should be stripped before postMessage.
          const finalStateToBroadcast = {...stateToSave}; // Already stripped
          channelRef.current.postMessage(finalStateToBroadcast);
        }
      } catch (error)
{
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

export const minutesToSeconds = (minutes: number | string): number => {
  const numMinutes = typeof minutes === 'string' ? parseInt(minutes, 10) : minutes;
  if (isNaN(numMinutes) || numMinutes < 0) return 0;
  return numMinutes * 60;
};
export const secondsToMinutes = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "0";
  return Math.floor(seconds / 60).toString();
};
    
