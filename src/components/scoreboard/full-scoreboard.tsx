
"use client";

import { useGameState } from '@/contexts/game-state-context';
import { CompactHeaderScoreboard } from './compact-header-scoreboard';
import { PenaltiesDisplay } from './penalties-display';
// ScoreDisplay is no longer directly used here

export function FullScoreboard() {
  const { state } = useGameState();

  return (
    <div className="space-y-6 md:space-y-8">
      <CompactHeaderScoreboard />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <PenaltiesDisplay teamDisplayType="Local" teamName={state.homeTeamName} penalties={state.homePenalties} />
        <PenaltiesDisplay teamDisplayType="Visitante" teamName={state.awayTeamName} penalties={state.awayPenalties} />
      </div>
    </div>
  );
}
