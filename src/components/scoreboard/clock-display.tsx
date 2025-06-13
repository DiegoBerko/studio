
"use client";

import { useGameState, formatTime, getActualPeriodText, getPeriodText } from '@/contexts/game-state-context';
import { cn } from '@/lib/utils';

interface ClockDisplayProps {
  className?: string;
}

export function ClockDisplay({ className }: ClockDisplayProps) {
  const { state } = useGameState();

  const isMainClockLastMinute = state.currentTime < 60 && state.currentTime >= 0 && 
                                (state.periodDisplayOverride !== null || state.currentPeriod >= 0); // Ensure it's a running phase

  const preTimeoutTime = state.preTimeoutState?.time;
  const isPreTimeoutLastMinute = typeof preTimeoutTime === 'number' && preTimeoutTime < 60 && preTimeoutTime >= 0;

  return (
    <div className={cn("text-center", className)}>
      <div className={cn(
          "text-8xl md:text-[10rem] font-bold font-headline tabular-nums tracking-tighter",
          isMainClockLastMinute ? "text-orange-500" : "text-accent"
        )}>
        {formatTime(state.currentTime, isMainClockLastMinute)}
      </div>
      {/* Period and Paused display section */}
      <div className="mt-1 text-4xl md:text-6xl font-semibold text-primary-foreground uppercase tracking-wider relative"> {/* text-center is inherited, relative for Paused positioning */}
        <div className="inline-block relative"> {/* This div wraps the period text and is centered. "Paused" is positioned relative to this. */}
          <span>
            {getActualPeriodText(state.currentPeriod, state.periodDisplayOverride, state.numberOfRegularPeriods)}
          </span>
          {!state.isClockRunning && state.currentTime > 0 && (
            <span 
              className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 text-sm md:text-base font-normal text-muted-foreground normal-case tracking-normal px-2 py-1 bg-background/50 rounded-md whitespace-nowrap"
              style={{ lineHeight: 'normal' }} 
            >
              Paused
            </span>
          )}
        </div>
      </div>
      {state.preTimeoutState && (
        <div className={cn(
            "mt-2 text-lg md:text-xl normal-case tracking-normal",
            isPreTimeoutLastMinute ? "text-orange-500/80" : "text-muted-foreground" // Slightly less prominent orange for pre-timeout
          )}>
          {getPeriodText(state.preTimeoutState.period, state.numberOfRegularPeriods)} - {formatTime(state.preTimeoutState.time, isPreTimeoutLastMinute)}
          {state.preTimeoutState.override ? ` (${state.preTimeoutState.override})` : ''}
        </div>
      )}
    </div>
  );
}

    
