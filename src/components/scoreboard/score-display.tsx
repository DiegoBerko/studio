
"use client";

import { useGameState } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';

interface TeamScoreProps {
  teamActualName: string;
  teamDisplayName: "Local" | "Visitante";
  score: number;
  className?: string;
}

const TeamScore: React.FC<TeamScoreProps> = ({ teamActualName, teamDisplayName, score, className }) => {
  const [flash, setFlash] = useState(false);
  const [prevScore, setPrevScore] = useState(score);

  useEffect(() => {
    if (score !== prevScore) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 500);
      setPrevScore(score);
      return () => clearTimeout(timer);
    }
  }, [score, prevScore]);
  
  return (
    <div className={cn("flex flex-col items-center text-center w-[45%]", className)}>
      <h2 className="text-xl md:text-3xl font-bold text-foreground uppercase tracking-wide truncate w-full">{teamActualName}</h2>
      <p className="text-xs md:text-sm text-muted-foreground -mt-0.5 md:-mt-1 mb-1 md:mb-1.5">({teamDisplayName})</p>
      <div 
        className={cn(
            "text-5xl md:text-7xl font-bold font-headline text-accent tabular-nums tracking-tighter",
            flash && "animate-score-flash"
          )}
      >
        {score}
      </div>
    </div>
  );
};

export function ScoreDisplay() {
  const { state } = useGameState();

  return (
    <Card className="bg-card shadow-xl">
      <CardContent className="p-3 md:p-4 flex justify-around items-start"> {/* items-start para alinear mejor con texto debajo del nombre */}
        <TeamScore teamActualName={state.homeTeamName} teamDisplayName="Local" score={state.homeScore} />
        <div className="text-2xl md:text-4xl font-bold text-primary-foreground mx-1 md:mx-4 self-center pt-6 md:pt-10"> {/* Ajustado padding top para centrar VS */}
          VS
        </div>
        <TeamScore teamActualName={state.awayTeamName} teamDisplayName="Visitante" score={state.awayScore} />
      </CardContent>
    </Card>
  );
}
