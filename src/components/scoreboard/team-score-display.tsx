
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

const LONG_NAME_THRESHOLD = 10; // Characters after which scrolling might be needed
const SCROLL_ANIMATION_DURATION_MS = 1000; // Duration of the scroll animation
const PAUSE_AT_START_DURATION_MS = 5000;   // How long to show the start of the name
const PAUSE_AT_END_DURATION_MS = 2000;     // How long to show the end of the name

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
    setCurrentScrollX(0); // Reset scroll position when team name changes

    if (teamActualName.length > LONG_NAME_THRESHOLD) {
      const performAnimationCycle = () => {
        // Ensure refs are available
        if (!containerRef.current || !textRef.current) {
          // If refs not ready, try again shortly
          animationTimeoutRef.current = setTimeout(performAnimationCycle, 100);
          return;
        }
        
        // Phase 1: Show start, then prepare to scroll to end
        setCurrentScrollX(0);
        animationTimeoutRef.current = setTimeout(() => {
          if (containerRef.current && textRef.current) {
            const containerWidth = containerRef.current.offsetWidth;
            const textWidth = textRef.current.scrollWidth; // Use scrollWidth due to nowrap
            const maxScroll = textWidth - containerWidth;

            if (maxScroll > 0) {
              setCurrentScrollX(-maxScroll); // Trigger scroll to end

              // Phase 2: Paused at end, then prepare to scroll to start
              animationTimeoutRef.current = setTimeout(() => {
                setCurrentScrollX(0); // Trigger scroll to start

                // Phase 3: Paused at start, then loop
                animationTimeoutRef.current = setTimeout(() => {
                  performAnimationCycle(); // Loop the whole cycle
                }, PAUSE_AT_START_DURATION_MS + SCROLL_ANIMATION_DURATION_MS);
              }, PAUSE_AT_END_DURATION_MS + SCROLL_ANIMATION_DURATION_MS);
            } else {
              // Text is not actually overflowing, reset and stop animation
              setCurrentScrollX(0);
            }
          }
        }, PAUSE_AT_START_DURATION_MS);
      };
      
      // Start the first cycle
      // Delay slightly to ensure initial rendering and measurement can occur
      animationTimeoutRef.current = setTimeout(performAnimationCycle, 100);

    } else {
      setCurrentScrollX(0); // Ensure text is at start if name is short
    }

    return clearCurrentAnimationTimeout; // Cleanup on unmount or name change
  }, [teamActualName]);


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
