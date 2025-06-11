
"use client";

import { useGameState } from '@/contexts/game-state-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';


interface TeamScoreProps {
  teamName: string;
  score: number;
  className?: string;
}

const TeamScore: React.FC<TeamScoreProps> = ({ teamName, score, className }) => {
  const [flash, setFlash] = useState(false);
  const [prevScore, setPrevScore] = useState(score);

  useEffect(() => {
    if (score !== prevScore) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 500); // Animation duration
      setPrevScore(score);
      return () => clearTimeout(timer);
    }
  }, [score, prevScore]);
  
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <h2 className="text-2xl md:text-4xl font-bold text-foreground uppercase tracking-wide">{teamName}</h2>
      <div 
        className={cn(
            "text-6xl md:text-8xl font-bold font-headline text-accent tabular-nums tracking-tighter",
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
      <CardContent className="p-4 flex justify-around items-center">
        <TeamScore teamName="Home" score={state.homeScore} />
        <div className="text-3xl md:text-5xl font-bold text-primary-foreground mx-4 md:mx-8 self-center relative top-4 md:top-6">VS</div>
        <TeamScore teamName="Away" score={state.awayScore} />
      </CardContent>
    </Card>
  );
}

