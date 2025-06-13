
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react';
import type { Penalty, Team } from '@/types';

// --- Constantes para la sincronización local ---
const BROADCAST_CHANNEL_NAME = 'icevision-game-state-channel';
const LOCAL_STORAGE_KEY = 'icevision-game-state';
const CENTISECONDS_PER_SECOND = 100;
const TICK_INTERVAL_MS = 50; 

// TAB_ID: Generado una vez por pestaña/contexto del navegador.
let TAB_ID: string;
if (typeof window !== 'undefined') {
  TAB_ID = crypto.randomUUID();
} else {
  TAB_ID = 'server-tab-id-' + Math.random().toString(36).substring(2);
}


// Duraciones por defecto iniciales, se guardarán en centésimas de segundo
const INITIAL_CONFIG_NAME = "Configuración Predeterminada";
const INITIAL_WARM_UP_DURATION = 5 * 60 * CENTISECONDS_PER_SECOND; 
const INITIAL_PERIOD_DURATION = 20 * 60 * CENTISECONDS_PER_SECOND; 
const INITIAL_OT_PERIOD_DURATION = 5 * 60 * CENTISECONDS_PER_SECOND; 
const INITIAL_BREAK_DURATION = 2 * 60 * CENTISECONDS_PER_SECOND; 
const INITIAL_PRE_OT_BREAK_DURATION = 60 * CENTISECONDS_PER_SECOND; 
const INITIAL_TIMEOUT_DURATION = 30 * CENTISECONDS_PER_SECOND; 
const INITIAL_MAX_CONCURRENT_PENALTIES = 2;
const INITIAL_AUTO_START_WARM_UP = true;
const INITIAL_AUTO_START_BREAKS = true;
const INITIAL_AUTO_START_PRE_OT_BREAKS = false;
const INITIAL_AUTO_START_TIMEOUTS = true;
const INITIAL_NUMBER_OF_REGULAR_PERIODS = 2; 
const INITIAL_NUMBER_OF_OVERTIME_PERIODS = 0; 
const INITIAL_PLAYERS_PER_TEAM_ON_ICE = 5;

type PeriodDisplayOverrideType = "Warm-up" | "Break" | "Pre-OT Break" | "Time Out" | null;

interface PreTimeoutState {
  period: number;
  time: number; // Stored in centiseconds
  isClockRunning: boolean;
  override: PeriodDisplayOverrideType;
  clockStartTimeMs: number | null;
  remainingTimeAtStartCs: number | null; // Stored in centiseconds
}

export interface ConfigFields {
  configName: string;
  defaultWarmUpDuration: number; // Stored in centiseconds
  defaultPeriodDuration: number; // Stored in centiseconds
  defaultOTPeriodDuration: number; // Stored in centiseconds
  defaultBreakDuration: number; // Stored in centiseconds
  defaultPreOTBreakDuration: number; // Stored in centiseconds
  defaultTimeoutDuration: number; // Stored in centiseconds
  maxConcurrentPenalties: number;
  autoStartWarmUp: boolean;
  autoStartBreaks: boolean;
  autoStartPreOTBreaks: boolean;
  autoStartTimeouts: boolean;
  numberOfRegularPeriods: number;
  numberOfOvertimePeriods: number;
  playersPerTeamOnIce: number;
}

interface GameState extends ConfigFields {
  homeScore: number;
  awayScore: number;
  currentTime: number; // in centiseconds
  currentPeriod: number; // 0 for Warm-up, 1-N for regular, N+ for OT
  isClockRunning: boolean;
  homePenalties: Penalty[];
  awayPenalties: Penalty[];
  homeTeamName: string;
  awayTeamName: string;
  periodDisplayOverride: PeriodDisplayOverrideType;
  preTimeoutState: PreTimeoutState | null;
  clockStartTimeMs: number | null;
  remainingTimeAtStartCs: number | null; // in centiseconds
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
  | { type: 'SET_DEFAULT_WARM_UP_DURATION'; payload: number } 
  | { type: 'SET_DEFAULT_PERIOD_DURATION'; payload: number } 
  | { type: 'SET_DEFAULT_OT_PERIOD_DURATION'; payload: number } 
  | { type: 'SET_DEFAULT_BREAK_DURATION'; payload: number } 
  | { type: 'SET_DEFAULT_PRE_OT_BREAK_DURATION'; payload: number } 
  | { type: 'SET_DEFAULT_TIMEOUT_DURATION'; payload: number } 
  | { type: 'SET_MAX_CONCURRENT_PENALTIES'; payload: number }
  | { type: 'SET_NUMBER_OF_REGULAR_PERIODS'; payload: number }
  | { type: 'SET_NUMBER_OF_OVERTIME_PERIODS'; payload: number }
  | { type: 'SET_PLAYERS_PER_TEAM_ON_ICE'; payload: number }
  | { type: 'SET_AUTO_START_WARM_UP_VALUE'; payload: boolean }
  | { type: 'SET_AUTO_START_BREAKS_VALUE'; payload: boolean }
  | { type: 'SET_AUTO_START_PRE_OT_BREAKS_VALUE'; payload: boolean }
  | { type: 'SET_AUTO_START_TIMEOUTS_VALUE'; payload: boolean }
  | { type: 'LOAD_CONFIG_FROM_FILE'; payload: Partial<ConfigFields> } 
  | { type: 'HYDRATE_FROM_STORAGE'; payload: Partial<GameState> } 
  | { type: 'SET_STATE_FROM_LOCAL_BROADCAST'; payload: GameState }
  | { type: 'RESET_CONFIG_TO_DEFAULTS' }
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
  playersPerTeamOnIce: INITIAL_PLAYERS_PER_TEAM_ON_ICE,
  preTimeoutState: null,
  clockStartTimeMs: null,
  remainingTimeAtStartCs: null,
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
      isClockRunning: false, 
      periodDisplayOverride: null,
    };
  } else if (periodDisplayOverride === 'Break') {
    const nextPeriod = currentPeriod + 1;
    const nextPeriodDuration = nextPeriod > numRegPeriods ? defaultOTPeriodDuration : defaultPeriodDuration;
    newPartialState = {
      currentPeriod: nextPeriod,
      currentTime: nextPeriodDuration,
      isClockRunning: false, 
      periodDisplayOverride: null,
    };
  } else if (periodDisplayOverride === 'Pre-OT Break') {
    const nextPeriod = currentPeriod + 1;
    newPartialState = {
      currentPeriod: nextPeriod,
      currentTime: defaultOTPeriodDuration, 
      isClockRunning: false, 
      periodDisplayOverride: null,
    };
  } else if (periodDisplayOverride === 'Time Out') {
    if (preTimeoutState) {
      const { period, time, isClockRunning: preTimeoutIsRunning, override: preTimeoutOverride, clockStartTimeMs: preTimeoutClockStart, remainingTimeAtStartCs: preTimeoutRemaining } = preTimeoutState;
      const shouldResumeClock = preTimeoutIsRunning && time > 0;
      newPartialState = {
        currentPeriod: period,
        currentTime: time,
        isClockRunning: shouldResumeClock,
        periodDisplayOverride: preTimeoutOverride,
        clockStartTimeMs: shouldResumeClock ? Date.now() : null,
        remainingTimeAtStartCs: shouldResumeClock ? time : null,
        preTimeoutState: null,
      };
    } else {
      newPartialState = { currentTime: 0, isClockRunning: false, periodDisplayOverride: currentState.periodDisplayOverride };
    }
  } else if (periodDisplayOverride === null) { // Game Period Ended
    if (currentPeriod < numRegPeriods) {
      newPartialState = {
        currentTime: defaultBreakDuration,
        isClockRunning: autoStartBreaks && defaultBreakDuration > 0,
        periodDisplayOverride: 'Break',
        clockStartTimeMs: (autoStartBreaks && defaultBreakDuration > 0) ? Date.now() : null,
        remainingTimeAtStartCs: (autoStartBreaks && defaultBreakDuration > 0) ? defaultBreakDuration : null,
      };
    } else if (currentPeriod === numRegPeriods && numberOfOvertimePeriods > 0) {
      newPartialState = {
        currentTime: defaultPreOTBreakDuration,
        isClockRunning: autoStartPreOTBreaks && defaultPreOTBreakDuration > 0,
        periodDisplayOverride: 'Pre-OT Break',
        clockStartTimeMs: (autoStartPreOTBreaks && defaultPreOTBreakDuration > 0) ? Date.now() : null,
        remainingTimeAtStartCs: (autoStartPreOTBreaks && defaultPreOTBreakDuration > 0) ? defaultPreOTBreakDuration : null,
      };
    } else if (currentPeriod > numRegPeriods && currentPeriod < totalGamePeriods) {
      newPartialState = {
        currentTime: defaultPreOTBreakDuration,
        isClockRunning: autoStartPreOTBreaks && defaultPreOTBreakDuration > 0,
        periodDisplayOverride: 'Pre-OT Break',
        clockStartTimeMs: (autoStartPreOTBreaks && defaultPreOTBreakDuration > 0) ? Date.now() : null,
        remainingTimeAtStartCs: (autoStartPreOTBreaks && defaultPreOTBreakDuration > 0) ? defaultPreOTBreakDuration : null,
      };
    } else { // End of game
      newPartialState = { currentTime: 0, isClockRunning: false };
    }
  } else { // Should not happen, but as a fallback
    newPartialState = { currentTime: 0, isClockRunning: false };
  }

  if (!newPartialState.isClockRunning) {
    newPartialState.clockStartTimeMs = null;
    newPartialState.remainingTimeAtStartCs = null;
  }

  return {
    ...currentState, 
    ...newPartialState, 
    homePenalties, 
    awayPenalties,
  };
};

const updatePenaltyStatusesOnly = (penalties: Penalty[], maxConcurrent: number): Penalty[] => {
  const newPenalties: Penalty[] = [];
  const activePlayerTickets: Set<string> = new Set();
  let concurrentRunningCount = 0;

  for (const p of penalties) {
    let currentStatus: Penalty['_status'] = undefined;
    // Penalties with no time left don't need a status related to running/pending
    if (p.remainingTime <= 0) {
      newPenalties.push({ ...p, _status: undefined });
      continue;
    }

    if (activePlayerTickets.has(p.playerNumber)) {
      currentStatus = 'pending_player';
    } else if (concurrentRunningCount < maxConcurrent) {
      currentStatus = 'running';
      // Add to activePlayerTickets only if it's actually running and has time.
      // This ensures a player with multiple penalties serves them one by one.
      activePlayerTickets.add(p.playerNumber);
      concurrentRunningCount++;
    } else {
      currentStatus = 'pending_concurrent';
    }
    newPenalties.push({ ...p, _status: currentStatus });
  }
  return newPenalties;
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
      hydratedBase.remainingTimeAtStartCs = null;

      const cleanPenaltiesOnHydrate = (penalties?: Penalty[]) => (penalties || []).map(({ _status, ...p }) => p);
      
      let rawHomePenalties = cleanPenaltiesOnHydrate(action.payload?.homePenalties);
      let rawAwayPenalties = cleanPenaltiesOnHydrate(action.payload?.awayPenalties);

      hydratedBase.homePenalties = updatePenaltyStatusesOnly(rawHomePenalties, hydratedBase.maxConcurrentPenalties ?? initialGlobalState.maxConcurrentPenalties);
      hydratedBase.awayPenalties = updatePenaltyStatusesOnly(rawAwayPenalties, hydratedBase.maxConcurrentPenalties ?? initialGlobalState.maxConcurrentPenalties);


      let initialHydratedTimeCs: number;
      const hydratedPeriod = hydratedBase.currentPeriod ?? initialGlobalState.currentPeriod;
      const hydratedWarmUpDurationCs = hydratedBase.defaultWarmUpDuration ?? initialGlobalState.defaultWarmUpDuration;
      const hydratedPeriodDurationCs = hydratedBase.defaultPeriodDuration ?? initialGlobalState.defaultPeriodDuration;
      const hydratedOTPeriodDurationCs = hydratedBase.defaultOTPeriodDuration ?? initialGlobalState.defaultOTPeriodDuration;
      const hydratedBreakDurationCs = hydratedBase.defaultBreakDuration ?? initialGlobalState.defaultBreakDuration;
      const hydratedPreOTBreakDurationCs = hydratedBase.defaultPreOTBreakDuration ?? initialGlobalState.defaultPreOTBreakDuration;
      const hydratedTimeoutDurationCs = hydratedBase.defaultTimeoutDuration ?? initialGlobalState.defaultTimeoutDuration;
      const hydratedNumberOfRegularPeriods = hydratedBase.numberOfRegularPeriods ?? initialGlobalState.numberOfRegularPeriods;
      
      if (hydratedBase.periodDisplayOverride === 'Warm-up' || (hydratedPeriod === 0 && hydratedBase.periodDisplayOverride === null) ) {
        initialHydratedTimeCs = hydratedWarmUpDurationCs;
        hydratedBase.periodDisplayOverride = 'Warm-up';
        hydratedBase.currentPeriod = 0;
      } else if (hydratedBase.periodDisplayOverride === 'Break') {
        initialHydratedTimeCs = hydratedBreakDurationCs;
      } else if (hydratedBase.periodDisplayOverride === 'Pre-OT Break') {
         initialHydratedTimeCs = hydratedPreOTBreakDurationCs;
      } else if (hydratedBase.periodDisplayOverride === 'Time Out') {
         if (hydratedBase.preTimeoutState) {
            initialHydratedTimeCs = hydratedTimeoutDurationCs;
         } else {
            initialHydratedTimeCs = hydratedTimeoutDurationCs;
         }
      } else if (hydratedPeriod > hydratedNumberOfRegularPeriods) { 
        initialHydratedTimeCs = hydratedOTPeriodDurationCs;
        hydratedBase.periodDisplayOverride = null; 
      } else { 
        initialHydratedTimeCs = hydratedPeriodDurationCs;
        hydratedBase.periodDisplayOverride = null;
      }
      
      if (action.payload?.currentTime === undefined || action.payload.currentTime === null || action.payload.currentTime < 0 || action.payload.currentTime > initialHydratedTimeCs ) {
          hydratedBase.currentTime = initialHydratedTimeCs;
      } else {
          hydratedBase.currentTime = action.payload.currentTime;
      }

      if(hydratedBase.currentTime <=0 && hydratedBase.periodDisplayOverride !== 'Time Out' && !(hydratedBase.periodDisplayOverride === null && hydratedBase.currentPeriod === 0)) {
        hydratedBase.isClockRunning = false;
      } else if (hydratedBase.periodDisplayOverride === 'Time Out' && hydratedBase.currentTime <= 0) {
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
      let newCurrentTimeCs = state.currentTime;
      let newIsClockRunning = state.isClockRunning;
      let newClockStartTimeMs = state.clockStartTimeMs;
      let newRemainingTimeAtStartCs = state.remainingTimeAtStartCs;

      if (state.isClockRunning) { // Pausing
        if (state.clockStartTimeMs && state.remainingTimeAtStartCs !== null) {
          const elapsedMs = Date.now() - state.clockStartTimeMs;
          const elapsedCs = Math.floor(elapsedMs / 10);
          newCurrentTimeCs = Math.max(0, state.remainingTimeAtStartCs - elapsedCs);
        }
        newIsClockRunning = false;
        newClockStartTimeMs = null;
        newRemainingTimeAtStartCs = null;
      } else { // Starting
        if (state.currentTime > 0) {
          newIsClockRunning = true;
          newClockStartTimeMs = Date.now();
          newRemainingTimeAtStartCs = state.currentTime;
        } else { 
          newIsClockRunning = false;
          newClockStartTimeMs = null;
          newRemainingTimeAtStartCs = null;
        }
      }
      newStateWithoutMeta = { 
        ...state, 
        currentTime: newCurrentTimeCs,
        isClockRunning: newIsClockRunning,
        clockStartTimeMs: newClockStartTimeMs,
        remainingTimeAtStartCs: newRemainingTimeAtStartCs,
      };
      break;
    }
    case 'SET_TIME': {
      const newTimeCs = Math.max(0, (action.payload.minutes * 60 + action.payload.seconds) * CENTISECONDS_PER_SECOND);
      const newIsClockRunning = newTimeCs > 0 ? state.isClockRunning : false; 
      newStateWithoutMeta = { 
        ...state, 
        currentTime: newTimeCs,
        isClockRunning: newIsClockRunning,
        clockStartTimeMs: newIsClockRunning ? Date.now() : null,
        remainingTimeAtStartCs: newIsClockRunning ? newTimeCs : null,
       };
      if (!newIsClockRunning) { 
        newStateWithoutMeta.clockStartTimeMs = null;
        newStateWithoutMeta.remainingTimeAtStartCs = null;
      }
      break;
    }
    case 'ADJUST_TIME': { 
      let currentTimeSnapshotCs = state.currentTime;
      if (state.isClockRunning && state.clockStartTimeMs && state.remainingTimeAtStartCs !== null) {
        const elapsedMs = Date.now() - state.clockStartTimeMs;
        const elapsedCs = Math.floor(elapsedMs / 10);
        currentTimeSnapshotCs = Math.max(0, state.remainingTimeAtStartCs - elapsedCs);
      }
      const newAdjustedTimeCs = Math.max(0, currentTimeSnapshotCs + action.payload);
      
      const newIsClockRunning = newAdjustedTimeCs > 0 ? state.isClockRunning : false;
      newStateWithoutMeta = { 
        ...state, 
        currentTime: newAdjustedTimeCs,
        isClockRunning: newIsClockRunning,
        clockStartTimeMs: newIsClockRunning ? Date.now() : null, 
        remainingTimeAtStartCs: newIsClockRunning ? newAdjustedTimeCs : null,
      };
       if (!newIsClockRunning) {
        newStateWithoutMeta.clockStartTimeMs = null;
        newStateWithoutMeta.remainingTimeAtStartCs = null;
      }
      break;
    }
    case 'SET_PERIOD': {
      const newPeriod = Math.max(0, action.payload); 
      let periodDurationCs: number;
      let displayOverride: PeriodDisplayOverrideType;
      let autoStartClock: boolean;

      if (newPeriod === 0) { 
        periodDurationCs = state.defaultWarmUpDuration;
        displayOverride = 'Warm-up';
        autoStartClock = state.autoStartWarmUp && periodDurationCs > 0;
      } else if (newPeriod > state.numberOfRegularPeriods) { 
        periodDurationCs = state.defaultOTPeriodDuration;
        displayOverride = null;
        autoStartClock = false; 
      } else { 
        periodDurationCs = state.defaultPeriodDuration;
        displayOverride = null;
        autoStartClock = false; 
      }

      newStateWithoutMeta = {
        ...state,
        currentPeriod: newPeriod,
        periodDisplayOverride: displayOverride,
        currentTime: periodDurationCs,
        isClockRunning: autoStartClock,
        preTimeoutState: null,
        clockStartTimeMs: autoStartClock ? Date.now() : null,
        remainingTimeAtStartCs: autoStartClock ? periodDurationCs : null,
      };
      break;
    }
    case 'RESET_PERIOD_CLOCK': {
      let newTimeCs: number;
      let autoStart = false;
      if (state.periodDisplayOverride === 'Warm-up' || (state.currentPeriod === 0 && state.periodDisplayOverride === null)) {
        newTimeCs = state.defaultWarmUpDuration;
        autoStart = state.autoStartWarmUp && newTimeCs > 0;
      } else if (state.periodDisplayOverride === 'Break') {
        newTimeCs = state.defaultBreakDuration;
        autoStart = state.autoStartBreaks && newTimeCs > 0;
      } else if (state.periodDisplayOverride === 'Pre-OT Break') {
        newTimeCs = state.defaultPreOTBreakDuration;
        autoStart = state.autoStartPreOTBreaks && newTimeCs > 0;
      } else if (state.periodDisplayOverride === 'Time Out') {
        newTimeCs = state.defaultTimeoutDuration;
        autoStart = state.autoStartTimeouts && newTimeCs > 0;
      } else if (state.currentPeriod > state.numberOfRegularPeriods) { 
        newTimeCs = state.defaultOTPeriodDuration;
      } else { 
        newTimeCs = state.defaultPeriodDuration;
      }
      newStateWithoutMeta = {
        ...state,
        currentTime: newTimeCs,
        isClockRunning: autoStart,
        clockStartTimeMs: autoStart ? Date.now() : null,
        remainingTimeAtStartCs: autoStart ? newTimeCs : null,
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
        initialDuration: action.payload.penalty.initialDuration, 
        remainingTime: action.payload.penalty.remainingTime,     
        id: (typeof window !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).slice(2))
      };
      let penalties = [...state[`${action.payload.team}Penalties`], newPenalty];
      penalties = updatePenaltyStatusesOnly(penalties, state.maxConcurrentPenalties);
      newStateWithoutMeta = { ...state, [`${action.payload.team}Penalties`]: penalties };
      break;
    }
    case 'REMOVE_PENALTY': {
      let penalties = state[`${action.payload.team}Penalties`].filter(p => p.id !== action.payload.penaltyId);
      penalties = updatePenaltyStatusesOnly(penalties, state.maxConcurrentPenalties);
      newStateWithoutMeta = { ...state, [`${action.payload.team}Penalties`]: penalties };
      break;
    }
    case 'ADJUST_PENALTY_TIME': { 
      const { team, penaltyId, delta } = action.payload;
      let updatedPenalties = state[`${team}Penalties`].map(p => {
        if (p.id === penaltyId) {
          const newRemainingTimeSec = Math.max(0, p.remainingTime + delta);
          const cappedTimeSec = delta > 0 ? Math.min(newRemainingTimeSec, p.initialDuration) : newRemainingTimeSec;
          return { ...p, remainingTime: cappedTimeSec };
        }
        return p;
      });
      updatedPenalties = updatePenaltyStatusesOnly(updatedPenalties, state.maxConcurrentPenalties);
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
      const reorderedPenalties = updatePenaltyStatusesOnly(currentPenalties, state.maxConcurrentPenalties);
      newStateWithoutMeta = { ...state, [`${team}Penalties`]: reorderedPenalties };
      break;
    }
    case 'TICK': {
      let newCalculatedTimeCs = state.currentTime;
      let homePenaltiesResult = state.homePenalties;
      let awayPenaltiesResult = state.awayPenalties;

      if (state.isClockRunning && state.clockStartTimeMs && state.remainingTimeAtStartCs !== null) {
        const elapsedMs = Date.now() - state.clockStartTimeMs;
        const elapsedCs = Math.floor(elapsedMs / 10); 
        newCalculatedTimeCs = Math.max(0, state.remainingTimeAtStartCs - elapsedCs);

        const gameClockWasTickingForPenalties =
          state.isClockRunning && 
          state.periodDisplayOverride === null &&
          state.currentPeriod > 0 &&
          state.remainingTimeAtStartCs > 0; 

        if (gameClockWasTickingForPenalties) {
          const oldSecondBoundary = Math.floor(state.currentTime / CENTISECONDS_PER_SECOND);
          const newSecondBoundary = Math.floor(newCalculatedTimeCs / CENTISECONDS_PER_SECOND);

          if (newSecondBoundary < oldSecondBoundary) { 
            const updatePenaltiesForOneSecondTick = (penalties: Penalty[], maxConcurrent: number): Penalty[] => {
              const resultPenalties: Penalty[] = [];
              const activePlayerTickets: Set<string> = new Set();
              let concurrentRunningCount = 0;

              for (const p of penalties) {
                if (p.remainingTime <= 0) { 
                  continue; 
                }
                let status: Penalty['_status'] = undefined;
                let newRemainingTimeForPenaltySec = p.remainingTime; 

                if (activePlayerTickets.has(p.playerNumber)) {
                  status = 'pending_player';
                } else if (concurrentRunningCount < maxConcurrent) {
                  status = 'running';
                  newRemainingTimeForPenaltySec = Math.max(0, p.remainingTime - 1); 
                  if (newRemainingTimeForPenaltySec > 0) { 
                      activePlayerTickets.add(p.playerNumber);
                  }
                  concurrentRunningCount++;
                } else {
                  status = 'pending_concurrent';
                }
                
                if (newRemainingTimeForPenaltySec > 0 || (status === 'running' && newRemainingTimeForPenaltySec === 0 && p.remainingTime > 0) ) {
                   resultPenalties.push({ ...p, remainingTime: newRemainingTimeForPenaltySec, _status: status });
                }
              }
              return resultPenalties;
            };
            homePenaltiesResult = updatePenaltiesForOneSecondTick(state.homePenalties, state.maxConcurrentPenalties);
            awayPenaltiesResult = updatePenaltiesForOneSecondTick(state.awayPenalties, state.maxConcurrentPenalties);
          } else { // Status might need update even if second boundary not crossed (e.g. penalty added/removed and clock is running)
            homePenaltiesResult = updatePenaltyStatusesOnly(state.homePenalties, state.maxConcurrentPenalties);
            awayPenaltiesResult = updatePenaltyStatusesOnly(state.awayPenalties, state.maxConcurrentPenalties);
          }
        } else if (state.isClockRunning) { // Clock is running, but not for game penalties (e.g. timeout, break)
            homePenaltiesResult = updatePenaltyStatusesOnly(state.homePenalties, state.maxConcurrentPenalties);
            awayPenaltiesResult = updatePenaltyStatusesOnly(state.awayPenalties, state.maxConcurrentPenalties);
        }
      } else if (state.isClockRunning && state.currentTime <= 0) {
         newCalculatedTimeCs = 0; 
      }


      if (state.isClockRunning && newCalculatedTimeCs <= 0) {
        const baseStateForTransition = {
          ...state,
          currentTime: 0,
          isClockRunning: false,
          clockStartTimeMs: null,
          remainingTimeAtStartCs: null,
          homePenalties: homePenaltiesResult, 
          awayPenalties: awayPenaltiesResult,
        };
        newStateWithoutMeta = handleAutoTransition(baseStateForTransition);
      } else { 
        newStateWithoutMeta = {
          ...state,
          currentTime: newCalculatedTimeCs,
          homePenalties: homePenaltiesResult,
          awayPenalties: awayPenaltiesResult,
        };
        if (state.isClockRunning && newCalculatedTimeCs <= 0) {
            newStateWithoutMeta.isClockRunning = false;
            newStateWithoutMeta.clockStartTimeMs = null;
            newStateWithoutMeta.remainingTimeAtStartCs = null;
        }
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
        remainingTimeAtStartCs: autoStart ? state.defaultBreakDuration : null,
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
        remainingTimeAtStartCs: autoStart ? state.defaultPreOTBreakDuration : null,
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
      const breakDurationCs = isPreOT ? state.defaultPreOTBreakDuration : state.defaultBreakDuration;
      const autoStart = isPreOT ? state.autoStartPreOTBreaks : state.autoStartBreaks;

      newStateWithoutMeta = {
        ...state,
        currentPeriod: periodBeforeBreak, 
        currentTime: breakDurationCs,
        periodDisplayOverride: isPreOT ? 'Pre-OT Break' : 'Break',
        isClockRunning: autoStart && breakDurationCs > 0,
        preTimeoutState: null,
        clockStartTimeMs: autoStart && breakDurationCs > 0 ? Date.now() : null,
        remainingTimeAtStartCs: autoStart && breakDurationCs > 0 ? breakDurationCs : null,
      };
      break;
    }
    case 'START_TIMEOUT': {
      let preciseCurrentTimeCs = state.currentTime;
      let preTimeoutIsRunning = state.isClockRunning;
      let preTimeoutClockStartMs = state.clockStartTimeMs;
      let preTimeoutRemainingCs = state.remainingTimeAtStartCs;

      if (state.isClockRunning && state.clockStartTimeMs && state.remainingTimeAtStartCs !== null) { 
        const elapsedMs = Date.now() - state.clockStartTimeMs;
        const elapsedCs = Math.floor(elapsedMs / 10);
        preciseCurrentTimeCs = Math.max(0, state.remainingTimeAtStartCs - elapsedCs);
      }
      
      const autoStart = state.autoStartTimeouts && state.defaultTimeoutDuration > 0;
      newStateWithoutMeta = {
        ...state,
        preTimeoutState: {
          period: state.currentPeriod,
          time: preciseCurrentTimeCs,
          isClockRunning: preTimeoutIsRunning,
          override: state.periodDisplayOverride,
          clockStartTimeMs: preTimeoutClockStartMs, 
          remainingTimeAtStartCs: preTimeoutRemainingCs,
        },
        currentTime: state.defaultTimeoutDuration,
        periodDisplayOverride: 'Time Out',
        isClockRunning: autoStart,
        clockStartTimeMs: autoStart ? Date.now() : null,
        remainingTimeAtStartCs: autoStart ? state.defaultTimeoutDuration : null,
      };
      break;
    }
    case 'END_TIMEOUT':
      if (state.preTimeoutState) {
        const { period, time, isClockRunning: preTimeoutIsRunning, override: preTimeoutOverride, clockStartTimeMs: preTimeoutClockStart, remainingTimeAtStartCs: preTimeoutRemaining } = state.preTimeoutState;
        const shouldResumeClock = preTimeoutIsRunning && time > 0;
        newStateWithoutMeta = {
          ...state,
          currentPeriod: period,
          currentTime: time,
          isClockRunning: shouldResumeClock,
          periodDisplayOverride: preTimeoutOverride,
          clockStartTimeMs: shouldResumeClock ? (preTimeoutClockStart || Date.now()) : null, 
          remainingTimeAtStartCs: shouldResumeClock ? (preTimeoutRemaining !== null ? preTimeoutRemaining : time) : null,
          preTimeoutState: null,
        };
         if (shouldResumeClock && newStateWithoutMeta.clockStartTimeMs === preTimeoutClockStart) {
            newStateWithoutMeta.clockStartTimeMs = Date.now(); 
            newStateWithoutMeta.remainingTimeAtStartCs = time;
        }
      } else {
        newStateWithoutMeta = state; 
      }
      break;
    case 'SET_CONFIG_NAME':
      newStateWithoutMeta = { ...state, configName: action.payload || initialGlobalState.configName };
      break;
    case 'SET_DEFAULT_WARM_UP_DURATION': 
      newStateWithoutMeta = { ...state, defaultWarmUpDuration: Math.max(60 * CENTISECONDS_PER_SECOND, action.payload) };
      break;
    case 'SET_DEFAULT_PERIOD_DURATION': 
      newStateWithoutMeta = { ...state, defaultPeriodDuration: Math.max(60 * CENTISECONDS_PER_SECOND, action.payload) };
      break;
    case 'SET_DEFAULT_OT_PERIOD_DURATION': 
      newStateWithoutMeta = { ...state, defaultOTPeriodDuration: Math.max(60 * CENTISECONDS_PER_SECOND, action.payload) };
      break;
    case 'SET_DEFAULT_BREAK_DURATION': 
      newStateWithoutMeta = { ...state, defaultBreakDuration: Math.max(1 * CENTISECONDS_PER_SECOND, action.payload) };
      break;
    case 'SET_DEFAULT_PRE_OT_BREAK_DURATION': 
      newStateWithoutMeta = { ...state, defaultPreOTBreakDuration: Math.max(1 * CENTISECONDS_PER_SECOND, action.payload) };
      break;
    case 'SET_DEFAULT_TIMEOUT_DURATION': 
      newStateWithoutMeta = { ...state, defaultTimeoutDuration: Math.max(1 * CENTISECONDS_PER_SECOND, action.payload) };
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
    case 'SET_PLAYERS_PER_TEAM_ON_ICE':
      newStateWithoutMeta = { ...state, playersPerTeamOnIce: Math.max(1, action.payload) };
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
        playersPerTeamOnIce: config.playersPerTeamOnIce ?? state.playersPerTeamOnIce,
      };
      break;
    }
    case 'RESET_CONFIG_TO_DEFAULTS': {
      newStateWithoutMeta = {
        ...state,
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
        playersPerTeamOnIce: INITIAL_PLAYERS_PER_TEAM_ON_ICE,
      };
      break;
    }
    case 'RESET_GAME_STATE': {
      const { _lastActionOriginator, _lastUpdatedTimestamp, ...initialsToKeepConfig } = initialGlobalState;
      
      const initialWarmUpDurationCs = state.defaultWarmUpDuration ?? initialsToKeepConfig.defaultWarmUpDuration;
      const autoStartWarmUp = state.autoStartWarmUp ?? initialsToKeepConfig.autoStartWarmUp;

      newStateWithoutMeta = {
        ...state, 
        homeScore: initialsToKeepConfig.homeScore,
        awayScore: initialsToKeepConfig.awayScore,
        currentPeriod: 0, 
        currentTime: initialWarmUpDurationCs,
        isClockRunning: autoStartWarmUp && initialWarmUpDurationCs > 0, 
        homePenalties: updatePenaltyStatusesOnly([], state.maxConcurrentPenalties), // Reset penalties
        awayPenalties: updatePenaltyStatusesOnly([], state.maxConcurrentPenalties), // Reset penalties
        homeTeamName: initialsToKeepConfig.homeTeamName,
        awayTeamName: initialsToKeepConfig.awayTeamName,
        periodDisplayOverride: 'Warm-up',
        preTimeoutState: initialsToKeepConfig.preTimeoutState,
        clockStartTimeMs: (autoStartWarmUp && initialWarmUpDurationCs > 0) ? Date.now() : null,
        remainingTimeAtStartCs: (autoStartWarmUp && initialWarmUpDurationCs > 0) ? initialWarmUpDurationCs : null,
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
    if (state.currentTime === newStateWithoutMeta.currentTime && 
        JSON.stringify(state.homePenalties) === JSON.stringify(newStateWithoutMeta.homePenalties) &&
        JSON.stringify(state.awayPenalties) === JSON.stringify(newStateWithoutMeta.awayPenalties) ) {
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
      // Do not store _status in localStorage as it's transient
      const cleanPenaltiesForStorage = (penalties: Penalty[]) => (penalties || []).map(({ _status, ...p }) => p);
      stateForStorage.homePenalties = cleanPenaltiesForStorage(state.homePenalties);
      stateForStorage.awayPenalties = cleanPenaltiesForStorage(state.awayPenalties);
      
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
      }, TICK_INTERVAL_MS);
    }
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [state.isClockRunning, state.clockStartTimeMs, state.remainingTimeAtStartCs, isPageVisible]);


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

export const formatTime = (
  totalCentiseconds: number,
  options: {
    showTenths?: boolean;
    includeMinutesForTenths?: boolean;
  } = {}
): string => {
  if (isNaN(totalCentiseconds) || totalCentiseconds < 0) totalCentiseconds = 0;

  const isUnderMinute = totalCentiseconds < 6000;

  if (isUnderMinute && options.showTenths) {
    const seconds = Math.floor(totalCentiseconds / 100);
    const tenths = Math.floor((totalCentiseconds % 100) / 10);
    if (options.includeMinutesForTenths) {
      return `00:${seconds.toString().padStart(2, '0')}.${tenths.toString()}`;
    } else {
      return `${seconds.toString().padStart(2, '0')}.${tenths.toString()}`;
    }
  } else { 
    const totalSecondsOnly = Math.floor(totalCentiseconds / 100);
    const minutes = Math.floor(totalSecondsOnly / 60);
    const seconds = totalSecondsOnly % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
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
    if (overtimeNumber === 1 && numRegPeriods > 0) return 'OT'; 
    if (overtimeNumber > 0 && numRegPeriods > 0) return `OT${overtimeNumber}`;
    if (overtimeNumber === 1 && numRegPeriods === 0) return 'OT'; 
    if (overtimeNumber > 1 && numRegPeriods === 0) return `OT${overtimeNumber}`;
    return "---"; 
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

export const centisecondsToDisplaySeconds = (centiseconds: number): string => {
  if (isNaN(centiseconds) || centiseconds < 0) return "0";
  return Math.floor(centiseconds / CENTISECONDS_PER_SECOND).toString();
};
export const centisecondsToDisplayMinutes = (centiseconds: number): string => {
  if (isNaN(centiseconds) || centiseconds < 0) return "0";
  return Math.floor(centiseconds / (60 * CENTISECONDS_PER_SECOND)).toString();
};

    
