"use client";

import type { Penalty } from '@/types';
import { formatTime } from '@/contexts/game-state-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Clock } from 'lucide-react';

interface PenaltyCardProps {
  penalty: Penalty;
}

export function PenaltyCard({ penalty }: PenaltyCardProps) {
  return (
    <Card className="bg-muted/50 border-primary/30">
      <CardContent className="p-3 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary-foreground" />
            <span className="font-semibold">P{penalty.playerNumber}</span>
          </div>
          <div className="flex items-center gap-1 text-accent font-mono">
            <Clock className="h-4 w-4 text-accent" />
            {formatTime(penalty.remainingTime)}
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          ({formatTime(penalty.initialDuration)} Min)
        </div>
      </CardContent>
    </Card>
  );
}
