
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MiniScoreboard } from '@/components/controls/mini-scoreboard';
import { PenaltyControlCard } from '@/components/controls/penalty-control-card';
import { GoalManagementDialog } from '@/components/controls/goal-management-dialog';
import { GameSummaryDialog } from '@/components/controls/game-summary-dialog';
import { useGameState, type Team, type GoalLog, type PenaltyLog, getCategoryNameById, formatTime } from '@/contexts/game-state-context';
import type { PlayerData } from '@/types';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, AlertTriangle, PlayCircle, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { saveGameSummary } from '@/ai/flows/file-operations';

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
  const [isDownloadPromptOpen, setIsDownloadPromptOpen] = useState(false);
  
  const [isGoalManagementOpen, setIsGoalManagementOpen] = useState(false);
  const [editingTeamForGoals, setEditingTeamForGoals] = useState<Team | null>(null);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);

  const prevPeriodDisplayOverrideRef = useRef<string | null>();
  const isInitialMount = useRef(true);


  useEffect(() => {
    // Skip the effect on the initial render/hydration cycle
    if (isInitialMount.current) {
        isInitialMount.current = false;
        prevPeriodDisplayOverrideRef.current = state.periodDisplayOverride;
        return;
    }

    // Only the primary controls tab should handle saving
    if (pageDisplayState !== 'Primary') {
        prevPeriodDisplayOverrideRef.current = state.periodDisplayOverride;
        return;
    }

    // Check for the specific transition from not-ended to ended
    if (prevPeriodDisplayOverrideRef.current !== 'End of Game' && state.periodDisplayOverride === 'End of Game') {
        const categoryName = getCategoryNameById(state.selectedMatchCategory, state.availableCategories) || 'N/A';
        
        (async () => {
            try {
                const result = await saveGameSummary({
                    homeTeamName: state.homeTeamName,
                    awayTeamName: state.awayTeamName,
                    homeScore: state.homeScore,
                    awayScore: state.awayScore,
                    categoryName: categoryName,
                    gameSummary: state.gameSummary
                });
                if (result.success) {
                    toast({
                        title: "Resumen Guardado",
                        description: `El resumen del partido se ha guardado en el servidor.`,
                    });
                } else {
                    toast({
                        title: "Error al Guardar",
                        description: result.message,
                        variant: "destructive",
                    });
                }
            } catch (e) {
                console.error('Failed to save game summary from controls page:', e);
                toast({
                    title: "Error al Guardar Resumen",
                    description: "No se pudo guardar el resumen del partido en el servidor.",
                    variant: "destructive",
                });
            }
        })();
    }

    // Always update the ref for the next render
    prevPeriodDisplayOverrideRef.current = state.periodDisplayOverride;

  }, [
      state.periodDisplayOverride, 
      pageDisplayState, 
      state.selectedMatchCategory, 
      state.availableCategories, 
      state.homeTeamName, 
      state.awayTeamName, 
      state.homeScore, 
      state.awayScore, 
      state.gameSummary,
      toast
  ]);


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
        dispatch({ type: 'TOGGLE_CLOCK' });
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
    dispatch({ type: 'RESET_GAME_STATE' });
    toast({
      title: "Nuevo Partido Iniciado",
      description: "El estado del juego ha sido restablecido.",
    });
    setShowResetConfirmation(false);
  };
  
  const handleConfirmReset = () => {
    setShowResetConfirmation(false);
    setIsDownloadPromptOpen(true);
  };

  const getEndReasonText = (reason?: PenaltyLog['endReason']): string => {
    if (!reason) return 'Activa';
    switch (reason) {
        case 'completed': return 'Cumplida';
        case 'deleted': return 'Eliminada';
        case 'goal_on_pp': return 'Gol en Contra';
        default: return 'Cerrada';
    }
  };

  const handleDownloadAndReset = () => {
    // --- PDF Generation Logic ---
    const doc = new jsPDF();
    const teamTitle = `${state.homeTeamName} vs ${state.awayTeamName}`;
    const categoryName = getCategoryNameById(state.selectedMatchCategory, state.availableCategories) || 'N/A';
    
    const date = new Date();
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    const filename = `${dateString} - Cat ${categoryName} - ${state.homeTeamName} vs ${state.awayTeamName}.pdf`;

    const finalScore = `${state.homeScore} - ${state.awayScore}`;

    doc.text(`Resumen del Partido: ${teamTitle} (Cat. ${categoryName})`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Fecha: ${date.toLocaleDateString()}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Resultado Final: ${finalScore}`, 14, 29);

    const homeGoals = state.goals.filter(g => g.team === 'home').sort((a, b) => a.timestamp - b.timestamp);
    const awayGoals = state.goals.filter(g => g.team === 'away').sort((a, b) => a.timestamp - b.timestamp);
    const homePenalties = [...state.gameSummary.home.penalties].sort((a,b) => a.addTimestamp - b.addTimestamp);
    const awayPenalties = [...state.gameSummary.away.penalties].sort((a,b) => a.addTimestamp - b.addTimestamp);

    const homeTeamData = state.teams.find(t => t.name === state.homeTeamName && (t.subName || undefined) === (state.homeTeamSubName || undefined) && t.category === state.selectedMatchCategory);
    const awayTeamData = state.teams.find(t => t.name === state.awayTeamName && (t.subName || undefined) === (state.awayTeamSubName || undefined) && t.category === state.selectedMatchCategory);

    const homeAttendanceIds = new Set(state.gameSummary.attendance?.home || []);
    const homeAttendedPlayers = homeTeamData?.players
        .filter(p => homeAttendanceIds.has(p.id))
        .sort((a,b) => (parseInt(a.number) || 999) - (parseInt(b.number) || 999)) || [];

    const awayAttendanceIds = new Set(state.gameSummary.attendance?.away || []);
    const awayAttendedPlayers = awayTeamData?.players
        .filter(p => awayAttendanceIds.has(p.id))
        .sort((a,b) => (parseInt(a.number) || 999) - (parseInt(b.number) || 999)) || [];
    
    const addTeamSection = (doc: jsPDF, teamName: string, goals: GoalLog[], penalties: PenaltyLog[], attendedPlayers: PlayerData[], startY: number): number => {
        let currentY = startY;

        // --- Goles Section ---
        doc.setFontSize(14);
        doc.text(`${teamName} - Goles`, 14, currentY);
        currentY += 2; // Move down for the table/text

        if (goals.length > 0) {
            autoTable(doc, {
                startY: currentY,
                head: [['Tiempo', 'Periodo', 'Gol', 'Asistencia']],
                body: goals.map(g => [
                  formatTime(g.gameTime), 
                  g.periodText, 
                  `#${g.scorer?.playerNumber || 'S/N'} ${g.scorer?.playerName || ''}`.trim(),
                  g.assist ? `#${g.assist.playerNumber} ${g.assist.playerName || ''}`.trim() : '---'
                ]),
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] },
            });
            currentY = (doc as any).lastAutoTable.finalY;
        } else {
             doc.setFontSize(10);
             doc.text("Sin goles registrados.", 14, currentY + 6);
             currentY += 10; // Approx height for the text line + padding
        }
        
        // --- Penalidades Section ---
        currentY += 12; // Padding before next section
        doc.setFontSize(14);
        doc.text(`${teamName} - Penalidades`, 14, currentY);
        currentY += 2;

        if (penalties.length > 0) {
            autoTable(doc, {
                startY: currentY,
                head: [['Tiempo', 'Periodo', 'Jugador #', 'Nombre', 'Duración', 'Estado']],
                body: penalties.map(p => [formatTime(p.addGameTime), p.addPeriodText, p.playerNumber, p.playerName || '---', formatTime(p.initialDuration * 100), getEndReasonText(p.endReason)]),
                theme: 'striped',
                headStyles: { fillColor: [231, 76, 60] },
            });
            currentY = (doc as any).lastAutoTable.finalY;
        } else {
            doc.setFontSize(10);
            doc.text("Sin penalidades registradas.", 14, currentY + 6);
            currentY += 10;
        }

        // --- Asistencia Section ---
        currentY += 12; // Padding before next section
        doc.setFontSize(14);
        doc.text(`${teamName} - Asistencia`, 14, currentY);
        currentY += 2;
        
        if (attendedPlayers.length > 0) {
            autoTable(doc, {
                startY: currentY,
                head: [['#', 'Nombre']],
                body: attendedPlayers.map(p => [p.number || 'S/N', p.name || '---']),
                theme: 'grid',
                headStyles: { fillColor: [22, 163, 74] },
            });
            currentY = (doc as any).lastAutoTable.finalY;
        } else {
            doc.setFontSize(10);
            doc.text("Sin jugadores marcados como asistentes.", 14, currentY + 6);
            currentY += 10;
        }

        return currentY;
    };
    
    const homeFinalY = addTeamSection(doc, state.homeTeamName, homeGoals, homePenalties, homeAttendedPlayers, 40);
    addTeamSection(doc, state.awayTeamName, awayGoals, awayPenalties, awayAttendedPlayers, homeFinalY + 15);

    doc.save(filename);
    // --- End PDF Generation Logic ---
    
    toast({
        title: "Resumen Descargado",
        description: `El archivo ${filename} se ha guardado.`,
    });
    
    handleResetGame();
    setIsDownloadPromptOpen(false);
  };


  const handleActivatePendingPuckPenalties = () => {
    dispatch({ type: 'ACTIVATE_PENDING_PUCK_PENALTIES' });
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
                  <AlertDialogAction onClick={handleConfirmReset}>
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

      {isDownloadPromptOpen && (
        <AlertDialog open={isDownloadPromptOpen} onOpenChange={setIsDownloadPromptOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Descargar Resumen del Partido</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Deseas descargar un resumen en PDF del partido que acaba de finalizar antes de reiniciar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { handleResetGame(); setIsDownloadPromptOpen(false); }} variant="outline">
                Reiniciar sin Descargar
              </AlertDialogAction>
              <AlertDialogAction onClick={handleDownloadAndReset}>
                Descargar y Reiniciar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
