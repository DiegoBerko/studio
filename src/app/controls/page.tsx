
"use client";

import { MiniScoreboard } from '@/components/controls/mini-scoreboard';
import { TimeControlCard } from '@/components/controls/time-control-card';
// ScorePeriodControlCard ya no es necesario
import { PenaltyControlCard } from '@/components/controls/penalty-control-card';
import { useGameState } from '@/contexts/game-state-context';

export default function ControlsPage() {
  const { state } = useGameState();

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Controles de Tiempo y Descanso (ScorePeriodControlCard removido) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TimeControlCard />
        {/* ScorePeriodControlCard fue removido, si necesitas el espacio o un placeholder, considera añadirlo aquí */}
        {/* Si TimeControlCard debe ocupar toda la fila en md+, puedes quitar el grid-cols-2 o hacer que TimeControlCard ocupe 2 columnas */}
      </div>

      {/* Mini Scoreboard (con Play/Pause y controles de período integrados) */}
      <MiniScoreboard />
      
      {/* Penalidades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PenaltyControlCard team="home" teamName={state.homeTeamName} />
        <PenaltyControlCard team="away" teamName={state.awayTeamName} />
      </div>
    </div>
  );
}
