
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

export const PenaltySettingsCard = forwardRef<PenaltySettingsCardRef>((props, ref) => {
  const { state, dispatch } = useGameState();
  
  const [localMaxPenaltiesInput, setLocalMaxPenaltiesInput] = useState(String(state.maxConcurrentPenalties));
  const [localPlayersPerTeamInput, setLocalPlayersPerTeamInput] = useState(String(state.playersPerTeamOnIce));
  // No isDirty local state needed here, getIsDirty will compare directly

  useEffect(() => {
    // This effect only runs if the card itself isn't considered "dirty" by the parent page's logic,
    // or if the direct comparison in getIsDirty returns false.
    // It ensures that if global state changes (e.g., from file import or reset),
    // the local inputs reflect that, UNLESS the user has uncommitted changes.
    if (!getIsDirtyInternal()) {
        setLocalMaxPenaltiesInput(String(state.maxConcurrentPenalties));
        setLocalPlayersPerTeamInput(String(state.playersPerTeamOnIce));
    }
  }, [state.maxConcurrentPenalties, state.playersPerTeamOnIce]);


  const markDirty = () => {
    // This function is essentially a no-op now as dirtiness is determined by direct comparison.
    // Kept for potential future use or if a child component needed to signal dirtiness.
  };

  const getIsDirtyInternal = () => {
    return (
      localMaxPenaltiesInput !== String(state.maxConcurrentPenalties) ||
      localPlayersPerTeamInput !== String(state.playersPerTeamOnIce)
    );
  };

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      if (!getIsDirtyInternal()) return true;

      const maxPenNum = parseInt(localMaxPenaltiesInput, 10);
      const finalMaxPenalties = (isNaN(maxPenNum) || maxPenNum < 1) ? 1 : maxPenNum;
      dispatch({ type: "SET_MAX_CONCURRENT_PENALTIES", payload: finalMaxPenalties });

      const playersNum = parseInt(localPlayersPerTeamInput, 10);
      const finalPlayersPerTeam = (isNaN(playersNum) || playersNum < 1) ? 1 : playersNum;
      dispatch({ type: "SET_PLAYERS_PER_TEAM_ON_ICE", payload: finalPlayersPerTeam });
      
      // After saving, local inputs should match global state, so getIsDirty will return false
      return true;
    },
    handleDiscard: () => {
      setLocalMaxPenaltiesInput(String(state.maxConcurrentPenalties));
      setLocalPlayersPerTeamInput(String(state.playersPerTeamOnIce));
    },
    getIsDirty: getIsDirtyInternal,
  }));

  return (
    <ControlCardWrapper title="Formato de Juego y Penalidades">
      <div className="space-y-6">
        <div>
          <div className="grid grid-cols-[auto_minmax(0,theme(spacing.24))] items-center gap-x-3 sm:gap-x-4">
            <Label htmlFor="playersPerTeam">Jugadores en Cancha</Label>
            <Input
              id="playersPerTeam"
              type="number"
              value={localPlayersPerTeamInput}
              onChange={(e) => { setLocalPlayersPerTeamInput(e.target.value); markDirty(); }}
              className="text-sm" // Width controlled by grid
              placeholder="ej. 5"
              min="1"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Número de jugadores de campo por equipo (excluyendo al arquero).
          </p>
        </div>
        
        <div>
          <div className="grid grid-cols-[auto_minmax(0,theme(spacing.24))] items-center gap-x-3 sm:gap-x-4">
            <Label htmlFor="maxConcurrentPenalties">Máximo Penalidades Concurrentes</Label>
            <Input
              id="maxConcurrentPenalties"
              type="number"
              value={localMaxPenaltiesInput}
              onChange={(e) => { setLocalMaxPenaltiesInput(e.target.value); markDirty(); }}
              className="text-sm" // Width controlled by grid
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
