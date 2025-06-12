
"use client";

import { useState } from 'react';
import { useGameState, formatTime, getActualPeriodText, getPeriodText, secondsToMinutes } from '@/contexts/game-state-context';
import type { Team } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Minus, Play, Pause, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function MiniScoreboard() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const [pendingConfirmation, setPendingConfirmation] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const MAX_PERIOD_NUMBER = state.numberOfRegularPeriods + state.numberOfOvertimePeriods;

  const handleNameChange = (team: Team, name: string) => {
    if (team === 'home') {
      dispatch({ type: 'SET_HOME_TEAM_NAME', payload: name });
    } else {
      dispatch({ type: 'SET_AWAY_TEAM_NAME', payload: name });
    }
  };

  const handleScoreAdjust = (team: Team, delta: number) => {
    dispatch({ type: 'ADJUST_SCORE', payload: { team, delta } });
    const teamName = team === 'home' ? state.homeTeamName : state.awayTeamName;
    toast({ title: `Puntuación de ${teamName} Actualizada`, description: `Puntuación ${delta > 0 ? 'aumentada' : 'disminuida'} en ${Math.abs(delta)}.` });
  };

  const handleTimeAdjust = (delta: number) => {
    dispatch({ type: 'ADJUST_TIME', payload: delta });
    toast({ 
      title: "Reloj Ajustado", 
      description: `Tiempo ajustado en ${delta > 0 ? '+' : ''}${delta} segundo${Math.abs(delta) === 1 ? '' : 's'}.` 
    });
  };

  const handleToggleClock = () => {
    // Condition for showing the default team name confirmation
    const isFirstPeriodStart = state.currentPeriod === 1 && 
                               state.periodDisplayOverride === null && 
                               state.currentTime === state.defaultPeriodDuration;
    const hasDefaultTeamNames = state.homeTeamName.trim().toUpperCase() === 'LOCAL' || 
                                state.awayTeamName.trim().toUpperCase() === 'VISITANTE';

    if (!state.isClockRunning && isFirstPeriodStart && hasDefaultTeamNames) {
      checkAndConfirm(
        true, // Always show if conditions met
        "Nombres de Equipo por Defecto",
        "Uno o ambos equipos aún tienen los nombres predeterminados ('Local', 'Visitante'). ¿Deseas iniciar el partido de todas formas o prefieres actualizar los nombres primero?",
        () => dispatch({ type: 'TOGGLE_CLOCK' })
      );
    } else {
      dispatch({ type: 'TOGGLE_CLOCK' });
    }
  };

  const executeConfirmedAction = (actionFn: () => void) => {
    actionFn();
    setPendingConfirmation(null);
  };

  const cancelConfirmation = () => {
    setPendingConfirmation(null);
  };

  const checkAndConfirm = (
    condition: boolean, 
    title: string,
    description: string,
    action: () => void
  ) => {
    if (condition) {
      setPendingConfirmation({ title, description, onConfirm: action });
    } else {
      action(); 
    }
  };

  const handlePreviousPeriod = () => {
    if (state.periodDisplayOverride === "Time Out") {
      toast({ title: "Time Out Activo", description: "Finaliza el Time Out para cambiar de período.", variant: "destructive" });
      return;
    }
    if (state.periodDisplayOverride === "Break" || state.periodDisplayOverride === "Pre-OT Break") {
      dispatch({ type: 'SET_PERIOD', payload: state.currentPeriod });
      toast({ title: "Período Cambiado", description: `Período establecido a ${getPeriodText(state.currentPeriod, state.numberOfRegularPeriods)}. Reloj reiniciado y pausado.` });
    } else { 
      if (state.currentPeriod > 1) {
        const actionToConfirm = () => {
          dispatch({ type: 'START_BREAK_AFTER_PREVIOUS_PERIOD' }); 
          
          const periodBeforeIntendedBreak = state.currentPeriod -1;
          const isPreOT = periodBeforeIntendedBreak >= state.numberOfRegularPeriods;
          const breakType = isPreOT ? "Pre-OT Break" : "Break";
          const duration = isPreOT ? state.defaultPreOTBreakDuration : state.defaultBreakDuration;
          const autoStart = isPreOT ? state.autoStartPreOTBreaks : state.autoStartBreaks;
          toast({ 
              title: `${breakType} Iniciado`, 
              description: `${breakType} iniciado después de ${getPeriodText(periodBeforeIntendedBreak, state.numberOfRegularPeriods)} (${secondsToMinutes(duration)} min). Reloj ${autoStart ? 'corriendo' : 'pausado'}.`
          });
        };
        
        const isCurrentPeriodOT = state.currentPeriod > state.numberOfRegularPeriods;
        const currentPeriodExpectedDuration = isCurrentPeriodOT ? state.defaultOTPeriodDuration : state.defaultPeriodDuration;
        
        const shouldConfirm = state.periodDisplayOverride === null &&
                              state.currentTime > 0 &&
                              state.currentTime < currentPeriodExpectedDuration;

        checkAndConfirm(
          shouldConfirm,
          "Confirmar Acción",
          "El reloj del período actual ha corrido. ¿Estás seguro de que quieres iniciar el descanso/ir al período anterior?",
          actionToConfirm
        );
      } else {
        toast({ title: "Límite de Período Alcanzado", description: "No se puede retroceder más allá del 1er Período.", variant: "destructive" });
      }
    }
  };

  const handleNextAction = () => { 
    if (state.periodDisplayOverride === "Time Out") {
      if (state.currentTime <= 0) {
        dispatch({ type: 'END_TIMEOUT' });
        toast({ title: "Time Out Finalizado", description: "Juego reanudado al estado anterior." });
      } else {
        toast({ title: "Time Out en Curso", description: "El tiempo de Time Out aún no ha finalizado." });
      }
      return;
    }

    if (state.periodDisplayOverride === "Break" || state.periodDisplayOverride === "Pre-OT Break") {
      const nextNumericPeriod = state.currentPeriod + 1;
      if (nextNumericPeriod <= MAX_PERIOD_NUMBER) {
        dispatch({ type: 'SET_PERIOD', payload: nextNumericPeriod });
        toast({ title: "Período Cambiado", description: `Período establecido a ${getPeriodText(nextNumericPeriod, state.numberOfRegularPeriods)}. Reloj reiniciado y pausado.` });
      } else {
        toast({ title: "Límite de Período Alcanzado", description: `No se puede avanzar más allá de ${getPeriodText(state.currentPeriod, state.numberOfRegularPeriods)}.`, variant: "destructive" });
      }
    } else { 
      if (state.currentPeriod < MAX_PERIOD_NUMBER) {
        const actionToConfirm = () => {
          const isPreOT = state.currentPeriod >= state.numberOfRegularPeriods; 
          const breakType = isPreOT ? "Pre-OT Break" : "Break";
          const duration = isPreOT ? state.defaultPreOTBreakDuration : state.defaultBreakDuration;
          const autoStart = isPreOT ? state.autoStartPreOTBreaks : state.autoStartBreaks;

          if (isPreOT) {
              dispatch({ type: 'START_PRE_OT_BREAK' });
          } else {
              dispatch({ type: 'START_BREAK' });
          }
          toast({ 
              title: `${breakType} Iniciado`, 
              description: `${breakType} iniciado después de ${getPeriodText(state.currentPeriod, state.numberOfRegularPeriods)} (${secondsToMinutes(duration)} min). Reloj ${autoStart ? 'corriendo' : 'pausado'}.`
          });
        };

        const isCurrentPeriodOT = state.currentPeriod > state.numberOfRegularPeriods;
        const currentPeriodExpectedDuration = isCurrentPeriodOT ? state.defaultOTPeriodDuration : state.defaultPeriodDuration;

        const shouldConfirm = state.periodDisplayOverride === null &&
                              state.currentTime > 0 &&
                              state.currentTime < currentPeriodExpectedDuration;
        
        checkAndConfirm(
          shouldConfirm,
          "Confirmar Acción",
          "El reloj del período actual ha corrido. ¿Estás seguro de que quieres iniciar el descanso/ir al siguiente período?",
          actionToConfirm
        );
      } else {
         toast({ title: "Límite de Período Alcanzado", description: `No se puede avanzar más allá de ${getPeriodText(state.currentPeriod, state.numberOfRegularPeriods)}.`, variant: "destructive" });
      }
    }
  };
  
  const isPreviousPeriodDisabled = (state.periodDisplayOverride === null && state.currentPeriod <= 1) || state.periodDisplayOverride === "Time Out";
  const isNextPeriodDisabled = (state.periodDisplayOverride === null && state.currentPeriod >= MAX_PERIOD_NUMBER && state.numberOfOvertimePeriods > 0) ||
                               (state.periodDisplayOverride === null && state.currentPeriod >= state.numberOfRegularPeriods && state.numberOfOvertimePeriods === 0) ||
                               (state.periodDisplayOverride === "Time Out" && state.currentTime > 0);


  const showNextActionButton = state.currentTime <= 0 && !state.isClockRunning;
  const nextActionButtonText = state.periodDisplayOverride === "Time Out" && state.currentTime <=0 ? "Finalizar Time Out" : "Siguiente";


  return (
    <>
      <Card className="mb-8 bg-card shadow-lg">
        <CardContent className="flex flex-col sm:flex-row justify-around items-center text-center gap-4 sm:gap-8 py-6">
          {/* Home Team Section */}
          <div className="flex-1 space-y-1">
            <Input
              value={state.homeTeamName}
              onChange={(e) => handleNameChange('home', e.target.value)}
              onBlur={(e) => handleNameChange('home', e.target.value.trim() || 'Local')}
              className="bg-transparent border-0 text-center p-0 text-sm uppercase text-card-foreground placeholder:text-muted-foreground focus:ring-0 focus:border-b focus:border-primary h-auto leading-tight"
              placeholder="Nombre Local"
              aria-label="Nombre del equipo local"
            />
            <p className="text-xs text-muted-foreground -mt-1">(Local)</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-accent" 
                onClick={() => handleScoreAdjust('home', -1)}
                aria-label={`Disminuir Puntuación ${state.homeTeamName}`}
              >
                <Minus className="h-5 w-5" />
              </Button>
              <p className="text-4xl font-bold text-accent w-12 text-center tabular-nums">{state.homeScore}</p>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-accent" 
                onClick={() => handleScoreAdjust('home', 1)}
                aria-label={`Aumentar Puntuación ${state.homeTeamName}`}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Clock & Period Section */}
          <div className="flex-1 space-y-2 text-center">
            {showNextActionButton ? (
              <Button
                onClick={handleNextAction}
                className="w-full max-w-[200px] mx-auto mb-2"
                variant="default"
                aria-label={nextActionButtonText}
                disabled={isNextPeriodDisabled && state.periodDisplayOverride === null} 
              >
                <ChevronsRight className="mr-2 h-5 w-5" /> {nextActionButtonText}
              </Button>
            ) : (
              <Button
                onClick={handleToggleClock}
                className="w-full max-w-[180px] mx-auto mb-2"
                variant={state.isClockRunning ? "destructive" : "default"}
                aria-label={state.isClockRunning ? "Pausar Reloj" : "Iniciar Reloj"}
                disabled={state.currentTime <= 0 && !state.isClockRunning && state.periodDisplayOverride !== "Time Out"}
              >
                {state.isClockRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                {state.isClockRunning ? 'Pausar' : 'Iniciar'} Reloj
              </Button>
            )}
            
            <div className="flex items-center justify-center gap-1">
              {!state.isClockRunning && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-accent"
                  onClick={() => handleTimeAdjust(-1)}
                  aria-label="Restar 1 segundo al reloj"
                >
                  <Minus className="h-3 w-3" />
                </Button>
              )}
              <p className="text-5xl font-bold text-accent tabular-nums">{formatTime(state.currentTime)}</p>
              {!state.isClockRunning && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-accent"
                  onClick={() => handleTimeAdjust(1)}
                  aria-label="Sumar 1 segundo al reloj"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="relative mt-1 flex items-center justify-center gap-2">
               <Button 
                onClick={handlePreviousPeriod} 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-primary-foreground"
                aria-label="Período Anterior o Descanso"
                disabled={isPreviousPeriodDisabled}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <p className="text-lg text-primary-foreground uppercase w-28 truncate">
                {getActualPeriodText(state.currentPeriod, state.periodDisplayOverride, state.numberOfRegularPeriods)}
              </p>
              <Button 
                onClick={handleNextAction} 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-primary-foreground"
                aria-label="Siguiente Período o Descanso"
                disabled={isNextPeriodDisabled}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              {!state.isClockRunning && state.currentTime > 0 && !showNextActionButton && (
                <span className="absolute top-[-0.25rem] right-1 text-[0.6rem] font-normal text-muted-foreground normal-case px-1 rounded-sm bg-background/30">
                  Paused
                </span>
              )}
            </div>
            {state.periodDisplayOverride === "Time Out" && state.preTimeoutState && (
              <div className="text-xs text-muted-foreground mt-1">
                Retornando a: {getPeriodText(state.preTimeoutState.period, state.numberOfRegularPeriods)} - {formatTime(state.preTimeoutState.time)}
                {state.preTimeoutState.override ? ` (${state.preTimeoutState.override})` : ''}
              </div>
            )}
          </div>

          {/* Away Team Section */}
          <div className="flex-1 space-y-1">
            <Input
              value={state.awayTeamName}
              onChange={(e) => handleNameChange('away', e.target.value)}
              onBlur={(e) => handleNameChange('away', e.target.value.trim() || 'Visitante')}
              className="bg-transparent border-0 text-center p-0 text-sm uppercase text-card-foreground placeholder:text-muted-foreground focus:ring-0 focus:border-b focus:border-primary h-auto leading-tight"
              placeholder="Nombre Visitante"
              aria-label="Nombre del equipo visitante"
            />
             <p className="text-xs text-muted-foreground -mt-1">(Visitante)</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-accent" 
                onClick={() => handleScoreAdjust('away', -1)}
                aria-label={`Disminuir Puntuación ${state.awayTeamName}`}
              >
                <Minus className="h-5 w-5" />
              </Button>
              <p className="text-4xl font-bold text-accent w-12 text-center tabular-nums">{state.awayScore}</p>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-accent" 
                onClick={() => handleScoreAdjust('away', 1)}
                aria-label={`Aumentar Puntuación ${state.awayTeamName}`}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {pendingConfirmation && (
        <AlertDialog open={true} onOpenChange={(isOpen) => !isOpen && cancelConfirmation()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{pendingConfirmation.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingConfirmation.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelConfirmation}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => executeConfirmedAction(pendingConfirmation.onConfirm)}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

    
