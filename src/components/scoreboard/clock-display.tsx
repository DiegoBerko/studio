
"use client";

import { useGameState, formatTime, getActualPeriodText, getPeriodText } from '@/contexts/game-state-context';
import { cn } from '@/lib/utils';

interface ClockDisplayProps {
  className?: string;
}

export function ClockDisplay({ className }: ClockDisplayProps) {
  const { state } = useGameState();

  return (
    <div className={cn("text-center", className)}>
      <div className="text-8xl md:text-[10rem] font-bold font-headline text-accent tabular-nums tracking-tighter">
        {formatTime(state.currentTime)}
      </div>
      <div className="mt-1 text-4xl md:text-6xl font-semibold text-primary-foreground uppercase tracking-wider flex items-center justify-center relative">
        <span>
         {getActualPeriodText(state.currentPeriod, state.periodDisplayOverride)}
        </span>
        {!state.isClockRunning && state.currentTime > 0 && (
          <span className="ml-3 text-sm md:text-base font-normal text-muted-foreground normal-case tracking-normal px-2 py-1 bg-background/50 rounded-md">
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
