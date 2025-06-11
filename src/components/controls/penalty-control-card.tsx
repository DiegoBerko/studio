
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
  team: Team; // 'home' or 'away' for reducer logic
  teamName: string; // Actual display name from state
}

export function PenaltyControlCard({ team, teamName }: PenaltyControlCardProps) {
  const { state, dispatch } = useGameState();
  const [playerNumber, setPlayerNumber] = useState('');
  const [penaltyDuration, setPenaltyDuration] = useState('120');
  const { toast } = useToast();

  const penalties = team === 'home' ? state.homePenalties : state.awayPenalties;

  const handleAddPenalty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerNumber || !penaltyDuration) {
      toast({ title: "Error", description: "Número de jugador y duración son requeridos.", variant: "destructive" });
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
    toast({ title: "Penalidad Agregada", description: `Jugador ${playerNumber} de ${teamName} recibió una penalidad de ${formatTime(durationSec)}.` });
    setPlayerNumber('');
  };

  const handleRemovePenalty = (penaltyId: string) => {
    dispatch({ type: 'REMOVE_PENALTY', payload: { team, penaltyId } });
    toast({ title: "Penalidad Removida", description: `Penalidad para ${teamName} removida.` });
  };

  return (
    <ControlCardWrapper title={`Penalidades ${teamName}`}>
      <form onSubmit={handleAddPenalty} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <div>
            <Label htmlFor={`${team}-playerNumber`}>Jugador #</Label>
            <Input
              id={`${team}-playerNumber`}
              value={playerNumber}
              onChange={(e) => setPlayerNumber(e.target.value)}
              placeholder="ej., 99"
              required
            />
          </div>
          <div>
            <Label htmlFor={`${team}-penaltyDuration`}>Duración</Label>
            <Select value={penaltyDuration} onValueChange={setPenaltyDuration}>
              <SelectTrigger id={`${team}-penaltyDuration`}>
                <SelectValue placeholder="Seleccionar duración" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="120">2:00 (Menor)</SelectItem>
                <SelectItem value="240">4:00 (Doble Menor)</SelectItem>
                <SelectItem value="300">5:00 (Mayor)</SelectItem>
                <SelectItem value="600">10:00 (Mala Conducta)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full sm:w-auto" aria-label={`Agregar penalidad para ${teamName}`}>
            <UserPlus className="mr-2 h-4 w-4" /> Agregar
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <Label>Penalidades Activas ({penalties.length})</Label>
        {penalties.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin penalidades activas.</p>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {penalties.map((p) => (
              <Card key={p.id} className="p-3 bg-muted/30 flex justify-between items-center">
                <div className="text-sm">
                  <p className="font-semibold">Jugador {p.playerNumber}</p>
                  <p className="text-xs text-muted-foreground flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(p.remainingTime)} / {formatTime(p.initialDuration)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePenalty(p.id)}
                  aria-label={`Remover penalidad para jugador ${p.playerNumber}`}
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
