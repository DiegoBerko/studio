
"use client";

import { useGameState, formatTime, getPeriodText } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';

export function ClockDisplay() {
  const { state } = useGameState();

  return (
    <Card className="text-center bg-card shadow-xl">
      <CardContent className="p-6 relative"> {/* Añadido relative para el posicionamiento de Paused */}
        <div className="text-6xl md:text-8xl font-bold font-headline text-accent tabular-nums tracking-tighter">
          {formatTime(state.currentTime)}
        </div>
        <div className="mt-1 text-2xl md:text-4xl font-semibold text-primary-foreground uppercase tracking-wider">
          {getPeriodText(state.currentPeriod)}
          {!state.isClockRunning && state.currentTime > 0 && (
            <span className="absolute top-2 right-2 text-xs font-normal text-muted-foreground normal-case tracking-normal px-2 py-1 bg-background/50 rounded-sm">
              Paused
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

