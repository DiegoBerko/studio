
"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface TeamScoreDisplayProps {
  teamActualName: string;
  teamDisplayName: "Local" | "Visitante";
  score: number;
  playersOnIce: number;
  configuredPlayersPerTeam: number;
  className?: string;
}

export function TeamScoreDisplay({ teamActualName, teamDisplayName, score, playersOnIce, configuredPlayersPerTeam, className }: TeamScoreDisplayProps) {
  const [flash, setFlash] = useState(false);
  const [prevScore, setPrevScore] = useState(score);

  useEffect(() => {
    if (score !== prevScore) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 500); // Duration of the flash animation
      setPrevScore(score);
      return () => clearTimeout(timer);
    }
  }, [score, prevScore]);
  
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <div className="flex justify-center items-center gap-1 mb-1 h-5 md:h-6 lg:h-7">
        {playersOnIce > 0 && Array(playersOnIce).fill(null).map((_, index) => (
          <User key={index} className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-primary-foreground/80" />
        ))}
        {playersOnIce === 0 && configuredPlayersPerTeam > 0 && (
          <span className="text-sm md:text-base lg:text-lg text-destructive animate-pulse">0 JUGADORES</span>
        )}
      </div>
      <h2 className="text-xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground uppercase tracking-wide truncate w-full px-1">{teamActualName}</h2>
      <p className="text-xs md:text-sm lg:text-base text-muted-foreground -mt-0.5 md:-mt-1 mb-1 md:mb-1.5">({teamDisplayName})</p>
      <div 
        className={cn(
            "text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold font-headline text-accent tabular-nums tracking-tighter",
            flash && "animate-score-flash"
          )}
      >
        {score}
      </div>
    </div>
  );
}
