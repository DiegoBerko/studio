
"use client";

import { useGameState, getCategoryNameById } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { ClockDisplay } from './clock-display';
import { TeamScoreDisplay } from './team-score-display';
import { ListFilter } from 'lucide-react'; // Icon for category

export function CompactHeaderScoreboard() {
  const { state } = useGameState();
  const { scoreboardLayout } = state;

  const activeHomePenaltiesCount = state.penalties.home.filter(p => p._status === 'running').length;
  const playersOnIceForHome = Math.max(0, state.playersPerTeamOnIce - activeHomePenaltiesCount);

  const activeAwayPenaltiesCount = state.penalties.away.filter(p => p._status === 'running').length;
  const playersOnIceForAway = Math.max(0, state.playersPerTeamOnIce - activeAwayPenaltiesCount);

  const matchCategoryName = getCategoryNameById(state.selectedMatchCategory, state.availableCategories);

  return (
    <Card className="bg-card shadow-xl relative">
       {matchCategoryName && (
        <div 
          className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 md:bottom-4 md:left-4 flex items-baseline gap-1 px-2 py-1 bg-primary/20 text-primary-foreground rounded-md backdrop-blur-sm z-10"
          style={{ fontSize: `${scoreboardLayout.categorySize}rem`}}
        >
            <span className="opacity-80">Cat.</span>
            <span className="font-semibold">{matchCategoryName}</span>
        </div>
      )}
      <CardContent className="p-4 md:p-6 grid grid-cols-[auto_1fr_auto] items-center gap-x-6 md:gap-x-8 lg:gap-x-10">
        <TeamScoreDisplay 
          teamActualName={state.homeTeamName} 
          teamDisplayName="Local" 
          score={state.score.home}
          playersOnIce={playersOnIceForHome}
          configuredPlayersPerTeam={state.playersPerTeamOnIce}
          layout={scoreboardLayout}
        />
        <ClockDisplay />
        <TeamScoreDisplay 
          teamActualName={state.awayTeamName} 
          teamDisplayName="Visitante" 
          score={state.score.away} 
          playersOnIce={playersOnIceForAway}
          configuredPlayersPerTeam={state.playersPerTeamOnIce}
          layout={scoreboardLayout}
        />
      </CardContent>
    </Card>
  );
}
