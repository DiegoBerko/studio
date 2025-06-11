
"use client";

import { useGameState, getPeriodText } from '@/contexts/game-state-context';
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

  const handlePeriodChange = (newPeriod: number) => {
    dispatch({ type: 'SET_PERIOD', payload: newPeriod });
    dispatch({ type: 'RESET_PERIOD_CLOCK' });
    toast({ title: "Período Cambiado", description: `Período establecido a ${getPeriodText(newPeriod)}. Reloj reiniciado y pausado.` });
  };

  const handleHomeTeamNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_HOME_TEAM_NAME', payload: e.target.value });
  };

  const handleAwayTeamNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_AWAY_TEAM_NAME', payload: e.target.value });
  };

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
              onClick={() => handlePeriodChange(Math.max(1, state.currentPeriod - 1))} 
              variant="outline" 
              size="icon" 
              aria-label="Período Anterior"
              disabled={state.currentPeriod <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-2xl font-bold w-20 text-center text-accent">{getPeriodText(state.currentPeriod)}</span>
            <Button 
              onClick={() => handlePeriodChange(state.currentPeriod + 1)} 
              variant="outline" 
              size="icon" 
              aria-label="Siguiente Período"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </ControlCardWrapper>
  );
}
