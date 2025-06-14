
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameState, formatTime, getActualPeriodText, getPeriodText, centisecondsToDisplayMinutes } from '@/contexts/game-state-context';
import type { Team } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Minus, Play, Pause, ChevronLeft, ChevronRight, ChevronsRight, User, Search, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type EditingSegment = 'minutes' | 'seconds' | 'tenths';

export function MiniScoreboard() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const [pendingConfirmation, setPendingConfirmation] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const MAX_TOTAL_GAME_PERIODS = state.numberOfRegularPeriods + state.numberOfOvertimePeriods;

  const [editingSegment, setEditingSegment] = useState<EditingSegment | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Home Team Name State
  const [localHomeTeamName, setLocalHomeTeamName] = useState(state.homeTeamName);
  const [isHomePopoverOpen, setIsHomePopoverOpen] = useState(false);
  const [homeSearchTerm, setHomeSearchTerm] = useState("");

  // Away Team Name State
  const [localAwayTeamName, setLocalAwayTeamName] = useState(state.awayTeamName);
  const [isAwayPopoverOpen, setIsAwayPopoverOpen] = useState(false);
  const [awaySearchTerm, setAwaySearchTerm] = useState("");


  useEffect(() => {
    if (!isHomePopoverOpen) { 
        setLocalHomeTeamName(state.homeTeamName);
    }
  }, [state.homeTeamName, isHomePopoverOpen]);

  useEffect(() => {
    if (!isAwayPopoverOpen) { 
        setLocalAwayTeamName(state.awayTeamName);
    }
  }, [state.awayTeamName, isAwayPopoverOpen]);


  const getTimeParts = useCallback((timeCs: number) => {
    const safeTimeCs = Math.max(0, timeCs);
    const totalSecondsOnly = Math.floor(safeTimeCs / 100);
    const minutes = Math.floor(totalSecondsOnly / 60);
    const seconds = totalSecondsOnly % 60;
    const tenths = Math.floor((safeTimeCs % 100) / 10);
    return { minutes, seconds, tenths };
  }, []);

  const timeParts = getTimeParts(state.currentTime);

  useEffect(() => {
    if (editingSegment && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingSegment]);

  const handleScoreAdjust = (team: Team, delta: number) => {
    dispatch({ type: 'ADJUST_SCORE', payload: { team, delta } });
    const teamName = team === 'home' ? state.homeTeamName : state.awayTeamName;
    toast({ title: `Puntuación de ${teamName} Actualizada`, description: `Puntuación ${delta > 0 ? 'aumentada' : 'disminuida'} en ${Math.abs(delta)}.` });
  };

  const handleTimeAdjust = (deltaSeconds: number) => {
    dispatch({ type: 'ADJUST_TIME', payload: deltaSeconds * 100 });
    toast({
      title: "Reloj Ajustado",
      description: `Tiempo ajustado en ${deltaSeconds > 0 ? '+' : ''}${deltaSeconds} segundo${Math.abs(deltaSeconds) === 1 ? '' : 's'}.`
    });
  };

  const handleToggleClock = () => {
    setEditingSegment(null);
    const isFirstGameAction = state.currentPeriod === 0 &&
                              state.periodDisplayOverride === 'Warm-up' &&
                              state.currentTime === state.defaultWarmUpDuration;
    const hasDefaultTeamNames = state.homeTeamName.trim().toUpperCase() === 'LOCAL' ||
                                state.awayTeamName.trim().toUpperCase() === 'VISITANTE';

    if (!state.isClockRunning && isFirstGameAction && hasDefaultTeamNames) {
      checkAndConfirm(
        true,
        "Nombres de Equipo por Defecto",
        "Uno o ambos equipos aún tienen los nombres predeterminados ('Local', 'Visitante'). ¿Deseas iniciar la entrada en calor de todas formas o prefieres actualizar los nombres primero?",
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
    setEditingSegment(null);
    if (state.periodDisplayOverride === "Time Out") {
      toast({ title: "Time Out Activo", description: "Finaliza el Time Out para cambiar de período.", variant: "destructive" });
      return;
    }
    if (state.periodDisplayOverride === "Break" || state.periodDisplayOverride === "Pre-OT Break") {
      const actionToConfirm = () => {
        dispatch({ type: 'SET_PERIOD', payload: state.currentPeriod });
        toast({ title: "Período Restaurado", description: `Retornando a ${getPeriodText(state.currentPeriod, state.numberOfRegularPeriods)}. Reloj reiniciado y pausado.` });
      };

      const currentBreakDurationCs = state.periodDisplayOverride === "Break" ? state.defaultBreakDuration : state.defaultPreOTBreakDuration;
      const shouldConfirm = state.currentTime > 0 && state.currentTime < currentBreakDurationCs;

      checkAndConfirm(
        shouldConfirm,
        "Confirmar Acción",
        `El descanso no ha finalizado. ¿Estás seguro de que quieres retornar a ${getPeriodText(state.currentPeriod, state.numberOfRegularPeriods)}?`,
        actionToConfirm
      );
    } else {
      if (state.currentPeriod === 1) {
        const actionToConfirm = () => {
          dispatch({ type: 'SET_PERIOD', payload: 0 });
          toast({ title: "Entrada en Calor Reiniciada", description: `Reloj de Entrada en Calor (${centisecondsToDisplayMinutes(state.defaultWarmUpDuration)} min) ${state.autoStartWarmUp ? 'corriendo.' : 'pausado.'}` });
        };
        const shouldConfirm = state.currentTime > 0 && state.currentTime < state.defaultPeriodDuration;
        checkAndConfirm(
          shouldConfirm,
          "Confirmar Acción",
          "El reloj del 1er período ha corrido. ¿Estás seguro de que quieres volver a la Entrada en Calor (reiniciará su tiempo)?",
          actionToConfirm
        );
      } else if (state.currentPeriod > 1) {
        const actionToConfirm = () => {
          dispatch({ type: 'START_BREAK_AFTER_PREVIOUS_PERIOD' });
          const periodBeforeIntendedBreak = state.currentPeriod -1;
          const isPreOT = periodBeforeIntendedBreak >= state.numberOfRegularPeriods;
          const breakType = isPreOT ? "Pre-OT Break" : "Break";
          const durationCs = isPreOT ? state.defaultPreOTBreakDuration : state.defaultBreakDuration;
          const autoStart = isPreOT ? state.autoStartPreOTBreaks : state.autoStartBreaks;
          toast({
              title: `${breakType} Iniciado`,
              description: `${breakType} iniciado después de ${getPeriodText(periodBeforeIntendedBreak, state.numberOfRegularPeriods)} (${centisecondsToDisplayMinutes(durationCs)} min). Reloj ${autoStart ? 'corriendo' : 'pausado'}.`
          });
        };

        const isCurrentPeriodOT = state.currentPeriod > state.numberOfRegularPeriods;
        const currentPeriodExpectedDurationCs = isCurrentPeriodOT ? state.defaultOTPeriodDuration : state.defaultPeriodDuration;
        const shouldConfirm = state.currentTime > 0 && state.currentTime < currentPeriodExpectedDurationCs;
        checkAndConfirm(
          shouldConfirm,
          "Confirmar Acción",
          "El reloj del período actual ha corrido. ¿Estás seguro de que quieres iniciar el descanso del período anterior?",
          actionToConfirm
        );
      } else {
        toast({ title: "Inicio del Juego", description: "No se puede retroceder más allá de la Entrada en Calor.", variant: "destructive" });
      }
    }
  };

  const handleNextAction = () => {
    setEditingSegment(null);
    if (state.periodDisplayOverride === "Time Out") {
      if (state.currentTime <= 0) {
        dispatch({ type: 'END_TIMEOUT' });
        toast({ title: "Time Out Finalizado", description: "Juego reanudado al estado anterior." });
      } else {
        toast({ title: "Time Out en Curso", description: "El tiempo de Time Out aún no ha finalizado." });
      }
      return;
    }

    if (state.currentPeriod === 0 && state.periodDisplayOverride === "Warm-up") {
      const actionToConfirm = () => {
        dispatch({ type: 'SET_PERIOD', payload: 1 });
        toast({ title: "1er Período Iniciado", description: `Reloj de 1er Período (${centisecondsToDisplayMinutes(state.defaultPeriodDuration)} min) pausado.` });
      };
      const shouldConfirm = state.currentTime > 0 && state.currentTime < state.defaultWarmUpDuration;
        checkAndConfirm(
          shouldConfirm,
          "Confirmar Acción",
          "La Entrada en Calor no ha finalizado. ¿Estás seguro de que quieres iniciar el 1er Período?",
          actionToConfirm
        );
    } else if (state.periodDisplayOverride === "Break" || state.periodDisplayOverride === "Pre-OT Break") {
      const nextNumericPeriod = state.currentPeriod + 1;
      if (nextNumericPeriod <= MAX_TOTAL_GAME_PERIODS) {
        const actionToConfirm = () => {
            dispatch({ type: 'SET_PERIOD', payload: nextNumericPeriod });
            toast({ title: "Período Cambiado", description: `Período establecido a ${getPeriodText(nextNumericPeriod, state.numberOfRegularPeriods)}. Reloj reiniciado y pausado.` });
        };

        const currentBreakDurationCs = state.periodDisplayOverride === "Break" ? state.defaultBreakDuration : state.defaultPreOTBreakDuration;
        const shouldConfirm = state.currentTime > 0 && state.currentTime < currentBreakDurationCs;

        checkAndConfirm(
            shouldConfirm,
            "Confirmar Acción",
            `El descanso no ha finalizado. ¿Estás seguro de que quieres iniciar ${getPeriodText(nextNumericPeriod, state.numberOfRegularPeriods)}?`,
            actionToConfirm
        );
      } else {
        toast({ title: "Límite de Período Alcanzado", description: `No se puede avanzar más allá de ${getPeriodText(state.currentPeriod, state.numberOfRegularPeriods)}.`, variant: "destructive" });
      }
    } else {
      if (state.currentPeriod < MAX_TOTAL_GAME_PERIODS) {
        const actionToConfirm = () => {
          const isPreOT = state.currentPeriod >= state.numberOfRegularPeriods;
          const breakType = isPreOT ? "Pre-OT Break" : "Break";
          const durationCs = isPreOT ? state.defaultPreOTBreakDuration : state.defaultBreakDuration;
          const autoStart = isPreOT ? state.autoStartPreOTBreaks : state.autoStartBreaks;

          if (isPreOT) {
              dispatch({ type: 'START_PRE_OT_BREAK' });
          } else {
              dispatch({ type: 'START_BREAK' });
          }
          toast({
              title: `${breakType} Iniciado`,
              description: `${breakType} iniciado después de ${getPeriodText(state.currentPeriod, state.numberOfRegularPeriods)} (${centisecondsToDisplayMinutes(durationCs)} min). Reloj ${autoStart ? 'corriendo' : 'pausado'}.`
          });
        };

        const isCurrentPeriodOT = state.currentPeriod > state.numberOfRegularPeriods;
        const currentPeriodExpectedDurationCs = isCurrentPeriodOT ? state.defaultOTPeriodDuration : state.defaultPeriodDuration;
        const shouldConfirm = state.currentTime > 0 && state.currentTime < currentPeriodExpectedDurationCs;

        checkAndConfirm(
          shouldConfirm,
          "Confirmar Acción",
          "El reloj del período actual ha corrido. ¿Estás seguro de que quieres iniciar el descanso/ir al siguiente período?",
          actionToConfirm
        );
      } else {
         toast({ title: "Fin del Juego", description: `No se puede avanzar más allá de ${getPeriodText(state.currentPeriod, state.numberOfRegularPeriods)}.`, variant: "destructive" });
      }
    }
  };

  const isPreviousPeriodDisabled = (state.currentPeriod === 0 && state.periodDisplayOverride === "Warm-up") || state.periodDisplayOverride === "Time Out";

  let isNextActionDisabled = false;
  if (state.periodDisplayOverride === "Time Out" && state.currentTime > 0) {
      isNextActionDisabled = true;
  } else if (state.periodDisplayOverride === null && state.currentPeriod >= MAX_TOTAL_GAME_PERIODS && state.currentTime <= 0) { 
      isNextActionDisabled = true;
  }


  const showNextActionButton = state.currentTime <= 0 && !state.isClockRunning;

  let nextActionButtonText = "Siguiente";
  if (state.periodDisplayOverride === "Time Out" && state.currentTime <=0) {
    nextActionButtonText = "Finalizar Time Out";
  } else if (state.currentPeriod === 0 && state.periodDisplayOverride === "Warm-up" && state.currentTime <= 0) {
    nextActionButtonText = "Iniciar 1er Período";
  } else if (state.periodDisplayOverride === null && state.currentPeriod < MAX_TOTAL_GAME_PERIODS && state.currentTime <= 0) {
    nextActionButtonText = "Iniciar Descanso";
  } else if ((state.periodDisplayOverride === "Break" || state.periodDisplayOverride === "Pre-OT Break") && state.currentTime <= 0) {
    nextActionButtonText = `Iniciar ${getPeriodText(state.currentPeriod + 1, state.numberOfRegularPeriods)}`;
  }



  const isMainClockLastMinute = state.currentTime < 6000 && state.currentTime >= 0 &&
                               (state.periodDisplayOverride !== null || state.currentPeriod >= 0);

  const preTimeoutTimeCs = state.preTimeoutState?.time;
  const isPreTimeoutLastMinute = typeof preTimeoutTimeCs === 'number' && preTimeoutTimeCs < 6000 && preTimeoutTimeCs >= 0;

  const handleSegmentClick = (segment: EditingSegment) => {
    if (state.isClockRunning) return;
    setEditingSegment(segment);
    switch (segment) {
      case 'minutes': setEditValue(String(timeParts.minutes).padStart(2, '0')); break;
      case 'seconds': setEditValue(String(timeParts.seconds).padStart(2, '0')); break;
      case 'tenths': setEditValue(String(timeParts.tenths)); break;
    }
  };

  const handleTimeEditConfirm = () => {
    if (!editingSegment) return;

    const { minutes: currentMins, seconds: currentSecs, tenths: currentTenths } = timeParts;
    let newTimeCs = state.currentTime;
    const value = parseInt(editValue, 10);

    if (isNaN(value)) {
      setEditingSegment(null);
      toast({ title: "Valor Inválido", description: "Por favor, ingresa un número.", variant: "destructive" });
      return;
    }

    switch (editingSegment) {
      case 'minutes':
        const newMinutes = Math.max(0, Math.min(value, 99));
        newTimeCs = (newMinutes * 60 * 100) + (currentSecs * 100) + (currentTenths * 10);
        break;
      case 'seconds':
        const newSeconds = Math.max(0, Math.min(value, 59));
        newTimeCs = (currentMins * 60 * 100) + (newSeconds * 100) + (currentTenths * 10);
        break;
      case 'tenths':
        if (isMainClockLastMinute) {
          const newTenthsVal = Math.max(0, Math.min(value, 9));
          newTimeCs = (currentMins * 60 * 100) + (currentSecs * 100) + (newTenthsVal * 10);
        }
        break;
    }
    newTimeCs = Math.max(0, newTimeCs);

    const payloadMinutes = Math.floor(newTimeCs / 6000);
    const payloadSeconds = Math.floor((newTimeCs % 6000) / 100);

    dispatch({ type: 'SET_TIME', payload: { minutes: payloadMinutes, seconds: payloadSeconds } });
    toast({
      title: "Reloj Actualizado",
      description: `Tiempo establecido a ${formatTime(newTimeCs, { showTenths: newTimeCs < 6000, includeMinutesForTenths: true })}`,
    });
    setEditingSegment(null);
  };

  const commonInputClass = cn(
    "bg-transparent border-0 p-0 text-center h-auto tabular-nums focus:ring-0 focus:outline-none focus:border-b focus:border-primary",
    "text-5xl font-bold",
    isMainClockLastMinute ? "text-orange-500" : "text-accent"
  );
  const commonSpanClass = cn(!state.isClockRunning && "cursor-pointer hover:underline");

  const activeHomePenaltiesCount = state.homePenalties.filter(p => p._status === 'running').length;
  const playersOnIceForHome = Math.max(0, state.playersPerTeamOnIce - activeHomePenaltiesCount);

  const activeAwayPenaltiesCount = state.awayPenalties.filter(p => p._status === 'running').length;
  const playersOnIceForAway = Math.max(0, state.playersPerTeamOnIce - activeAwayPenaltiesCount);

  const filteredHomeTeams = useMemo(() => {
    if (!homeSearchTerm.trim()) return state.teams;
    return state.teams.filter(team => 
        team.name.toLowerCase().includes(homeSearchTerm.toLowerCase())
    );
  }, [state.teams, homeSearchTerm]);

  const filteredAwayTeams = useMemo(() => {
    if (!awaySearchTerm.trim()) return state.teams;
    return state.teams.filter(team => 
        team.name.toLowerCase().includes(awaySearchTerm.toLowerCase())
    );
  }, [state.teams, awaySearchTerm]);


  return (
    <>
      <Card className="mb-8 bg-card shadow-lg">
        <CardContent className="flex flex-col sm:flex-row justify-around items-center text-center gap-4 sm:gap-8 py-6">
          {/* Home Team Section */}
          <div className="flex-1 space-y-1 w-full sm:w-auto">
            <div className="flex justify-center items-center gap-1 mb-1 h-5">
              {playersOnIceForHome > 0 && Array(playersOnIceForHome).fill(null).map((_, index) => (
                <User key={`home-player-${index}`} className="h-5 w-5 text-primary-foreground/80" />
              ))}
              {playersOnIceForHome === 0 && state.playersPerTeamOnIce > 0 && (
                <span className="text-xs text-destructive animate-pulse">0 JUGADORES</span>
              )}
            </div>
             <div className="relative w-full max-w-xs mx-auto">
              <Input
                id="homeTeamNameInput"
                value={localHomeTeamName}
                onChange={(e) => setLocalHomeTeamName(e.target.value)}
                onBlur={() => dispatch({ type: 'SET_HOME_TEAM_NAME', payload: localHomeTeamName.trim() || 'Local' })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    dispatch({ type: 'SET_HOME_TEAM_NAME', payload: localHomeTeamName.trim() || 'Local' });
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="Nombre Local"
                className={cn(
                    "w-full h-8 text-sm uppercase text-center text-card-foreground bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-8"
                )}
                aria-label="Nombre del equipo local"
                autoComplete="off"
              />
              {state.enableTeamSelectionInMiniScoreboard && (
                <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                  <Popover 
                      open={isHomePopoverOpen} 
                      onOpenChange={(isOpen) => {
                          setIsHomePopoverOpen(isOpen);
                          if (isOpen) {
                            setHomeSearchTerm(""); 
                          }
                      }}
                  >
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary-foreground">
                        <Search className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[250px]" align="start">
                      <Command shouldFilter={false}> 
                        <CommandInput
                          placeholder="Buscar equipo..."
                          value={homeSearchTerm}
                          onValueChange={setHomeSearchTerm}
                          className="text-sm h-9"
                        />
                        <CommandList>
                          <CommandEmpty>
                            {homeSearchTerm.trim() === "" && state.teams.length === 0 ? "No hay equipos guardados." : "No se encontraron equipos."}
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredHomeTeams.map((team) => (
                              <CommandItem
                                key={team.id}
                                value={team.name}
                                onSelect={() => {
                                  const newName = team.name.trim() || 'Local';
                                  setLocalHomeTeamName(newName); 
                                  dispatch({ type: 'SET_HOME_TEAM_NAME', payload: newName }); 
                                  setHomeSearchTerm(newName); 
                                  setIsHomePopoverOpen(false); 
                                }}
                                className="text-sm"
                              >
                                <Check className={cn("mr-2 h-4 w-4", localHomeTeamName === team.name ? "opacity-100" : "opacity-0")} />
                                {team.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground -mt-0.5 text-center">(Local)</p>
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
                disabled={isNextActionDisabled}
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

            <div className={cn("text-5xl font-bold tabular-nums flex items-baseline justify-center gap-0.5", isMainClockLastMinute ? "text-orange-500" : "text-accent")}>
              {!state.isClockRunning && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-accent self-center mr-1"
                  onClick={() => handleTimeAdjust(-1)}
                  aria-label="Restar 1 segundo al reloj"
                  disabled={state.currentTime <=0 || editingSegment !== null}
                >
                  <Minus className="h-3 w-3" />
                </Button>
              )}

              {editingSegment === 'minutes' ? (
                <Input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  value={editValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val) && val.length <= 2) setEditValue(val);
                  }}
                  onBlur={handleTimeEditConfirm}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTimeEditConfirm();
                    if (e.key === 'Escape') setEditingSegment(null);
                  }}
                  className={cn(commonInputClass, "w-[60px] px-0")} 
                  maxLength={2}
                  autoComplete="off"
                />
              ) : (
                <span onClick={() => handleSegmentClick('minutes')} className={commonSpanClass}>
                  {String(timeParts.minutes).padStart(2, '0')}
                </span>
              )}
              <span className={isMainClockLastMinute ? "text-orange-500" : "text-accent"}>:</span>
              {editingSegment === 'seconds' ? (
                <Input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  value={editValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val) && val.length <= 2) setEditValue(val);
                  }}
                  onBlur={handleTimeEditConfirm}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTimeEditConfirm();
                    if (e.key === 'Escape') setEditingSegment(null);
                  }}
                  className={cn(commonInputClass, "w-[60px] px-0")}
                  maxLength={2}
                  autoComplete="off"
                />
              ) : (
                <span onClick={() => handleSegmentClick('seconds')} className={commonSpanClass}>
                  {String(timeParts.seconds).padStart(2, '0')}
                </span>
              )}
              {isMainClockLastMinute && (
                <>
                  <span className="text-orange-500">.</span>
                  {editingSegment === 'tenths' ? (
                    <Input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      value={editValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val) && val.length <= 1) setEditValue(val);
                      }}
                      onBlur={handleTimeEditConfirm}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTimeEditConfirm();
                        if (e.key === 'Escape') setEditingSegment(null);
                      }}
                      className={cn(commonInputClass, "w-[30px] text-orange-500 px-0")}
                      maxLength={1}
                      autoComplete="off"
                    />
                  ) : (
                    <span onClick={() => handleSegmentClick('tenths')} className={cn(commonSpanClass, "text-orange-500")}>
                      {String(timeParts.tenths)}
                    </span>
                  )}
                </>
              )}
              {!state.isClockRunning && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-accent self-center ml-1"
                  onClick={() => handleTimeAdjust(1)}
                  aria-label="Sumar 1 segundo al reloj"
                  disabled={editingSegment !== null}
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
                disabled={isPreviousPeriodDisabled || editingSegment !== null}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <p className="text-lg text-primary-foreground uppercase w-36 truncate text-center">
                {getActualPeriodText(state.currentPeriod, state.periodDisplayOverride, state.numberOfRegularPeriods)}
              </p>
              <Button
                onClick={handleNextAction}
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary-foreground"
                aria-label="Siguiente Período o Descanso"
                disabled={isNextActionDisabled || editingSegment !== null}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              {!state.isClockRunning && state.currentTime > 0 && !showNextActionButton && editingSegment === null && (
                <span className="absolute top-[-0.25rem] right-1 text-[0.6rem] font-normal text-muted-foreground normal-case px-1 rounded-sm bg-background/30">
                  Paused
                </span>
              )}
            </div>
            {state.preTimeoutState && (
              <div className={cn(
                  "text-xs mt-1 normal-case",
                  isPreTimeoutLastMinute ? "text-orange-500/80" : "text-muted-foreground"
                )}>
                Retornando a: {getPeriodText(state.preTimeoutState.period, state.numberOfRegularPeriods)} - {formatTime(state.preTimeoutState.time, { showTenths: isPreTimeoutLastMinute, includeMinutesForTenths: true })}
                {state.preTimeoutState.override ? ` (${state.preTimeoutState.override})` : ''}
              </div>
            )}
          </div>

          {/* Away Team Section */}
          <div className="flex-1 space-y-1 w-full sm:w-auto">
            <div className="flex justify-center items-center gap-1 mb-1 h-5">
              {playersOnIceForAway > 0 && Array(playersOnIceForAway).fill(null).map((_, index) => (
                <User key={`away-player-${index}`} className="h-5 w-5 text-primary-foreground/80" />
              ))}
              {playersOnIceForAway === 0 && state.playersPerTeamOnIce > 0 && (
                <span className="text-xs text-destructive animate-pulse">0 JUGADORES</span>
              )}
            </div>
            <div className="relative w-full max-w-xs mx-auto">
              <Input
                id="awayTeamNameInput"
                value={localAwayTeamName}
                onChange={(e) => setLocalAwayTeamName(e.target.value)}
                onBlur={() => dispatch({ type: 'SET_AWAY_TEAM_NAME', payload: localAwayTeamName.trim() || 'Visitante' })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    dispatch({ type: 'SET_AWAY_TEAM_NAME', payload: localAwayTeamName.trim() || 'Visitante' });
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="Nombre Visitante"
                className={cn(
                  "w-full h-8 text-sm uppercase text-center text-card-foreground bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-8"
                )}
                aria-label="Nombre del equipo visitante"
                autoComplete="off"
              />
              {state.enableTeamSelectionInMiniScoreboard && (
                <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                  <Popover 
                      open={isAwayPopoverOpen} 
                      onOpenChange={(isOpen) => {
                          setIsAwayPopoverOpen(isOpen);
                          if (isOpen) {
                              setAwaySearchTerm(""); 
                          }
                      }}
                  >
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary-foreground">
                        <Search className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[250px]" align="start">
                      <Command shouldFilter={false}> 
                        <CommandInput
                          placeholder="Buscar equipo..."
                          value={awaySearchTerm}
                          onValueChange={setAwaySearchTerm}
                          className="text-sm h-9"
                        />
                        <CommandList>
                          <CommandEmpty>
                            {awaySearchTerm.trim() === "" && state.teams.length === 0 ? "No hay equipos guardados." : "No se encontraron equipos."}
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredAwayTeams.map((team) => (
                              <CommandItem
                                key={team.id}
                                value={team.name}
                                onSelect={() => {
                                  const newName = team.name.trim() || 'Visitante';
                                  setLocalAwayTeamName(newName);
                                  dispatch({ type: 'SET_AWAY_TEAM_NAME', payload: newName });
                                  setAwaySearchTerm(newName); 
                                  setIsAwayPopoverOpen(false);
                                }}
                                className="text-sm"
                              >
                                <Check className={cn("mr-2 h-4 w-4", localAwayTeamName === team.name ? "opacity-100" : "opacity-0")} />
                                {team.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground -mt-0.5 text-center">(Visitante)</p>
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
