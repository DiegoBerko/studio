
"use client";

import { useGameState, getCategoryNameById } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { ClockDisplay } from './clock-display';
import { TeamScoreDisplay } from './team-score-display';
import { ListFilter } from 'lucide-react'; // Icon for category

export function CompactHeaderScoreboard() {
  const { state } = useGameState();

  const activeHomePenaltiesCount = state.homePenalties.filter(p => p._status === 'running').length;
  const playersOnIceForHome = Math.max(0, state.playersPerTeamOnIce - activeHomePenaltiesCount);

  const activeAwayPenaltiesCount = state.awayPenalties.filter(p => p._status === 'running').length;
  const playersOnIceForAway = Math.max(0, state.playersPerTeamOnIce - activeAwayPenaltiesCount);

  const matchCategoryName = getCategoryNameById(state.selectedMatchCategory, state.availableCategories);

  return (
    <Card className="bg-card shadow-xl relative">
       {matchCategoryName && (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 flex items-center gap-1.5 px-2 py-1 bg-primary/20 text-primary-foreground rounded-md text-xs sm:text-sm md:text-base lg:text-lg backdrop-blur-sm">
            <ListFilter className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
            <span className="font-medium">{matchCategoryName}</span>
        </div>
      )}
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
