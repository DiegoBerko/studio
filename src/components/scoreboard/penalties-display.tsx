
"use client";

import type { Penalty } from '@/types';
import { PenaltyCard } from './penalty-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PenaltiesDisplayProps {
  teamName: string;
  penalties: Penalty[];
}

export function PenaltiesDisplay({ teamName, penalties }: PenaltiesDisplayProps) {
  return (
    <Card className="bg-card shadow-lg flex-1 min-w-[300px]">
      <CardHeader>
        <CardTitle className="text-xl text-primary-foreground">{teamName} Penalties</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {penalties.length === 0 ? (
          <p className="text-muted-foreground">None</p>
        ) : (
          penalties.slice(0, 3).map(penalty => ( // Display up to 3 penalties
            <PenaltyCard key={penalty.id} penalty={penalty} />
          ))
        )}
        {penalties.length > 3 && (
          <p className="text-xs text-muted-foreground text-center pt-2">+{penalties.length - 3} more...</p>
        )}
      </CardContent>
    </Card>
  );
}

