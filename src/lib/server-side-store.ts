
import type { LiveGameState, ConfigFields } from '@/types';
import { EventEmitter } from 'events';

// This is an in-memory store that runs on the server.
// It will be reset every time the server restarts.

let storedConfig: ConfigFields | null = null;
let storedGameState: LiveGameState | null = null;

// To avoid issues with Next.js dev server Hot Module Replacement (HMR),
// we store the emitter on the global object to make it a true singleton,
// ensuring it persists across reloads in development environments.
const globalForEmitter = globalThis as unknown as {
  gameStateEmitter: EventEmitter | undefined;
};

export const gameStateEmitter =
  globalForEmitter.gameStateEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEmitter.gameStateEmitter = gameStateEmitter;
}


export function getConfig(): ConfigFields | null {
  return storedConfig;
}

export function setConfig(newConfig: ConfigFields): void {
  storedConfig = newConfig;
}

export function getGameState(): LiveGameState | null {
  return storedGameState;
}

export function setGameState(newGameState: LiveGameState): void {
  storedGameState = newGameState;
  // Broadcast the update to all listeners
  gameStateEmitter.emit('update', newGameState);
}
