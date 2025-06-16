
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useGameState } from "@/contexts/game-state-context";
import type { PlayerData } from "@/types";
import { User, Shield, Save, X } from "lucide-react";

interface EditTeamPlayersDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  teamId: string;
  teamName: string;
}

interface EditablePlayer extends PlayerData {
  localNumber: string; // For controlled input
  isModified: boolean;
}

export function EditTeamPlayersDialog({
  isOpen,
  onOpenChange,
  teamId,
  teamName,
}: EditTeamPlayersDialogProps) {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const [editablePlayers, setEditablePlayers] = useState<EditablePlayer[]>([]);

  const teamDetails = useMemo(() => {
    return state.teams.find(t => t.id === teamId);
  }, [state.teams, teamId]);

  useEffect(() => {
    if (isOpen && teamDetails) {
      const sortedPlayers = [...teamDetails.players].sort((a, b) => {
        if (a.type === 'goalkeeper' && b.type !== 'goalkeeper') return -1;
        if (a.type !== 'goalkeeper' && b.type === 'goalkeeper') return 1;
        
        const numAEmpty = !a.number;
        const numBEmpty = !b.number;

        if (numAEmpty && !numBEmpty) return 1;
        if (!numAEmpty && numBEmpty) return -1;
        if (numAEmpty && numBEmpty) return a.name.localeCompare(b.name);

        const numA = parseInt(a.number, 10);
        const numB = parseInt(b.number, 10);

        if (isNaN(numA) && isNaN(numB)) return a.name.localeCompare(b.name);
        if (isNaN(numA)) return 1;
        if (isNaN(numB)) return -1;
        return numA - numB;
      });

      setEditablePlayers(
        sortedPlayers.map(p => ({ ...p, localNumber: p.number, isModified: false }))
      );
    } else if (!isOpen) {
      setEditablePlayers([]);
    }
  }, [isOpen, teamDetails]);

  const handlePlayerNumberChange = (playerId: string, newNumber: string) => {
    if (/^\d*$/.test(newNumber)) {
      setEditablePlayers(prevPlayers =>
        prevPlayers.map(p =>
          p.id === playerId ? { ...p, localNumber: newNumber.trim(), isModified: true } : p
        )
      );
    }
  };

  const handleSave = () => {
    let changesMadeCount = 0;
    let hasError = false;
    
    const finalPlayerNumbersMap = new Map<string, string[]>(); // Maps number to player IDs

    // Populate map with final intended numbers
    editablePlayers.forEach(p => {
      const finalNum = p.isModified ? p.localNumber : p.number;
      if (finalNum) { // Only consider non-empty numbers for duplication
        if (!finalPlayerNumbersMap.has(finalNum)) {
          finalPlayerNumbersMap.set(finalNum, []);
        }
        finalPlayerNumbersMap.get(finalNum)!.push(p.id);
      }
    });

    // Check for duplicates and invalid formats among modified players
    for (const player of editablePlayers) {
      if (player.isModified) {
        const trimmedNumber = player.localNumber; // Already trimmed in handlePlayerNumberChange
        if (trimmedNumber) { // If a number is provided
          if (!/^\d+$/.test(trimmedNumber)) {
            toast({
              title: "Número Inválido",
              description: `El número "${trimmedNumber}" para ${player.name} debe ser numérico.`,
              variant: "destructive",
            });
            hasError = true;
            break;
          }
          if (finalPlayerNumbersMap.get(trimmedNumber) && finalPlayerNumbersMap.get(trimmedNumber)!.length > 1) {
            toast({
              title: "Número Duplicado",
              description: `El número #${trimmedNumber} está asignado a más de un jugador en la lista.`,
              variant: "destructive",
            });
            hasError = true;
            break;
          }
        }
      }
    }

    if (hasError) {
      return;
    }

    editablePlayers.forEach(player => {
      if (player.isModified) {
        const newNumber = player.localNumber; // Already trimmed
        if (newNumber !== player.number) { // Check if it actually changed
          dispatch({
            type: "UPDATE_PLAYER_IN_TEAM",
            payload: {
              teamId: teamId,
              playerId: player.id,
              updates: { number: newNumber },
            },
          });
          changesMadeCount++;
        }
      }
    });

    if (changesMadeCount > 0) {
      toast({
        title: "Jugadores Actualizados",
        description: `Se actualizaron los números de ${changesMadeCount} jugador(es) del equipo "${teamName}".`,
      });
    } else {
      toast({
        title: "Sin Cambios",
        description: "No se detectaron modificaciones en los números de los jugadores.",
        variant: "default",
      });
    }
    onOpenChange(false);
  };

  if (!isOpen || !teamDetails) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Jugadores de {teamName}</DialogTitle>
          <DialogDescription>
            Modifica los números de los jugadores. Deja el campo vacío si el jugador no tiene número ("S/N").
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-3 py-2">
            {editablePlayers.map(player => (
              <div key={player.id} className="flex items-center gap-3 p-2 border rounded-md bg-card shadow-sm">
                {player.type === "goalkeeper" ? (
                  <Shield className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <User className="h-5 w-5 text-primary shrink-0" />
                )}
                <Label htmlFor={`player-num-${player.id}`} className="flex-1 min-w-0">
                  <span className="font-medium truncate" title={player.name}>{player.name}</span>
                  <span className="text-xs text-muted-foreground ml-1">({player.type === "goalkeeper" ? "Arquero" : "Jugador"})</span>
                </Label>
                <div className="flex items-baseline gap-1 w-24">
                   <span className="text-sm text-muted-foreground self-center">#</span>
                   <Input
                    id={`player-num-${player.id}`}
                    type="text"
                    inputMode="numeric"
                    value={player.localNumber}
                    onChange={(e) => handlePlayerNumberChange(player.id, e.target.value)}
                    placeholder="S/N"
                    className="h-8 px-1 py-0 text-sm"
                    maxLength={3} // Max 3 digits for player number
                  />
                </div>
              </div>
            ))}
            {editablePlayers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Este equipo no tiene jugadores.</p>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={editablePlayers.length === 0}>
            <Save className="mr-2 h-4 w-4" /> Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
