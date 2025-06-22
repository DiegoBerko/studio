
"use client";

import { useGameState } from '@/contexts/game-state-context';
import { CompactHeaderScoreboard } from './compact-header-scoreboard';
import { PenaltiesDisplay } from './penalties-display';

export function FullScoreboard() {
  const { state } = useGameState();
  const { scoreboardLayout } = state;

  return (
    <div 
      className="space-y-6 md:space-y-8 lg:space-y-10 xl:space-y-12"
      style={{ paddingTop: `${scoreboardLayout.scoreboardVerticalPosition}rem` }}
    >
      <CompactHeaderScoreboard />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-10 xl:gap-12">
        <PenaltiesDisplay teamDisplayType="Local" teamName={state.homeTeamName} penalties={state.homePenalties} isMonitorMode={state.isMonitorModeEnabled} />
        <PenaltiesDisplay teamDisplayType="Visitante" teamName={state.awayTeamName} penalties={state.awayPenalties} isMonitorMode={state.isMonitorModeEnabled} />
      </div>
    </div>
  );
}
