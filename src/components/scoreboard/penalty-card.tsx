
"use client";

import type { Penalty } from '@/types';
import { useGameState, formatTime } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react'; 

interface PenaltyCardProps {
  penalty: Penalty;
  teamName: string; 
}

const CagedUserIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" strokeWidth="2" stroke="hsl(var(--destructive))" />
    <circle cx="12" cy="7" r="4" strokeWidth="2" stroke="hsl(var(--destructive))" />
    <line x1="6" y1="2" x2="6" y2="22" strokeWidth="1" stroke="hsl(var(--muted-foreground))" />
    <line x1="10" y1="2" x2="10" y2="22" strokeWidth="1" stroke="hsl(var(--muted-foreground))" />
    <line x1="14" y1="2" x2="14" y2="22" strokeWidth="1" stroke="hsl(var(--muted-foreground))" />
    <line x1="18" y1="2" x2="18" y2="22" strokeWidth="1" stroke="hsl(var(--muted-foreground))" />
  </svg>
);


export function PenaltyCard({ penalty, teamName }: PenaltyCardProps) {
  const { state } = useGameState();

  const currentTeamSubName = state.homeTeamName === teamName ? state.homeTeamSubName : state.awayTeamName;

  const matchedPlayer = React.useMemo(() => {
    const currentTeam = state.teams.find(t =>
        t.name === teamName &&
        (t.subName || undefined) === (currentTeamSubName || undefined) &&
        t.category === state.selectedMatchCategory
    );
    if (currentTeam) {
      return currentTeam.players.find(p => p.number === penalty.playerNumber || (penalty.playerNumber === "S/N" && !p.number));
    }
    return null;
  }, [state.teams, teamName, currentTeamSubName, state.selectedMatchCategory, penalty.playerNumber]);

  const isWaitingSlot = penalty._status === 'pending_player' || penalty._status === 'pending_concurrent';
  const isPendingPuck = penalty._status === 'pending_puck';

  const cardClasses = cn(
    "bg-muted/50 border-primary/30 transition-opacity",
    (isWaitingSlot || isPendingPuck) && "opacity-50", 
    isPendingPuck && "border-yellow-500/40" 
  );

  const renderPlayerAlias = () => {
    if (!state.showAliasInScoreboardPenalties || !matchedPlayer || !matchedPlayer.name) return null;
    
    const name = matchedPlayer.name;
    let displayName = name;
    if (name.length > 10) {
      displayName = name.substring(0, 8) + "..";
    }
    
    return (
      <>
        {'\u00A0\u00A0\u00A0'} 
        <span 
          className="text-xl md:text-2xl lg:text-3xl xl:text-4xl text-muted-foreground font-normal" 
          title={name} 
        >
          {displayName}
        </span>
      </>
    );
  };

  const getStatusTextForScoreboard = () => {
    if (isPendingPuck) return "Esperando Puck";
    if (isWaitingSlot) return "Esperando";
    return null;
  }
  const statusText = getStatusTextForScoreboard();

  return (
    <Card className={cardClasses}>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <CagedUserIcon className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-primary-foreground" />
            <span className="font-semibold text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
              {penalty.playerNumber || 'S/N'}
              {renderPlayerAlias()}
            </span>
          </div>
          <div className="flex items-center gap-1 md:gap-2 text-accent font-mono text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
            <Clock className="h-4 w-4 md:h-6 md:w-6 lg:h-7 lg:w-7 text-accent" />
            {formatTime(penalty.remainingTime * 100, { showTenths: false })}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-sm md:text-base lg:text-lg xl:text-xl text-muted-foreground mt-1">
            ({formatTime(penalty.initialDuration * 100, { showTenths: false })} Min)
          </div>
          {statusText && (
            <div className={cn(
                "text-sm md:text-base lg:text-lg mt-1 italic",
                 isPendingPuck ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground/80"
              )}>
              {statusText}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

