


import { setGameState, getConfig } from '@/lib/server-side-store';
import { NextResponse } from 'next/server';
import type { LiveGameState } from '@/types';

// The GET handler is removed as its functionality is now handled by the SSE endpoint
// at /api/game-state/events

export async function POST(request: Request) {
  try {
    const gameStateData = (await request.json()) as LiveGameState;
    if (!gameStateData || !gameStateData.clock || !gameStateData.score || !gameStateData.penalties) {
      return NextResponse.json({ message: 'Invalid game state data provided.' }, { status: 400 });
    }

    // setGameState now also handles broadcasting the update to SSE subscribers
    setGameState(gameStateData);

    return NextResponse.json({ message: 'Game state updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error('API Error: Failed to update game state', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to update game state.', error: errorMessage }, { status: 500 });
  }
}
