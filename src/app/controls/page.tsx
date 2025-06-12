
"use client";

import { useState } from 'react';
import { MiniScoreboard } from '@/components/controls/mini-scoreboard';
import { TimeControlCard } from '@/components/controls/time-control-card';
import { PenaltyControlCard } from '@/components/controls/penalty-control-card';
import { useGameState } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';

export default function ControlsPage() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  const handleResetGame = () => {
    dispatch({ type: 'RESET_GAME_STATE' });
    toast({
      title: "Nuevo Partido Iniciado",
      description: "El estado del juego ha sido restablecido.",
    });
    setShowResetConfirmation(false);
  };

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

      {/* Botón Iniciar Nuevo Partido */}
      <div className="mt-12 pt-8 border-t border-border">
        <AlertDialog open={showResetConfirmation} onOpenChange={setShowResetConfirmation}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full sm:w-auto">
              <RefreshCw className="mr-2 h-4 w-4" /> Iniciar Nuevo Partido
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Nuevo Partido</AlertDialogTitle>
              <AlertDialogDescription>
                Esto restablecerá todas las puntuaciones, el reloj, el período y las penalidades a sus valores iniciales. Las configuraciones guardadas (duraciones, etc.) no se verán afectadas. ¿Estás seguro?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetGame}>
                Confirmar Nuevo Partido
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
         <p className="text-xs text-muted-foreground mt-2">
          Esta acción restablecerá los marcadores, el reloj, el período actual y las penalidades.
          Las configuraciones de duración de períodos, descansos, timeouts y penalidades se mantendrán.
        </p>
      </div>
    </div>
  );
}
