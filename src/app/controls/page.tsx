
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MiniScoreboard } from '@/components/controls/mini-scoreboard';
import { TimeControlCard } from '@/components/controls/time-control-card';
import { PenaltyControlCard } from '@/components/controls/penalty-control-card';
import { useGameState } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, AlertTriangle, Router } from 'lucide-react';
import { useRouter } from 'next/navigation';

const CONTROLS_LOCK_KEY = 'icevision-controls-lock-id';
const CONTROLS_CHANNEL_NAME = 'icevision-controls-channel';

type PageDisplayState = 'Checking' | 'Primary' | 'Secondary';

export default function ControlsPage() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const router = useRouter();

  const [pageDisplayState, setPageDisplayState] = useState<PageDisplayState>('Checking');
  const [currentLockHolderId, setCurrentLockHolderId] = useState<string | null>(null);
  
  // Stable instanceId for the component instance's lifetime
  const [instanceId] = useState(() => crypto.randomUUID());
  
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  const checkLockStatus = useCallback(() => {
    const lockIdFromStorage = localStorage.getItem(CONTROLS_LOCK_KEY);
    
    if (!lockIdFromStorage) {
      // No lock, this instance takes it
      localStorage.setItem(CONTROLS_LOCK_KEY, instanceId);
      setCurrentLockHolderId(instanceId);
      setPageDisplayState('Primary');
      console.log(`Instance ${instanceId.slice(-6)} took lock (no prior lock). State: Primary`);
    } else if (lockIdFromStorage === instanceId) {
      // This instance already holds the lock (e.g., after hot reload or previous successful acquisition)
      setPageDisplayState('Primary');
      setCurrentLockHolderId(instanceId);
      console.log(`Instance ${instanceId.slice(-6)} confirmed lock. State: Primary`);
    } else {
      // Another instance holds the lock
      setPageDisplayState('Secondary');
      setCurrentLockHolderId(lockIdFromStorage);
      console.log(`Instance ${instanceId.slice(-6)} found lock by ${lockIdFromStorage.slice(-6)}. State: Secondary`);
    }
  }, [instanceId, setPageDisplayState, setCurrentLockHolderId]);


  useEffect(() => {
    console.log(`ControlsPage Effect: Instance ${instanceId.slice(-6)} mounting/updating. Current state: ${pageDisplayState}`);
    
    setPageDisplayState('Checking'); // Ensure we are in checking state before evaluation

    if (!channelRef.current) {
      channelRef.current = new BroadcastChannel(CONTROLS_CHANNEL_NAME);
      console.log(`Instance ${instanceId.slice(-6)} created BroadcastChannel.`);
    }

    const handleChannelMessage = (message: MessageEvent) => {
      console.log(`Instance ${instanceId.slice(-6)} received channel message:`, message.data);
      if (message.data?.type === 'TAKEOVER_COMMAND') {
        if (message.data.newPrimaryId !== instanceId) {
          console.log(`Instance ${instanceId.slice(-6)} received TAKEOVER by ${message.data.newPrimaryId.slice(-6)}, navigating to /`);
          router.push('/');
        } else {
          // This instance just took over, ensure its state is Primary
          console.log(`Instance ${instanceId.slice(-6)} is the new primary from TAKEOVER_COMMAND.`);
          setPageDisplayState('Primary');
          setCurrentLockHolderId(instanceId);
        }
      } else if (message.data?.type === 'LOCK_RELEASED') {
        if (message.data.releasedBy !== instanceId) {
          console.log(`Instance ${instanceId.slice(-6)} detected LOCK_RELEASED by ${message.data.releasedBy.slice(-6)}, re-checking lock.`);
          checkLockStatus();
        }
      }
    };
    channelRef.current.onmessage = handleChannelMessage;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === CONTROLS_LOCK_KEY) {
        console.log(`Instance ${instanceId.slice(-6)} detected storage change for ${CONTROLS_LOCK_KEY}. New value: ${event.newValue?.slice(-6)}, Old value: ${event.oldValue?.slice(-6)}`);
        checkLockStatus();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleBeforeUnload = () => {
      const currentLockIdInStorage = localStorage.getItem(CONTROLS_LOCK_KEY);
      if (currentLockIdInStorage === instanceId) {
        localStorage.removeItem(CONTROLS_LOCK_KEY);
        // Note: Posting to BroadcastChannel in 'beforeunload' can be unreliable
        console.log(`Instance ${instanceId.slice(-6)} released lock on beforeunload.`);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Initial lock status check
    checkLockStatus();

    return () => {
      console.log(`ControlsPage Cleanup: Instance ${instanceId.slice(-6)} unmounting. Current lock holder in storage: ${localStorage.getItem(CONTROLS_LOCK_KEY)?.slice(-6)}`);
      
      // Important: Check if this instance still holds the lock before removing
      const currentLockIdInStorage = localStorage.getItem(CONTROLS_LOCK_KEY);
      if (currentLockIdInStorage === instanceId) {
        localStorage.removeItem(CONTROLS_LOCK_KEY);
        if (channelRef.current) { // Post release only if channel exists
             channelRef.current.postMessage({ type: 'LOCK_RELEASED', releasedBy: instanceId });
        }
        console.log(`Instance ${instanceId.slice(-6)} released lock via useEffect cleanup.`);
      }
      
      if (channelRef.current) {
        channelRef.current.close(); // Close the channel
        channelRef.current = null;
        console.log(`Instance ${instanceId.slice(-6)} closed BroadcastChannel.`);
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [instanceId, checkLockStatus, router]); // router added as push is used


  const handleTakeOver = useCallback(() => {
    console.log(`Instance ${instanceId.slice(-6)} attempting to take over.`);
    localStorage.setItem(CONTROLS_LOCK_KEY, instanceId);
    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'TAKEOVER_COMMAND', newPrimaryId: instanceId });
    }
    setCurrentLockHolderId(instanceId);
    setPageDisplayState('Primary'); // Directly set to primary after taking action
    toast({ title: "Control Adquirido", description: "Esta pestaña ahora es la principal para los controles." });
  }, [instanceId, toast, setCurrentLockHolderId, setPageDisplayState]);


  const handleResetGame = () => {
    dispatch({ type: 'RESET_GAME_STATE' });
    toast({
      title: "Nuevo Partido Iniciado",
      description: "El estado del juego ha sido restablecido.",
    });
    setShowResetConfirmation(false);
  };

  if (pageDisplayState === 'Checking') {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center p-4">
        <RefreshCw className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-foreground">Verificando instancia de controles...</p>
        <p className="text-sm text-muted-foreground">Esto tomará un momento.</p>
        <p className="text-xs text-muted-foreground mt-2">ID de esta instancia: ...{instanceId.slice(-6)}</p>
      </div>
    );
  }

  if (pageDisplayState === 'Secondary') {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center p-6 rounded-lg shadow-xl bg-card max-w-md mx-auto">
        <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
        <h1 className="text-2xl font-bold text-destructive-foreground mb-3">Múltiples Pestañas de Controles</h1>
        <p className="text-lg text-card-foreground mb-4">
          Ya existe otra pestaña o instancia de Controles activa. Para evitar problemas, solo una puede estar activa.
        </p>
        <div className="space-y-3 w-full max-w-xs">
           <Button onClick={handleTakeOver} className="w-full">
            Tomar el Control Principal en esta Pestaña
          </Button>
          <Button variant="outline" onClick={() => router.push('/')} className="w-full">
            Ir al Scoreboard
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-6">
          ID de esta instancia: ...{instanceId.slice(-6)} <br />
          ID de la instancia activa: ...{currentLockHolderId?.slice(-6) || 'Desconocido'}
        </p>
      </div>
    );
  }

  // pageDisplayState === 'Primary'
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <MiniScoreboard />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TimeControlCard />
        {/* ScorePeriodControlCard was removed, placeholder/layout logic here if needed */}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PenaltyControlCard team="home" teamName={state.homeTeamName} />
        <PenaltyControlCard team="away" teamName={state.awayTeamName} />
      </div>
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
       <p className="text-xs text-muted-foreground mt-6 text-center">
          ID de esta instancia de Controles (Primaria): ...{instanceId.slice(-6)}
      </p>
    </div>
  );
}
