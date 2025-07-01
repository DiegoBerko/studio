
import type { GameState, ConfigFields } from '@/types';

// This is an in-memory store that runs on the server.
// It will be reset every time the server restarts.

let storedConfig: ConfigFields | null = null;
let storedGameState: GameState | null = null;

export function getConfig(): ConfigFields | null {
  return storedConfig;
}

export function setConfig(newConfig: ConfigFields): void {
  console.log("Server-side config updated.");
  storedConfig = newConfig;
}

export function getGameState(): GameState | null {
  return storedGameState;
}

export function setGameState(newGameState: GameState): void {
  console.log("Server-side game state updated.");
  storedGameState = newGameState;
}
