

import { setGameState, getGameState, getConfig } from '@/lib/server-side-store';
import { NextResponse } from 'next/server';
import type { LiveGameState } from '@/types';

export async function GET() {
  try {
    const gameState = getGameState();
    const config = getConfig();
    if (gameState) {
      // Add necessary config fields to the response for the mobile client
      const mobileResponse = {
        ...gameState,
        playersPerTeamOnIce: config?.playersPerTeamOnIce,
        numberOfRegularPeriods: config?.numberOfRegularPeriods,
      };
      return NextResponse.json(mobileResponse, { status: 200 });
    } else {
      return NextResponse.json({ message: 'El estado del juego aún no está disponible.' }, { status: 404 });
    }
  } catch (error) {
    console.error('API Error: Failed to get game state', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to get game state.', error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const gameStateData = (await request.json()) as LiveGameState;
    if (!gameStateData || !gameStateData.clock || !gameStateData.score || !gameStateData.penalties) {
      return NextResponse.json({ message: 'Invalid game state data provided.' }, { status: 400 });
    }

    setGameState(gameStateData);

    return NextResponse.json({ message: 'Game state updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error('API Error: Failed to update game state', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to update game state.', error: errorMessage }, { status: 500 });
  }
}
