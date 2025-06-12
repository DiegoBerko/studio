
"use client";

import React, { useState } from 'react';
import { useGameState, formatTime } from '@/contexts/game-state-context';
import type { Penalty, Team } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, UserPlus, Clock, Plus, Minus, Hourglass } from 'lucide-react';
import { ControlCardWrapper } from './control-card-wrapper';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PenaltyControlCardProps {
  team: Team; // 'home' or 'away' for reducer logic
  teamName: string; // Actual display name from state
}

const ADJUST_TIME_DELTA = 1; // Segundos para ajustar

export function PenaltyControlCard({ team, teamName }: PenaltyControlCardProps) {
  const { state, dispatch } = useGameState();
  const [playerNumber, setPlayerNumber] = useState('');
  const [penaltyDuration, setPenaltyDuration] = useState('120');
  const { toast } = useToast();

  const [draggedPenaltyId, setDraggedPenaltyId] = useState<string | null>(null);
  const [dragOverPenaltyId, setDragOverPenaltyId] = useState<string | null>(null);

  const penalties = team === 'home' ? state.homePenalties : state.awayPenalties;

  const handleAddPenalty = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPlayerNumber = playerNumber.trim();

    if (!trimmedPlayerNumber || !penaltyDuration) {
      toast({ title: "Error", description: "Número de jugador y duración son requeridos.", variant: "destructive" });
      return;
    }
    const durationSec = parseInt(penaltyDuration, 10);
    dispatch({
      type: 'ADD_PENALTY',
      payload: {
        team,
        penalty: { playerNumber: trimmedPlayerNumber, initialDuration: durationSec, remainingTime: durationSec },
      },
    });
    toast({ title: "Penalidad Agregada", description: `Jugador ${trimmedPlayerNumber} de ${teamName} recibió una penalidad de ${formatTime(durationSec)}.` });
    setPlayerNumber('');
  };

  const handleRemovePenalty = (penaltyId: string) => {
    dispatch({ type: 'REMOVE_PENALTY', payload: { team, penaltyId } });
    toast({ title: "Penalidad Removida", description: `Penalidad para ${teamName} removida.` });
  };

  const handleAdjustPenaltyTime = (penaltyId: string, delta: number) => {
    dispatch({ type: 'ADJUST_PENALTY_TIME', payload: { team, penaltyId, delta } });
    const penalty = penalties.find(p => p.id === penaltyId);
    if (penalty) {
        toast({ title: "Tiempo de Penalidad Ajustado", description: `Tiempo para Jugador ${penalty.playerNumber} (${teamName}) ajustado en ${delta > 0 ? '+' : ''}${delta}s.` });
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, penaltyId: string) => {
    setDraggedPenaltyId(penaltyId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", penaltyId);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, penaltyId: string) => {
    e.preventDefault();
    setDragOverPenaltyId(penaltyId);
  };

  const handleDragLeave = () => {
    setDragOverPenaltyId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetPenaltyId: string) => {
    e.preventDefault();
    if (draggedPenaltyId && draggedPenaltyId !== targetPenaltyId) {
      const currentTeamPenalties = team === 'home' ? state.homePenalties : state.awayPenalties;
      const startIndex = currentTeamPenalties.findIndex(p => p.id === draggedPenaltyId);
      const endIndex = currentTeamPenalties.findIndex(p => p.id === targetPenaltyId);

      if (startIndex !== -1 && endIndex !== -1) {
        dispatch({
          type: 'REORDER_PENALTIES',
          payload: { team, startIndex, endIndex },
        });
        toast({ title: "Penalidades Reordenadas", description: `Orden de penalidades para ${teamName} actualizado.` });
      }
    }
    setDraggedPenaltyId(null);
    setDragOverPenaltyId(null);
  };
  
  const handleDragEnd = () => {
    setDraggedPenaltyId(null);
    setDragOverPenaltyId(null);
  };

  const getStatusText = (status?: Penalty['_status']) => {
    if (status === 'pending_player' || status === 'pending_concurrent') return 'Esperando';
    return null;
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
                <SelectItem value="5">0:05 (Prueba)</SelectItem>
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
          <div 
            className="max-h-60 overflow-y-auto space-y-2 pr-2"
          >
            {penalties.map((p) => {
              const isWaiting = p._status === 'pending_player' || p._status === 'pending_concurrent';
              const statusText = getStatusText(p._status);
              return (
                <Card 
                  key={p.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, p.id)}
                  onDragEnter={(e) => handleDragEnter(e, p.id)}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, p.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "p-3 bg-muted/30 flex flex-col cursor-move transition-all", 
                    draggedPenaltyId === p.id && "opacity-50 scale-95 shadow-lg",
                    dragOverPenaltyId === p.id && draggedPenaltyId !== p.id && "border-2 border-primary ring-2 ring-primary",
                    isWaiting && "opacity-60 bg-muted/10" 
                  )}
                >
                  <div className="flex justify-between items-center w-full">
                    <div className="flex-1">
                      <p className="font-semibold">Jugador {p.playerNumber}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{formatTime(p.remainingTime)} / {formatTime(p.initialDuration)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleAdjustPenaltyTime(p.id, -ADJUST_TIME_DELTA)}
                        aria-label={`Restar ${ADJUST_TIME_DELTA}s a penalidad de jugador ${p.playerNumber}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleAdjustPenaltyTime(p.id, ADJUST_TIME_DELTA)}
                        aria-label={`Sumar ${ADJUST_TIME_DELTA}s a penalidad de jugador ${p.playerNumber}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemovePenalty(p.id)}
                        aria-label={`Remover penalidad para jugador ${p.playerNumber}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {statusText && (
                    <div className="text-xs text-muted-foreground italic mt-1 flex items-center">
                      <Hourglass className="h-3 w-3 mr-1" />
                      {statusText}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ControlCardWrapper>
  );
}

