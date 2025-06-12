
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
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setLocalMaxPenaltiesInput(String(state.maxConcurrentPenalties));
    }
  }, [state.maxConcurrentPenalties, isDirty]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      if (!isDirty) return true;

      const num = parseInt(localMaxPenaltiesInput, 10);
      const finalMaxPenalties = (isNaN(num) || num < 1) ? 1 : num;
      
      dispatch({ type: "SET_MAX_CONCURRENT_PENALTIES", payload: finalMaxPenalties });
      setIsDirty(false);
      return true;
    },
    handleDiscard: () => {
      setLocalMaxPenaltiesInput(String(state.maxConcurrentPenalties));
      setIsDirty(false);
    },
    getIsDirty: () => isDirty,
  }));

  return (
    <ControlCardWrapper title="Configuración de Penalidades">
      <div className="space-y-4">
        <div>
          <Label htmlFor="maxConcurrentPenalties">Máximo Penalidades Concurrentes por Equipo</Label>
          <Input
            id="maxConcurrentPenalties"
            type="number"
            value={localMaxPenaltiesInput}
            onChange={(e) => { setLocalMaxPenaltiesInput(e.target.value); markDirty(); }}
            className="mt-1"
            placeholder="ej. 2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Define cuántas penalidades pueden correr su tiempo simultáneamente para un mismo equipo.
          </p>
        </div>
      </div>
    </ControlCardWrapper>
  );
});

PenaltySettingsCard.displayName = "PenaltySettingsCard";

    