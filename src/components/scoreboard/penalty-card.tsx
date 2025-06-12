
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
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
            <span className="font-semibold text-base md:text-lg">P{penalty.playerNumber}</span>
          </div>
          <div className="flex items-center gap-1 text-accent font-mono text-base md:text-lg">
            <Clock className="h-5 w-5 md:h-6 md:w-6 text-accent" />
            {formatTime(penalty.remainingTime)}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-xs md:text-sm text-muted-foreground mt-1">
            ({formatTime(penalty.initialDuration)} Min)
          </div>
          {isWaiting && (
            <div className="text-xs text-muted-foreground/80 mt-1 italic">
              {penalty._status === 'pending_player' ? 'Esperando (jugador)' : 'Esperando (puesto)'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
