
"use client";

import type { Penalty } from '@/types';
import { formatTime } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PenaltyCardProps {
  penalty: Penalty;
}

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
            <User className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-primary-foreground" />
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
