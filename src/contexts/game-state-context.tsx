
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import type { Penalty, Team } from '@/types';
import { db } from '@/lib/firebase'; // Import Firestore instance
import { doc, getDoc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';

// Duraciones por defecto iniciales, se guardarán en segundos
const INITIAL_PERIOD_DURATION = 20 * 60;
const INITIAL_BREAK_DURATION = 2 * 60;
const INITIAL_PRE_OT_BREAK_DURATION = 1 * 60;
const INITIAL_MAX_CONCURRENT_PENALTIES = 2;
const INITIAL_AUTO_START_BREAKS = true;
const INITIAL_AUTO_START_PRE_OT_BREAKS = false;

const GAME_DOC_ID = 'liveState'; // Document ID in Firestore

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
  // lastUpdated?: Timestamp; // Optional: for more complex sync logic or debugging
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
  | { type: 'SET_STATE_FROM_FIRESTORE'; payload: GameState }
  | { type: '_INITIAL_LOAD_COMPLETE'; payload: GameState };


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
  isLoading: boolean;
} | undefined>(undefined);

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case '_INITIAL_LOAD_COMPLETE':
    case 'SET_STATE_FROM_FIRESTORE':
      return { ...state, ...action.payload }; // Merge Firestore state with local, Firestore takes precedence
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
        id: Date.now().toString() + Math.random().toString(36).slice(2) 
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
};

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [isLoading, setIsLoading] = React.useState(true);
  const stateRef = useRef(state); 
  stateRef.current = state;

  // Ref to track if the last state update was from Firestore, to prevent immediate write-back.
  const lastUpdateFromFirestoreRef = useRef(false);

  // Effect for Firestore interaction (loading and listening for remote changes)
  useEffect(() => {
    const gameDocRef = doc(db, 'game', GAME_DOC_ID);

    const unsubscribe = onSnapshot(gameDocRef, (docSnapshot) => {
      if (docSnapshot.metadata.hasPendingWrites) {
        // This change originated from the local client, Firestore is just confirming.
        // The local state is already up-to-date. We don't need to re-dispatch.
        return;
      }
      if (docSnapshot.exists()) {
        const remoteState = docSnapshot.data() as GameState;
        lastUpdateFromFirestoreRef.current = true; // Mark that this update is from Firestore
        dispatch({ type: 'SET_STATE_FROM_FIRESTORE', payload: remoteState });
      } else {
        // Document doesn't exist, create it with the current initial state
        // Use stateRef.current to ensure we're writing the most up-to-date version of initialState
        // if any synchronous dispatches happened before this effect ran.
        setDoc(gameDocRef, stateRef.current).catch(error => {
          console.error("Error creating initial document in Firestore:", error);
        });
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error subscribing to Firestore:", error);
      setIsLoading(false); 
    });

    return () => unsubscribe(); 
  }, []); 

  // Effect to write local state changes to Firestore
  useEffect(() => {
    if (isLoading) {
      return; // Don't write during initial loading
    }

    if (lastUpdateFromFirestoreRef.current) {
      // This state change came from Firestore, so don't write it back immediately.
      // Reset the flag for the next user-initiated change.
      lastUpdateFromFirestoreRef.current = false;
      return;
    }
    
    // This check helps prevent writing the default initialState if Firestore hasn't loaded yet
    // and the state hasn't been changed by user interaction.
    if (state === initialState && isLoading) { // isLoading check is redundant here due to guard above but safe
        return;
    }

    const gameDocRef = doc(db, 'game', GAME_DOC_ID);
    const stateToSave = { ...state }; 

    setDoc(gameDocRef, stateToSave) 
      .catch(error => {
        console.error("Error writing to Firestore:", error);
      });

  }, [state, isLoading]);

  // Effect for the 1-second tick
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (state.isClockRunning && state.currentTime > 0) {
      timerId = setInterval(() => {
        // The TICK action itself does not directly cause a Firestore write in this setup,
        // but the resulting state change will trigger the useEffect above.
        // This needs optimization if TICK writes become too frequent.
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

    