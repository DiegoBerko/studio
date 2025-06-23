
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { useGameState } from "@/contexts/game-state-context";
import type { PlayerData, Team } from "@/types";
import { ChevronsUpDown, Check, X, CheckCircle, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalScorerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  team: Team;
  onGoalAssigned: (scorer?: { playerNumber: string; playerName?: string }) => void;
}

export function GoalScorerDialog({
  isOpen,
  onOpenChange,
  team,
  onGoalAssigned,
}: GoalScorerDialogProps) {
  const { state } = useGameState();
  const { toast } = useToast();
  
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [isPlayerPopoverOpen, setIsPlayerPopoverOpen] = useState(false);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  
  const teamName = team === 'home' ? state.homeTeamName : state.awayTeamName;
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
      return isNaN(numA) || isNaN(numB) ? a.number.localeCompare(b.number) : numA - numB;
    });
    
    const searchTermLower = playerSearchTerm.toLowerCase();
    if (!searchTermLower.trim()) return playersToFilter;

    return playersToFilter.filter(
      (player: PlayerData) =>
        (player.number.toLowerCase().includes(searchTermLower)) ||
        (state.showAliasInPenaltyPlayerSelector && player.name.toLowerCase().includes(searchTermLower))
    );
  }, [matchedTeam, teamHasPlayers, playerSearchTerm, state.showAliasInPenaltyPlayerSelector]);

  useEffect(() => {
    if (!isOpen) {
      setPlayerNumber('');
      setPlayerName(null);
      setPlayerSearchTerm('');
      setIsPlayerPopoverOpen(false);
    }
  }, [isOpen]);

  const handleAccept = () => {
    if (!playerNumber.trim()) {
      toast({
        title: "Número de jugador requerido",
        description: "Para asignar un gol, debes seleccionar o ingresar un número de jugador.",
        variant: "destructive",
      });
      return;
    }
    onGoalAssigned({ playerNumber: playerNumber.trim(), playerName: playerName || undefined });
  };
  
  const handleSkip = () => {
    onGoalAssigned(undefined);
  };
  
  const handleCancel = () => {
    onOpenChange(false);
  };

  const renderPlayerInput = () => {
    if (teamHasPlayers && matchedTeam) {
      return (
        <Popover open={isPlayerPopoverOpen} onOpenChange={setIsPlayerPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={isPlayerPopoverOpen} className="w-full justify-between">
              {playerNumber ? (
                <span className="truncate flex items-baseline">
                  <span className="text-xs text-muted-foreground mr-0.5">#</span>
                  <span className="font-semibold">{playerNumber}</span>
                  {playerName && <span className="text-xs text-muted-foreground ml-1 truncate"> - {playerName}</span>}
                </span>
              ) : "Nº Jugador / Seleccionar..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[--radix-popover-trigger-width] p-0"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
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
                            setPlayerNumber(playerToSelect.number);
                            setPlayerName(playerToSelect.name);
                        } else if (trimmedSearch && /^\d+$/.test(trimmedSearch)) {
                           setPlayerNumber(trimmedSearch);
                           setPlayerName(null);
                        }
                        setIsPlayerPopoverOpen(false);
                    }
                }}
              />
              <CommandList>
                <CommandEmpty>
                  <p>No se encontró jugador.</p>
                  {playerSearchTerm.trim() && /^\d+$/.test(playerSearchTerm.trim()) && (
                     <p className="text-xs text-muted-foreground p-2">Enter para usar: #{playerSearchTerm.trim().toUpperCase()}</p>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {filteredPlayers.map((player) => (
                    <CommandItem
                      key={player.id}
                      value={`${player.number} - ${player.name}`}
                      onSelect={() => {
                        setPlayerNumber(player.number);
                        setPlayerName(player.name);
                        setIsPlayerPopoverOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", playerNumber === player.number ? "opacity-100" : "opacity-0")} />
                      #<span className="font-semibold text-sm mr-1">{player.number}</span>
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
    // Fallback if player selection is disabled or team has no players
    return (
      <input
        value={playerNumber}
        onChange={(e) => {
          if (/^\d*$/.test(e.target.value)) {
            setPlayerNumber(e.target.value);
            setPlayerName(null);
          }
        }}
        placeholder="Ingresar número de jugador..."
        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar Gol para {teamName}</DialogTitle>
          <DialogDescription>
            Selecciona o ingresa el número del jugador que anotó el gol.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {renderPlayerInput()}
        </div>
        <DialogFooter className="justify-between sm:justify-between">
            <Button type="button" variant="link" onClick={handleSkip} className="px-0">
                <SkipForward className="mr-2 h-4 w-4" /> Saltear Asignación
            </Button>
            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" /> Cancelar
                </Button>
                <Button type="button" onClick={handleAccept}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Aceptar
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
