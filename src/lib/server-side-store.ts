

import type { LiveGameState, ConfigFields } from '@/types';

// This is an in-memory store that runs on the server.
// It will be reset every time the server restarts.

let storedConfig: ConfigFields | null = null;
let storedGameState: LiveGameState | null = null;

export function getConfig(): ConfigFields | null {
  return storedConfig;
}

export function setConfig(newConfig: ConfigFields): void {
  // To avoid verbose logging on every config change, we can remove this log
  // console.log("Server-side config updated.");
  storedConfig = newConfig;
}

export function getGameState(): LiveGameState | null {
  return storedGameState;
}

export function setGameState(newGameState: LiveGameState): void {
  // To avoid verbose logging on every game state change, we can remove this log
  // console.log("Server-side game state updated.");
  storedGameState = newGameState;
}
