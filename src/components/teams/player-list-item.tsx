
"use client";

import React, { useState, useEffect, useRef } from "react";
import type { PlayerData } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Shield, Trash2, CheckCircle, XCircle, Edit3 } from "lucide-react";
import { useGameState } from "@/contexts/game-state-context";
import { useToast } from "@/hooks/use-toast";

interface PlayerListItemProps {
  player: PlayerData;
  teamId: string;
  onRemovePlayer: (playerId: string) => void;
}

export function PlayerListItem({ player, teamId, onRemovePlayer }: PlayerListItemProps) {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editableNumber, setEditableNumber] = useState(player.number);
  const [editableName, setEditableName] = useState(player.name);

  const numberInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditableNumber(player.number);
      setEditableName(player.name);
    } else {
      // Focus the number input when editing starts
      numberInputRef.current?.focus();
      numberInputRef.current?.select();
    }
  }, [isEditing, player.number, player.name]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditableNumber(player.number);
    setEditableName(player.name);
    setIsEditing(false);
  };

  const handleSave = () => {
    const trimmedNumber = editableNumber.trim();
    const trimmedName = editableName.trim();
    let changesMade = false;
    const updates: Partial<Pick<PlayerData, 'name' | 'number'>> = {};

    // Validate Number
    if (!trimmedNumber) {
      toast({ title: "Número Requerido", description: "El número no puede estar vacío.", variant: "destructive" });
      // Do not setEditableNumber(player.number) here, allow user to correct
      return; 
    }
    if (!/^\d+$/.test(trimmedNumber)) {
      toast({ title: "Número Inválido", description: "El número solo debe contener dígitos.", variant: "destructive" });
      return;
    }
    const currentTeam = state.teams.find(t => t.id === teamId);
    if (currentTeam && currentTeam.players.some(p => p.id !== player.id && p.number === trimmedNumber)) {
      toast({ title: "Número Duplicado", description: `El número #${trimmedNumber} ya existe en este equipo.`, variant: "destructive" });
      return;
    }
    if (trimmedNumber !== player.number) {
      updates.number = trimmedNumber;
      changesMade = true;
    }

    // Validate Name
    if (!trimmedName) {
      toast({ title: "Nombre Requerido", description: "El nombre no puede estar vacío.", variant: "destructive" });
      return;
    }
    if (trimmedName !== player.name) {
      updates.name = trimmedName;
      changesMade = true;
    }

    if (changesMade) {
      dispatch({ type: "UPDATE_PLAYER_IN_TEAM", payload: { teamId, playerId: player.id, updates } });
      toast({ title: "Jugador Actualizado", description: `Datos del jugador #${updates.number || player.number} actualizados.` });
    }
    setIsEditing(false);
  };

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-grow min-w-0">
          {player.type === "goalkeeper" ? (
            <Shield className="h-6 w-6 text-primary shrink-0" />
          ) : (
            <User className="h-6 w-6 text-primary shrink-0" />
          )}
          <div className="flex-grow min-w-0">
            {isEditing ? (
              <div className="flex flex-col sm:flex-row gap-2 items-baseline">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-muted-foreground self-center">#</span>
                  <Input
                    ref={numberInputRef}
                    type="text"
                    inputMode="numeric"
                    value={editableNumber}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value)) {
                         setEditableNumber(e.target.value)
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } if (e.key === 'Escape') handleCancel();}}
                    className="h-7 px-1 py-0 w-16 text-sm"
                  />
                </div>
                <Input
                  type="text"
                  value={editableName}
                  onChange={(e) => setEditableName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave();} if (e.key === 'Escape') handleCancel();}}
                  className="h-7 px-1 py-0 flex-1 text-sm min-w-[100px]"
                  placeholder="Nombre/Apodo"
                />
              </div>
            ) : (
              <p className="font-semibold text-card-foreground truncate">
                #{player.number} - {player.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground capitalize">
              {player.type === "goalkeeper" ? "Arquero" : "Jugador"}
            </p>
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          {isEditing ? (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:text-green-600" onClick={handleSave} aria-label="Guardar cambios">
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleCancel} aria-label="Cancelar edición">
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80 h-8 w-8" onClick={handleEdit} aria-label={`Editar jugador ${player.name}`}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive h-8 w-8"
                onClick={() => onRemovePlayer(player.id)}
                aria-label={`Eliminar jugador ${player.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

    