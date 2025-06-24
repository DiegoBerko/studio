
"use client";

import React, { useState, useMemo, useRef } from 'react';
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
import { Trash2, UserPlus, Hourglass, ChevronsUpDown, Check, Info, Goal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PenaltyLogDialog } from '../scoreboard/penalty-log-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface PenaltyControlCardProps {
  team: Team;
  teamName: string;
}

export function PenaltyControlCard({ team, teamName }: PenaltyControlCardProps) {
  const { state, dispatch } = useGameState();
  const [playerNumberForPenalty, setPlayerNumberForPenalty] = useState('');
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [penaltyDurationSeconds, setPenaltyDurationSeconds] = useState('120');
  const { toast } = useToast();

  const [draggedPenaltyId, setDraggedPenaltyId] = useState<string | null>(null);
  const [dragOverPenaltyId, setDragOverPenaltyId] = useState<string | null>(null);

  const [isPlayerPopoverOpen, setIsPlayerPopoverOpen] = useState(false);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const justSelectedPlayerRef = useRef(false);
  const [isLogOpen, setIsLogOpen] = useState(false);

  // New state for editing penalty time
  const [editingPenaltyId, setEditingPenaltyId] = useState<string | null>(null);
  const [editTimeValue, setEditTimeValue] = useState('');
  
  const [pendingConfirmation, setPendingConfirmation] = useState<{ type: 'goal' | 'delete'; penalty: Penalty } | null>(null);


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
      if (!state.enablePlayerSelectionForPenalties) return false;
      return matchedTeam && matchedTeam.players.length > 0;
  }, [matchedTeam, state.enablePlayerSelectionForPenalties]);

  const filteredPlayers = useMemo(() => {
    if (!matchedTeam || !teamHasPlayers) return [];
    let playersToFilter = matchedTeam.players.filter(p => p.number && p.number.trim() !== '');
    playersToFilter.sort((a, b) => {
      const numA = parseInt(a.number, 10);
      const numB = parseInt(b.number, 10);
      if (isNaN(numA) || isNaN(numB)) {
        return a.number.localeCompare(b.number);
      }
      return numA - numB;
    });
    
    const searchTermLower = playerSearchTerm.toLowerCase();
    if (!searchTermLower.trim()) return playersToFilter;

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
          penalty: { playerNumber: trimmedPlayerNumberForPenalty.toUpperCase(), initialDuration: durationSec, remainingTime: durationSec },
        },
      });
    });
    toast({ title: "Penalidad Agregada", description: `Jugador ${trimmedPlayerNumberForPenalty.toUpperCase()}${selectedPlayerName ? ` (${selectedPlayerName})` : ''} de ${teamName} recibió una penalidad de ${formatTime(durationSec * 100)}.` });
    
    setPlayerNumberForPenalty('');
    setSelectedPlayerName(null);
    setPlayerSearchTerm('');
  };
  
  const handleSetPenaltyTime = (penaltyId: string) => {
    const parts = editTimeValue.split(':');
    let minutes = 0;
    let seconds = 0;

    if (parts.length === 2) {
      minutes = parseInt(parts[0], 10);
      seconds = parseInt(parts[1], 10);
    } else if (parts.length === 1) {
      seconds = parseInt(parts[0], 10);
    }

    if (isNaN(minutes) || isNaN(seconds)) {
      toast({ title: "Tiempo Inválido", description: "Por favor, usa el formato MM:SS o solo segundos.", variant: "destructive" });
      setEditingPenaltyId(null);
      return;
    }

    const totalSeconds = (minutes * 60) + seconds;

    flushSync(() => {
      dispatch({
        type: 'SET_PENALTY_TIME',
        payload: { team, penaltyId, time: totalSeconds }
      });
    });

    toast({ title: "Tiempo de Penalidad Establecido", description: `Tiempo actualizado a ${formatTime(totalSeconds * 100)}.` });
    
    setEditingPenaltyId(null);
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
  
  const handleConfirmAction = () => {
    if (!pendingConfirmation) return;

    flushSync(() => {
        if (pendingConfirmation.type === 'goal') {
            dispatch({ type: 'END_PENALTY_FOR_GOAL', payload: { team, penaltyId: pendingConfirmation.penalty.id } });
            toast({ title: "Penalidad Finalizada por Gol", description: `La penalidad para el jugador #${pendingConfirmation.penalty.playerNumber} se finalizó.` });
        } else if (pendingConfirmation.type === 'delete') {
            dispatch({ type: 'REMOVE_PENALTY', payload: { team, penaltyId: pendingConfirmation.penalty.id } });
            toast({ title: "Penalidad Eliminada", description: `La penalidad para el jugador #${pendingConfirmation.penalty.playerNumber} ha sido eliminada.` });
        }
    });

    setPendingConfirmation(null);
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
            <Command shouldFilter={false}>
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
                            setPlayerNumberForPenalty(playerToSelect.number);
                            setSelectedPlayerName(playerToSelect.name);
                        } else if (trimmedSearch && (/^\d+$/.test(trimmedSearch) || /^\d+[A-Za-z]*$/.test(trimmedSearch))) {
                           setPlayerNumberForPenalty(trimmedSearch);
                           setSelectedPlayerName(null);
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
    return (
      <Input
        id={`${team}-playerNumberForPenalty`}
        value={playerNumberForPenalty}
        onChange={(e) => {
            setPlayerNumberForPenalty(e.target.value.toUpperCase());
            setSelectedPlayerName(null);
        }}
        placeholder="ej., 99 o 15A"
        required
        autoComplete="off"
      />
    );
  };

  return (
    <>
    <Card className="bg-card shadow-md">
       <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl text-primary-foreground">{`Penalidades ${teamName}${teamSubName ? ` (${teamSubName})` : ''}`}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary-foreground"
            onClick={() => setIsLogOpen(true)}
            aria-label="Ver registro de penalidades"
          >
            <Info className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
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
              const isEditingThisPenalty = editingPenaltyId === p.id;
              const isEndingSoon = p._status === 'running' && p.remainingTime > 0 && p.remainingTime < 10;

              return (
                <Card
                  key={p.id}
                  draggable={!isEditingThisPenalty}
                  onDragStart={(e) => handleDragStart(e, p.id)}
                  onDragEnter={(e) => handleDragEnter(e, p.id)}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, p.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "p-3 bg-muted/30 transition-all border",
                    !isEditingThisPenalty && "cursor-move",
                    draggedPenaltyId === p.id && "opacity-50 scale-95 shadow-lg",
                    dragOverPenaltyId === p.id && draggedPenaltyId !== p.id && "border-2 border-primary ring-2 ring-primary",
                    isWaitingSlot && "opacity-60 bg-muted/10",
                    isPendingPuck && "opacity-40 bg-yellow-500/5 border-yellow-500/30",
                    isEndingSoon && "animate-flashing-border border-2"
                  )}
                >
                  <div className="flex justify-between items-center w-full gap-2">
                     <div className="flex-1 min-w-0">
                      <p className="font-semibold text-card-foreground truncate">
                        Jugador {displayPenaltyNumber}
                        {state.enablePlayerSelectionForPenalties && state.showAliasInControlsPenaltyList && matchedPlayerForPenaltyDisplay && matchedPlayerForPenaltyDisplay.name && (
                          <span className="ml-1 text-xs text-muted-foreground font-normal">
                             - {matchedPlayerForPenaltyDisplay.name}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total: {formatTime(p.initialDuration * 100)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {isEditingThisPenalty ? (
                        <Input
                          type="text"
                          value={editTimeValue}
                          onChange={(e) => setEditTimeValue(e.target.value)}
                          onBlur={() => handleSetPenaltyTime(p.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSetPenaltyTime(p.id); if (e.key === 'Escape') setEditingPenaltyId(null); }}
                          className="w-20 h-8 text-center font-mono"
                          autoFocus
                          placeholder="MM:SS"
                        />
                      ) : (
                        <div
                          className="w-20 h-8 flex items-center justify-center font-mono text-lg cursor-pointer rounded-md hover:bg-white/10"
                          onClick={() => {
                            setEditingPenaltyId(p.id);
                            setEditTimeValue(formatTime(p.remainingTime * 100));
                          }}
                        >
                          {formatTime(p.remainingTime * 100)}
                        </div>
                      )}
                      
                       <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPendingConfirmation({ type: 'goal', penalty: p })}
                        aria-label="Finalizar por gol"
                       >
                         <Goal className="h-4 w-4 text-green-500" />
                       </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 text-destructive/80 hover:text-destructive"
                        onClick={() => setPendingConfirmation({ type: 'delete', penalty: p })}
                        aria-label="Eliminar penalidad"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
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
      </CardContent>
    </Card>
      {isLogOpen && (
        <PenaltyLogDialog 
          isOpen={isLogOpen}
          onOpenChange={setIsLogOpen}
          team={team}
          teamName={teamName}
        />
      )}
      {pendingConfirmation && (
            <AlertDialog open={!!pendingConfirmation} onOpenChange={() => setPendingConfirmation(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingConfirmation.type === 'goal' ? 'Confirmar Penalidad Finalizada por Gol' : 'Confirmar Eliminación'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingConfirmation.type === 'goal'
                                ? `¿Estás seguro de que quieres finalizar la penalidad del jugador #${pendingConfirmation.penalty.playerNumber} por un gol en contra? Esto la eliminará de la lista activa.`
                                : `¿Estás seguro de que quieres eliminar permanentemente la penalidad del jugador #${pendingConfirmation.penalty.playerNumber}? Esta acción no se puede deshacer.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingConfirmation(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleConfirmAction} 
                            className={pendingConfirmation.type === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
                        >
                            {pendingConfirmation.type === 'goal' ? 'Confirmar Gol en PK' : 'Confirmar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
    </>
  );
}
