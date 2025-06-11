
"use client";

import type { Penalty } from '@/types';
import { formatTime } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card'; // CardHeader, CardTitle, CardDescription removidos ya que no se usan
import { User, Clock } from 'lucide-react';

interface PenaltyCardProps {
  penalty: Penalty;
}

export function PenaltyCard({ penalty }: PenaltyCardProps) {
  return (
    <Card className="bg-muted/50 border-primary/30">
      <CardContent className="p-3 md:p-4"> {/* Ajustado padding */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" /> {/* Tamaño ajustado */}
            <span className="font-semibold text-base md:text-lg">P{penalty.playerNumber}</span> {/* Tamaño ajustado */}
          </div>
          <div className="flex items-center gap-1 text-accent font-mono text-base md:text-lg"> {/* Tamaño ajustado */}
            <Clock className="h-5 w-5 md:h-6 md:w-6 text-accent" /> {/* Tamaño ajustado */}
            {formatTime(penalty.remainingTime)}
          </div>
        </div>
        <div className="text-xs md:text-sm text-muted-foreground mt-1 text-right"> {/* Alineado a la derecha y tamaño ajustado */}
          ({formatTime(penalty.initialDuration)} Min)
        </div>
      </CardContent>
    </Card>
  );
}
