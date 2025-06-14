
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface TeamScoreDisplayProps {
  teamActualName: string;
  teamDisplayName: "Local" | "Visitante";
  score: number;
  playersOnIce?: number; // Made optional for cases where it might not be relevant
  configuredPlayersPerTeam?: number; // Made optional
  className?: string;
}

const TRUNCATE_THRESHOLD = 10;
const SCROLL_VISIBLE_LENGTH = 8;
const SCROLL_INTERVAL_START_MS = 5000; // Time to show the start of the name
const SCROLL_INTERVAL_END_MS = 2000;   // Time to show the end of the name

export function TeamScoreDisplay({ 
  teamActualName, 
  teamDisplayName, 
  score, 
  playersOnIce = 0, 
  configuredPlayersPerTeam = 0, 
  className 
}: TeamScoreDisplayProps) {
  const [flash, setFlash] = useState(false);
  const [prevScore, setPrevScore] = useState(score);
  const [isScrolledToEnd, setIsScrolledToEnd] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (score !== prevScore) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 500);
      setPrevScore(score);
      return () => clearTimeout(timer);
    }
  }, [score, prevScore]);

  useEffect(() => {
    // Clear any existing timers when teamActualName changes or component unmounts
    const clearTimers = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    if (teamActualName.length > TRUNCATE_THRESHOLD) {
      setIsScrolledToEnd(false); // Start with the beginning

      const animateName = () => {
        // Show start for SCROLL_INTERVAL_START_MS
        timeoutRef.current = setTimeout(() => {
          setIsScrolledToEnd(true); // Switch to end

          // Show end for SCROLL_INTERVAL_END_MS
          timeoutRef.current = setTimeout(() => {
            setIsScrolledToEnd(false); // Switch back to start
          }, SCROLL_INTERVAL_END_MS);
        }, SCROLL_INTERVAL_START_MS);
      };

      animateName(); // Initial call
      intervalRef.current = setInterval(animateName, SCROLL_INTERVAL_START_MS + SCROLL_INTERVAL_END_MS);
      
    } else {
      setIsScrolledToEnd(false); // Ensure it's reset if name becomes short
    }

    return clearTimers;
  }, [teamActualName]);

  const nameStart = teamActualName.length > SCROLL_VISIBLE_LENGTH 
    ? teamActualName.substring(0, SCROLL_VISIBLE_LENGTH) + "..." 
    : teamActualName;
  
  const nameEnd = teamActualName.length > SCROLL_VISIBLE_LENGTH 
    ? "..." + teamActualName.substring(teamActualName.length - SCROLL_VISIBLE_LENGTH)
    : teamActualName;

  const shouldAnimate = teamActualName.length > TRUNCATE_THRESHOLD;

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <div className="flex justify-center items-center gap-1 mb-1 h-5 md:h-6 lg:h-7">
        {playersOnIce > 0 && Array(playersOnIce).fill(null).map((_, index) => (
          <User key={index} className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-primary-foreground/80" />
        ))}
        {configuredPlayersPerTeam > 0 && playersOnIce === 0 && (
          <span className="text-sm md:text-base lg:text-lg text-destructive animate-pulse">0 JUGADORES</span>
        )}
      </div>
      <div 
        className="relative text-xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground uppercase tracking-wide w-full px-1 h-[1.2em] overflow-hidden" // h-[1.2em] for stable height
        title={teamActualName}
      >
        {shouldAnimate ? (
          <>
            <span
              className={cn(
                "absolute inset-0 transition-opacity duration-300 ease-in-out flex items-center justify-center text-center w-full",
                isScrolledToEnd ? "opacity-0" : "opacity-100"
              )}
              aria-hidden={isScrolledToEnd}
            >
              {nameStart}
            </span>
            <span
              className={cn(
                "absolute inset-0 transition-opacity duration-300 ease-in-out flex items-center justify-center text-center w-full",
                isScrolledToEnd ? "opacity-100" : "opacity-0"
              )}
              aria-hidden={!isScrolledToEnd}
            >
              {nameEnd}
            </span>
          </>
        ) : (
          <span className="flex items-center justify-center text-center w-full">{teamActualName}</span>
        )}
      </div>
      <p className="text-sm md:text-base lg:text-lg text-muted-foreground -mt-0.5 md:-mt-1 mb-1 md:mb-1.5">({teamDisplayName})</p>
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
