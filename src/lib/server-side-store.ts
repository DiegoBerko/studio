

import type { LiveGameState, ConfigFields } from '@/types';

// This is an in-memory store that runs on the server.
// It will be reset every time the server restarts.

let storedConfig: ConfigFields | null = null;
let storedGameState: LiveGameState | null = null;

// New subscriber management for Server-Sent Events (SSE)
const subscribers = new Map<string, ReadableStreamDefaultController>();

function broadcastUpdate(state: LiveGameState) {
    const message = `data: ${JSON.stringify(state)}\n\n`;
    const messageBytes = new TextEncoder().encode(message);

    subscribers.forEach((controller, id) => {
        try {
            controller.enqueue(messageBytes);
        } catch (e) {
            console.error(`Failed to send update to subscriber ${id}, it might have disconnected. Removing it.`, e);
            // If enqueue fails, the client has likely disconnected.
            // We should remove them and close the stream.
            try {
              controller.close();
            } catch (closeError) {
              // Ignore if already closed
            }
            subscribers.delete(id);
        }
    });
}

export function addSubscriber(id: string, controller: ReadableStreamDefaultController) {
    subscribers.set(id, controller);
    console.log(`Subscriber added: ${id}. Total subscribers: ${subscribers.size}`);
}

export function removeSubscriber(id: string) {
    if (subscribers.has(id)) {
        subscribers.delete(id);
        console.log(`Subscriber removed: ${id}. Total subscribers: ${subscribers.size}`);
    }
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
