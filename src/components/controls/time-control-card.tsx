
"use client";

import React, { useState, useEffect } from 'react';
import { useGameState } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coffee } from 'lucide-react'; // Play, Pause removed
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
    <ControlCardWrapper title="Ajustes de Tiempo y Descansos">
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
