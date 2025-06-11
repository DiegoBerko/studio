
"use client";

import { useGameState, getPeriodText, getActualPeriodText } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { ControlCardWrapper } from './control-card-wrapper';
import { useToast } from '@/hooks/use-toast';
import type { Team } from '@/types';

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
      // Si estamos en Break, anterior es P3
      dispatch({ type: 'SET_PERIOD', payload: 3 });
      toast({ title: "Período Cambiado", description: `Período establecido a ${getPeriodText(3)}. Reloj reiniciado y pausado.` });
    } else if (state.currentPeriod === 4) { // Estamos en OT1
      // Anterior a OT1 es Break
      dispatch({ type: 'START_BREAK' });
      toast({ title: "Descanso Iniciado", description: `Período establecido a Descanso. Reloj iniciado con ${state.configurableBreakMinutes} minutos.` });
    } else if (state.currentPeriod > 1) {
      const newPeriod = state.currentPeriod - 1;
      dispatch({ type: 'SET_PERIOD', payload: newPeriod });
      // RESET_PERIOD_CLOCK is called implicitly by SET_PERIOD if not in break
      toast({ title: "Período Cambiado", description: `Período establecido a ${getPeriodText(newPeriod)}. Reloj reiniciado y pausado.` });
    }
  };

  const handleNextPeriod = () => {
    if (state.periodDisplayOverride === 'Break') {
      // Si estamos en Break, siguiente es OT1 (periodo 4)
      dispatch({ type: 'SET_PERIOD', payload: 4 });
      toast({ title: "Período Cambiado", description: `Período establecido a ${getPeriodText(4)}. Reloj reiniciado y pausado.` });
    } else if (state.currentPeriod === 3) { // Estamos en P3
      // Siguiente a P3 es Break
      dispatch({ type: 'START_BREAK' });
      toast({ title: "Descanso Iniciado", description: `Período establecido a Descanso. Reloj iniciado con ${state.configurableBreakMinutes} minutos.` });
    } else {
      const newPeriod = state.currentPeriod + 1;
      // Allow advancing up to OT5 for example (period 7)
      if (newPeriod <= 7) { // Arbitrary limit, can be adjusted
        dispatch({ type: 'SET_PERIOD', payload: newPeriod });
        // RESET_PERIOD_CLOCK is called implicitly by SET_PERIOD if not in break
        toast({ title: "Período Cambiado", description: `Período establecido a ${getPeriodText(newPeriod)}. Reloj reiniciado y pausado.` });
      } else {
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

  const isPreviousDisabled = state.currentPeriod <= 1 && state.periodDisplayOverride !== 'Break';
  const isNextDisabled = state.currentPeriod >= 7 && state.periodDisplayOverride !== 'Break'; // Assuming OT5 (period 7) is max.

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
