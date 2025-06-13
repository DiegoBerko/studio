
"use client";

import type { Penalty } from '@/types';
import { formatTime } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PenaltyCardProps {
  penalty: Penalty;
}

// Custom SVG for Caged User Icon
const CagedUserIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor" // Default stroke for player parts
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* User Icon Parts - these will inherit stroke="currentColor" from the svg tag */}
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" strokeWidth="2" />
    <circle cx="12" cy="7" r="4" strokeWidth="2" />

    {/* Cage Bars - drawn AFTER player, with explicit white stroke */}
    {/* Outer vertical bars */}
    <line x1="5" y1="2" x2="5" y2="22" strokeWidth="1.2" stroke="white" />
    <line x1="19" y1="2" x2="19" y2="22" strokeWidth="1.2" stroke="white" />
    {/* Inner vertical bars */}
    <line x1="8.5" y1="2" x2="8.5" y2="22" strokeWidth="1" stroke="white" />
    <line x1="12" y1="2" x2="12" y2="22" strokeWidth="1" stroke="white" />
    <line x1="15.5" y1="2" x2="15.5" y2="22" strokeWidth="1" stroke="white" />
  </svg>
);


export function PenaltyCard({ penalty }: PenaltyCardProps) {
  const isWaiting = penalty._status === 'pending_player' || penalty._status === 'pending_concurrent';
  const cardClasses = cn(
    "bg-muted/50 border-primary/30 transition-opacity",
    isWaiting && "opacity-50" // Grisado
  );

  return (
    <Card className={cardClasses}>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <CagedUserIcon className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-primary-foreground" />
            <span className="font-semibold text-3xl md:text-4xl lg:text-5xl xl:text-6xl">{penalty.playerNumber}</span>
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
          {isWaiting && (
            <div className="text-sm md:text-base lg:text-lg text-muted-foreground/80 mt-1 italic">
              Esperando
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

