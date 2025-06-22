
"use client";

import type { Penalty } from '@/types';
import { useGameState } from '@/contexts/game-state-context';
import { PenaltyCard } from './penalty-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PenaltiesDisplayProps {
  teamDisplayType: "Local" | "Visitante"; // Para mostrar (Local) o (Visitante)
  teamName: string; // Nombre real del equipo desde el estado
  penalties: Penalty[];
}

export function PenaltiesDisplay({ teamDisplayType, teamName, penalties }: PenaltiesDisplayProps) {
  const { state } = useGameState();
  const { scoreboardLayout } = state;

  return (
    <Card className="bg-card shadow-lg flex-1 min-w-[300px]">
      <CardHeader>
        <CardTitle 
          className="text-primary-foreground truncate"
          style={{ fontSize: `${scoreboardLayout.penaltiesTitleSize}rem` }}
        >
          Penalidades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 lg:space-y-4 pt-6">
        {penalties.length === 0 ? (
          <p 
            className="text-muted-foreground"
            style={{ fontSize: `${scoreboardLayout.penaltyPlayerNumberSize * 0.5}rem` }}
          >
            Ninguna
          </p>
        ) : (
          penalties.slice(0, 3).map(penalty => (
            <PenaltyCard key={penalty.id} penalty={penalty} teamName={teamName} />
          ))
        )}
        {penalties.length > 3 && (
          <p 
            className="text-muted-foreground text-center pt-2"
            style={{ fontSize: `${scoreboardLayout.penaltyPlayerNumberSize * 0.4}rem` }}
          >
            +{penalties.length - 3} más...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
