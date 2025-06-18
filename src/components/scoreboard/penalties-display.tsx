
"use client";

import type { Penalty } from '@/types';
import { PenaltyCard } from './penalty-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PenaltiesDisplayProps {
  teamDisplayType: "Local" | "Visitante"; // Para mostrar (Local) o (Visitante)
  teamName: string; // Nombre real del equipo desde el estado
  penalties: Penalty[];
  isMonitorMode: boolean; // New prop for monitor mode
}

export function PenaltiesDisplay({ teamDisplayType, teamName, penalties, isMonitorMode }: PenaltiesDisplayProps) {
  return (
    <Card className="bg-card shadow-lg flex-1 min-w-[300px]">
      {!isMonitorMode && (
        <CardHeader>
          <CardTitle className="text-lg md:text-xl lg:text-2xl xl:text-3xl text-primary-foreground truncate">
            Penalidades
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-3 lg:space-y-4 pt-6"> {/* Added pt-6 to ensure content padding */}
        {penalties.length === 0 ? (
          <p className="text-muted-foreground lg:text-lg">Ninguna</p>
        ) : (
          penalties.slice(0, 3).map(penalty => (
            <PenaltyCard key={penalty.id} penalty={penalty} teamName={teamName} />
          ))
        )}
        {penalties.length > 3 && (
          <p className="text-xs md:text-sm lg:text-base text-muted-foreground text-center pt-2">+{penalties.length - 3} más...</p>
        )}
      </CardContent>
    </Card>
  );
}

