
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useGameState, getActualPeriodText, type Team, type GoalLog, type PlayerData } from "@/contexts/game-state-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, PlusCircle, Save, X, ChevronsUpDown, Check, Goal } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalManagementDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  team: Team | null;
}

export function GoalManagementDialog({ isOpen, onOpenChange, team }: GoalManagementDialogProps) {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const [localGoals, setLocalGoals] = useState<GoalLog[]>([]);
  
  const teamName = team === 'home' ? state.homeTeamName : state.awayTeamName;

  useEffect(() => {
    if (isOpen) {
      setLocalGoals(JSON.parse(JSON.stringify(state.goals)));
    }
  }, [isOpen, state.goals]);

  const handleAddGoal = () => {
    if (!team) return;
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

  const handleUpdateGoal = (goalId: string, updates: Partial<GoalLog>) => {
    setLocalGoals(prev => prev.map(g => (g.id === goalId ? { ...g, ...updates } : g)));
  };

  const handleSave = () => {
    dispatch({ type: 'MANAGE_GOALS', payload: localGoals });
    toast({ title: "Marcador Actualizado", description: "La lista de goles y el marcador han sido guardados." });
    onOpenChange(false);
  };

  const displayedGoals = useMemo(() => {
    if (!team) return [];
    return localGoals.filter(g => g.team === team).sort((a, b) => b.timestamp - a.timestamp);
  }, [localGoals, team]);

  if (!team) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Gestión de Goles: {teamName}</DialogTitle>
          <DialogDescription>
            Añade, edita o elimina goles para este equipo. El marcador se actualizará al guardar.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4 -mr-4 my-4 border-y">
          <div className="py-4 space-y-3">
            {displayedGoals.length > 0 ? displayedGoals.map(goal => (
              <GoalItem
                key={goal.id}
                goal={goal}
                onDelete={handleDeleteGoal}
                onUpdateGoal={handleUpdateGoal}
              />
            )) : (
              <div className="text-center py-10 text-muted-foreground">
                <Goal className="mx-auto h-12 w-12 mb-4" />
                <p>No se han registrado goles para {teamName}.</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="justify-between sm:justify-between border-t pt-4">
          <Button variant="outline" size="sm" onClick={handleAddGoal}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Gol para {teamName}
          </Button>
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

function GoalItem({ goal, onDelete, onUpdateGoal }: { goal: GoalLog; onDelete: (id: string) => void; onUpdateGoal: (id: string, updates: Partial<GoalLog>) => void; }) {
  const { state } = useGameState();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  const { minutes, seconds } = useMemo(() => {
    const totalSeconds = Math.floor(goal.gameTime / 100);
    return {
        minutes: Math.floor(totalSeconds / 60),
        seconds: totalSeconds % 60,
    };
  }, [goal.gameTime]);

  const [minInput, setMinInput] = useState(String(minutes).padStart(2, '0'));
  const [secInput, setSecInput] = useState(String(seconds).padStart(2, '0'));
  const [periodInput, setPeriodInput] = useState(goal.periodText);

  const [scorerNumberInput, setScorerNumberInput] = useState(goal.scorer?.playerNumber || "");

  useEffect(() => {
    const totalSeconds = Math.floor(goal.gameTime / 100);
    setMinInput(String(Math.floor(totalSeconds / 60)).padStart(2, '0'));
    setSecInput(String(totalSeconds % 60).padStart(2, '0'));
    setPeriodInput(goal.periodText);
    setScorerNumberInput(goal.scorer?.playerNumber || "");
  }, [goal]);

  const handleTimeBlur = () => {
    const mins = parseInt(minInput, 10) || 0;
    const secs = parseInt(secInput, 10) || 0;
    const newGameTime = (mins * 60 + secs) * 100;
    if (newGameTime !== goal.gameTime) {
      onUpdateGoal(goal.id, { gameTime: newGameTime });
    }
  };

  const handlePeriodBlur = () => {
    if (periodInput.trim() !== goal.periodText) {
      onUpdateGoal(goal.id, { periodText: periodInput.trim() });
    }
  };

  const teamData = useMemo(() => {
    const teamName = goal.team === 'home' ? state.homeTeamName : state.awayTeamName;
    const teamSubName = goal.team === 'home' ? state.homeTeamSubName : state.awayTeamSubName;
    return state.teams.find(t => t.name === teamName && (t.subName || undefined) === (teamSubName || undefined) && t.category === state.selectedMatchCategory);
  }, [goal.team, state.homeTeamName, state.awayTeamName, state.homeTeamSubName, state.awayTeamSubName, state.selectedMatchCategory, state.teams]);

  const teamPlayers = useMemo(() => {
    if (!teamData) return [];
    return teamData.players.filter(p => p.number && p.number.trim() !== '').sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
  }, [teamData]);

  const handleScorerUpdate = (number: string) => {
    if (/^\d*$/.test(number)) {
      setScorerNumberInput(number);
      const matchedPlayer = teamPlayers.find(p => p.number === number);
      onUpdateGoal(goal.id, { scorer: { playerNumber: number, playerName: matchedPlayer?.name }});
    }
  };

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-3 flex items-center justify-between flex-wrap gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={minInput}
            onChange={(e) => { if (/^\d{0,2}$/.test(e.target.value)) setMinInput(e.target.value); }}
            onBlur={handleTimeBlur}
            className="w-12 h-8 text-center"
            aria-label="Minutos del gol"
          />
          <span>:</span>
          <Input
            value={secInput}
            onChange={(e) => { if (/^\d{0,2}$/.test(e.target.value)) setSecInput(e.target.value); }}
            onBlur={handleTimeBlur}
            className="w-12 h-8 text-center"
            aria-label="Segundos del gol"
          />
          <Input
            value={periodInput}
            onChange={(e) => setPeriodInput(e.target.value.toUpperCase())}
            onBlur={handlePeriodBlur}
            className="w-20 h-8 text-center"
            aria-label="Período del gol"
            placeholder="Período"
          />
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
                  value={scorerNumberInput} 
                  onValueChange={handleScorerUpdate}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setIsPopoverOpen(false); } }}
                />
                <CommandList>
                  <CommandEmpty>No se encontró jugador.</CommandEmpty>
                  <CommandGroup>
                    {teamPlayers
                      .filter(p => p.number.includes(scorerNumberInput) || p.name.toLowerCase().includes(scorerNumberInput.toLowerCase()))
                      .map(player => (
                      <CommandItem key={player.id} onSelect={() => {
                        handleScorerUpdate(player.number);
                        setIsPopoverOpen(false);
                      }}>
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
