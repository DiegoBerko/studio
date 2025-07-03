"use client";

import { useGameState, formatTime, getActualPeriodText } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { PenaltiesDisplay } from './penalties-display';

export function MobileScoreboard() {
  const { state } = useGameState();
  const { clock, score, penalties, homeTeamName, awayTeamName } = state;

  return (
    <div className="flex flex-col h-screen p-2 sm:p-4 gap-4 bg-background text-foreground">
      {/* Main Info Card: Clock and Scores */}
      <Card className="bg-card shadow-lg">
        <CardContent className="p-4">
          <div className="text-center mb-4">
            <div className="font-bold font-headline tabular-nums tracking-tighter text-6xl text-accent">
              {formatTime(clock.currentTime, { showTenths: clock.currentTime < 6000, includeMinutesForTenths: false })}
            </div>
            <div className="mt-1 font-semibold text-primary-foreground uppercase tracking-wider text-2xl">
              {getActualPeriodText(clock.currentPeriod, clock.periodDisplayOverride, state.numberOfRegularPeriods)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="text-center">
              <div className="text-xl font-bold uppercase truncate" title={homeTeamName}>{homeTeamName}</div>
              <div className="text-sm text-muted-foreground">(Local)</div>
              <div className="text-6xl font-bold text-accent">{score.home}</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold uppercase truncate" title={awayTeamName}>{awayTeamName}</div>
              <div className="text-sm text-muted-foreground">(Visitante)</div>
              <div className="text-6xl font-bold text-accent">{score.away}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Penalties */}
      <div className="flex-grow grid grid-cols-1 gap-4 overflow-y-auto pb-4">
         <PenaltiesDisplay teamDisplayType="Local" teamName={state.homeTeamName} penalties={penalties.home} mode="mobile" />
         <PenaltiesDisplay teamDisplayType="Visitante" teamName={state.awayTeamName} penalties={penalties.away} mode="mobile" />
      </div>
    </div>
  );
}
