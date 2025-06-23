
"use client";

import type { Penalty, Team } from '@/types';
import { useState } from 'react';
import { useGameState } from '@/contexts/game-state-context';
import { PenaltyCard } from './penalty-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { PenaltyLogDialog } from './penalty-log-dialog';

interface PenaltiesDisplayProps {
  teamDisplayType: "Local" | "Visitante";
  teamName: string;
  penalties: Penalty[];
  team: Team;
}

export function PenaltiesDisplay({ teamDisplayType, teamName, penalties, team }: PenaltiesDisplayProps) {
  const { state } = useGameState();
  const { scoreboardLayout } = state;
  const [isLogOpen, setIsLogOpen] = useState(false);

  return (
    <>
      <Card className="bg-card shadow-lg flex-1 min-w-[300px]">
        <CardHeader className="flex flex-row justify-between items-start">
          <CardTitle 
            className="text-primary-foreground truncate"
            style={{ fontSize: `${scoreboardLayout.penaltiesTitleSize}rem` }}
          >
            Penalidades
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary-foreground"
            onClick={() => setIsLogOpen(true)}
            aria-label="Ver registro de penalidades"
          >
            <Info className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 lg:space-y-4">
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
      {isLogOpen && (
        <PenaltyLogDialog 
          isOpen={isLogOpen}
          onOpenChange={setIsLogOpen}
          team={team}
          teamName={teamName}
        />
      )}
    </>
  );
}
