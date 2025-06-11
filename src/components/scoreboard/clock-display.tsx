
"use client";

import { useGameState, formatTime, getActualPeriodText } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';

export function ClockDisplay() {
  const { state } = useGameState();

  return (
    <Card className="text-center bg-card shadow-xl">
      <CardContent className="p-6 relative">
        <div className="text-6xl md:text-8xl font-bold font-headline text-accent tabular-nums tracking-tighter">
          {formatTime(state.currentTime)}
        </div>
        <div className="mt-1 text-2xl md:text-4xl font-semibold text-primary-foreground uppercase tracking-wider">
          {getActualPeriodText(state.currentPeriod, state.periodDisplayOverride)}
          {!state.isClockRunning && state.currentTime > 0 && (
            <span className="absolute top-2 right-2 text-[0.6rem] font-normal text-muted-foreground normal-case tracking-normal px-1.5 py-0.5 bg-background/50 rounded-sm">
              Paused
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
