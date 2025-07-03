
import { NextResponse } from 'next/server';
import { getGameState, addSubscriber, removeSubscriber } from '@/lib/server-side-store';

export const dynamic = 'force-dynamic'; // Required for streaming

export async function GET(request: Request) {
    let controller: ReadableStreamDefaultController;

    const stream = new ReadableStream({
        start(c) {
            controller = c;
            const clientId = crypto.randomUUID();
            addSubscriber(clientId, controller);

            // Send the current state immediately on connection
            const currentState = getGameState();
            if (currentState) {
                const message = `data: ${JSON.stringify(currentState)}\n\n`;
                try {
                     controller.enqueue(new TextEncoder().encode(message));
                } catch(e) {
                    console.error("Failed to send initial state to subscriber:", e);
                    // This might happen if client disconnects immediately
                    removeSubscriber(clientId);
                    try {
                        controller.close();
                    } catch (closeError) {
                        // Ignore if already closed
                    }
                }
            }

            // Handle client disconnection
            request.signal.onabort = () => {
                removeSubscriber(clientId);
                try {
                    if (controller) {
                        controller.close();
                    }
                } catch (e) {
                    // Ignore error if stream is already closed
                }
                console.log(`Client ${clientId} disconnected, stream closed.`);
            };
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
