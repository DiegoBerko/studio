
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGameState, formatTime } from '@/contexts/game-state-context';
import type { Penalty, Team, PlayerData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Trash2, UserPlus, Clock, Plus, Minus, Hourglass, ChevronsUpDown, Check } from 'lucide-react';
import { ControlCardWrapper } from './control-card-wrapper';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PenaltyControlCardProps {
  team: Team; 
  teamName: string; 
}

const ADJUST_TIME_DELTA_SECONDS = 1; 

export function PenaltyControlCard({ team, teamName }: PenaltyControlCardProps) {
  const { state, dispatch } = useGameState();
  const [playerNumber, setPlayerNumber] = useState('');
  const [penaltyDurationSeconds, setPenaltyDurationSeconds] = useState('120'); 
  const { toast } = useToast();

  const [draggedPenaltyId, setDraggedPenaltyId] = useState<string | null>(null);
  const [dragOverPenaltyId, setDragOverPenaltyId] = useState<string | null>(null);

  const [isPlayerPopoverOpen, setIsPlayerPopoverOpen] = useState(false);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const justSelectedPlayerRef = useRef(false);


  const penalties = team === 'home' ? state.homePenalties : state.awayPenalties;

  const matchedTeam = useMemo(() => state.teams.find(t => t.name === teamName), [state.teams, teamName]);
  const teamHasPlayers = useMemo(() => matchedTeam && matchedTeam.players.length > 0, [matchedTeam]);

  const filteredPlayers = useMemo(() => {
    if (!matchedTeam || !teamHasPlayers) return [];
    
    let playersToFilter = [...matchedTeam.players]; 

    playersToFilter.sort((a, b) => {
      const numA = parseInt(a.number, 10);
      const numB = parseInt(b.number, 10);
      if (isNaN(numA) && isNaN(numB)) return a.number.localeCompare(b.number); // Sort non-numeric as strings
      if (isNaN(numA)) return 1; 
      if (isNaN(numB)) return -1;
      return numA - numB;
    });
    
    const searchTermLower = playerSearchTerm.toLowerCase();
    if (!searchTermLower.trim()) return playersToFilter;
    
    return playersToFilter.filter(
      (player: PlayerData) =>
        player.number.toLowerCase().includes(searchTermLower) ||
        player.name.toLowerCase().includes(searchTermLower)
    );
  }, [matchedTeam, teamHasPlayers, playerSearchTerm]);


  const handleAddPenalty = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPlayerNumber = playerNumber.trim();

    if (!trimmedPlayerNumber || !penaltyDurationSeconds) {
      toast({ title: "Error", description: "Número de jugador y duración son requeridos.", variant: "destructive" });
      return;
    }
    if (!/^\d+$/.test(trimmedPlayerNumber) && !/^\d+[A-Za-z]*$/.test(trimmedPlayerNumber)) {
       toast({ title: "Error", description: "El número de jugador debe ser numérico o un número seguido de letras (ej. 1, 23, 15A).", variant: "destructive" });
       return;
    }

    const durationSec = parseInt(penaltyDurationSeconds, 10);
    dispatch({
      type: 'ADD_PENALTY',
      payload: {
        team,
        penalty: { playerNumber: trimmedPlayerNumber.toUpperCase(), initialDuration: durationSec, remainingTime: durationSec },
      },
    });
    toast({ title: "Penalidad Agregada", description: `Jugador ${trimmedPlayerNumber.toUpperCase()} de ${teamName} recibió una penalidad de ${formatTime(durationSec * 100)}.` });
    setPlayerNumber('');
    setPlayerSearchTerm(''); 
  };

  const handleRemovePenalty = (penaltyId: string) => {
    dispatch({ type: 'REMOVE_PENALTY', payload: { team, penaltyId } });
    toast({ title: "Penalidad Removida", description: `Penalidad para ${teamName} removida.` });
  };

  const handleAdjustPenaltyTime = (penaltyId: string, deltaSeconds: number) => {
    dispatch({ type: 'ADJUST_PENALTY_TIME', payload: { team, penaltyId, delta: deltaSeconds } });
    const penalty = penalties.find(p => p.id === penaltyId);
    if (penalty) {
        toast({ title: "Tiempo de Penalidad Ajustado", description: `Tiempo para Jugador ${penalty.playerNumber} (${teamName}) ajustado en ${deltaSeconds > 0 ? '+' : ''}${deltaSeconds}s.` });
    }
  };

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

  const renderPlayerNumberInput = () => {
    if (teamHasPlayers && matchedTeam) {
      return (
        <Popover 
            open={isPlayerPopoverOpen} 
            onOpenChange={(isOpen) => {
                setIsPlayerPopoverOpen(isOpen);
                if (isOpen) {
                    justSelectedPlayerRef.current = false; 
                    setPlayerSearchTerm(''); 
                } else {
                    // If popover closes without selection, and search term is a valid number, set it
                    if (!justSelectedPlayerRef.current && playerSearchTerm.trim()) {
                        const trimmedSearch = playerSearchTerm.trim().toUpperCase();
                        if (/^\d+$/.test(trimmedSearch) || /^\d+[A-Za-z]*$/.test(trimmedSearch)) {
                            setPlayerNumber(trimmedSearch);
                        }
                    }
                }
            }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isPlayerPopoverOpen}
              className="w-full justify-between"
            >
              {playerNumber
                ? (() => {
                    const selectedPlayer = matchedTeam.players.find(p => p.number === playerNumber);
                    return selectedPlayer ? (
                      <span className="truncate flex items-baseline">
                        <span className="text-xs text-muted-foreground mr-0.5">#</span>
                        <span className="font-semibold">{selectedPlayer.number}</span>
                        <span className="text-xs text-muted-foreground ml-1 truncate"> - {selectedPlayer.name}</span>
                      </span>
                    ) : (
                      <span className="truncate flex items-baseline">
                        <span className="text-xs text-muted-foreground mr-0.5">#</span>
                        <span className="font-semibold">{playerNumber.toUpperCase()}</span>
                      </span>
                    );
                  })()
                : (
                    <span className="truncate">
                        <span className="text-muted-foreground">Nº Jugador</span>
                        <span className="text-foreground/70"> / Seleccionar...</span>
                    </span>
                  )
              }
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command shouldFilter={false}> {/* Manual filtering via filteredPlayers */}
              <CommandInput 
                placeholder="Buscar Nº o Nombre..." 
                value={playerSearchTerm} 
                onValueChange={setPlayerSearchTerm}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmedSearch = playerSearchTerm.trim().toUpperCase();
                        if (trimmedSearch && (/^\d+$/.test(trimmedSearch) || /^\d+[A-Za-z]*$/.test(trimmedSearch))) {
                            setPlayerNumber(trimmedSearch);
                        } else {
                             const firstMatch = filteredPlayers[0];
                             if(firstMatch) setPlayerNumber(firstMatch.number);
                             // else keep playerNumber as is or clear it, depending on desired behavior
                        }
                        setIsPlayerPopoverOpen(false);
                    }
                }}
              />
              <CommandList>
                <CommandEmpty>
                  {playerSearchTerm.trim() && (/^\d+$/.test(playerSearchTerm.trim()) || /^\d+[A-Za-z]*$/.test(playerSearchTerm.trim()))
                    ? (
                        <CommandItem
                            key={`typed-${playerSearchTerm.trim()}`}
                            value={`typed-${playerSearchTerm.trim()}`}
                            onSelect={() => {
                                const typedNum = playerSearchTerm.trim().toUpperCase();
                                setPlayerNumber(typedNum);
                                justSelectedPlayerRef.current = true; 
                                setIsPlayerPopoverOpen(false);
                            }}
                            className="flex items-baseline"
                        >
                          <span className="text-muted-foreground text-xs">Usar número tipeado:</span>
                          <span className="text-xs text-muted-foreground ml-1 mr-0.5">#</span>
                          <span className="font-semibold text-sm">{playerSearchTerm.trim().toUpperCase()}</span>
                        </CommandItem>
                      )
                    : "No se encontró jugador."
                  }
                </CommandEmpty>
                <CommandGroup>
                  {filteredPlayers.map((player: PlayerData) => (
                    <CommandItem
                      key={player.id}
                      value={`${player.number} - ${player.name}`} 
                      onSelect={() => {
                        setPlayerNumber(player.number);
                        setPlayerSearchTerm(''); 
                        justSelectedPlayerRef.current = true; 
                        setIsPlayerPopoverOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          playerNumber === player.number ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="text-xs text-muted-foreground mr-0.5">#</span>
                      <span className="font-semibold text-sm mr-1">{player.number}</span>
                      <span className="text-xs text-muted-foreground truncate">{player.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }
    return (
      <Input
        id={`${team}-playerNumber`}
        value={playerNumber}
        onChange={(e) => setPlayerNumber(e.target.value.toUpperCase())}
        placeholder="ej., 99 o 15A"
        required
      />
    );
  };


  return (
    <ControlCardWrapper title={`Penalidades ${teamName}`}>
      <form onSubmit={handleAddPenalty} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <div className="sm:col-span-1">
            <Label htmlFor={`${team}-playerNumber`}>Jugador #</Label>
            {renderPlayerNumberInput()}
          </div>
          <div className="sm:col-span-1">
            <Label htmlFor={`${team}-penaltyDuration`}>Duración (segundos)</Label>
            <Select value={penaltyDurationSeconds} onValueChange={setPenaltyDurationSeconds}>
              <SelectTrigger id={`${team}-penaltyDuration`}>
                <SelectValue placeholder="Seleccionar duración" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">0:04 (Prueba)</SelectItem>
                <SelectItem value="120">2:00 (Menor)</SelectItem>
                <SelectItem value="240">4:00 (Doble Menor)</SelectItem>
                <SelectItem value="300">5:00 (Mayor)</SelectItem>
                <SelectItem value="600">10:00 (Mala Conducta)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full sm:w-auto sm:self-end" aria-label={`Agregar penalidad para ${teamName}`}>
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
              const matchedTeamForPenaltyDisplay = state.teams.find(t => t.name === teamName);
              const matchedPlayerForPenaltyDisplay = matchedTeamForPenaltyDisplay?.players.find(pData => pData.number === p.playerNumber);

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
                      <p className="font-semibold text-card-foreground">
                        Jugador {p.playerNumber}
                        {matchedPlayerForPenaltyDisplay && (
                          <span className="ml-1 text-xs text-muted-foreground font-normal">
                             - {matchedPlayerForPenaltyDisplay.name}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{formatTime(p.remainingTime * 100)} / {formatTime(p.initialDuration * 100)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleAdjustPenaltyTime(p.id, -ADJUST_TIME_DELTA_SECONDS)}
                        aria-label={`Restar ${ADJUST_TIME_DELTA_SECONDS}s a penalidad de jugador ${p.playerNumber}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleAdjustPenaltyTime(p.id, ADJUST_TIME_DELTA_SECONDS)}
                        aria-label={`Sumar ${ADJUST_TIME_DELTA_SECONDS}s a penalidad de jugador ${p.playerNumber}`}
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
    
