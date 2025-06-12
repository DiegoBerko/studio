
"use client";

import { useGameState } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { ClockDisplay } from './clock-display';
import { TeamScoreDisplay } from './team-score-display';

export function CompactHeaderScoreboard() {
  const { state } = useGameState();

  return (
    <Card className="bg-card shadow-xl">
      <CardContent className="p-4 md:p-6 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 md:gap-x-4">
        <TeamScoreDisplay 
          teamActualName={state.homeTeamName} 
          teamDisplayName="Local" 
          score={state.homeScore}
        />
        <ClockDisplay />
        <TeamScoreDisplay 
          teamActualName={state.awayTeamName} 
          teamDisplayName="Visitante" 
          score={state.awayScore} 
        />
      </CardContent>
    </Card>
  );
}
