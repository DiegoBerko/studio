
"use client";

import type { Penalty } from '@/types';
import { formatTime } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react'; // User icon removed
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
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* User Icon Paths */}
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
    {/* Cage Bars */}
    <line x1="4" y1="3" x2="4" y2="21" /> {/* Left bar */}
    <line x1="20" y1="3" x2="20" y2="21" /> {/* Right bar */}
    <line x1="2" y1="10" x2="22" y2="10" /> {/* Middle horizontal bar */}
    <line x1="2" y1="15" x2="22" y2="15" /> {/* Lower horizontal bar */}
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

