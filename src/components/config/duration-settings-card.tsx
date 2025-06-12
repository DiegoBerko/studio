
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useGameState, secondsToMinutes, minutesToSeconds } from "@/contexts/game-state-context";
import { ControlCardWrapper } from "@/components/controls/control-card-wrapper";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export interface DurationSettingsCardRef {
  handleSave: () => boolean; 
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

  const [localNumRegularPeriodsInput, setLocalNumRegularPeriodsInput] = useState(String(state.numberOfRegularPeriods));
  const [localNumOTPeriodsInput, setLocalNumOTPeriodsInput] = useState(String(state.numberOfOvertimePeriods));

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
      setLocalNumRegularPeriodsInput(String(state.numberOfRegularPeriods));
      setLocalNumOTPeriodsInput(String(state.numberOfOvertimePeriods));
    }
  }, [
    state.defaultPeriodDuration, 
    state.defaultBreakDuration, 
    state.defaultPreOTBreakDuration, 
    state.defaultTimeoutDuration,
    state.autoStartBreaks,
    state.autoStartPreOTBreaks,
    state.autoStartTimeouts,
    state.numberOfRegularPeriods,
    state.numberOfOvertimePeriods,
    isDirty 
  ]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);
  
  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      if (!isDirty) return true;

      const periodDurationNum = parseInt(localPeriodDurationInput, 10);
      const finalPeriodDurationSeconds = (isNaN(periodDurationNum) || periodDurationNum < 1) ? 60 : periodDurationNum * 60; // Default 1 min (60s)
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

      const numRegularPeriods = parseInt(localNumRegularPeriodsInput, 10);
      const finalNumRegularPeriods = (isNaN(numRegularPeriods) || numRegularPeriods < 1) ? 3 : numRegularPeriods;
      dispatch({ type: "SET_NUMBER_OF_REGULAR_PERIODS", payload: finalNumRegularPeriods });

      const numOTPeriods = parseInt(localNumOTPeriodsInput, 10);
      const finalNumOTPeriods = (isNaN(numOTPeriods) || numOTPeriods < 0) ? 1 : numOTPeriods; // Default 1 OT, can be 0
      dispatch({ type: "SET_NUMBER_OF_OVERTIME_PERIODS", payload: finalNumOTPeriods });


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
      setLocalNumRegularPeriodsInput(String(state.numberOfRegularPeriods));
      setLocalNumOTPeriodsInput(String(state.numberOfOvertimePeriods));
      setIsDirty(false);
    },
    getIsDirty: () => isDirty,
  }));

  return (
    <ControlCardWrapper title="Configuración de Tiempos, Períodos y Arranque Automático">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="numRegularPeriods">Número de Períodos Regulares</Label>
                <Input
                id="numRegularPeriods"
                type="number"
                value={localNumRegularPeriodsInput}
                onChange={(e) => { setLocalNumRegularPeriodsInput(e.target.value); markDirty(); }}
                className="mt-1"
                placeholder="ej. 3"
                min="1"
                />
            </div>
            <div>
                <Label htmlFor="numOTPeriods">Número de Períodos de Overtime</Label>
                <Input
                id="numOTPeriods"
                type="number"
                value={localNumOTPeriodsInput}
                onChange={(e) => { setLocalNumOTPeriodsInput(e.target.value); markDirty(); }}
                className="mt-1"
                placeholder="ej. 1 (0 para ninguno)"
                min="0"
                />
            </div>
        </div>

        <div>
          <Label htmlFor="periodDuration">Duración del Período (minutos)</Label>
          <Input
            id="periodDuration"
            type="number"
            value={localPeriodDurationInput}
            onChange={(e) => { setLocalPeriodDurationInput(e.target.value); markDirty(); }}
            className="mt-1"
            placeholder="ej. 20"
            min="1"
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
              min="1"
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
              min="1"
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
              min="1"
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

    
