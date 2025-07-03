
import { NextResponse } from 'next/server';
import { getGameState, gameStateEmitter } from '@/lib/server-side-store';
import type { LiveGameState } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // The listener function that will be called on each game state update
      const onUpdate = (state: LiveGameState) => {
        try {
          // Send the updated state to the client
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`));
        } catch (e) {
          // If enqueue fails, it means the client has disconnected.
          // We remove the listener to prevent memory leaks.
          console.log('Client disconnected, removing listener.');
          gameStateEmitter.off('update', onUpdate);
        }
      };

      // Subscribe to game state updates
      gameStateEmitter.on('update', onUpdate);

      // Send the current state immediately on connection
      const currentState = getGameState();
      if (currentState) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(currentState)}\n\n`));
        } catch (e) {
          // It's possible the client disconnected immediately after connecting
          console.log('Client disconnected before initial state could be sent.');
          gameStateEmitter.off('update', onUpdate);
        }
      }

      // Handle client disconnection (e.g., closing the tab)
      request.signal.onabort = () => {
        console.log('Client disconnected (onabort signal).');
        gameStateEmitter.off('update', onUpdate);
        try {
          if (controller.desiredSize !== null) {
            controller.close();
          }
        } catch (e) {
          // Ignore error, controller is likely already closed.
        }
      };
    },
    cancel() {
      // This is less common but good practice to have.
      // It handles cases where the stream is canceled programmatically.
      console.log('Stream canceled by consumer.');
      // The onabort handler should already have cleaned up listeners, but this is a safeguard.
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no', // For NGINX proxies
    },
  });
}
