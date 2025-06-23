
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
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
  const [playerNumberForPenalty, setPlayerNumberForPenalty] = useState(''); // Number for the penalty itself
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null); // Name of player selected from popover
  const [penaltyDurationSeconds, setPenaltyDurationSeconds] = useState('120');
  const { toast } = useToast();

  const [draggedPenaltyId, setDraggedPenaltyId] = useState<string | null>(null);
  const [dragOverPenaltyId, setDragOverPenaltyId] = useState<string | null>(null);

  const [isPlayerPopoverOpen, setIsPlayerPopoverOpen] = useState(false);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const justSelectedPlayerRef = useRef(false);


  const penalties = team === 'home' ? state.homePenalties : state.awayPenalties;
  const teamSubName = team === 'home' ? state.homeTeamSubName : state.awayTeamSubName;

  const matchedTeam = useMemo(() => {
    return state.teams.find(t =>
        t.name === teamName &&
        (t.subName || undefined) === (teamSubName || undefined) &&
        t.category === state.selectedMatchCategory
    );
  }, [state.teams, teamName, teamSubName, state.selectedMatchCategory]);
  
  const teamHasPlayers = useMemo(() => {
      if (!state.enablePlayerSelectionForPenalties) return false; // Global setting check
      return matchedTeam && matchedTeam.players.length > 0;
  }, [matchedTeam, state.enablePlayerSelectionForPenalties]);


  const filteredPlayers = useMemo(() => {
    if (!matchedTeam || !teamHasPlayers) return [];

    // Filter to only include players with a number
    let playersToFilter = matchedTeam.players.filter(p => p.number && p.number.trim() !== '');

    // Sort players by number
    playersToFilter.sort((a, b) => {
      const numA = parseInt(a.number, 10);
      const numB = parseInt(b.number, 10);
      if (isNaN(numA) || isNaN(numB)) {
        return a.number.localeCompare(b.number); // Fallback for non-numeric or mixed numbers
      }
      return numA - numB;
    });
    
    const searchTermLower = playerSearchTerm.toLowerCase();
    if (!searchTermLower.trim()) return playersToFilter;

    // Filter based on search term
    return playersToFilter.filter(
      (player: PlayerData) =>
        (player.number.toLowerCase().includes(searchTermLower)) ||
        (state.showAliasInPenaltyPlayerSelector && player.name.toLowerCase().includes(searchTermLower))
    );
  }, [matchedTeam, teamHasPlayers, playerSearchTerm, state.showAliasInPenaltyPlayerSelector]);


  const handleAddPenalty = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPlayerNumberForPenalty = playerNumberForPenalty.trim();

    if (!trimmedPlayerNumberForPenalty || !penaltyDurationSeconds) {
      toast({ title: "Error", description: "Número de jugador para la penalidad y duración son requeridos.", variant: "destructive" });
      return;
    }
    // This validation ensures the number entered for the penalty itself is numeric or numeric+letter
    if (!/^\d+$/.test(trimmedPlayerNumberForPenalty) && !/^\d+[A-Za-z]*$/.test(trimmedPlayerNumberForPenalty)) {
       toast({ title: "Error", description: "El número de jugador para la penalidad debe ser numérico o un número seguido de letras (ej. 1, 23, 15A).", variant: "destructive" });
       return;
    }

    const durationSec = parseInt(penaltyDurationSeconds, 10);
    flushSync(() => {
      dispatch({
        type: 'ADD_PENALTY',
        payload: {
          team,
          // The `playerNumber` on the penalty object is the one that will be displayed and used for game logic.
          // It can be the player's actual number, or a manually entered one for the penalty.
          penalty: { playerNumber: trimmedPlayerNumberForPenalty.toUpperCase(), initialDuration: durationSec, remainingTime: durationSec },
        },
      });
    });
    toast({ title: "Penalidad Agregada", description: `Jugador ${trimmedPlayerNumberForPenalty.toUpperCase()}${selectedPlayerName ? ` (${selectedPlayerName})` : ''} de ${teamName} recibió una penalidad de ${formatTime(durationSec * 100)}.` });
    
    setPlayerNumberForPenalty('');
    setSelectedPlayerName(null);
    setPlayerSearchTerm('');
  };

  const handleRemovePenalty = (penaltyId: string) => {
    flushSync(() => {
      dispatch({ type: 'REMOVE_PENALTY', payload: { team, penaltyId } });
    });
    toast({ title: "Penalidad Removida", description: `Penalidad para ${teamName} removida.` });
  };

  const handleAdjustPenaltyTime = (penaltyId: string, deltaSeconds: number) => {
    flushSync(() => {
      dispatch({ type: 'ADJUST_PENALTY_TIME', payload: { team, penaltyId, delta: deltaSeconds } });
    });
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
        flushSync(() => {
          dispatch({
            type: 'REORDER_PENALTIES',
            payload: { team, startIndex, endIndex },
          });
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
    if (status === 'pending_player' || status === 'pending_concurrent') return 'Esperando Slot';
    if (status === 'pending_puck') return 'Esperando Puck';
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
                    setPlayerSearchTerm(''); 
                }
                justSelectedPlayerRef.current = false; 
            }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isPlayerPopoverOpen}
              className="w-full justify-between"
            >
              {playerNumberForPenalty || selectedPlayerName
                ? (
                  <span className="truncate flex items-baseline">
                    <span className="text-xs text-muted-foreground mr-0.5">#</span>
                    <span className="font-semibold">{playerNumberForPenalty || 'S/N'}</span>
                    {(state.showAliasInPenaltyPlayerSelector && selectedPlayerName) && (
                      <span className="text-xs text-muted-foreground ml-1 truncate"> - {selectedPlayerName}</span>
                    )}
                  </span>
                )
                : <span className="truncate">Nº Jugador <span className="text-foreground/70"> / Seleccionar...</span></span>
              }
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command shouldFilter={false}> {/* We do custom filtering in `filteredPlayers` */}
              <CommandInput
                placeholder="Buscar Nº o Nombre..."
                value={playerSearchTerm}
                onValueChange={setPlayerSearchTerm}
                autoComplete="off"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmedSearch = playerSearchTerm.trim().toUpperCase();
                        if (filteredPlayers.length > 0) {
                            const playerToSelect = filteredPlayers[0];
                            setPlayerNumberForPenalty(playerToSelect.number); // This will always be a number
                            setSelectedPlayerName(playerToSelect.name);
                        } else if (trimmedSearch && (/^\d+$/.test(trimmedSearch) || /^\d+[A-Za-z]*$/.test(trimmedSearch))) {
                           // Allow entering a number not in list
                           setPlayerNumberForPenalty(trimmedSearch);
                           setSelectedPlayerName(null); // No player matched from list
                        }
                        justSelectedPlayerRef.current = true;
                        setIsPlayerPopoverOpen(false);
                    }
                }}
              />
              <CommandList>
                <CommandEmpty>
                  No se encontró jugador.
                  {playerSearchTerm.trim() && (/^\d+$/.test(playerSearchTerm.trim()) || /^\d+[A-Za-z]*$/.test(playerSearchTerm.trim())) && (
                     <p className="text-xs text-muted-foreground p-2">Enter para usar: #{playerSearchTerm.trim().toUpperCase()}</p>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {filteredPlayers.map((player: PlayerData) => (
                    <CommandItem
                      key={player.id}
                      value={`${player.number} - ${state.showAliasInPenaltyPlayerSelector ? player.name : ''}`}
                      onSelect={() => {
                        setPlayerNumberForPenalty(player.number);
                        setSelectedPlayerName(player.name);
                        justSelectedPlayerRef.current = true;
                        setIsPlayerPopoverOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          (playerNumberForPenalty === player.number && selectedPlayerName === player.name)
                           ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="text-xs text-muted-foreground mr-0.5">#</span>
                      <span className="font-semibold text-sm mr-1">{player.number}</span>
                      {state.showAliasInPenaltyPlayerSelector && player.name && (
                         <span className="text-xs text-muted-foreground truncate">{player.name}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }
    // Fallback to direct input if player selection is not available/enabled
    return (
      <Input
        id={`${team}-playerNumberForPenalty`}
        value={playerNumberForPenalty}
        onChange={(e) => {
            setPlayerNumberForPenalty(e.target.value.toUpperCase());
            setSelectedPlayerName(null); // Clear selected player if number is manually typed
        }}
        placeholder="ej., 99 o 15A"
        required
        autoComplete="off"
      />
    );
  };


  return (
    <ControlCardWrapper title={`Penalidades ${teamName}${teamSubName ? ` (${teamSubName})` : ''}`}>
      <form onSubmit={handleAddPenalty} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <div className="sm:col-span-1">
            <Label htmlFor={`${team}-playerNumberForPenalty`}>Jugador # (Penalidad)</Label>
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
              const isWaitingSlot = p._status === 'pending_player' || p._status === 'pending_concurrent';
              const isPendingPuck = p._status === 'pending_puck';
              const statusText = getStatusText(p._status);
              
              const matchedPlayerForPenaltyDisplay = matchedTeam?.players.find(
                pData => pData.number === p.playerNumber || (p.playerNumber === "S/N" && !pData.number)
              );
              const displayPenaltyNumber = p.playerNumber || 'S/N';

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
                    isWaitingSlot && "opacity-60 bg-muted/10",
                    isPendingPuck && "opacity-40 bg-yellow-500/5 border-yellow-500/30" // Distintivo para pending_puck
                  )}
                >
                  <div className="flex justify-between items-center w-full">
                    <div className="flex-1">
                      <p className="font-semibold text-card-foreground">
                        Jugador {displayPenaltyNumber}
                        {state.enablePlayerSelectionForPenalties && state.showAliasInControlsPenaltyList && matchedPlayerForPenaltyDisplay && matchedPlayerForPenaltyDisplay.name && (
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
                    <div className={cn(
                        "text-xs italic mt-1 flex items-center",
                        isPendingPuck ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"
                    )}>
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
