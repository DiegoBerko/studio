
"use client";

import React, { useState, useEffect } from 'react';
import { useGameState } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimerOff } from 'lucide-react';
import { ControlCardWrapper } from './control-card-wrapper';
import { useToast } from '@/hooks/use-toast';

export function TimeControlCard() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const [localMinutes, setLocalMinutes] = useState(() => 
    String(Math.floor(state.currentTime / 6000)).padStart(2, '0') // 6000 cs = 60s
  );
  const [localSeconds, setLocalSeconds] = useState(() => 
    String(Math.floor((state.currentTime % 6000) / 100)).padStart(2, '0') // cs to s
  );
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // Only update inputs from global state if:
    // 1. The inputs haven't been touched by the user (isDirty is false)
    // OR
    // 2. The clock is running AND it's NOT in the last minute (currentTime >= 6000 centiseconds)
    if (!isDirty || (state.isClockRunning && state.currentTime >= 6000)) {
      setLocalMinutes(String(Math.floor(state.currentTime / 6000)).padStart(2, '0'));
      setLocalSeconds(String(Math.floor((state.currentTime % 6000) / 100)).padStart(2, '0'));
      // If inputs were dirty but got updated because clock is running (and not in last min)
      if (isDirty && state.isClockRunning) {
        setIsDirty(false);
      }
    }
  }, [state.currentTime, state.isClockRunning, isDirty]);

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) { 
      setLocalMinutes(value);
      if (!isDirty) setIsDirty(true);
    }
  };

  const handleMinutesBlur = () => {
    let minsVal = parseInt(localMinutes, 10);
    if (localMinutes === '' || isNaN(minsVal)) {
      setLocalMinutes('00');
    } else {
      minsVal = Math.max(0, minsVal); 
      setLocalMinutes(String(minsVal).padStart(2, '0'));
    }
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) { 
      setLocalSeconds(value);
      if (!isDirty) setIsDirty(true);
    }
  };

  const handleSecondsBlur = () => {
    let secsVal = parseInt(localSeconds, 10);
    if (localSeconds === '' || isNaN(secsVal)) {
      setLocalSeconds('00');
    } else {
      secsVal = Math.max(0, Math.min(59, secsVal)); 
      setLocalSeconds(String(secsVal).padStart(2, '0'));
    }
  };

  const handleSetTime = () => {
    const minutesNum = parseInt(localMinutes, 10) || 0;
    const secondsNum = parseInt(localSeconds, 10) || 0;
    
    const finalSeconds = Math.min(secondsNum, 59);
    const finalMinutes = minutesNum;

    // Dispatch expects payload in minutes and seconds, conversion to CS happens in reducer
    dispatch({ type: 'SET_TIME', payload: { minutes: finalMinutes, seconds: finalSeconds } });
    toast({ 
      title: "Reloj Actualizado", 
      description: `Tiempo establecido a ${String(finalMinutes).padStart(2, '0')}:${String(finalSeconds).padStart(2, '0')}` 
    });
    setIsDirty(false); 
  };
  
  const handleStartTimeOut = () => {
    dispatch({ type: 'START_TIMEOUT' }); 
    const autoStart = state.autoStartTimeouts;
    toast({ 
        title: "Time Out Iniciado", 
        description: `Time Out de ${state.defaultTimeoutDuration / 100} segundos. Reloj ${autoStart ? 'corriendo' : 'pausado'}.`
    });
  };

  const isTimeOutButtonDisabled = 
    state.periodDisplayOverride === "Break" ||
    state.periodDisplayOverride === "Pre-OT Break" ||
    state.periodDisplayOverride === "Time Out" ||
    state.isClockRunning;

  return (
    <ControlCardWrapper title="Ajustes de Tiempo y Time Out">
      <div className="space-y-4">
        <fieldset disabled={state.isClockRunning && state.currentTime < 6000} className="space-y-2">
          <Label htmlFor="minutes-manual">Establecer Tiempo Manualmente</Label>
          <div className="flex items-center gap-2">
            <Input
              id="minutes-manual"
              type="text"
              inputMode="numeric"
              value={localMinutes}
              onChange={handleMinutesChange}
              onBlur={handleMinutesBlur}
              placeholder="MM"
              className="w-1/3"
              aria-label="Establecer minutos"
              disabled={state.isClockRunning && state.currentTime < 6000}
            />
            <span className="font-bold text-primary-foreground">:</span>
            <Input
              id="seconds-manual"
              type="text"
              inputMode="numeric"
              value={localSeconds}
              onChange={handleSecondsChange}
              onBlur={handleSecondsBlur}
              placeholder="SS"
              className="w-1/3"
              aria-label="Establecer segundos"
              disabled={state.isClockRunning && state.currentTime < 6000}
            />
            <Button 
              onClick={handleSetTime} 
              variant="secondary" 
              className="flex-1" 
              aria-label="Aplicar Cambio de Tiempo"
              disabled={(state.isClockRunning && state.currentTime < 6000) || !isDirty}
            >
              Establecer
            </Button>
          </div>
           {(state.isClockRunning && state.currentTime < 6000) && (
            <p className="text-xs text-muted-foreground pt-1">El ajuste manual de tiempo está deshabilitado mientras el reloj corre en el último minuto.</p>
          )}
        </fieldset>

        <div className="border-t border-border pt-4">
            <Button 
              onClick={handleStartTimeOut} 
              variant="outline" 
              className="w-full" 
              aria-label="Iniciar Time Out" 
              disabled={isTimeOutButtonDisabled}
            >
                <TimerOff className="mr-2 h-4 w-4" /> Iniciar Time Out
            </Button>
        </div>
      </div>
    </ControlCardWrapper>
  );
}
