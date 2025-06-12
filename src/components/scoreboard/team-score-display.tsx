
"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TeamScoreDisplayProps {
  teamActualName: string;
  teamDisplayName: "Local" | "Visitante";
  score: number;
  className?: string;
}

export function TeamScoreDisplay({ teamActualName, teamDisplayName, score, className }: TeamScoreDisplayProps) {
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
    <div className={cn("flex flex-col items-center text-center w-[30%] md:w-[25%]", className)}>
      <h2 className="text-xl md:text-3xl font-bold text-foreground uppercase tracking-wide truncate w-full px-1">{teamActualName}</h2>
      <p className="text-xs md:text-sm text-muted-foreground -mt-0.5 md:-mt-1 mb-1 md:mb-1.5">({teamDisplayName})</p>
      <div 
        className={cn(
            "text-5xl md:text-7xl font-bold font-headline text-accent tabular-nums tracking-tighter",
            flash && "animate-score-flash" // Ensure this animation is defined in tailwind.config.ts
          )}
      >
        {score}
      </div>
    </div>
  );
}
