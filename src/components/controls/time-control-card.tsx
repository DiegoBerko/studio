
"use client";

import React, { useState } from 'react';
import { useGameState } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Plus, Minus, TimerReset, Coffee } from 'lucide-react';
import { ControlCardWrapper } from './control-card-wrapper';
import { useToast } from '@/hooks/use-toast';

export function TimeControlCard() {
  const { state, dispatch } = useGameState();
  const [minutes, setMinutes] = useState(Math.floor(state.currentTime / 60));
  const [seconds, setSeconds] = useState(state.currentTime % 60);
  const [breakMinutes, setBreakMinutes] = useState(2); // Default break time
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

  const handleStartBreak = () => {
    if (breakMinutes <= 0) {
        toast({ title: "Error", description: "Break duration must be greater than 0 minutes.", variant: "destructive" });
        return;
    }
    dispatch({ type: 'START_BREAK', payload: { minutes: Number(breakMinutes) } });
    toast({ title: "Break Started", description: `Break started for ${breakMinutes} minutes. Clock is running.`});
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
            <Button onClick={() => handleAdjustTime(10)} variant="outline"><Plus className="mr-1 h-4 w-4" />10 Sec</Button>
            <Button onClick={() => handleAdjustTime(-10)} variant="outline"><Minus className="mr-1 h-4 w-4" />10 Sec</Button>
            <Button onClick={() => handleAdjustTime(1)} variant="outline"><Plus className="mr-1 h-4 w-4" />1 Sec</Button>
            <Button onClick={() => handleAdjustTime(-1)} variant="outline"><Minus className="mr-1 h-4 w-4" />1 Sec</Button>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-2">
            <Label htmlFor="breakMinutes">Break Duration</Label>
            <div className="flex items-center gap-2">
            <Input
                id="breakMinutes"
                type="number"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                placeholder="Min"
                className="w-1/3"
                aria-label="Set break duration in minutes"
            />
            <Button onClick={handleStartBreak} variant="outline" className="flex-1" aria-label="Start Break">
                <Coffee className="mr-2 h-4 w-4" /> Start Break
            </Button>
            </div>
        </div>

      </div>
    </ControlCardWrapper>
  );
}
