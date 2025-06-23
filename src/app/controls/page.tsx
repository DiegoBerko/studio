
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { MiniScoreboard } from '@/components/controls/mini-scoreboard';
import { TimeControlCard } from '@/components/controls/time-control-card';
import { PenaltyControlCard } from '@/components/controls/penalty-control-card';
import { GoalManagementDialog } from '@/components/controls/goal-management-dialog';
import { GameSummaryDialog } from '@/components/controls/game-summary-dialog';
import { useGameState, type Team } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, AlertTriangle, PlayCircle, FileText } from 'lucide-react';
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
  
  const [instanceId, setInstanceId] = useState<string | null>(null);
  
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  
  const [isGoalManagementOpen, setIsGoalManagementOpen] = useState(false);
  const [editingTeamForGoals, setEditingTeamForGoals] = useState<Team | null>(null);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);


  useEffect(() => {
    setInstanceId(crypto.randomUUID());
  }, []);

  const checkLockStatus = useCallback(() => {
    if (!instanceId) {
      return;
    }
    const lockIdFromStorage = localStorage.getItem(CONTROLS_LOCK_KEY);
    
    if (!lockIdFromStorage) {
      localStorage.setItem(CONTROLS_LOCK_KEY, instanceId);
      setCurrentLockHolderId(instanceId);
      setPageDisplayState('Primary');
      console.log(`Instance ${instanceId.slice(-6)} took lock (no prior lock). State: Primary`);
    } else if (lockIdFromStorage === instanceId) {
      setPageDisplayState('Primary');
      setCurrentLockHolderId(instanceId);
      console.log(`Instance ${instanceId.slice(-6)} confirmed lock. State: Primary`);
    } else {
      setPageDisplayState('Secondary');
      setCurrentLockHolderId(lockIdFromStorage);
      console.log(`Instance ${instanceId.slice(-6)} found lock by ${lockIdFromStorage.slice(-6)}. State: Secondary`);
    }
  }, [instanceId, setPageDisplayState, setCurrentLockHolderId]);


  useEffect(() => {
    if (!instanceId) return; 
    console.log(`ControlsPage Effect: Instance ${instanceId.slice(-6)} mounting/updating. Current state: ${pageDisplayState}`);
    
    setPageDisplayState('Checking'); 

    if (!channelRef.current) {
      channelRef.current = new BroadcastChannel(CONTROLS_CHANNEL_NAME);
      console.log(`Instance ${instanceId.slice(-6)} created BroadcastChannel.`);
    }

    const handleChannelMessage = (message: MessageEvent) => {
      if (!instanceId) return;
      console.log(`Instance ${instanceId.slice(-6)} received channel message:`, message.data);
      if (message.data?.type === 'TAKEOVER_COMMAND') {
        if (message.data.newPrimaryId !== instanceId) {
          console.log(`Instance ${instanceId.slice(-6)} received TAKEOVER by ${message.data.newPrimaryId.slice(-6)}, navigating to /`);
          router.push('/');
        } else {
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
      if (!instanceId) return;
      if (event.key === CONTROLS_LOCK_KEY) {
        console.log(`Instance ${instanceId.slice(-6)} detected storage change for ${CONTROLS_LOCK_KEY}. New value: ${event.newValue?.slice(-6)}, Old value: ${event.oldValue?.slice(-6)}`);
        checkLockStatus();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleBeforeUnload = () => {
      if (!instanceId) return;
      const currentLockIdInStorage = localStorage.getItem(CONTROLS_LOCK_KEY);
      if (currentLockIdInStorage === instanceId) {
        localStorage.removeItem(CONTROLS_LOCK_KEY);
        console.log(`Instance ${instanceId.slice(-6)} released lock on beforeunload.`);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    checkLockStatus();

    return () => {
      if (!instanceId) return;
      console.log(`ControlsPage Cleanup: Instance ${instanceId.slice(-6)} unmounting. Current lock holder in storage: ${localStorage.getItem(CONTROLS_LOCK_KEY)?.slice(-6)}`);
      
      const currentLockIdInStorage = localStorage.getItem(CONTROLS_LOCK_KEY);
      if (currentLockIdInStorage === instanceId) {
        localStorage.removeItem(CONTROLS_LOCK_KEY);
        if (channelRef.current) { 
             channelRef.current.postMessage({ type: 'LOCK_RELEASED', releasedBy: instanceId });
        }
        console.log(`Instance ${instanceId.slice(-6)} released lock via useEffect cleanup.`);
      }
      
      if (channelRef.current) {
        channelRef.current.close(); 
        channelRef.current = null;
        console.log(`Instance ${instanceId.slice(-6)} closed BroadcastChannel.`);
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [instanceId, checkLockStatus, router]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (pageDisplayState !== 'Primary') {
        return;
      }

      if (event.code === 'Space' || event.key === ' ') {
        const activeElement = document.activeElement as HTMLElement;
        
        if (
          activeElement &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.isContentEditable ||
            activeElement.getAttribute?.('role') === 'button')
        ) {
          return; 
        }
        
        event.preventDefault();
        flushSync(() => {
          dispatch({ type: 'TOGGLE_CLOCK' });
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch, pageDisplayState]);


  const handleTakeOver = useCallback(() => {
    if (!instanceId) {
      toast({ title: "Error", description: "No se pudo obtener el ID de la instancia. Intenta recargar.", variant: "destructive" });
      return;
    }
    console.log(`Instance ${instanceId.slice(-6)} attempting to take over.`);
    localStorage.setItem(CONTROLS_LOCK_KEY, instanceId);
    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'TAKEOVER_COMMAND', newPrimaryId: instanceId });
    }
    setCurrentLockHolderId(instanceId);
    setPageDisplayState('Primary'); 
    toast({ title: "Control Adquirido", description: "Esta pestaña ahora es la principal para los controles." });
  }, [instanceId, toast, setCurrentLockHolderId, setPageDisplayState]);


  const handleResetGame = () => {
    flushSync(() => {
      dispatch({ type: 'RESET_GAME_STATE' });
    });
    toast({
      title: "Nuevo Partido Iniciado",
      description: "El estado del juego ha sido restablecido.",
    });
    setShowResetConfirmation(false);
  };

  const handleActivatePendingPuckPenalties = () => {
    flushSync(() => {
      dispatch({ type: 'ACTIVATE_PENDING_PUCK_PENALTIES' });
    });
  };

  const hasPendingPuckPenalties = useMemo(() => {
    return state.homePenalties.some(p => p._status === 'pending_puck') ||
           state.awayPenalties.some(p => p._status === 'pending_puck');
  }, [state.homePenalties, state.awayPenalties]);

  const handleScoreClick = (team: Team) => {
    setEditingTeamForGoals(team);
    setIsGoalManagementOpen(true);
  };

  if (pageDisplayState === 'Checking' || !instanceId) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center p-4">
        <RefreshCw className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-foreground">Verificando instancia de controles...</p>
        <p className="text-sm text-muted-foreground">Esto tomará un momento.</p>
        <p className="text-xs text-muted-foreground mt-2">ID de esta instancia: ...{instanceId ? instanceId.slice(-6) : 'generando...'}</p>
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
          ID de esta instancia: ...{instanceId ? instanceId.slice(-6) : 'N/A'} <br />
          ID de la instancia activa: ...{currentLockHolderId?.slice(-6) || 'Desconocido'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <MiniScoreboard onScoreClick={handleScoreClick} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TimeControlCard />
      </div>

      {hasPendingPuckPenalties && (
        <div className="my-6 flex justify-center">
          <Button
            variant="destructive"
            size="lg"
            className="px-8 py-4 text-base font-semibold h-auto" 
            onClick={handleActivatePendingPuckPenalties}
          >
            <PlayCircle className="mr-2 h-5 w-5" /> 
            ACTIVAR PENALIDADES (PUCK EN JUEGO)
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PenaltyControlCard team="home" teamName={state.homeTeamName} />
        <PenaltyControlCard team="away" teamName={state.awayTeamName} />
      </div>
      <div className="mt-12 pt-8 border-t border-border">
         <div className="flex flex-col sm:flex-row gap-4 items-start">
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
                    Esto restablecerá todas las puntuaciones, el reloj, el período, las penalidades y el registro de eventos del partido a sus valores iniciales. Las configuraciones guardadas (duraciones, etc.) no se verán afectadas. ¿Estás seguro?
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
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsSummaryDialogOpen(true)}>
              <FileText className="mr-2 h-4 w-4" /> Ver Resumen del Partido
            </Button>
        </div>
         <p className="text-xs text-muted-foreground mt-2">
          La acción "Iniciar Nuevo Partido" restablecerá los marcadores, el reloj, el período actual, las penalidades y el registro de eventos del partido.
          Las configuraciones de duración de períodos, descansos, timeouts y penalidades se mantendrán.
        </p>
      </div>
       <p className="text-xs text-muted-foreground mt-6 text-center">
          ID de esta instancia de Controles (Primaria): ...{instanceId ? instanceId.slice(-6) : 'N/A'}
      </p>

      {isGoalManagementOpen && (
        <GoalManagementDialog 
            isOpen={isGoalManagementOpen} 
            onOpenChange={(isOpen) => {
              setIsGoalManagementOpen(isOpen);
              if (!isOpen) {
                setEditingTeamForGoals(null);
              }
            }}
            team={editingTeamForGoals}
        />
      )}

      {isSummaryDialogOpen && (
        <GameSummaryDialog 
          isOpen={isSummaryDialogOpen}
          onOpenChange={setIsSummaryDialogOpen}
        />
      )}
    </div>
  );
}
