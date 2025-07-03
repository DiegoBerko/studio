
import { NextResponse } from 'next/server';
import { getGameState, gameStateEmitter } from '@/lib/server-side-store';
import type { LiveGameState } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let intervalId: NodeJS.Timeout;

      const onUpdate = (state: LiveGameState) => {
        // The try/catch is a good safeguard, but the main cleanup is handled elsewhere.
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`));
        } catch (e) {
          console.error("Failed to enqueue data, stream might be closed.", e);
        }
      };

      const cleanup = () => {
        console.log('SSE: Cleaning up resources.');
        clearInterval(intervalId);
        gameStateEmitter.off('update', onUpdate);
      };

      // Subscribe to game state updates
      gameStateEmitter.on('update', onUpdate);

      // Send a ping every 30 seconds to keep the connection alive
      intervalId = setInterval(() => {
        try {
            // This also acts as a check to see if the connection is still alive.
            controller.enqueue(encoder.encode(':ping\n\n'));
        } catch (e) {
            // If this fails, the client has disconnected.
            console.log('SSE: Ping failed, client disconnected.');
            cleanup();
            // We don't need to call controller.close() because this error
            // means the controller is already in a closed/errored state.
        }
      }, 30000);

      // Handle client disconnection (the primary way)
      request.signal.onabort = () => {
        console.log('SSE: Client disconnected via abort signal.');
        cleanup();
        // The stream is automatically closed by the browser on abort, no need to call controller.close().
      };

      // Send the current state immediately on connection
      const currentState = getGameState();
      if (currentState) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(currentState)}\n\n`));
        } catch (e) {
          // This can happen if the client disconnects immediately after connecting.
          console.log('SSE: Could not send initial state, client disconnected early.');
          cleanup();
        }
      }
    },
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
