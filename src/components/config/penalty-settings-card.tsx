
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useGameState } from "@/contexts/game-state-context";
import { ControlCardWrapper } from "@/components/controls/control-card-wrapper";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface PenaltySettingsCardRef {
  handleSave: () => boolean;
  handleDiscard: () => void;
  getIsDirty: () => boolean;
}

interface PenaltySettingsCardProps {
  onDirtyChange: (isDirty: boolean) => void;
}

export const PenaltySettingsCard = forwardRef<PenaltySettingsCardRef, PenaltySettingsCardProps>(({ onDirtyChange }, ref) => {
  const { state, dispatch } = useGameState();
  
  const [localMaxPenaltiesInput, setLocalMaxPenaltiesInput] = useState(String(state.maxConcurrentPenalties));
  const [localPlayersPerTeamInput, setLocalPlayersPerTeamInput] = useState(String(state.playersPerTeamOnIce));
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setLocalMaxPenaltiesInput(String(state.maxConcurrentPenalties));
      setLocalPlayersPerTeamInput(String(state.playersPerTeamOnIce));
    }
  }, [state.maxConcurrentPenalties, state.playersPerTeamOnIce, isDirty]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      if (!isDirty) return true;

      const maxPenNum = parseInt(localMaxPenaltiesInput, 10);
      const finalMaxPenalties = (isNaN(maxPenNum) || maxPenNum < 1) ? 1 : maxPenNum;
      dispatch({ type: "SET_MAX_CONCURRENT_PENALTIES", payload: finalMaxPenalties });

      const playersNum = parseInt(localPlayersPerTeamInput, 10);
      const finalPlayersPerTeam = (isNaN(playersNum) || playersNum < 1) ? 1 : playersNum;
      dispatch({ type: "SET_PLAYERS_PER_TEAM_ON_ICE", payload: finalPlayersPerTeam });
      
      setIsDirty(false);
      return true;
    },
    handleDiscard: () => {
      setLocalMaxPenaltiesInput(String(state.maxConcurrentPenalties));
      setLocalPlayersPerTeamInput(String(state.playersPerTeamOnIce));
      setIsDirty(false);
    },
    getIsDirty: () => isDirty,
  }));

  return (
    <ControlCardWrapper title="Formato de Juego y Penalidades">
      <div className="space-y-6">
        <div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 sm:gap-x-4">
            <Label htmlFor="playersPerTeam">Jugadores en Cancha</Label>
            <Input
              id="playersPerTeam"
              type="number"
              value={localPlayersPerTeamInput}
              onChange={(e) => { setLocalPlayersPerTeamInput(e.target.value); markDirty(); }}
              className="w-24 text-sm"
              placeholder="ej. 5"
              min="1"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Número de jugadores de campo por equipo (excluyendo al arquero).
          </p>
        </div>
        
        <div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 sm:gap-x-4">
            <Label htmlFor="maxConcurrentPenalties">Máximo Penalidades Concurrentes por Equipo</Label>
            <Input
              id="maxConcurrentPenalties"
              type="number"
              value={localMaxPenaltiesInput}
              onChange={(e) => { setLocalMaxPenaltiesInput(e.target.value); markDirty(); }}
              className="w-24 text-sm"
              placeholder="ej. 2"
              min="1"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Define cuántas penalidades pueden correr su tiempo simultáneamente para un mismo equipo. (Ligado a cuántos jugadores menos en cancha puede tener un equipo)
          </p>
        </div>
      </div>
    </ControlCardWrapper>
  );
});

PenaltySettingsCard.displayName = "PenaltySettingsCard";
    
