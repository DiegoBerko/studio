
"use client";

import { useGameState, getPeriodText, getActualPeriodText } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { ControlCardWrapper } from './control-card-wrapper';
import { useToast } from '@/hooks/use-toast';
import type { Team } from '@/types';

const MAX_PERIOD_NUMBER = 7; // e.g., P1, P2, P3, OT1, OT2, OT3, OT4 (period 7)

export function ScorePeriodControlCard() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const handleScoreAdjust = (team: Team, delta: number) => {
    dispatch({ type: 'ADJUST_SCORE', payload: { team, delta } });
    const teamName = team === 'home' ? state.homeTeamName : state.awayTeamName;
    toast({ title: `Puntuación de ${teamName} Actualizada`, description: `Puntuación ${delta > 0 ? 'aumentada' : 'disminuida'} en ${Math.abs(delta)}.` });
  };

  const handlePreviousPeriod = () => {
    if (state.periodDisplayOverride === 'Break') {
      // Coming from a break, go to the period number that was before the break
      const numericPeriodBeforeBreak = state.currentPeriod;
      dispatch({ type: 'SET_PERIOD', payload: numericPeriodBeforeBreak });
      toast({ title: "Período Cambiado", description: `Período establecido a ${getPeriodText(numericPeriodBeforeBreak)}. Reloj reiniciado y pausado.` });
    } else {
      // In a numeric period, try to go to a break *after* the (currentPeriod - 1)
      if (state.currentPeriod > 1) {
        dispatch({ type: 'START_BREAK_AFTER_PREVIOUS_PERIOD' });
        toast({ title: "Descanso Iniciado", description: `Descanso iniciado después de ${getPeriodText(state.currentPeriod - 1)}. Reloj corriendo con ${state.configurableBreakMinutes} min.` });
      } else {
        // Already at P1, cannot go further back or to a break before P1
        toast({ title: "Límite de Período Alcanzado", description: "No se puede retroceder más allá del 1er Período.", variant: "destructive" });
      }
    }
  };

  const handleNextPeriod = () => {
    if (state.periodDisplayOverride === 'Break') {
      // Coming from a break, go to the next numeric period
      const nextNumericPeriod = state.currentPeriod + 1;
      if (nextNumericPeriod <= MAX_PERIOD_NUMBER) {
        dispatch({ type: 'SET_PERIOD', payload: nextNumericPeriod });
        toast({ title: "Período Cambiado", description: `Período establecido a ${getPeriodText(nextNumericPeriod)}. Reloj reiniciado y pausado.` });
      } else {
        toast({ title: "Límite de Período Alcanzado", description: `No se puede avanzar más allá de ${getPeriodText(state.currentPeriod)}.`, variant: "destructive" });
      }
    } else {
      // In a numeric period, try to go to a break *after* the currentPeriod
      if (state.currentPeriod < MAX_PERIOD_NUMBER) {
        dispatch({ type: 'START_BREAK' });
        toast({ title: "Descanso Iniciado", description: `Descanso iniciado después de ${getPeriodText(state.currentPeriod)}. Reloj corriendo con ${state.configurableBreakMinutes} min.` });
      } else {
        // Already at max period, cannot start a break after it
        toast({ title: "Límite de Período Alcanzado", description: `No se puede avanzar más allá de ${getPeriodText(state.currentPeriod)}.`, variant: "destructive" });
      }
    }
  };
  
  const handleHomeTeamNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_HOME_TEAM_NAME', payload: e.target.value });
  };

  const handleAwayTeamNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_AWAY_TEAM_NAME', payload: e.target.value });
  };

  // Disable "Previous" if:
  // - In P1 and not in a break (cannot go before P1 or to a break before P1)
  const isPreviousDisabled = state.periodDisplayOverride !== 'Break' && state.currentPeriod <= 1;

  // Disable "Next" if:
  // - In the MAX_PERIOD_NUMBER and not in a break (cannot go to a break after max period, or to a period beyond max)
  const isNextDisabled = state.periodDisplayOverride !== 'Break' && state.currentPeriod >= MAX_PERIOD_NUMBER;


  return (
    <ControlCardWrapper title="Puntuación, Período y Equipos">
      <div className="space-y-6">
        <div>
          <Label className="text-base">Nombres de Equipos</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div>
              <Label htmlFor="homeTeamNameInput" className="mb-1 block">Equipo Local</Label>
              <Input
                id="homeTeamNameInput"
                value={state.homeTeamName}
                onChange={handleHomeTeamNameChange}
                placeholder="Nombre del Local"
              />
            </div>
            <div>
              <Label htmlFor="awayTeamNameInput" className="mb-1 block">Equipo Visitante</Label>
              <Input
                id="awayTeamNameInput"
                value={state.awayTeamName}
                onChange={handleAwayTeamNameChange}
                placeholder="Nombre del Visitante"
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-base">Controles de Puntuación</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="font-medium text-center mb-1 text-primary-foreground">{state.homeTeamName}</p>
              <div className="flex justify-center items-center gap-2">
                <Button onClick={() => handleScoreAdjust('home', -1)} variant="outline" size="icon" aria-label={`Disminuir Puntuación ${state.homeTeamName}`}><Minus className="h-4 w-4" /></Button>
                <span className="text-2xl font-bold w-10 text-center text-accent">{state.homeScore}</span>
                <Button onClick={() => handleScoreAdjust('home', 1)} variant="outline" size="icon" aria-label={`Aumentar Puntuación ${state.homeTeamName}`}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <div>
              <p className="font-medium text-center mb-1 text-primary-foreground">{state.awayTeamName}</p>
              <div className="flex justify-center items-center gap-2">
                <Button onClick={() => handleScoreAdjust('away', -1)} variant="outline" size="icon" aria-label={`Disminuir Puntuación ${state.awayTeamName}`}><Minus className="h-4 w-4" /></Button>
                <span className="text-2xl font-bold w-10 text-center text-accent">{state.awayScore}</span>
                <Button onClick={() => handleScoreAdjust('away', 1)} variant="outline" size="icon" aria-label={`Aumentar Puntuación ${state.awayTeamName}`}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-base">Controles de Período</Label>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Button 
              onClick={handlePreviousPeriod} 
              variant="outline" 
              size="icon" 
              aria-label="Período Anterior"
              disabled={isPreviousDisabled}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-2xl font-bold w-28 text-center text-accent">
              {getActualPeriodText(state.currentPeriod, state.periodDisplayOverride)}
            </span>
            <Button 
              onClick={handleNextPeriod} 
              variant="outline" 
              size="icon" 
              aria-label="Siguiente Período"
              disabled={isNextDisabled}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </ControlCardWrapper>
  );
}
