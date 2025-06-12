
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
const INITIAL_WARM_UP_DURATION = 5 * 60; // 5 minutos para Warm-up
const INITIAL_PERIOD_DURATION = 20 * 60;
const INITIAL_OT_PERIOD_DURATION = 5 * 60;
const INITIAL_BREAK_DURATION = 120;
const INITIAL_PRE_OT_BREAK_DURATION = 60;
const INITIAL_TIMEOUT_DURATION = 30;
const INITIAL_MAX_CONCURRENT_PENALTIES = 2;
const INITIAL_AUTO_START_WARM_UP = true;
const INITIAL_AUTO_START_BREAKS = true;
const INITIAL_AUTO_START_PRE_OT_BREAKS = false;
const INITIAL_AUTO_START_TIMEOUTS = true;
const INITIAL_NUMBER_OF_REGULAR_PERIODS = 3;
const INITIAL_NUMBER_OF_OVERTIME_PERIODS = 1;

type PeriodDisplayOverrideType = "Warm-up" | "Break" | "Pre-OT Break" | "Time Out" | null;

interface PreTimeoutState {
  period: number;
  time: number;
  isClockRunning: boolean;
  override: PeriodDisplayOverrideType;
  clockStartTimeMs: number | null;
  remainingTimeAtStartSec: number | null;
}

export interface ConfigFields {
  configName: string;
  defaultWarmUpDuration: number;
  defaultPeriodDuration: number;
  defaultOTPeriodDuration: number;
  defaultBreakDuration: number;
  defaultPreOTBreakDuration: number;
  defaultTimeoutDuration: number;
  maxConcurrentPenalties: number;
  autoStartWarmUp: boolean;
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
  currentPeriod: number; // 0 for Warm-up, 1-N for regular, N+ for OT
  isClockRunning: boolean;
  homePenalties: Penalty[];
  awayPenalties: Penalty[];
  homeTeamName: string;
  awayTeamName: string;
  periodDisplayOverride: PeriodDisplayOverrideType;
  preTimeoutState: PreTimeoutState | null;
  clockStartTimeMs: number | null;
  remainingTimeAtStartSec: number | null;
  _lastActionOriginator?: string;
  _lastUpdatedTimestamp?: number;
}

export type GameAction =
  | { type: 'TOGGLE_CLOCK' }
  | { type: 'SET_TIME'; payload: { minutes: number; seconds: number } }
  | { type: 'ADJUST_TIME'; payload: number }
  | { type: 'SET_PERIOD'; payload: number } // payload is the target period number
  | { type: 'RESET_PERIOD_CLOCK' } // Resets clock for current period/override
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
  | { type: 'SET_DEFAULT_WARM_UP_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_PERIOD_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_OT_PERIOD_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_BREAK_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_PRE_OT_BREAK_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_TIMEOUT_DURATION'; payload: number }
  | { type: 'SET_MAX_CONCURRENT_PENALTIES'; payload: number }
  | { type: 'SET_NUMBER_OF_REGULAR_PERIODS'; payload: number }
  | { type: 'SET_NUMBER_OF_OVERTIME_PERIODS'; payload: number }
  | { type: 'SET_AUTO_START_WARM_UP_VALUE'; payload: boolean }
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
  currentPeriod: 0, 
  currentTime: INITIAL_WARM_UP_DURATION,
  isClockRunning: false, 
  periodDisplayOverride: 'Warm-up', 
  homePenalties: [],
  awayPenalties: [],
  homeTeamName: 'Local',
  awayTeamName: 'Visitante',
  configName: INITIAL_CONFIG_NAME,
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
  preTimeoutState: null,
  clockStartTimeMs: null,
  remainingTimeAtStartSec: null,
  _lastActionOriginator: undefined,
  _lastUpdatedTimestamp: undefined,
};

const GameStateContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isLoading: boolean;
} | undefined>(undefined);


// Helper function for automatic transitions, placed outside the reducer
const handleAutoTransition = (currentState: GameState): Omit<GameState, '_lastActionOriginator' | '_lastUpdatedTimestamp'> => {
  const {
    currentPeriod,
    periodDisplayOverride,
    numberOfRegularPeriods,
    numberOfOvertimePeriods,
    defaultPeriodDuration,
    defaultOTPeriodDuration,
    defaultBreakDuration,
    defaultPreOTBreakDuration,
    autoStartBreaks,
    autoStartPreOTBreaks,
    preTimeoutState,
    homePenalties, 
    awayPenalties, 
  } = currentState;

  let newPartialState: Partial<GameState> = {};
  const numRegPeriods = numberOfRegularPeriods;
  const totalGamePeriods = numRegPeriods + numberOfOvertimePeriods;

  if (periodDisplayOverride === 'Warm-up') {
    newPartialState = {
      currentPeriod: 1,
      currentTime: defaultPeriodDuration,
      isClockRunning: false, // Periods start paused
      periodDisplayOverride: null,
    };
  } else if (periodDisplayOverride === 'Break') {
    const nextPeriod = currentPeriod + 1;
    const nextPeriodDuration = nextPeriod > numRegPeriods ? defaultOTPeriodDuration : defaultPeriodDuration;
    newPartialState = {
      currentPeriod: nextPeriod,
      currentTime: nextPeriodDuration,
      isClockRunning: false, // Periods start paused
      periodDisplayOverride: null,
    };
  } else if (periodDisplayOverride === 'Pre-OT Break') {
    const nextPeriod = currentPeriod + 1;
    newPartialState = {
      currentPeriod: nextPeriod,
      currentTime: defaultOTPeriodDuration, // Assumes Pre-OT break always leads to OT
      isClockRunning: false, // Periods start paused
      periodDisplayOverride: null,
    };
  } else if (periodDisplayOverride === 'Time Out') {
    if (preTimeoutState) {
      const { period, time, isClockRunning: preTimeoutIsRunning, override: preTimeoutOverride } = preTimeoutState;
      const shouldResumeClock = preTimeoutIsRunning && time > 0;
      newPartialState = {
        currentPeriod: period,
        currentTime: time,
        isClockRunning: shouldResumeClock,
        periodDisplayOverride: preTimeoutOverride,
        clockStartTimeMs: shouldResumeClock ? Date.now() : null,
        remainingTimeAtStartSec: shouldResumeClock ? time : null,
        preTimeoutState: null,
      };
    } else {
      // Fallback if preTimeoutState is missing (should ideally not happen)
      // Keep current period, just stop clock
      newPartialState = { currentTime: 0, isClockRunning: false, periodDisplayOverride: currentState.periodDisplayOverride };
    }
  } else if (periodDisplayOverride === null) { // Game Period Ended
    if (currentPeriod < numRegPeriods) {
      // End of a regular period, not the last one -> Go to Break
      newPartialState = {
        // currentPeriod remains the same (break is for this period that just ended)
        currentTime: defaultBreakDuration,
        isClockRunning: autoStartBreaks && defaultBreakDuration > 0,
        periodDisplayOverride: 'Break',
        clockStartTimeMs: (autoStartBreaks && defaultBreakDuration > 0) ? Date.now() : null,
        remainingTimeAtStartSec: (autoStartBreaks && defaultBreakDuration > 0) ? defaultBreakDuration : null,
      };
    } else if (currentPeriod === numRegPeriods && numberOfOvertimePeriods > 0) {
      // End of last regular period, OT exists -> Go to Pre-OT Break
      newPartialState = {
        // currentPeriod remains the same
        currentTime: defaultPreOTBreakDuration,
        isClockRunning: autoStartPreOTBreaks && defaultPreOTBreakDuration > 0,
        periodDisplayOverride: 'Pre-OT Break',
        clockStartTimeMs: (autoStartPreOTBreaks && defaultPreOTBreakDuration > 0) ? Date.now() : null,
        remainingTimeAtStartSec: (autoStartPreOTBreaks && defaultPreOTBreakDuration > 0) ? defaultPreOTBreakDuration : null,
      };
    } else if (currentPeriod > numRegPeriods && currentPeriod < totalGamePeriods) {
      // End of an OT period, but not the last OT period -> Go to Pre-OT Break (between OTs)
      newPartialState = {
        // currentPeriod remains the same
        currentTime: defaultPreOTBreakDuration,
        isClockRunning: autoStartPreOTBreaks && defaultPreOTBreakDuration > 0,
        periodDisplayOverride: 'Pre-OT Break',
        clockStartTimeMs: (autoStartPreOTBreaks && defaultPreOTBreakDuration > 0) ? Date.now() : null,
        remainingTimeAtStartSec: (autoStartPreOTBreaks && defaultPreOTBreakDuration > 0) ? defaultPreOTBreakDuration : null,
      };
    } else {
      // End of Game (last regular period with no OT, or last OT period)
      newPartialState = { currentTime: 0, isClockRunning: false };
    }
  } else {
     // Fallback for any unhandled override type when countdown finishes
    newPartialState = { currentTime: 0, isClockRunning: false };
  }

  // Ensure clockStartTimeMs and remainingTimeAtStartSec are null if clock is not running in the new state
  if (!newPartialState.isClockRunning) {
    newPartialState.clockStartTimeMs = null;
    newPartialState.remainingTimeAtStartSec = null;
  }

  // Combine with the base state that had currentTime = 0 and clock stopped
  // and carry over updated penalties
  return {
    ...currentState, // Spreads all properties of currentState
    ...newPartialState, // Overrides specific properties based on transition logic
    homePenalties, 
    awayPenalties,
  };
};


const gameReducer = (state: GameState, action: GameAction): GameState => {
  let newStateWithoutMeta: Omit<GameState, '_lastActionOriginator' | '_lastUpdatedTimestamp'>;
  let newTimestamp = Date.now();

  switch (action.type) {
    case 'HYDRATE_FROM_STORAGE': {
       const hydratedBase: GameState = {
        ...initialGlobalState, 
        ...(action.payload ?? {}),
      };
      
      hydratedBase.isClockRunning = false; 
      hydratedBase.clockStartTimeMs = null;
      hydratedBase.remainingTimeAtStartSec = null;

      const cleanPenaltiesOnHydrate = (penalties?: Penalty[]) => (penalties || []).map(({ _status, ...p }) => p);
      hydratedBase.homePenalties = cleanPenaltiesOnHydrate(action.payload?.homePenalties);
      hydratedBase.awayPenalties = cleanPenaltiesOnHydrate(action.payload?.awayPenalties);

      let initialHydratedTime: number;
      const hydratedPeriod = hydratedBase.currentPeriod ?? initialGlobalState.currentPeriod;
      
      if (hydratedBase.periodDisplayOverride === 'Warm-up' || (hydratedPeriod === 0 && hydratedBase.periodDisplayOverride === null) ) {
        initialHydratedTime = hydratedBase.defaultWarmUpDuration ?? initialGlobalState.defaultWarmUpDuration;
        hydratedBase.periodDisplayOverride = 'Warm-up';
      } else if (hydratedBase.periodDisplayOverride === 'Break') {
        initialHydratedTime = hydratedBase.defaultBreakDuration ?? initialGlobalState.defaultBreakDuration;
      } else if (hydratedBase.periodDisplayOverride === 'Pre-OT Break') {
         initialHydratedTime = hydratedBase.defaultPreOTBreakDuration ?? initialGlobalState.defaultPreOTBreakDuration;
      } else if (hydratedBase.periodDisplayOverride === 'Time Out') {
         initialHydratedTime = hydratedBase.defaultTimeoutDuration ?? initialGlobalState.defaultTimeoutDuration;
         // For timeout, we might also need to restore preTimeoutState, but HYDRATE should simplify.
         // Let's assume timeout ends and hydration restores to the period it was in.
         // If hydration happens *during* a timeout, preTimeoutState should be hydrated too.
      } else if (hydratedPeriod > (hydratedBase.numberOfRegularPeriods ?? initialGlobalState.numberOfRegularPeriods)) { // OT Period
        initialHydratedTime = hydratedBase.defaultOTPeriodDuration ?? initialGlobalState.defaultOTPeriodDuration;
        hydratedBase.periodDisplayOverride = null; 
      } else { // Regular Period
        initialHydratedTime = hydratedBase.defaultPeriodDuration ?? initialGlobalState.defaultPeriodDuration;
        hydratedBase.periodDisplayOverride = null;
      }
      
      // Validate currentTime from storage, or set to determined initialHydratedTime
      if (action.payload?.currentTime === undefined || action.payload.currentTime === null || action.payload.currentTime < 0 || action.payload.currentTime > initialHydratedTime ) {
          hydratedBase.currentTime = initialHydratedTime;
      } else {
          hydratedBase.currentTime = action.payload.currentTime;
      }
      if(hydratedBase.currentTime <=0) {
        hydratedBase.isClockRunning = false;
      }
      
      const { _lastActionOriginator, _lastUpdatedTimestamp, ...restOfHydrated } = hydratedBase;
      newStateWithoutMeta = restOfHydrated;
      return { ...newStateWithoutMeta, _lastActionOriginator: undefined, _lastUpdatedTimestamp: action.payload?._lastUpdatedTimestamp };
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
      
      const { _lastActionOriginator, ...restOfPayload } = action.payload;
      newStateWithoutMeta = restOfPayload;
      return { ...newStateWithoutMeta, _lastActionOriginator: undefined, _lastUpdatedTimestamp: incomingTimestamp };
    }
    case 'TOGGLE_CLOCK': {
      let newCurrentTime = state.currentTime;
      let newIsClockRunning = state.isClockRunning;
      let newClockStartTimeMs = state.clockStartTimeMs;
      let newRemainingTimeAtStartSec = state.remainingTimeAtStartSec;

      if (state.isClockRunning) { // Pausing
        if (state.clockStartTimeMs && state.remainingTimeAtStartSec !== null) {
          const elapsedMs = Date.now() - state.clockStartTimeMs;
          const elapsedSec = Math.floor(elapsedMs / 1000);
          newCurrentTime = Math.max(0, state.remainingTimeAtStartSec - elapsedSec);
        }
        newIsClockRunning = false;
        newClockStartTimeMs = null;
        newRemainingTimeAtStartSec = null;
      } else { // Starting
        if (state.currentTime > 0) {
          newIsClockRunning = true;
          newClockStartTimeMs = Date.now();
          newRemainingTimeAtStartSec = state.currentTime;
        } else { 
          newIsClockRunning = false;
          newClockStartTimeMs = null;
          newRemainingTimeAtStartSec = null;
        }
      }
      newStateWithoutMeta = { 
        ...state, 
        currentTime: newCurrentTime,
        isClockRunning: newIsClockRunning,
        clockStartTimeMs: newClockStartTimeMs,
        remainingTimeAtStartSec: newRemainingTimeAtStartSec,
      };
      break;
    }
    case 'SET_TIME': {
      const newTime = Math.max(0, action.payload.minutes * 60 + action.payload.seconds);
      const newIsClockRunning = newTime > 0 ? state.isClockRunning : false; // Keep running state if time set > 0, otherwise stop.
      newStateWithoutMeta = { 
        ...state, 
        currentTime: newTime,
        isClockRunning: newIsClockRunning,
        clockStartTimeMs: newIsClockRunning ? Date.now() : null,
        remainingTimeAtStartSec: newIsClockRunning ? newTime : null,
       };
      if (!newIsClockRunning) { // Ensure these are null if clock is stopped
        newStateWithoutMeta.clockStartTimeMs = null;
        newStateWithoutMeta.remainingTimeAtStartSec = null;
      }
      break;
    }
    case 'ADJUST_TIME': {
      let currentTimeSnapshot = state.currentTime;
      if (state.isClockRunning && state.clockStartTimeMs && state.remainingTimeAtStartSec !== null) {
        const elapsedMs = Date.now() - state.clockStartTimeMs;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        currentTimeSnapshot = Math.max(0, state.remainingTimeAtStartSec - elapsedSec);
      }
      const newAdjustedTime = Math.max(0, currentTimeSnapshot + action.payload);
      
      const newIsClockRunning = newAdjustedTime > 0 ? state.isClockRunning : false;
      newStateWithoutMeta = { 
        ...state, 
        currentTime: newAdjustedTime,
        isClockRunning: newIsClockRunning,
        clockStartTimeMs: newIsClockRunning ? Date.now() : null, 
        remainingTimeAtStartSec: newIsClockRunning ? newAdjustedTime : null,
      };
       if (!newIsClockRunning) {
        newStateWithoutMeta.clockStartTimeMs = null;
        newStateWithoutMeta.remainingTimeAtStartSec = null;
      }
      break;
    }
    case 'SET_PERIOD': {
      const newPeriod = Math.max(0, action.payload); 
      let periodDuration: number;
      let displayOverride: PeriodDisplayOverrideType;
      let autoStartClock: boolean;

      if (newPeriod === 0) { 
        periodDuration = state.defaultWarmUpDuration;
        displayOverride = 'Warm-up';
        autoStartClock = state.autoStartWarmUp && periodDuration > 0;
      } else if (newPeriod > state.numberOfRegularPeriods) { 
        periodDuration = state.defaultOTPeriodDuration;
        displayOverride = null;
        autoStartClock = false; 
      } else { 
        periodDuration = state.defaultPeriodDuration;
        displayOverride = null;
        autoStartClock = false; 
      }

      newStateWithoutMeta = {
        ...state,
        currentPeriod: newPeriod,
        periodDisplayOverride: displayOverride,
        currentTime: periodDuration,
        isClockRunning: autoStartClock,
        preTimeoutState: null,
        clockStartTimeMs: autoStartClock ? Date.now() : null,
        remainingTimeAtStartSec: autoStartClock ? periodDuration : null,
      };
      break;
    }
    case 'RESET_PERIOD_CLOCK': {
      let newTime: number;
      let autoStart = false;
      if (state.periodDisplayOverride === 'Warm-up' || (state.currentPeriod === 0 && state.periodDisplayOverride === null)) {
        newTime = state.defaultWarmUpDuration;
        autoStart = state.autoStartWarmUp && newTime > 0;
      } else if (state.periodDisplayOverride === 'Break') {
        newTime = state.defaultBreakDuration;
        autoStart = state.autoStartBreaks && newTime > 0;
      } else if (state.periodDisplayOverride === 'Pre-OT Break') {
        newTime = state.defaultPreOTBreakDuration;
        autoStart = state.autoStartPreOTBreaks && newTime > 0;
      } else if (state.periodDisplayOverride === 'Time Out') {
        newTime = state.defaultTimeoutDuration;
        autoStart = state.autoStartTimeouts && newTime > 0;
      } else if (state.currentPeriod > state.numberOfRegularPeriods) { // OT
        newTime = state.defaultOTPeriodDuration;
      } else { // Regular Period
        newTime = state.defaultPeriodDuration;
      }
      newStateWithoutMeta = {
        ...state,
        currentTime: newTime,
        isClockRunning: autoStart,
        clockStartTimeMs: autoStart ? Date.now() : null,
        remainingTimeAtStartSec: autoStart ? newTime : null,
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
      let newCurrentTime = state.currentTime;
      let newIsClockRunning = state.isClockRunning;

      let homePenaltiesResult = state.homePenalties;
      let awayPenaltiesResult = state.awayPenalties;

      // Penalties tick if game clock *was* running for a game period and had time
      if (state.isClockRunning && state.periodDisplayOverride === null && state.currentPeriod > 0 && state.currentTime > 0) {
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
              if (newRemainingTimeForPenalty > 0) { 
                  activePlayerTickets.add(p.playerNumber);
              }
              concurrentRunningCount++;
            } else {
              status = 'pending_concurrent';
            }
            
            if (newRemainingTimeForPenalty > 0 || (status === 'running' && newRemainingTimeForPenalty === 0 && p.remainingTime > 0) ) {
               resultPenalties.push({ ...p, remainingTime: newRemainingTimeForPenalty, _status: status });
            }
          }
          return resultPenalties;
        };
        homePenaltiesResult = updatePenaltiesForTick(state.homePenalties, state.maxConcurrentPenalties);
        awayPenaltiesResult = updatePenaltiesForTick(state.awayPenalties, state.maxConcurrentPenalties);
      }

      if (state.isClockRunning && state.clockStartTimeMs && state.remainingTimeAtStartSec !== null) {
        const elapsedMs = Date.now() - state.clockStartTimeMs;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        const calculatedTime = state.remainingTimeAtStartSec - elapsedSec;

        if (calculatedTime <= 0) {
          // Countdown finished!
          const baseStateForTransition = {
            ...state,
            currentTime: 0, // Explicitly set to 0 before transition
            isClockRunning: false,
            clockStartTimeMs: null,
            remainingTimeAtStartSec: null,
            homePenalties: homePenaltiesResult, 
            awayPenalties: awayPenaltiesResult,
          };
          newStateWithoutMeta = handleAutoTransition(baseStateForTransition);
        } else { // Clock is still running, time > 0
          newCurrentTime = calculatedTime;
           newStateWithoutMeta = {
            ...state,
            currentTime: newCurrentTime,
            // isClockRunning, clockStartTimeMs, remainingTimeAtStartSec remain from state
            homePenalties: homePenaltiesResult,
            awayPenalties: awayPenaltiesResult,
          };
        }
      } else if (state.isClockRunning && state.currentTime <= 0) { 
        // Clock was running but time was already 0 (e.g. manually set to 0 then TICK)
        // Or, clock was running, but clockStartTimeMs/remainingTimeAtStartSec was null
        newStateWithoutMeta = { 
            ...state,
            isClockRunning: false, // Ensure clock is stopped
            clockStartTimeMs: null,
            remainingTimeAtStartSec: null,
            homePenalties: homePenaltiesResult,
            awayPenalties: awayPenaltiesResult,
          };
      } else { // Clock was not running.
          newStateWithoutMeta = {
            ...state, 
            homePenalties: homePenaltiesResult, // Still update penalties if they were changed (e.g. manually)
            awayPenalties: awayPenaltiesResult,
          };
      }
      break;
    }
    case 'SET_HOME_TEAM_NAME':
      newStateWithoutMeta = { ...state, homeTeamName: action.payload || 'Local' };
      break;
    case 'SET_AWAY_TEAM_NAME':
      newStateWithoutMeta = { ...state, awayTeamName: action.payload || 'Visitante' };
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
        remainingTimeAtStartSec: autoStart ? state.defaultBreakDuration : null,
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
        remainingTimeAtStartSec: autoStart ? state.defaultPreOTBreakDuration : null,
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
      const breakDuration = isPreOT ? state.defaultPreOTBreakDuration : state.defaultBreakDuration;
      const autoStart = isPreOT ? state.autoStartPreOTBreaks : state.autoStartBreaks;

      newStateWithoutMeta = {
        ...state,
        currentPeriod: periodBeforeBreak, 
        currentTime: breakDuration,
        periodDisplayOverride: isPreOT ? 'Pre-OT Break' : 'Break',
        isClockRunning: autoStart && breakDuration > 0,
        preTimeoutState: null,
        clockStartTimeMs: autoStart && breakDuration > 0 ? Date.now() : null,
        remainingTimeAtStartSec: autoStart && breakDuration > 0 ? breakDuration : null,
      };
      break;
    }
    case 'START_TIMEOUT': {
      let preciseCurrentTime = state.currentTime;
      let preTimeoutIsRunning = state.isClockRunning;
      let preTimeoutClockStart = state.clockStartTimeMs;
      let preTimeoutRemaining = state.remainingTimeAtStartSec;

      if (state.isClockRunning && state.clockStartTimeMs && state.remainingTimeAtStartSec !== null) { 
        const elapsedMs = Date.now() - state.clockStartTimeMs;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        preciseCurrentTime = Math.max(0, state.remainingTimeAtStartSec - elapsedSec);
      }
      
      const autoStart = state.autoStartTimeouts && state.defaultTimeoutDuration > 0;
      newStateWithoutMeta = {
        ...state,
        preTimeoutState: {
          period: state.currentPeriod,
          time: preciseCurrentTime,
          isClockRunning: preTimeoutIsRunning,
          override: state.periodDisplayOverride,
          clockStartTimeMs: preTimeoutClockStart, 
          remainingTimeAtStartSec: preTimeoutRemaining,
        },
        currentTime: state.defaultTimeoutDuration,
        periodDisplayOverride: 'Time Out',
        isClockRunning: autoStart,
        clockStartTimeMs: autoStart ? Date.now() : null,
        remainingTimeAtStartSec: autoStart ? state.defaultTimeoutDuration : null,
      };
      break;
    }
    case 'END_TIMEOUT':
      if (state.preTimeoutState) {
        const { period, time, isClockRunning: preTimeoutIsRunning, override: preTimeoutOverride, clockStartTimeMs: preTimeoutClockStart, remainingTimeAtStartSec: preTimeoutRemaining } = state.preTimeoutState;
        const shouldResumeClock = preTimeoutIsRunning && time > 0;
        newStateWithoutMeta = {
          ...state,
          currentPeriod: period,
          currentTime: time,
          isClockRunning: shouldResumeClock,
          periodDisplayOverride: preTimeoutOverride,
          clockStartTimeMs: shouldResumeClock ? Date.now() : null, // Recalculate actual start if resuming
          remainingTimeAtStartSec: shouldResumeClock ? time : null,
          preTimeoutState: null,
        };
      } else {
        newStateWithoutMeta = state; // Should not happen if timeout was started correctly
      }
      break;
    case 'SET_CONFIG_NAME':
      newStateWithoutMeta = { ...state, configName: action.payload || initialGlobalState.configName };
      break;
    case 'SET_DEFAULT_WARM_UP_DURATION':
      newStateWithoutMeta = { ...state, defaultWarmUpDuration: Math.max(60, action.payload) };
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
    case 'SET_AUTO_START_WARM_UP_VALUE':
      newStateWithoutMeta = { ...state, autoStartWarmUp: action.payload };
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
        defaultWarmUpDuration: config.defaultWarmUpDuration ?? state.defaultWarmUpDuration,
        defaultPeriodDuration: config.defaultPeriodDuration ?? state.defaultPeriodDuration,
        defaultOTPeriodDuration: config.defaultOTPeriodDuration ?? state.defaultOTPeriodDuration,
        defaultBreakDuration: config.defaultBreakDuration ?? state.defaultBreakDuration,
        defaultPreOTBreakDuration: config.defaultPreOTBreakDuration ?? state.defaultPreOTBreakDuration,
        defaultTimeoutDuration: config.defaultTimeoutDuration ?? state.defaultTimeoutDuration,
        maxConcurrentPenalties: config.maxConcurrentPenalties ?? state.maxConcurrentPenalties,
        autoStartWarmUp: config.autoStartWarmUp ?? state.autoStartWarmUp,
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
      
      const initialClockTime = state.defaultWarmUpDuration ?? initialsToKeepConfig.defaultWarmUpDuration;
      const autoStart = state.autoStartWarmUp ?? initialsToKeepConfig.autoStartWarmUp;

      newStateWithoutMeta = {
        ...state, 
        homeScore: initialsToKeepConfig.homeScore,
        awayScore: initialsToKeepConfig.awayScore,
        currentPeriod: 0, 
        currentTime: initialClockTime,
        isClockRunning: autoStart && initialClockTime > 0, 
        homePenalties: initialsToKeepConfig.homePenalties,
        awayPenalties: initialsToKeepConfig.awayPenalties,
        homeTeamName: initialsToKeepConfig.homeTeamName,
        awayTeamName: initialsToKeepConfig.awayTeamName,
        periodDisplayOverride: 'Warm-up',
        preTimeoutState: initialsToKeepConfig.preTimeoutState,
        clockStartTimeMs: (autoStart && initialClockTime > 0) ? Date.now() : null,
        remainingTimeAtStartSec: (autoStart && initialClockTime > 0) ? initialClockTime : null,
      };
      break;
    }
    default:
      newStateWithoutMeta = state; 
      newTimestamp = state._lastUpdatedTimestamp || Date.now();
      break;
  }

  const nonOriginatingActionTypes: GameAction['type'][] = ['HYDRATE_FROM_STORAGE', 'SET_STATE_FROM_LOCAL_BROADCAST'];
  if (nonOriginatingActionTypes.includes(action.type)) {
    return { ...newStateWithoutMeta, _lastActionOriginator: undefined, _lastUpdatedTimestamp: (newStateWithoutMeta as GameState)._lastUpdatedTimestamp };
  } else if (action.type === 'TICK' && !state.isClockRunning && !newStateWithoutMeta.isClockRunning) {
    // If TICK was called but clock wasn't running and still isn't, don't update originator/timestamp
    // unless the TICK action *itself* caused a state change (e.g. auto-transition from 0)
    // The auto-transition logic within TICK should result in newStateWithoutMeta being different from state.
    if (JSON.stringify(state) === JSON.stringify(newStateWithoutMeta)) { // Simple check for no actual state change
        return { ...newStateWithoutMeta, _lastActionOriginator: state._lastActionOriginator, _lastUpdatedTimestamp: state._lastUpdatedTimestamp };
    }
  }
  
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
            const receivedState = event.data as GameState;
            dispatch({ type: 'SET_STATE_FROM_LOCAL_BROADCAST', payload: receivedState });
        }
      };
      channelRef.current.addEventListener('message', handleMessage);

      return () => {
        if (channelRef.current) {
          channelRef.current.removeEventListener('message', handleMessage);
          // Consider closing the channel if this is the last provider instance, though tricky to determine.
          // For now, just remove listener.
        }
      };
    } else {
      console.warn('BroadcastChannel API not available. Multi-tab sync will not work.');
    }
  }, []); 


  useEffect(() => {
    if (isLoading || typeof window === 'undefined' || state._lastActionOriginator !== TAB_ID) {
      return;
    }

    try {
      const stateForStorage = { ...state };
      const cleanPenalties = (penalties: Penalty[]) => (penalties || []).map(({ _status, ...p }) => p);
      stateForStorage.homePenalties = cleanPenalties(state.homePenalties);
      stateForStorage.awayPenalties = cleanPenalties(state.awayPenalties);
      
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
      }, 1000);
    }
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [state.isClockRunning, state.clockStartTimeMs, state.remainingTimeAtStartSec, isPageVisible]); // Added clockStartTimeMs and remainingTimeAtStartSec to ensure timer restarts if these change while running.


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

