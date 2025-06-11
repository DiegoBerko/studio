"use client";

import { useGameState, getPeriodText } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { ControlCardWrapper } from './control-card-wrapper';
import { useToast } from '@/hooks/use-toast';
import type { Team } from '@/types';

export function ScorePeriodControlCard() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const handleScoreAdjust = (team: Team, delta: number) => {
    dispatch({ type: 'ADJUST_SCORE', payload: { team, delta } });
    const teamName = team.charAt(0).toUpperCase() + team.slice(1);
    toast({ title: `${teamName} Score Updated`, description: `Score ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}.` });
  };

  const handlePeriodChange = (newPeriod: number) => {
    dispatch({ type: 'SET_PERIOD', payload: newPeriod });
    // Also reset clock and pause
    dispatch({ type: 'RESET_PERIOD_CLOCK' });
    toast({ title: "Period Changed", description: `Period set to ${getPeriodText(newPeriod)}. Clock reset and paused.` });
  };

  return (
    <ControlCardWrapper title="Score & Period">
      <div className="space-y-6">
        {/* Score Controls */}
        <div>
          <Label className="text-base">Score Controls</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="font-medium text-center mb-1 text-primary-foreground">Home Team</p>
              <div className="flex justify-center items-center gap-2">
                <Button onClick={() => handleScoreAdjust('home', -1)} variant="outline" size="icon" aria-label="Decrease Home Score"><Minus className="h-4 w-4" /></Button>
                <span className="text-2xl font-bold w-10 text-center text-accent">{state.homeScore}</span>
                <Button onClick={() => handleScoreAdjust('home', 1)} variant="outline" size="icon" aria-label="Increase Home Score"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <div>
              <p className="font-medium text-center mb-1 text-primary-foreground">Away Team</p>
              <div className="flex justify-center items-center gap-2">
                <Button onClick={() => handleScoreAdjust('away', -1)} variant="outline" size="icon" aria-label="Decrease Away Score"><Minus className="h-4 w-4" /></Button>
                <span className="text-2xl font-bold w-10 text-center text-accent">{state.awayScore}</span>
                <Button onClick={() => handleScoreAdjust('away', 1)} variant="outline" size="icon" aria-label="Increase Away Score"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>

        {/* Period Controls */}
        <div>
          <Label className="text-base">Period Controls</Label>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Button 
              onClick={() => handlePeriodChange(Math.max(1, state.currentPeriod - 1))} 
              variant="outline" 
              size="icon" 
              aria-label="Previous Period"
              disabled={state.currentPeriod <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-2xl font-bold w-20 text-center text-accent">{getPeriodText(state.currentPeriod)}</span>
            <Button 
              onClick={() => handlePeriodChange(state.currentPeriod + 1)} 
              variant="outline" 
              size="icon" 
              aria-label="Next Period"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </ControlCardWrapper>
  );
}
