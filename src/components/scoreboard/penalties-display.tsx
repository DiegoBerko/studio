
"use client";

import type { Penalty } from '@/types';
import { PenaltyCard } from './penalty-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PenaltiesDisplayProps {
  teamDisplayType: "Local" | "Visitante"; // Para mostrar (Local) o (Visitante)
  teamName: string; // Nombre real del equipo desde el estado
  penalties: Penalty[];
}

export function PenaltiesDisplay({ teamDisplayType, teamName, penalties }: PenaltiesDisplayProps) {
  return (
    <Card className="bg-card shadow-lg flex-1 min-w-[300px]">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl text-primary-foreground truncate">
          Penalidades {teamName}
          <span className="text-sm md:text-base opacity-80 ml-2">({teamDisplayType})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {penalties.length === 0 ? (
          <p className="text-muted-foreground">Ninguna</p>
        ) : (
          penalties.slice(0, 3).map(penalty => (
            <PenaltyCard key={penalty.id} penalty={penalty} />
          ))
        )}
        {penalties.length > 3 && (
          <p className="text-xs text-muted-foreground text-center pt-2">+{penalties.length - 3} más...</p>
        )}
      </CardContent>
    </Card>
  );
}
