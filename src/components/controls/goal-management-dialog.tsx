
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useGameState, formatTime, getActualPeriodText, type Team, type GoalLog, type PlayerData } from "@/contexts/game-state-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, PlusCircle, Save, X, ChevronsUpDown, Check, Goal } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalManagementDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function GoalManagementDialog({ isOpen, onOpenChange }: GoalManagementDialogProps) {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const [localGoals, setLocalGoals] = useState<GoalLog[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Deep copy to prevent direct mutation
      setLocalGoals(JSON.parse(JSON.stringify(state.goals)));
    }
  }, [isOpen, state.goals]);

  const handleAddGoal = (team: Team) => {
    const newGoal: GoalLog = {
      id: crypto.randomUUID(),
      team,
      timestamp: Date.now(),
      gameTime: state.currentTime,
      periodText: getActualPeriodText(state.currentPeriod, state.periodDisplayOverride, state.numberOfRegularPeriods),
      scorer: { playerNumber: "" },
    };
    setLocalGoals(prev => [...prev, newGoal]);
  };

  const handleDeleteGoal = (goalId: string) => {
    setLocalGoals(prev => prev.filter(g => g.id !== goalId));
  };

  const handleUpdateScorer = (goalId: string, player: PlayerData | { number: string; name?: string }) => {
    setLocalGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        return {
          ...g,
          scorer: { playerNumber: player.number, playerName: player.name },
        };
      }
      return g;
    }));
  };

  const handleSave = () => {
    dispatch({ type: 'MANAGE_GOALS', payload: localGoals });
    toast({ title: "Marcador Actualizado", description: "La lista de goles y el marcador han sido guardados." });
    onOpenChange(false);
  };

  const sortedGoals = useMemo(() => {
    return [...localGoals].sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  }, [localGoals]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Gestión de Goles</DialogTitle>
          <DialogDescription>
            Añade, edita o elimina goles del partido. El marcador se actualizará automáticamente.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4 -mr-4 my-4 border-y">
          <div className="py-4 space-y-3">
            {sortedGoals.length > 0 ? sortedGoals.map(goal => (
              <GoalItem
                key={goal.id}
                goal={goal}
                onDelete={handleDeleteGoal}
                onUpdateScorer={handleUpdateScorer}
              />
            )) : (
              <div className="text-center py-10 text-muted-foreground">
                <Goal className="mx-auto h-12 w-12 mb-4" />
                <p>No se han registrado goles.</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="justify-between sm:justify-between border-t pt-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleAddGoal('home')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Gol Local
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleAddGoal('away')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Gol Visitante
            </Button>
          </div>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline"><X className="mr-2 h-4 w-4"/>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleSave}><Save className="mr-2 h-4 w-4"/>Guardar Cambios</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function GoalItem({ goal, onDelete, onUpdateScorer }: { goal: GoalLog; onDelete: (id: string) => void; onUpdateScorer: (id: string, player: PlayerData | { number: string; name?: string }) => void; }) {
  const { state } = useGameState();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const teamData = useMemo(() => {
    const teamName = goal.team === 'home' ? state.homeTeamName : state.awayTeamName;
    const teamSubName = goal.team === 'home' ? state.homeTeamSubName : state.awayTeamSubName;
    return state.teams.find(t => t.name === teamName && (t.subName || undefined) === (teamSubName || undefined) && t.category === state.selectedMatchCategory);
  }, [goal.team, state.homeTeamName, state.awayTeamName, state.homeTeamSubName, state.awayTeamSubName, state.selectedMatchCategory, state.teams]);

  const teamPlayers = useMemo(() => {
    if (!teamData) return [];
    return teamData.players.filter(p => p.number && p.number.trim() !== '').sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
  }, [teamData]);

  const handlePlayerSelect = (player: PlayerData) => {
    onUpdateScorer(goal.id, player);
    setIsPopoverOpen(false);
  };
  
  const handleManualNumberInput = (number: string) => {
    if (/^\d*$/.test(number)) {
      const matchedPlayer = teamPlayers.find(p => p.number === number);
      onUpdateScorer(goal.id, matchedPlayer || { number });
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsPopoverOpen(false);
    }
  };

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-3 flex items-center justify-between gap-4">
        <div className="flex-grow flex items-center gap-4">
          <Badge variant={goal.team === 'home' ? 'default' : 'secondary'} className="w-20 justify-center">
            {goal.team === 'home' ? state.homeTeamName : state.awayTeamName}
          </Badge>
          <div className="text-sm">
            <p className="font-semibold text-card-foreground">{goal.periodText} - {formatTime(goal.gameTime)}</p>
            <p className="text-xs text-muted-foreground">{new Date(goal.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen} modal={true}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-[200px] justify-between">
                <span className="truncate">
                  {goal.scorer?.playerNumber ? `#${goal.scorer.playerNumber}` : "Asignar..."}
                  {goal.scorer?.playerName && <span className="text-muted-foreground ml-2">{goal.scorer.playerName}</span>}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" onCloseAutoFocus={e => e.preventDefault()}>
              <Command shouldFilter={false}>
                <CommandInput 
                    placeholder="Buscar o ingresar Nº..." 
                    value={searchTerm} 
                    onValueChange={(value) => {
                      setSearchTerm(value);
                      handleManualNumberInput(value);
                    }}
                    onKeyDown={handleKeyDown}
                />
                <CommandList>
                  <CommandEmpty>No se encontró jugador.</CommandEmpty>
                  <CommandGroup>
                    {teamPlayers
                      .filter(p => p.number.includes(searchTerm) || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(player => (
                      <CommandItem key={player.id} onSelect={() => handlePlayerSelect(player)}>
                        <Check className={cn("mr-2 h-4 w-4", goal.scorer?.playerNumber === player.number ? "opacity-100" : "opacity-0")} />
                        #{player.number} - {player.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => onDelete(goal.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
