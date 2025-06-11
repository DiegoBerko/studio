"use client";

import React, { useState } from 'react';
import { useGameState } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Plus, Minus, TimerReset } from 'lucide-react';
import { ControlCardWrapper } from './control-card-wrapper';
import { useToast } from '@/hooks/use-toast';

export function TimeControlCard() {
  const { state, dispatch } = useGameState();
  const [minutes, setMinutes] = useState(Math.floor(state.currentTime / 60));
  const [seconds, setSeconds] = useState(state.currentTime % 60);
  const { toast } = useToast();

  const handleSetTime = () => {
    dispatch({ type: 'SET_TIME', payload: { minutes: Number(minutes), seconds: Number(seconds) } });
    toast({ title: "Clock Updated", description: `Time set to ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` });
  };
  
  const handleAdjustTime = (amount: number) => {
    dispatch({ type: 'ADJUST_TIME', payload: amount });
    toast({ title: "Clock Adjusted", description: `Time adjusted by ${amount > 0 ? '+' : ''}${amount}s` });
  };

  const handleResetPeriodClock = () => {
    dispatch({ type: 'RESET_PERIOD_CLOCK' });
    setMinutes(20); // Default period duration
    setSeconds(0);
    toast({ title: "Period Clock Reset", description: "Clock reset to 20:00 and paused." });
  };

  React.useEffect(() => {
    setMinutes(Math.floor(state.currentTime / 60));
    setSeconds(state.currentTime % 60);
  }, [state.currentTime]);

  return (
    <ControlCardWrapper title="Clock Controls">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={() => dispatch({ type: 'TOGGLE_CLOCK' })}
            className="flex-1"
            variant={state.isClockRunning ? "destructive" : "default"}
            aria-label={state.isClockRunning ? "Pause Clock" : "Start Clock"}
          >
            {state.isClockRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {state.isClockRunning ? 'Pause' : 'Start'} Clock
          </Button>
           <Button onClick={handleResetPeriodClock} variant="outline" aria-label="Reset Period Clock">
            <TimerReset className="mr-2 h-4 w-4" /> Reset Period
          </Button>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="minutes">Set Time</Label>
          <div className="flex items-center gap-2">
            <Input
              id="minutes"
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
              placeholder="MM"
              className="w-1/3"
              aria-label="Set minutes"
            />
            <span className="font-bold text-primary-foreground">:</span>
            <Input
              id="seconds"
              type="number"
              value={seconds}
              onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
              placeholder="SS"
              className="w-1/3"
              aria-label="Set seconds"
            />
            <Button onClick={handleSetTime} variant="secondary" className="flex-1" aria-label="Apply Time Change">
              Set
            </Button>
          </div>
        </div>

        <div>
          <Label>Adjust Time</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Button onClick={() => handleAdjustTime(60)} variant="outline"><Plus className="mr-1 h-4 w-4" />1 Min</Button>
            <Button onClick={() => handleAdjustTime(-60)} variant="outline"><Minus className="mr-1 h-4 w-4" />1 Min</Button>
            <Button onClick={() => handleAdjustTime(10)} variant="outline"><Plus className="mr-1 h-4 w-4" />10 Sec</Button>
            <Button onClick={() => handleAdjustTime(-10)} variant="outline"><Minus className="mr-1 h-4 w-4" />10 Sec</Button>
          </div>
        </div>
      </div>
    </ControlCardWrapper>
  );
}
