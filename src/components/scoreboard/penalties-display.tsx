
"use client";

import type { Penalty } from '@/types';
import { useGameState } from '@/contexts/game-state-context';
import { PenaltyCard } from './penalty-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PenaltiesDisplayProps {
  teamDisplayType: "Local" | "Visitante";
  teamName: string;
  penalties: Penalty[];
  mode?: 'desktop' | 'mobile';
}

export function PenaltiesDisplay({ teamDisplayType, teamName, penalties, mode = 'desktop' }: PenaltiesDisplayProps) {
  const { state } = useGameState();
  const { scoreboardLayout } = state;

  const isMobile = mode === 'mobile';

  // Define styles based on mode
  const titleStyle = isMobile ? { fontSize: '1.125rem' } : { fontSize: `${scoreboardLayout.penaltiesTitleSize}rem` };
  const noPenaltiesStyle = isMobile ? { fontSize: '0.875rem' } : { fontSize: `${scoreboardLayout.penaltyPlayerNumberSize * 0.5}rem` };
  const morePenaltiesStyle = { fontSize: `${scoreboardLayout.penaltyPlayerNumberSize * 0.4}rem` };
  
  const penaltiesToShow = isMobile ? penalties : penalties.slice(0, 3);

  return (
      <Card className="bg-card shadow-lg flex-1">
        <CardHeader className="flex flex-row justify-between items-center p-3 md:p-6">
          <CardTitle 
            className="text-primary-foreground"
            style={titleStyle}
          >
            {isMobile ? `Penalidades ${teamName}` : 'Penalidades'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-0 md:p-6 md:pt-0 md:space-y-3 lg:space-y-4">
          {penalties.length === 0 ? (
            <p 
              className="text-muted-foreground"
              style={noPenaltiesStyle}
            >
              Ninguna
            </p>
          ) : (
            penaltiesToShow.map(penalty => (
              <PenaltyCard key={penalty.id} penalty={penalty} teamName={teamName} mode={mode} />
            ))
          )}
          {!isMobile && penalties.length > 3 && (
            <p 
              className="text-muted-foreground text-center pt-2"
              style={morePenaltiesStyle}
            >
              +{penalties.length - 3} más...
            </p>
          )}
        </CardContent>
      </Card>
  );
}
