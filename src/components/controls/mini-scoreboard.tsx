
"use client";

import { useGameState, formatTime, getPeriodText } from '@/contexts/game-state-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MiniScoreboard() {
  const { state } = useGameState();

  return (
    <Card className="mb-8 bg-card shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-2xl text-primary-foreground">Estado del Juego</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row justify-around items-center text-center gap-4 sm:gap-8">
        <div className="flex-1">
          <p className="text-sm uppercase text-muted-foreground">{state.homeTeamName} (Local)</p>
          <p className="text-4xl font-bold text-accent">{state.homeScore}</p>
        </div>
        <div className="flex-1">
          <p className="text-3xl font-bold text-accent">{formatTime(state.currentTime)}</p>
          <p className="text-lg text-primary-foreground">{getPeriodText(state.currentPeriod)}</p>
        </div>
        <div className="flex-1">
          <p className="text-sm uppercase text-muted-foreground">{state.awayTeamName} (Visitante)</p>
          <p className="text-4xl font-bold text-accent">{state.awayScore}</p>
        </div>
      </CardContent>
    </Card>
  );
}
