
"use client";

import React, { useState, useEffect } from 'react';
import { useGameState } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, TimerReset, Plus, Minus, Coffee } from 'lucide-react';
import { ControlCardWrapper } from './control-card-wrapper';
import { useToast } from '@/hooks/use-toast';

export function TimeControlCard() {
  const { state, dispatch } = useGameState();
  const [displayMinutes, setDisplayMinutes] = useState(Math.floor(state.currentTime / 60));
  const [displaySeconds, setDisplaySeconds] = useState(state.currentTime % 60);
  const { toast } = useToast();

  useEffect(() => {
    setDisplayMinutes(Math.floor(state.currentTime / 60));
    setDisplaySeconds(state.currentTime % 60);
  }, [state.currentTime]);

  const handleSetTime = () => {
    dispatch({ type: 'SET_TIME', payload: { minutes: Number(displayMinutes), seconds: Number(displaySeconds) } });
    toast({ title: "Reloj Actualizado", description: `Tiempo establecido a ${String(displayMinutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}` });
  };
  
  const handleAdjustTime = (amount: number) => {
    dispatch({ type: 'ADJUST_TIME', payload: amount });
    toast({ title: "Reloj Ajustado", description: `Tiempo ajustado en ${amount > 0 ? '+' : ''}${amount}s` });
  };

  const handleResetPeriodClock = () => {
    dispatch({ type: 'RESET_PERIOD_CLOCK' });
    toast({ title: "Reloj de Período Reiniciado", description: `Reloj reiniciado a la duración por defecto (${Math.floor(state.defaultPeriodDuration/60)} min) y pausado.` });
  };

  const handleStartRegularBreak = () => {
    dispatch({ type: 'START_BREAK' }); 
    const breakType = "Descanso Regular";
    const autoStart = state.autoStartBreaks;
    toast({ 
        title: `${breakType} Iniciado`, 
        description: `${breakType} de ${Math.floor(state.defaultBreakDuration/60)} minutos. Reloj ${autoStart ? 'corriendo' : 'pausado'}.`
    });
  };

  return (
    <ControlCardWrapper title="Controles de Reloj">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={() => dispatch({ type: 'TOGGLE_CLOCK' })}
            className="flex-1"
            variant={state.isClockRunning ? "destructive" : "default"}
            aria-label={state.isClockRunning ? "Pausar Reloj" : "Iniciar Reloj"}
            disabled={state.currentTime <= 0 && !state.isClockRunning} // Disable start if time is 0
          >
            {state.isClockRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {state.isClockRunning ? 'Pausar' : 'Iniciar'} Reloj
          </Button>
           <Button onClick={handleResetPeriodClock} variant="outline" aria-label="Reiniciar Reloj de Período">
            <TimerReset className="mr-2 h-4 w-4" /> Reiniciar Período
          </Button>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="minutes">Establecer Tiempo</Label>
          <div className="flex items-center gap-2">
            <Input
              id="minutes"
              type="number"
              value={displayMinutes}
              onChange={(e) => setDisplayMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
              placeholder="MM"
              className="w-1/3"
              aria-label="Establecer minutos"
            />
            <span className="font-bold text-primary-foreground">:</span>
            <Input
              id="seconds"
              type="number"
              value={displaySeconds}
              onChange={(e) => setDisplaySeconds(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
              placeholder="SS"
              className="w-1/3"
              aria-label="Establecer segundos"
            />
            <Button onClick={handleSetTime} variant="secondary" className="flex-1" aria-label="Aplicar Cambio de Tiempo">
              Establecer
            </Button>
          </div>
        </div>

        <div>
          <Label>Ajustar Tiempo</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Button onClick={() => handleAdjustTime(10)} variant="outline"><Plus className="mr-1 h-4 w-4" />10 Seg</Button>
            <Button onClick={() => handleAdjustTime(1)} variant="outline"><Plus className="mr-1 h-4 w-4" />1 Seg</Button>
            <Button onClick={() => handleAdjustTime(-10)} variant="outline"><Minus className="mr-1 h-4 w-4" />10 Seg</Button>
            <Button onClick={() => handleAdjustTime(-1)} variant="outline"><Minus className="mr-1 h-4 w-4" />1 Seg</Button>
          </div>
        </div>

        <div className="border-t border-border pt-4">
            <Button onClick={handleStartRegularBreak} variant="outline" className="w-full" aria-label="Iniciar Descanso Regular">
                <Coffee className="mr-2 h-4 w-4" /> Iniciar Descanso Regular
            </Button>
            <p className="text-xs text-muted-foreground mt-1 text-center">
                Utilizará la duración y configuración de auto-inicio definidas en Configuración.
            </p>
        </div>

      </div>
    </ControlCardWrapper>
  );
}

    