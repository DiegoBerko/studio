
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useGameState, secondsToMinutes, minutesToSeconds } from "@/contexts/game-state-context";
import { ControlCardWrapper } from "@/components/controls/control-card-wrapper";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export interface DurationSettingsCardRef {
  handleSave: () => boolean; // Returns true if save was successful (or no changes)
  handleDiscard: () => void;
  getIsDirty: () => boolean;
}

interface DurationSettingsCardProps {
  onDirtyChange: (isDirty: boolean) => void;
}

export const DurationSettingsCard = forwardRef<DurationSettingsCardRef, DurationSettingsCardProps>(({ onDirtyChange }, ref) => {
  const { state, dispatch } = useGameState();

  // Local state for inputs
  const [localPeriodDurationInput, setLocalPeriodDurationInput] = useState(secondsToMinutes(state.defaultPeriodDuration));
  const [localBreakDurationInput, setLocalBreakDurationInput] = useState(String(state.defaultBreakDuration));
  const [localPreOTBreakDurationInput, setLocalPreOTBreakDurationInput] = useState(String(state.defaultPreOTBreakDuration));
  const [localTimeoutDurationInput, setLocalTimeoutDurationInput] = useState(String(state.defaultTimeoutDuration));
  
  const [localAutoStartBreaks, setLocalAutoStartBreaks] = useState(state.autoStartBreaks);
  const [localAutoStartPreOTBreaks, setLocalAutoStartPreOTBreaks] = useState(state.autoStartPreOTBreaks);
  const [localAutoStartTimeouts, setLocalAutoStartTimeouts] = useState(state.autoStartTimeouts);

  const [isDirty, setIsDirty] = useState(false);

  // Effect to update local state if global state changes and form isn't dirty
  useEffect(() => {
    if (!isDirty) {
      setLocalPeriodDurationInput(secondsToMinutes(state.defaultPeriodDuration));
      setLocalBreakDurationInput(String(state.defaultBreakDuration));
      setLocalPreOTBreakDurationInput(String(state.defaultPreOTBreakDuration));
      setLocalTimeoutDurationInput(String(state.defaultTimeoutDuration));
      setLocalAutoStartBreaks(state.autoStartBreaks);
      setLocalAutoStartPreOTBreaks(state.autoStartPreOTBreaks);
      setLocalAutoStartTimeouts(state.autoStartTimeouts);
    }
  }, [
    state.defaultPeriodDuration, 
    state.defaultBreakDuration, 
    state.defaultPreOTBreakDuration, 
    state.defaultTimeoutDuration,
    state.autoStartBreaks,
    state.autoStartPreOTBreaks,
    state.autoStartTimeouts,
    isDirty // Re-evaluate if isDirty changes (e.g., after save/discard)
  ]);

  // Effect to report dirty status to parent
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);
  
  // Helper to mark dirty
  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      if (!isDirty) return true;

      const periodDurationNum = parseInt(localPeriodDurationInput, 10);
      const finalPeriodDurationSeconds = (isNaN(periodDurationNum) || periodDurationNum < 1) ? 60 : periodDurationNum * 60;
      dispatch({ type: "SET_DEFAULT_PERIOD_DURATION", payload: finalPeriodDurationSeconds });

      const breakDurationNum = parseInt(localBreakDurationInput, 10);
      const finalBreakDurationSeconds = (isNaN(breakDurationNum) || breakDurationNum < 1) ? 1 : breakDurationNum;
      dispatch({ type: "SET_DEFAULT_BREAK_DURATION", payload: finalBreakDurationSeconds });

      const preOTBreakDurationNum = parseInt(localPreOTBreakDurationInput, 10);
      const finalPreOTBreakDurationSeconds = (isNaN(preOTBreakDurationNum) || preOTBreakDurationNum < 1) ? 1 : preOTBreakDurationNum;
      dispatch({ type: "SET_DEFAULT_PRE_OT_BREAK_DURATION", payload: finalPreOTBreakDurationSeconds });
      
      const timeoutDurationNum = parseInt(localTimeoutDurationInput, 10);
      const finalTimeoutDurationSeconds = (isNaN(timeoutDurationNum) || timeoutDurationNum < 1) ? 1 : timeoutDurationNum;
      dispatch({ type: "SET_DEFAULT_TIMEOUT_DURATION", payload: finalTimeoutDurationSeconds });

      if (localAutoStartBreaks !== state.autoStartBreaks) {
        dispatch({ type: "SET_AUTO_START_BREAKS_VALUE", payload: localAutoStartBreaks });
      }
      if (localAutoStartPreOTBreaks !== state.autoStartPreOTBreaks) {
        dispatch({ type: "SET_AUTO_START_PRE_OT_BREAKS_VALUE", payload: localAutoStartPreOTBreaks });
      }
      if (localAutoStartTimeouts !== state.autoStartTimeouts) {
        dispatch({ type: "SET_AUTO_START_TIMEOUTS_VALUE", payload: localAutoStartTimeouts });
      }
      
      setIsDirty(false);
      return true;
    },
    handleDiscard: () => {
      setLocalPeriodDurationInput(secondsToMinutes(state.defaultPeriodDuration));
      setLocalBreakDurationInput(String(state.defaultBreakDuration));
      setLocalPreOTBreakDurationInput(String(state.defaultPreOTBreakDuration));
      setLocalTimeoutDurationInput(String(state.defaultTimeoutDuration));
      setLocalAutoStartBreaks(state.autoStartBreaks);
      setLocalAutoStartPreOTBreaks(state.autoStartPreOTBreaks);
      setLocalAutoStartTimeouts(state.autoStartTimeouts);
      setIsDirty(false);
    },
    getIsDirty: () => isDirty,
  }));

  return (
    <ControlCardWrapper title="Configuración de Tiempos y Arranque Automático">
      <div className="space-y-6">
        <div>
          <Label htmlFor="periodDuration">Duración del Período (minutos)</Label>
          <Input
            id="periodDuration"
            type="number"
            value={localPeriodDurationInput}
            onChange={(e) => { setLocalPeriodDurationInput(e.target.value); markDirty(); }}
            className="mt-1"
            placeholder="ej. 20"
          />
        </div>

        <div className="space-y-3 p-4 border rounded-md bg-muted/20">
          <div>
            <Label htmlFor="breakDuration">Duración Descanso Regular (segundos)</Label>
            <Input
              id="breakDuration"
              type="number"
              value={localBreakDurationInput}
              onChange={(e) => { setLocalBreakDurationInput(e.target.value); markDirty(); }}
              className="mt-1"
              placeholder="ej. 120"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="autoStartBreaks" className="flex flex-col space-y-1">
              <span>Iniciar Automáticamente Descansos Regulares</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                Si está activo, el reloj comenzará automáticamente al iniciar un descanso regular.
              </span>
            </Label>
            <Switch
              id="autoStartBreaks"
              checked={localAutoStartBreaks}
              onCheckedChange={(checked) => { setLocalAutoStartBreaks(checked); markDirty(); }}
            />
          </div>
        </div>

        <div className="space-y-3 p-4 border rounded-md bg-muted/20">
          <div>
            <Label htmlFor="preOTBreakDuration">Duración Descanso Pre-OT / Entre OTs (segundos)</Label>
            <Input
              id="preOTBreakDuration"
              type="number"
              value={localPreOTBreakDurationInput}
              onChange={(e) => { setLocalPreOTBreakDurationInput(e.target.value); markDirty(); }}
              className="mt-1"
              placeholder="ej. 60"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="autoStartPreOTBreaks" className="flex flex-col space-y-1">
              <span>Iniciar Automáticamente Descansos Pre-OT</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                Si está activo, el reloj comenzará automáticamente al iniciar un descanso Pre-OT.
              </span>
            </Label>
            <Switch
              id="autoStartPreOTBreaks"
              checked={localAutoStartPreOTBreaks}
              onCheckedChange={(checked) => { setLocalAutoStartPreOTBreaks(checked); markDirty(); }}
            />
          </div>
        </div>
        
        <div className="space-y-3 p-4 border rounded-md bg-muted/20">
          <div>
            <Label htmlFor="timeoutDuration">Duración del Time Out (segundos)</Label>
            <Input
              id="timeoutDuration"
              type="number"
              value={localTimeoutDurationInput}
              onChange={(e) => { setLocalTimeoutDurationInput(e.target.value); markDirty(); }}
              className="mt-1"
              placeholder="ej. 30"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="autoStartTimeouts" className="flex flex-col space-y-1">
              <span>Iniciar Automáticamente Time Outs</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                Si está activo, el reloj comenzará automáticamente al iniciar un Time Out.
              </span>
            </Label>
            <Switch
              id="autoStartTimeouts"
              checked={localAutoStartTimeouts}
              onCheckedChange={(checked) => { setLocalAutoStartTimeouts(checked); markDirty(); }}
            />
          </div>
        </div>
      </div>
    </ControlCardWrapper>
  );
});

DurationSettingsCard.displayName = "DurationSettingsCard";

    