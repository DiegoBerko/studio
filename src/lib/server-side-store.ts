

import type { LiveGameState, ConfigFields } from '@/types';

// This is an in-memory store that runs on the server.
// It will be reset every time the server restarts.

let storedConfig: ConfigFields | null = null;
let storedGameState: LiveGameState | null = null;

// New subscriber management for Server-Sent Events (SSE)
const subscribers = new Map<string, TransformStreamDefaultController>();

function broadcastUpdate(state: LiveGameState) {
    const message = `data: ${JSON.stringify(state)}\n\n`;
    subscribers.forEach((controller) => {
        try {
            controller.enqueue(new TextEncoder().encode(message));
        } catch (e) {
            console.error('Failed to send update to a subscriber, it might have disconnected.', e);
        }
    });
}

export function addSubscriber(id: string, controller: TransformStreamDefaultController) {
    subscribers.set(id, controller);
    console.log(`Subscriber added: ${id}. Total subscribers: ${subscribers.size}`);
}

export function removeSubscriber(id: string) {
    subscribers.delete(id);
    console.log(`Subscriber removed: ${id}. Total subscribers: ${subscribers.size}`);
}
// End of new subscriber management

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
  broadcastUpdate(newGameState); // Broadcast to all subscribers on state change
}
