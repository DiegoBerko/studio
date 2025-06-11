"use client";

import { useGameState } from '@/contexts/game-state-context';
import { ClockDisplay } from './clock-display';
import { ScoreDisplay } from './score-display';
import { PenaltiesDisplay } from './penalties-display';

export function FullScoreboard() {
  const { state } = useGameState();

  return (
    <div className="space-y-6 md:space-y-8">
      <ClockDisplay />
      <ScoreDisplay />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <PenaltiesDisplay teamName="Home" penalties={state.homePenalties} />
        <PenaltiesDisplay teamName="Away" penalties={state.awayPenalties} />
      </div>
    </div>
  );
}
