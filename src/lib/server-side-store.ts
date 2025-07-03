
import type { LiveGameState, ConfigFields } from '@/types';
import { EventEmitter } from 'events';

// This is an in-memory store that runs on the server.
// It will be reset every time the server restarts.

let storedConfig: ConfigFields | null = null;
let storedGameState: LiveGameState | null = null;

// Use an EventEmitter to broadcast updates.
// This is more robust than manually managing subscribers.
class GameStateEmitter extends EventEmitter {}
export const gameStateEmitter = new GameStateEmitter();


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
