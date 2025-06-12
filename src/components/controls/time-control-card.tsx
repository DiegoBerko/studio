
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

  // Local state for inputs, initialized from global state
  const [localMinutes, setLocalMinutes] = useState(() => 
    String(Math.floor(state.currentTime / 60)).padStart(2, '0')
  );
  const [localSeconds, setLocalSeconds] = useState(() => 
    String(state.currentTime % 60).padStart(2, '0')
  );
  const [isDirty, setIsDirty] = useState(false);

  // Effect to update local inputs if global time changes AND inputs are not dirty
  useEffect(() => {
    if (!isDirty) {
      setLocalMinutes(String(Math.floor(state.currentTime / 60)).padStart(2, '0'));
      setLocalSeconds(String(state.currentTime % 60).padStart(2, '0'));
    }
  }, [state.currentTime, isDirty]);

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) { // Allow only digits or empty string
      setLocalMinutes(value);
      if (!isDirty) setIsDirty(true);
    }
  };

  const handleMinutesBlur = () => {
    let minsVal = parseInt(localMinutes, 10);
    if (localMinutes === '' || isNaN(minsVal)) {
      setLocalMinutes('00');
    } else {
      minsVal = Math.max(0, minsVal); // Ensure minutes are not negative
      setLocalMinutes(String(minsVal).padStart(2, '0'));
    }
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) { // Allow only digits or empty string
      setLocalSeconds(value);
      if (!isDirty) setIsDirty(true);
    }
  };

  const handleSecondsBlur = () => {
    let secsVal = parseInt(localSeconds, 10);
    if (localSeconds === '' || isNaN(secsVal)) {
      setLocalSeconds('00');
    } else {
      secsVal = Math.max(0, Math.min(59, secsVal)); // Ensure seconds are 0-59
      setLocalSeconds(String(secsVal).padStart(2, '0'));
    }
  };

  const handleSetTime = () => {
    const minutesNum = parseInt(localMinutes, 10) || 0;
    const secondsNum = parseInt(localSeconds, 10) || 0;
    
    // Ensure seconds are capped at 59 even if somehow blur didn't catch it
    const finalSeconds = Math.min(secondsNum, 59);
    const finalMinutes = minutesNum;


    dispatch({ type: 'SET_TIME', payload: { minutes: finalMinutes, seconds: finalSeconds } });
    toast({ 
      title: "Reloj Actualizado", 
      description: `Tiempo establecido a ${String(finalMinutes).padStart(2, '0')}:${String(finalSeconds).padStart(2, '0')}` 
    });
    setIsDirty(false); // After setting, inputs are no longer "dirty" and will re-sync
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
              id="minutes-manual" // Changed ID to avoid conflict if old "minutes" ID is cached
              type="text" // Use text to allow empty string and leading zeros typed by user
              inputMode="numeric" // Hint for numeric keyboard on mobile
              value={localMinutes}
              onChange={handleMinutesChange}
              onBlur={handleMinutesBlur}
              placeholder="MM"
              className="w-1/3"
              aria-label="Establecer minutos"
            />
            <span className="font-bold text-primary-foreground">:</span>
            <Input
              id="seconds-manual" // Changed ID
              type="text"
              inputMode="numeric"
              value={localSeconds}
              onChange={handleSecondsChange}
              onBlur={handleSecondsBlur}
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
            <Button onClick={handleStartTimeOut} variant="outline" className="w-full" aria-label="Iniciar Time Out" disabled={state.periodDisplayOverride === "Time Out"}>
                <TimerOff className="mr-2 h-4 w-4" /> Iniciar Time Out
            </Button>
        </div>
      </div>
    </ControlCardWrapper>
  );
}
