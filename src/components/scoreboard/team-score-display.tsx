
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface TeamScoreDisplayProps {
  teamActualName: string;
  teamDisplayName: "Local" | "Visitante";
  score: number;
  playersOnIce?: number;
  configuredPlayersPerTeam?: number;
  className?: string;
}

const LONG_NAME_THRESHOLD = 10; // Reduced from 12
const SCROLL_ANIMATION_DURATION_MS = 1500; 
const PAUSE_AT_START_DURATION_MS = 5000;   
const PAUSE_AT_END_DURATION_MS = 2000;     

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

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [currentScrollX, setCurrentScrollX] = useState(0);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (score !== prevScore) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 500);
      setPrevScore(score);
      return () => clearTimeout(timer);
    }
  }, [score, prevScore]);

  useEffect(() => {
    const clearCurrentAnimationTimeout = () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    };

    clearCurrentAnimationTimeout();
    setCurrentScrollX(0); 

    if (teamActualName.length > LONG_NAME_THRESHOLD) {
      const performAnimationCycle = () => {
        // Ensure refs are current before proceeding
        if (!containerRef.current || !textRef.current) {
          animationTimeoutRef.current = setTimeout(performAnimationCycle, 100); // Retry shortly
          return;
        }
        
        setCurrentScrollX(0); // Start by showing the beginning

        animationTimeoutRef.current = setTimeout(() => {
          if (containerRef.current && textRef.current) {
            const containerWidth = containerRef.current.offsetWidth;
            const textWidth = textRef.current.scrollWidth;
            const maxScroll = textWidth - containerWidth;

            if (maxScroll > 0) {
              setCurrentScrollX(-maxScroll); // Scroll to show the end

              animationTimeoutRef.current = setTimeout(() => {
                setCurrentScrollX(0); // Scroll back to the beginning

                animationTimeoutRef.current = setTimeout(() => {
                  performAnimationCycle(); // Restart the cycle
                }, PAUSE_AT_START_DURATION_MS + SCROLL_ANIMATION_DURATION_MS);
              }, PAUSE_AT_END_DURATION_MS + SCROLL_ANIMATION_DURATION_MS);
            } else {
              // If no scrolling is needed (e.g., window resized wider), stay at start
              setCurrentScrollX(0);
            }
          }
        }, PAUSE_AT_START_DURATION_MS);
      };
      
      // Initial short delay to allow DOM to settle, then start animation
      animationTimeoutRef.current = setTimeout(performAnimationCycle, 100); 

    } else {
      // Name is not long, ensure it's at the start and no animation
      setCurrentScrollX(0);
    }

    return clearCurrentAnimationTimeout; // Cleanup on component unmount or name change
  }, [teamActualName]);


  return (
    <div className={cn(
        "flex flex-col items-center text-center min-w-[160px] sm:min-w-[180px] md:min-w-[220px] lg:min-w-[260px] xl:min-w-[300px]",
        className
      )}>
      <div className="flex justify-center items-center gap-1 mb-1 h-5 md:h-6 lg:h-7">
        {playersOnIce > 0 && Array(playersOnIce).fill(null).map((_, index) => (
          <User key={index} className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-primary-foreground/80" />
        ))}
        {configuredPlayersPerTeam > 0 && playersOnIce === 0 && (
          <span className="text-sm md:text-base lg:text-lg text-destructive animate-pulse">0 JUGADORES</span>
        )}
      </div>

      <div
        ref={containerRef}
        className="text-xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground uppercase tracking-wide w-full h-[1.2em] overflow-hidden relative"
        title={teamActualName}
      >
        <span
          ref={textRef}
          className="whitespace-nowrap absolute left-0 top-0"
          style={{
            transform: `translateX(${currentScrollX}px)`,
            transitionProperty: 'transform',
            transitionDuration: `${SCROLL_ANIMATION_DURATION_MS}ms`,
            transitionTimingFunction: 'ease-in-out',
          }}
        >
          {teamActualName}
        </span>
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
