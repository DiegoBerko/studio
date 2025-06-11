
"use client";

import { useGameState, formatTime, getActualPeriodText } from '@/contexts/game-state-context';
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
          <div className="relative">
            <p className="text-lg text-primary-foreground uppercase">
              {getActualPeriodText(state.currentPeriod, state.periodDisplayOverride)}
            </p>
            {!state.isClockRunning && state.currentTime > 0 && (
              <span className="absolute top-[-0.25rem] right-1 text-[0.6rem] font-normal text-muted-foreground normal-case px-1 rounded-sm bg-background/30">
                Paused
              </span>
            )}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm uppercase text-muted-foreground">{state.awayTeamName} (Visitante)</p>
          <p className="text-4xl font-bold text-accent">{state.awayScore}</p>
        </div>
      </CardContent>
    </Card>
  );
}
