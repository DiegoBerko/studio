
"use client";

import { useGameState, formatTime, getActualPeriodText, getPeriodText, secondsToMinutes } from '@/contexts/game-state-context';
import type { Team } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Play, Pause, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MAX_PERIOD_NUMBER = 7;

export function MiniScoreboard() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

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
    dispatch({ type: 'TOGGLE_CLOCK' });
  };

  const handlePreviousPeriod = () => {
    if (state.periodDisplayOverride === "Break" || state.periodDisplayOverride === "Pre-OT Break") {
      dispatch({ type: 'SET_PERIOD', payload: state.currentPeriod });
      toast({ title: "Período Cambiado", description: `Período establecido a ${getPeriodText(state.currentPeriod)}. Reloj reiniciado y pausado.` });
    } else {
      if (state.currentPeriod > 1) {
        dispatch({ type: 'START_BREAK_AFTER_PREVIOUS_PERIOD' }); 
        const breakType = (state.currentPeriod -1) >= 3 ? "Pre-OT Break" : "Break";
        const duration = (state.currentPeriod -1) >= 3 ? state.defaultPreOTBreakDuration : state.defaultBreakDuration;
        const autoStart = (state.currentPeriod -1) >= 3 ? state.autoStartPreOTBreaks : state.autoStartBreaks;
        toast({ 
            title: `${breakType} Iniciado`, 
            description: `${breakType} iniciado después de ${getPeriodText(state.currentPeriod-1)} (${secondsToMinutes(duration)} min). Reloj ${autoStart ? 'corriendo' : 'pausado'}.`
        });
      } else {
        toast({ title: "Límite de Período Alcanzado", description: "No se puede retroceder más allá del 1er Período.", variant: "destructive" });
      }
    }
  };

  const handleNextPeriod = () => {
    if (state.periodDisplayOverride === "Break" || state.periodDisplayOverride === "Pre-OT Break") {
      const nextNumericPeriod = state.currentPeriod + 1;
      if (nextNumericPeriod <= MAX_PERIOD_NUMBER) {
        dispatch({ type: 'SET_PERIOD', payload: nextNumericPeriod });
        toast({ title: "Período Cambiado", description: `Período establecido a ${getPeriodText(nextNumericPeriod)}. Reloj reiniciado y pausado.` });
      } else {
        toast({ title: "Límite de Período Alcanzado", description: `No se puede avanzar más allá de ${getPeriodText(state.currentPeriod)}.`, variant: "destructive" });
      }
    } else {
      if (state.currentPeriod < MAX_PERIOD_NUMBER) {
        const isPreOT = state.currentPeriod >= 3; 
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
            description: `${breakType} iniciado después de ${getPeriodText(state.currentPeriod)} (${secondsToMinutes(duration)} min). Reloj ${autoStart ? 'corriendo' : 'pausado'}.`
        });
      } else {
        toast({ title: "Límite de Período Alcanzado", description: `No se puede avanzar más allá de ${getPeriodText(state.currentPeriod)}.`, variant: "destructive" });
      }
    }
  };
  
  const isPreviousPeriodDisabled = state.periodDisplayOverride === null && state.currentPeriod <= 1;
  const isNextPeriodDisabled = state.periodDisplayOverride === null && state.currentPeriod >= MAX_PERIOD_NUMBER;

  const showNextPeriodButton = state.currentTime <= 0 && !state.isClockRunning;

  return (
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
          {showNextPeriodButton ? (
            <Button
              onClick={handleNextPeriod}
              className="w-full max-w-[200px] mx-auto mb-2"
              variant="default"
              aria-label="Siguiente Período o Descanso"
              disabled={isNextPeriodDisabled && state.periodDisplayOverride === null} 
            >
              <ChevronsRight className="mr-2 h-5 w-5" /> Siguiente
            </Button>
          ) : (
            <Button
              onClick={handleToggleClock}
              className="w-full max-w-[180px] mx-auto mb-2"
              variant={state.isClockRunning ? "destructive" : "default"}
              aria-label={state.isClockRunning ? "Pausar Reloj" : "Iniciar Reloj"}
              disabled={state.currentTime <= 0 && !state.isClockRunning}
            >
              {state.isClockRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {state.isClockRunning ? 'Pausar' : 'Iniciar'} Reloj
            </Button>
          )}
          
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-accent"
              onClick={() => handleTimeAdjust(-1)}
              aria-label="Restar 1 segundo al reloj"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <p className="text-5xl font-bold text-accent tabular-nums">{formatTime(state.currentTime)}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-accent"
              onClick={() => handleTimeAdjust(1)}
              aria-label="Sumar 1 segundo al reloj"
            >
              <Plus className="h-3 w-3" />
            </Button>
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
              {getActualPeriodText(state.currentPeriod, state.periodDisplayOverride)}
            </p>
            <Button 
              onClick={handleNextPeriod} 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground hover:text-primary-foreground"
              aria-label="Siguiente Período o Descanso"
              disabled={isNextPeriodDisabled && state.periodDisplayOverride === null} // Ajuste para deshabilitar correctamente
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            {!state.isClockRunning && state.currentTime > 0 && !showNextPeriodButton && (
              <span className="absolute top-[-0.25rem] right-1 text-[0.6rem] font-normal text-muted-foreground normal-case px-1 rounded-sm bg-background/30">
                Paused
              </span>
            )}
          </div>
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
  );
}
