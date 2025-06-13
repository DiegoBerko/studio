
"use client";

import { useGameState } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { ClockDisplay } from './clock-display';
import { TeamScoreDisplay } from './team-score-display';

export function CompactHeaderScoreboard() {
  const { state } = useGameState();

  const activeHomePenaltiesCount = state.homePenalties.filter(p => p._status === 'running').length;
  const playersOnIceForHome = Math.max(0, state.playersPerTeamOnIce - activeHomePenaltiesCount);

  const activeAwayPenaltiesCount = state.awayPenalties.filter(p => p._status === 'running').length;
  const playersOnIceForAway = Math.max(0, state.playersPerTeamOnIce - activeAwayPenaltiesCount);

  return (
    <Card className="bg-card shadow-xl">
      <CardContent className="p-4 md:p-6 grid grid-cols-[auto_1fr_auto] items-center gap-x-4 md:gap-x-6 lg:gap-x-8">
        <TeamScoreDisplay 
          teamActualName={state.homeTeamName} 
          teamDisplayName="Local" 
          score={state.homeScore}
          playersOnIce={playersOnIceForHome}
          configuredPlayersPerTeam={state.playersPerTeamOnIce}
        />
        <ClockDisplay />
        <TeamScoreDisplay 
          teamActualName={state.awayTeamName} 
          teamDisplayName="Visitante" 
          score={state.awayScore} 
          playersOnIce={playersOnIceForAway}
          configuredPlayersPerTeam={state.playersPerTeamOnIce}
        />
      </CardContent>
    </Card>
  );
}

