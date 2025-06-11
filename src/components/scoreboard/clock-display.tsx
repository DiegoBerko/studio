"use client";

import { useGameState, formatTime, getPeriodText } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';

export function ClockDisplay() {
  const { state } = useGameState();

  return (
    <Card className="text-center bg-card shadow-xl">
      <CardContent className="p-6">
        <div className="text-6xl md:text-8xl font-bold font-headline text-accent tabular-nums tracking-tighter">
          {formatTime(state.currentTime)}
        </div>
        <div className="text-2xl md:text-4xl font-semibold text-primary-foreground uppercase tracking-wider">
          {getPeriodText(state.currentPeriod)} {state.isClockRunning ? "" : "(Paused)"}
        </div>
      </CardContent>
    </Card>
  );
}
