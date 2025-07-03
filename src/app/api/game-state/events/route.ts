
import { NextResponse } from 'next/server';
import { getGameState, addSubscriber, removeSubscriber } from '@/lib/server-side-store';

export const dynamic = 'force-dynamic'; // Required for streaming

export async function GET(request: Request) {
    // This creates a streaming response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const controller = {
        enqueue: (chunk: Uint8Array) => writer.write(chunk),
        close: () => writer.close(),
        error: (err: any) => writer.abort(err),
    } as TransformStreamDefaultController;

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
        }
    }

    // Handle client disconnection
    request.signal.onabort = () => {
        removeSubscriber(clientId);
    };

    return new NextResponse(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache, no-transform',
        },
    });
}
