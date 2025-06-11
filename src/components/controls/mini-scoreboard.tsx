
"use client";

import { useGameState, formatTime, getActualPeriodText } from '@/contexts/game-state-context';
import type { Team } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  return (
    <Card className="mb-8 bg-card shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-2xl text-primary-foreground">Estado del Juego</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row justify-around items-center text-center gap-4 sm:gap-8 py-4">
        {/* Home Team Section */}
        <div className="flex-1 space-y-1">
          <Input
            value={state.homeTeamName}
            onChange={(e) => handleNameChange('home', e.target.value)}
            onBlur={(e) => handleNameChange('home', e.target.value.trim() || 'Local')}
            className="bg-transparent border-0 text-center p-0 text-sm uppercase text-muted-foreground focus:ring-0 focus:border-b focus:border-primary h-auto leading-tight"
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

        {/* Clock Section */}
        <div className="flex-1 space-y-1">
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
          <div className="relative mt-1"> {/* Ajuste de margen si es necesario */}
            <p className="text-lg text-primary-foreground uppercase">
              {getActualPeriodText(state.currentPeriod, state.periodDisplayOverride)}
            </p>
            {!state.isClockRunning && state.currentTime > 0 && (
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
            className="bg-transparent border-0 text-center p-0 text-sm uppercase text-muted-foreground focus:ring-0 focus:border-b focus:border-primary h-auto leading-tight"
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
