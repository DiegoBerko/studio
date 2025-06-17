
"use client";

import { useGameState, formatTime, getActualPeriodText, getPeriodText } from '@/contexts/game-state-context';
import { cn } from '@/lib/utils';

interface ClockDisplayProps {
  className?: string;
}

export function ClockDisplay({ className }: ClockDisplayProps) {
  const { state } = useGameState();

  const isMainClockLastMinute = state.currentTime < 6000 && state.currentTime >= 0 &&
                                (state.periodDisplayOverride !== "End of Game" && (state.periodDisplayOverride !== null || state.currentPeriod >= 0));

  const preTimeoutTimeCs = state.preTimeoutState?.time;
  const isPreTimeoutLastMinute = typeof preTimeoutTimeCs === 'number' && preTimeoutTimeCs < 6000 && preTimeoutTimeCs >= 0;

  const getWinnerText = () => {
    if (state.homeScore > state.awayScore) {
      return `Ganador ${state.homeTeamName || 'Local'}`;
    } else if (state.awayScore > state.homeScore) {
      return `Ganador ${state.awayTeamName || 'Visitante'}`;
    } else {
      return "Empate";
    }
  };

  return (
    <div className={cn("text-center", className)}>
      {state.periodDisplayOverride === "End of Game" ? (
        <div className={cn(
          "text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold font-headline text-accent tracking-tight py-4 md:py-6 lg:py-8", // Tamaño reducido
          className
        )}>
          {getWinnerText()}
        </div>
      ) : (
        <div className={cn(
            "text-8xl md:text-[10rem] lg:text-[12rem] xl:text-[14rem] font-bold font-headline tabular-nums tracking-tighter",
            isMainClockLastMinute ? "text-orange-500" : "text-accent" 
          )}>
          {formatTime(state.currentTime, { showTenths: isMainClockLastMinute, includeMinutesForTenths: false })}
        </div>
      )}
      {state.periodDisplayOverride !== "End of Game" && (
        <div className="mt-1 text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold text-primary-foreground uppercase tracking-wider relative">
          <div className="inline-block relative">
            <span>
              {getActualPeriodText(state.currentPeriod, state.periodDisplayOverride, state.numberOfRegularPeriods)}
            </span>
            {!state.isClockRunning && state.currentTime > 0 && state.periodDisplayOverride !== "End of Game" && (
              <span
                className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 text-sm md:text-base lg:text-lg font-normal text-muted-foreground normal-case tracking-normal px-2 py-1 bg-background/50 rounded-md whitespace-nowrap"
                style={{ lineHeight: 'normal' }}
              >
                Paused
              </span>
            )}
          </div>
        </div>
      )}
      {state.preTimeoutState && state.periodDisplayOverride !== "End of Game" && (
        <div className={cn(
            "mt-2 text-lg md:text-xl lg:text-2xl normal-case tracking-normal",
            isPreTimeoutLastMinute ? "text-orange-500/80" : "text-muted-foreground"
          )}>
          {getPeriodText(state.preTimeoutState.period, state.numberOfRegularPeriods)} - {formatTime(state.preTimeoutState.time, { showTenths: isPreTimeoutLastMinute, includeMinutesForTenths: false })}
          {state.preTimeoutState.override ? ` (${state.preTimeoutState.override})` : ''}
        </div>
      )}
    </div>
  );
}
    
