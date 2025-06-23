
"use client";

import { useGameState } from '@/contexts/game-state-context';
import { CompactHeaderScoreboard } from './compact-header-scoreboard';
import { PenaltiesDisplay } from './penalties-display';

export function FullScoreboard() {
  const { state } = useGameState();
  const { scoreboardLayout } = state;

  return (
    <div 
      className="flex flex-col transition-transform duration-200"
      style={{
        gap: `${scoreboardLayout.mainContentGap}rem`,
        paddingTop: `${scoreboardLayout.scoreboardVerticalPosition}rem`,
        transform: `translateX(${scoreboardLayout.scoreboardHorizontalPosition}rem)`
      }}
    >
      <CompactHeaderScoreboard />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-10 xl:gap-12">
        <PenaltiesDisplay teamDisplayType="Local" teamName={state.homeTeamName} penalties={state.homePenalties} />
        <PenaltiesDisplay teamDisplayType="Visitante" teamName={state.awayTeamName} penalties={state.awayPenalties} />
      </div>
    </div>
  );
}
