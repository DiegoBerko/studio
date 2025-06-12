
"use client";

import { useGameState } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { ClockDisplay } from './clock-display';
import { TeamScoreDisplay } from './team-score-display';

export function CompactHeaderScoreboard() {
  const { state } = useGameState();

  return (
    <Card className="bg-card shadow-xl">
      <CardContent className="p-4 md:p-6 flex justify-between items-center">
        <TeamScoreDisplay 
          teamActualName={state.homeTeamName} 
          teamDisplayName="Local" 
          score={state.homeScore}
          className="w-[30%] md:w-[35%]" 
        />
        <ClockDisplay className="w-[40%] md:w-[30%]" />
        <TeamScoreDisplay 
          teamActualName={state.awayTeamName} 
          teamDisplayName="Visitante" 
          score={state.awayScore} 
          className="w-[30%] md:w-[35%]"
        />
      </CardContent>
    </Card>
  );
}
