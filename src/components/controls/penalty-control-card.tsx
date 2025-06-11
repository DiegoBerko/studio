"use client";

import React, { useState } from 'react';
import { useGameState, formatTime } from '@/contexts/game-state-context';
import type { Penalty, Team } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, UserPlus, Clock } from 'lucide-react';
import { ControlCardWrapper } from './control-card-wrapper';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

interface PenaltyControlCardProps {
  team: Team;
  teamName: string;
}

export function PenaltyControlCard({ team, teamName }: PenaltyControlCardProps) {
  const { state, dispatch } = useGameState();
  const [playerNumber, setPlayerNumber] = useState('');
  const [penaltyDuration, setPenaltyDuration] = useState('120'); // Default to 2 minutes (120 seconds)
  const { toast } = useToast();

  const penalties = team === 'home' ? state.homePenalties : state.awayPenalties;

  const handleAddPenalty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerNumber || !penaltyDuration) {
      toast({ title: "Error", description: "Player number and duration are required.", variant: "destructive" });
      return;
    }
    const durationSec = parseInt(penaltyDuration, 10);
    dispatch({
      type: 'ADD_PENALTY',
      payload: {
        team,
        penalty: { playerNumber, initialDuration: durationSec, remainingTime: durationSec },
      },
    });
    toast({ title: "Penalty Added", description: `${teamName} player ${playerNumber} received a ${formatTime(durationSec)} penalty.` });
    setPlayerNumber('');
  };

  const handleRemovePenalty = (penaltyId: string) => {
    dispatch({ type: 'REMOVE_PENALTY', payload: { team, penaltyId } });
    toast({ title: "Penalty Removed", description: `Penalty for ${teamName} removed.` });
  };

  return (
    <ControlCardWrapper title={`${teamName} Penalties`}>
      <form onSubmit={handleAddPenalty} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <div>
            <Label htmlFor={`${team}-playerNumber`}>Player #</Label>
            <Input
              id={`${team}-playerNumber`}
              value={playerNumber}
              onChange={(e) => setPlayerNumber(e.target.value)}
              placeholder="e.g., 99"
              required
            />
          </div>
          <div>
            <Label htmlFor={`${team}-penaltyDuration`}>Duration</Label>
            <Select value={penaltyDuration} onValueChange={setPenaltyDuration}>
              <SelectTrigger id={`${team}-penaltyDuration`}>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="120">2:00 (Minor)</SelectItem>
                <SelectItem value="240">4:00 (Double Minor)</SelectItem>
                <SelectItem value="300">5:00 (Major)</SelectItem>
                <SelectItem value="600">10:00 (Misconduct)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full sm:w-auto" aria-label={`Add penalty for ${teamName}`}>
            <UserPlus className="mr-2 h-4 w-4" /> Add
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <Label>Active Penalties ({penalties.length})</Label>
        {penalties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active penalties.</p>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {penalties.map((p) => (
              <Card key={p.id} className="p-3 bg-muted/30 flex justify-between items-center">
                <div className="text-sm">
                  <p className="font-semibold">Player {p.playerNumber}</p>
                  <p className="text-xs text-muted-foreground flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(p.remainingTime)} / {formatTime(p.initialDuration)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePenalty(p.id)}
                  aria-label={`Remove penalty for player ${p.playerNumber}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ControlCardWrapper>
  );
}
