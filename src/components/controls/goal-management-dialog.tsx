
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useGameState, getPeriodText, type Team, type GoalLog, type PlayerData, getActualPeriodText, formatTime } from "@/contexts/game-state-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, PlusCircle, Save, X, ChevronsUpDown, Check, Goal, Edit3, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";


interface GoalManagementDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  team: Team | null;
}

function AddGoalForm({ team }: { team: Team }) {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const [scorerNumber, setScorerNumber] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);

  const teamData = useMemo(() => {
    const teamName = team === 'home' ? state.homeTeamName : state.awayTeamName;
    const teamSubName = team === 'home' ? state.homeTeamSubName : state.awayTeamSubName;
    return state.teams.find(t => t.name === teamName && (t.subName || undefined) === (teamSubName || undefined) && t.category === state.selectedMatchCategory);
  }, [team, state.homeTeamName, state.awayTeamName, state.homeTeamSubName, state.awayTeamSubName, state.selectedMatchCategory, state.teams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedScorerNumber = scorerNumber.trim();
    if (!trimmedScorerNumber) {
      toast({ title: "Número Requerido", description: "Debes ingresar el número del jugador que anotó.", variant: "destructive" });
      return;
    }
    if (!/^\d+$/.test(trimmedScorerNumber)) {
      toast({ title: "Número Inválido", description: "El número debe ser numérico.", variant: "destructive" });
      return;
    }
    
    dispatch({
      type: 'ADD_GOAL',
      payload: {
        team,
        timestamp: Date.now(),
        gameTime: state.currentTime,
        periodText: getActualPeriodText(state.currentPeriod, state.periodDisplayOverride, state.numberOfRegularPeriods),
        scorer: {
          playerNumber: trimmedScorerNumber,
          playerName: selectedPlayer?.name,
        },
      },
    });

    toast({ title: "Gol Añadido", description: `Gol para el jugador #${trimmedScorerNumber} registrado.` });
    setScorerNumber('');
    setSelectedPlayer(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Añadir Nuevo Gol</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex items-end gap-4">
          <div className="flex-grow">
            <Label htmlFor="new-scorer-number">Número del Goleador</Label>
            <Input
              id="new-scorer-number"
              value={scorerNumber}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) {
                  setScorerNumber(val);
                  const player = teamData?.players.find(p => p.number === val);
                  setSelectedPlayer(player || null);
                }
              }}
              placeholder="Ej: 99"
            />
          </div>
          <Button type="submit">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Gol
          </Button>
        </form>
         {selectedPlayer && (
            <p className="text-xs text-muted-foreground mt-1">
              Jugador: {selectedPlayer.name}
            </p>
        )}
      </CardContent>
    </Card>
  );
}


function EditableGoalItem({ goal }: { goal: GoalLog }) {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Editing state
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
  const [scorerNumberInput, setScorerNumberInput] = useState(goal.scorer?.playerNumber || '');

  const periodOptions = useMemo(() => {
    const options: { value: string, label: string }[] = [];
    const totalPeriods = state.numberOfRegularPeriods + state.numberOfOvertimePeriods;
    for (let i = 1; i <= totalPeriods; i++) {
        const periodText = getPeriodText(i, state.numberOfRegularPeriods);
        options.push({ value: periodText, label: periodText });
    }
    return options;
  }, [state.numberOfRegularPeriods, state.numberOfOvertimePeriods]);

  useEffect(() => {
    if (!isEditing) {
      const totalSeconds = Math.floor(goal.gameTime / 100);
      setMinInput(String(Math.floor(totalSeconds / 60)).padStart(2, '0'));
      setSecInput(String(totalSeconds % 60).padStart(2, '0'));
      setPeriodInput(goal.periodText);
      setScorerNumberInput(goal.scorer?.playerNumber || '');
    }
  }, [isEditing, goal]);

  const teamData = useMemo(() => {
    const teamName = goal.team === 'home' ? state.homeTeamName : state.awayTeamName;
    const teamSubName = goal.team === 'home' ? state.homeTeamSubName : state.awayTeamSubName;
    return state.teams.find(t => t.name === teamName && (t.subName || undefined) === (teamSubName || undefined) && t.category === state.selectedMatchCategory);
  }, [goal.team, state.homeTeamName, state.awayTeamName, state.homeTeamSubName, state.awayTeamSubName, state.selectedMatchCategory, state.teams]);

  const handleSave = () => {
    const trimmedScorerNumber = scorerNumberInput.trim();
    if (!trimmedScorerNumber || !/^\d+$/.test(trimmedScorerNumber)) {
      toast({ title: "Número Inválido", description: "El número del goleador es requerido y debe ser numérico.", variant: "destructive" });
      return;
    }
    
    const mins = parseInt(minInput, 10) || 0;
    const secs = parseInt(secInput, 10) || 0;
    const newGameTime = (mins * 60 + secs) * 100;
    
    const player = teamData?.players.find(p => p.number === trimmedScorerNumber);

    const updates: Partial<GoalLog> = {};
    if (newGameTime !== goal.gameTime) updates.gameTime = newGameTime;
    if (periodInput !== goal.periodText) updates.periodText = periodInput;
    if (trimmedScorerNumber !== goal.scorer?.playerNumber) {
        updates.scorer = { playerNumber: trimmedScorerNumber, playerName: player?.name };
    }

    if (Object.keys(updates).length > 0) {
        dispatch({ type: 'EDIT_GOAL', payload: { goalId: goal.id, updates } });
        toast({ title: "Gol Actualizado", description: "Los cambios en el gol han sido guardados." });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    dispatch({ type: 'DELETE_GOAL', payload: { goalId: goal.id } });
    toast({ title: "Gol Eliminado", description: "El gol ha sido eliminado del registro." });
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const displayTimestamp = useMemo(() => {
    const date = new Date(goal.timestamp);
    if (isNaN(date.getTime())) return { time: '--:--', date: '--/--' };
    return {
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: date.toLocaleDateString([], { day: '2-digit', month: '2-digit' }),
    }
  }, [goal.timestamp]);

  if (isEditing) {
    return (
      <Card className="bg-card/80 border-primary/50">
        <CardContent className="p-3 space-y-3">
            <div className="flex flex-col sm:flex-row items-baseline gap-x-4 gap-y-2">
                {/* Time and Period Inputs */}
                <div className="flex items-center gap-2">
                    <Input value={minInput} onChange={(e) => { if (/^\d{0,2}$/.test(e.target.value)) setMinInput(e.target.value); }} className="w-12 h-8 text-center" aria-label="Minutos del gol" />
                    <span>:</span>
                    <Input value={secInput} onChange={(e) => { if (/^\d{0,2}$/.test(e.target.value)) setSecInput(e.target.value); }} className="w-12 h-8 text-center" aria-label="Segundos del gol" />
                    <Select value={periodInput} onValueChange={setPeriodInput}>
                        <SelectTrigger className="w-24 h-8 text-center justify-center">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            {periodOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                {/* Scorer Input */}
                <div className="flex items-center gap-1">
                    <Label htmlFor={`scorer-${goal.id}`} className="text-sm text-muted-foreground">Nº:</Label>
                    <Input id={`scorer-${goal.id}`} value={scorerNumberInput} onChange={(e) => { if (/^\d*$/.test(e.target.value)) setScorerNumberInput(e.target.value); }} className="w-16 h-8 text-center" />
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:text-green-600" onClick={handleSave}><CheckCircle className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={handleCancel}><XCircle className="h-5 w-5" /></Button>
            </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-grow min-w-0">
          <div className="flex flex-col text-xs text-muted-foreground w-20 text-center">
            <span>{displayTimestamp.time}</span>
            <span className="opacity-80">{displayTimestamp.date}</span>
          </div>
          <div className="font-semibold text-card-foreground truncate">
            <p>Gol #{goal.scorer?.playerNumber || 'S/N'}</p>
            <p className="text-sm text-muted-foreground font-normal">
              {formatTime(goal.gameTime)} - {goal.periodText}
            </p>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80 h-8 w-8" onClick={() => setIsEditing(true)}>
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function GoalManagementDialog({ isOpen, onOpenChange, team }: GoalManagementDialogProps) {
  const { state } = useGameState();
  const teamName = team === 'home' ? state.homeTeamName : state.awayTeamName;
  
  const displayedGoals = useMemo(() => {
    if (!team) return [];
    return state.goals.filter(g => g.team === team).sort((a, b) => b.timestamp - a.timestamp);
  }, [state.goals, team]);

  if (!team) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-xl h-[90vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Gestión de Goles: {teamName}</DialogTitle>
          <DialogDescription>
            Añade nuevos goles o edita los existentes. Los cambios se guardan automáticamente.
          </DialogDescription>
        </DialogHeader>

        <AddGoalForm team={team} />

        <Separator className="my-4" />
        
        <h3 className="text-lg font-medium text-primary-foreground -mb-2">Goles Registrados ({displayedGoals.length})</h3>
        <ScrollArea className="flex-grow pr-4 -mr-4">
          <div className="py-2 space-y-3">
            {displayedGoals.length > 0 ? displayedGoals.map(goal => (
              <EditableGoalItem key={goal.id} goal={goal} />
            )) : (
              <div className="text-center py-10 text-muted-foreground">
                <Goal className="mx-auto h-12 w-12 mb-4" />
                <p>No se han registrado goles para {teamName}.</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="border-t pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline"><X className="mr-2 h-4 w-4"/>Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
