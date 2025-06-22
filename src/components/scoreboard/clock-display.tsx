
"use client";

import { useGameState, formatTime, getActualPeriodText, getPeriodText } from '@/contexts/game-state-context';
import { cn } from '@/lib/utils';

interface ClockDisplayProps {
  className?: string;
}

export function ClockDisplay({ className }: ClockDisplayProps) {
  const { state } = useGameState();
  const { scoreboardLayout } = state;

  const isMainClockLastMinute = state.currentTime < 6000 && state.currentTime >= 0 &&
                                (state.periodDisplayOverride !== "End of Game" && (state.periodDisplayOverride !== null || state.currentPeriod >= 0));

  const preTimeoutTimeCs = state.preTimeoutState?.time;
  const isPreTimeoutLastMinute = typeof preTimeoutTimeCs === 'number' && preTimeoutTimeCs < 6000 && preTimeoutTimeCs >= 0;

  const getWinnerName = () => {
    if (state.homeScore > state.awayScore) {
      return state.homeTeamName || 'Local';
    } else if (state.awayScore > state.homeScore) {
      return state.awayTeamName || 'Visitante';
    } else {
      return "Empate";
    }
  };

  return (
    <div className={cn("text-center", className)}>
      {state.periodDisplayOverride === "End of Game" ? (
        <div className={cn(
          "font-bold font-headline text-accent tracking-tight py-4 md:py-6 lg:py-8 flex flex-col items-center justify-center",
          className
        )}>
          <span style={{ fontSize: `${scoreboardLayout.periodSize * 0.7}rem` }}>Ganador</span>
          <span style={{ fontSize: `${scoreboardLayout.periodSize}rem`}} className="mt-1 md:mt-2">
            {getWinnerName()}
          </span>
        </div>
      ) : (
        <div 
          className={cn(
            "font-bold font-headline tabular-nums tracking-tighter",
            isMainClockLastMinute ? "text-orange-500" : "text-accent"
          )}
          style={{ fontSize: `${scoreboardLayout.clockSize}rem`, lineHeight: 1 }}
          >
          {formatTime(state.currentTime, { showTenths: isMainClockLastMinute, includeMinutesForTenths: false })}
        </div>
      )}
      {state.periodDisplayOverride !== "End of Game" && (
        <div 
          className="mt-1 font-semibold text-primary-foreground uppercase tracking-wider relative"
          style={{ fontSize: `${scoreboardLayout.periodSize}rem`, lineHeight: 1.1 }}
        >
          <div className="inline-block relative">
            <span>
              {getActualPeriodText(state.currentPeriod, state.periodDisplayOverride, state.numberOfRegularPeriods)}
            </span>
            {!state.isClockRunning && state.currentTime > 0 && state.periodDisplayOverride !== "End of Game" && (
              <span
                className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 font-normal text-muted-foreground normal-case tracking-normal px-2 py-1 bg-background/50 rounded-md whitespace-nowrap"
                style={{ fontSize: '0.4em', lineHeight: 'normal' }}
              >
                Paused
              </span>
            )}
          </div>
        </div>
      )}
      {state.preTimeoutState && state.periodDisplayOverride !== "End of Game" && (
        <div className={cn(
            "mt-2 normal-case tracking-normal",
            isPreTimeoutLastMinute ? "text-orange-500/80" : "text-muted-foreground"
          )}
          style={{ fontSize: `${scoreboardLayout.periodSize * 0.45}rem` }}
          >
          {getPeriodText(state.preTimeoutState.period, state.numberOfRegularPeriods)} - {formatTime(state.preTimeoutState.time, { showTenths: isPreTimeoutLastMinute, includeMinutesForTenths: false })}
          {state.preTimeoutState.override ? ` (${state.preTimeoutState.override})` : ''}
        </div>
      )}
    </div>
  );
}
