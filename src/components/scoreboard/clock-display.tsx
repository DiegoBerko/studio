
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
      {/* Period and Paused display section */}
      <div className="mt-1 text-4xl md:text-6xl font-semibold text-primary-foreground uppercase tracking-wider relative"> {/* text-center is inherited, relative for Paused positioning */}
        <div className="inline-block relative"> {/* This div wraps the period text and is centered. "Paused" is positioned relative to this. */}
          <span>
            {getActualPeriodText(state.currentPeriod, state.periodDisplayOverride)}
          </span>
          {!state.isClockRunning && state.currentTime > 0 && (
            <span 
              className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 text-sm md:text-base font-normal text-muted-foreground normal-case tracking-normal px-2 py-1 bg-background/50 rounded-md whitespace-nowrap"
              style={{ lineHeight: 'normal' }} // Helps with consistent vertical alignment next to larger text
            >
              Paused
            </span>
          )}
        </div>
      </div>
      {state.periodDisplayOverride === "Time Out" && state.preTimeoutState && (
        <div className="mt-2 text-base md:text-lg text-muted-foreground normal-case tracking-normal">
          {getPeriodText(state.preTimeoutState.period)} - {formatTime(state.preTimeoutState.time)}
          {state.preTimeoutState.override ? ` (${state.preTimeoutState.override})` : ''}
        </div>
      )}
    </div>
  );
}

