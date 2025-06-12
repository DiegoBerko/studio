
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MiniScoreboard } from '@/components/controls/mini-scoreboard';
import { TimeControlCard } from '@/components/controls/time-control-card';
import { PenaltyControlCard } from '@/components/controls/penalty-control-card';
import { useGameState } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, AlertTriangle } from 'lucide-react';

const CONTROLS_LOCK_KEY = 'icevision-controls-lock-id';

export default function ControlsPage() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  const [isPrimaryControlsInstance, setIsPrimaryControlsInstance] = useState<boolean | null>(null);
  const [currentLockHolderId, setCurrentLockHolderId] = useState<string | null>(null);
  const instanceIdRef = useRef<string | null>(null);


  useEffect(() => {
    // Initialize instanceIdRef for this specific mount of the component
    // This will generate a new ID if the component is re-mounted (e.g., navigating away and back)
    instanceIdRef.current = crypto.randomUUID();
    const myId = instanceIdRef.current;

    const releaseLock = () => {
      // Only release the lock if this specific instance (myId) holds it
      if (localStorage.getItem(CONTROLS_LOCK_KEY) === myId) {
        localStorage.removeItem(CONTROLS_LOCK_KEY);
      }
    };

    const checkAndSetLock = () => {
      const lockId = localStorage.getItem(CONTROLS_LOCK_KEY);
      if (!lockId) {
        // No lock, take it
        localStorage.setItem(CONTROLS_LOCK_KEY, myId);
        setIsPrimaryControlsInstance(true);
        setCurrentLockHolderId(myId);
      } else if (lockId === myId) {
        // We already hold the lock (e.g., after a hot reload where this instance was already primary)
        setIsPrimaryControlsInstance(true);
        setCurrentLockHolderId(myId);
      } else {
        // Lock is held by someone else
        setIsPrimaryControlsInstance(false);
        setCurrentLockHolderId(lockId);
      }
    };

    checkAndSetLock(); // Initial check

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === CONTROLS_LOCK_KEY) {
        checkAndSetLock(); // Re-evaluate who holds the lock
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // `beforeunload` is for tab/browser close events
    window.addEventListener('beforeunload', releaseLock);

    // Cleanup function for when the component unmounts (e.g., navigating to another page in the app)
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', releaseLock);
      releaseLock(); // Attempt to release the lock when navigating away from this page.
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount.

  const handleResetGame = () => {
    dispatch({ type: 'RESET_GAME_STATE' });
    toast({
      title: "Nuevo Partido Iniciado",
      description: "El estado del juego ha sido restablecido.",
    });
    setShowResetConfirmation(false);
  };

  if (isPrimaryControlsInstance === null) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center p-4">
        <RefreshCw className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-foreground">Verificando instancia de controles...</p>
        <p className="text-sm text-muted-foreground">Esto tomará un momento.</p>
      </div>
    );
  }

  if (!isPrimaryControlsInstance) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center p-6 rounded-lg shadow-xl bg-card max-w-md mx-auto">
        <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
        <h1 className="text-2xl font-bold text-destructive-foreground mb-3">Múltiples Pestañas de Controles</h1>
        <p className="text-lg text-card-foreground mb-2">
          Ya existe otra pestaña o instancia de Controles activa.
        </p>
        <p className="text-card-foreground mb-6">
          Para evitar problemas de sincronización y asegurar un correcto funcionamiento, por favor cierra esta pestaña o la otra instancia de Controles. Solo una pestaña de Controles puede estar activa a la vez.
        </p>
        <Button variant="outline" onClick={() => window.close()}>Cerrar esta Pestaña</Button>
        <p className="text-xs text-muted-foreground mt-6">
          ID de esta instancia: ...{instanceIdRef.current?.slice(-6)} <br />
          ID de la instancia activa: ...{currentLockHolderId?.slice(-6)}
        </p>
      </div>
    );
  }

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
