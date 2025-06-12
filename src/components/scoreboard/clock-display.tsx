
"use client";

import { useGameState, formatTime, getActualPeriodText, getPeriodText } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card'; // Card and CardContent might not be needed if used within another card
import { cn } from '@/lib/utils';

interface ClockDisplayProps {
  className?: string;
}

export function ClockDisplay({ className }: ClockDisplayProps) {
  const { state } = useGameState();

  return (
    <div className={cn("text-center flex-grow", className)}>
      <div className="text-7xl md:text-9xl font-bold font-headline text-accent tabular-nums tracking-tighter">
        {formatTime(state.currentTime)}
      </div>
      <div className="mt-1 text-3xl md:text-5xl font-semibold text-primary-foreground uppercase tracking-wider relative">
        {getActualPeriodText(state.currentPeriod, state.periodDisplayOverride)}
        {!state.isClockRunning && state.currentTime > 0 && (
          <span className="absolute top-0 -right-2 text-[0.5rem] md:text-[0.6rem] font-normal text-muted-foreground normal-case tracking-normal px-1.5 py-0.5 bg-background/50 rounded-sm">
            Paused
          </span>
        )}
      </div>
      {state.periodDisplayOverride === "Time Out" && state.preTimeoutState && (
        <div className="mt-2 text-xs md:text-sm text-muted-foreground normal-case tracking-normal">
          Al finalizar, volviendo a: {getPeriodText(state.preTimeoutState.period)} - {formatTime(state.preTimeoutState.time)}
          {state.preTimeoutState.override ? ` (${state.preTimeoutState.override})` : ''}
        </div>
      )}
    </div>
  );
}
