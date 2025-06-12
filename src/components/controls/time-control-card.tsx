
"use client";

import React, { useState, useEffect } from 'react';
import { useGameState, secondsToMinutes } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimerOff } from 'lucide-react'; // Cambiado icono
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
  
  const handleStartTimeOut = () => {
    dispatch({ type: 'START_TIMEOUT' }); 
    const autoStart = state.autoStartTimeouts;
    toast({ 
        title: "Time Out Iniciado", 
        description: `Time Out de ${state.defaultTimeoutDuration} segundos. Reloj ${autoStart ? 'corriendo' : 'pausado'}.`
    });
  };

  return (
    <ControlCardWrapper title="Ajustes de Tiempo y Time Out">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="minutes">Establecer Tiempo Manualmente</Label>
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

        <div className="border-t border-border pt-4">
            <Button onClick={handleStartTimeOut} variant="outline" className="w-full" aria-label="Iniciar Time Out">
                <TimerOff className="mr-2 h-4 w-4" /> Iniciar Time Out
            </Button>
        </div>
      </div>
    </ControlCardWrapper>
  );
}
