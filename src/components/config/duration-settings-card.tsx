
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { 
  useGameState, 
  centisecondsToDisplayMinutes, 
  centisecondsToDisplaySeconds
} from "@/contexts/game-state-context";
import { ControlCardWrapper } from "@/components/controls/control-card-wrapper";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface DurationSettingsCardRef {
  handleSave: () => boolean; 
  handleDiscard: () => void;
  getIsDirty: () => boolean;
}

interface DurationSettingsCardProps {
  onDirtyChange: (isDirty: boolean) => void;
}

const narrowInputStyle = "w-20 mt-0"; 

export const DurationSettingsCard = forwardRef<DurationSettingsCardRef, DurationSettingsCardProps>(({ onDirtyChange }, ref) => {
  const { state, dispatch } = useGameState();

  const [localWarmUpDurationInput, setLocalWarmUpDurationInput] = useState(centisecondsToDisplayMinutes(state.defaultWarmUpDuration));
  const [localPeriodDurationInput, setLocalPeriodDurationInput] = useState(centisecondsToDisplayMinutes(state.defaultPeriodDuration));
  const [localOTPeriodDurationInput, setLocalOTPeriodDurationInput] = useState(centisecondsToDisplayMinutes(state.defaultOTPeriodDuration));
  const [localBreakDurationInput, setLocalBreakDurationInput] = useState(centisecondsToDisplaySeconds(state.defaultBreakDuration));
  const [localPreOTBreakDurationInput, setLocalPreOTBreakDurationInput] = useState(centisecondsToDisplaySeconds(state.defaultPreOTBreakDuration));
  const [localTimeoutDurationInput, setLocalTimeoutDurationInput] = useState(centisecondsToDisplaySeconds(state.defaultTimeoutDuration));
  
  const [localAutoStartWarmUp, setLocalAutoStartWarmUp] = useState(state.autoStartWarmUp);
  const [localAutoStartBreaks, setLocalAutoStartBreaks] = useState(state.autoStartBreaks);
  const [localAutoStartPreOTBreaks, setLocalAutoStartPreOTBreaks] = useState(state.autoStartPreOTBreaks);
  const [localAutoStartTimeouts, setLocalAutoStartTimeouts] = useState(state.autoStartTimeouts);

  const [localNumRegularPeriodsInput, setLocalNumRegularPeriodsInput] = useState(String(state.numberOfRegularPeriods));
  const [localNumOTPeriodsInput, setLocalNumOTPeriodsInput] = useState(String(state.numberOfOvertimePeriods));

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setLocalWarmUpDurationInput(centisecondsToDisplayMinutes(state.defaultWarmUpDuration));
      setLocalPeriodDurationInput(centisecondsToDisplayMinutes(state.defaultPeriodDuration));
      setLocalOTPeriodDurationInput(centisecondsToDisplayMinutes(state.defaultOTPeriodDuration));
      setLocalBreakDurationInput(centisecondsToDisplaySeconds(state.defaultBreakDuration));
      setLocalPreOTBreakDurationInput(centisecondsToDisplaySeconds(state.defaultPreOTBreakDuration));
      setLocalTimeoutDurationInput(centisecondsToDisplaySeconds(state.defaultTimeoutDuration));
      setLocalAutoStartWarmUp(state.autoStartWarmUp);
      setLocalAutoStartBreaks(state.autoStartBreaks);
      setLocalAutoStartPreOTBreaks(state.autoStartPreOTBreaks);
      setLocalAutoStartTimeouts(state.autoStartTimeouts);
      setLocalNumRegularPeriodsInput(String(state.numberOfRegularPeriods));
      setLocalNumOTPeriodsInput(String(state.numberOfOvertimePeriods));
    }
  }, [
    state.defaultWarmUpDuration,
    state.defaultPeriodDuration, 
    state.defaultOTPeriodDuration,
    state.defaultBreakDuration, 
    state.defaultPreOTBreakDuration, 
    state.defaultTimeoutDuration,
    state.autoStartWarmUp,
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

      const warmUpDurationMin = parseInt(localWarmUpDurationInput, 10);
      const finalWarmUpDurationCs = (isNaN(warmUpDurationMin) || warmUpDurationMin < 1) ? (60 * 100) : warmUpDurationMin * 60 * 100;
      dispatch({ type: "SET_DEFAULT_WARM_UP_DURATION", payload: finalWarmUpDurationCs });

      const periodDurationMin = parseInt(localPeriodDurationInput, 10);
      const finalPeriodDurationCs = (isNaN(periodDurationMin) || periodDurationMin < 1) ? (60 * 100) : periodDurationMin * 60 * 100;
      dispatch({ type: "SET_DEFAULT_PERIOD_DURATION", payload: finalPeriodDurationCs });

      const otPeriodDurationMin = parseInt(localOTPeriodDurationInput, 10);
      const finalOTPeriodDurationCs = (isNaN(otPeriodDurationMin) || otPeriodDurationMin < 1) ? (60 * 100) : otPeriodDurationMin * 60 * 100;
      dispatch({ type: "SET_DEFAULT_OT_PERIOD_DURATION", payload: finalOTPeriodDurationCs });

      const breakDurationSec = parseInt(localBreakDurationInput, 10);
      const finalBreakDurationCs = (isNaN(breakDurationSec) || breakDurationSec < 1) ? (1 * 100) : breakDurationSec * 100;
      dispatch({ type: "SET_DEFAULT_BREAK_DURATION", payload: finalBreakDurationCs });

      const preOTBreakDurationSec = parseInt(localPreOTBreakDurationInput, 10);
      const finalPreOTBreakDurationCs = (isNaN(preOTBreakDurationSec) || preOTBreakDurationSec < 1) ? (1 * 100) : preOTBreakDurationSec * 100;
      dispatch({ type: "SET_DEFAULT_PRE_OT_BREAK_DURATION", payload: finalPreOTBreakDurationCs });
      
      const timeoutDurationSec = parseInt(localTimeoutDurationInput, 10);
      const finalTimeoutDurationCs = (isNaN(timeoutDurationSec) || timeoutDurationSec < 1) ? (1 * 100) : timeoutDurationSec * 100;
      dispatch({ type: "SET_DEFAULT_TIMEOUT_DURATION", payload: finalTimeoutDurationCs });

      const numRegularPeriods = parseInt(localNumRegularPeriodsInput, 10);
      const finalNumRegularPeriods = (isNaN(numRegularPeriods) || numRegularPeriods < 1) ? 3 : numRegularPeriods;
      dispatch({ type: "SET_NUMBER_OF_REGULAR_PERIODS", payload: finalNumRegularPeriods });

      const numOTPeriods = parseInt(localNumOTPeriodsInput, 10);
      const finalNumOTPeriods = (isNaN(numOTPeriods) || numOTPeriods < 0) ? 1 : numOTPeriods;
      dispatch({ type: "SET_NUMBER_OF_OVERTIME_PERIODS", payload: finalNumOTPeriods });

      if (localAutoStartWarmUp !== state.autoStartWarmUp) {
        dispatch({ type: "SET_AUTO_START_WARM_UP_VALUE", payload: localAutoStartWarmUp });
      }
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
      setLocalWarmUpDurationInput(centisecondsToDisplayMinutes(state.defaultWarmUpDuration));
      setLocalPeriodDurationInput(centisecondsToDisplayMinutes(state.defaultPeriodDuration));
      setLocalOTPeriodDurationInput(centisecondsToDisplayMinutes(state.defaultOTPeriodDuration));
      setLocalBreakDurationInput(centisecondsToDisplaySeconds(state.defaultBreakDuration));
      setLocalPreOTBreakDurationInput(centisecondsToDisplaySeconds(state.defaultPreOTBreakDuration));
      setLocalTimeoutDurationInput(centisecondsToDisplaySeconds(state.defaultTimeoutDuration));
      setLocalAutoStartWarmUp(state.autoStartWarmUp);
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
        {/* Regular Periods */}
        <div className="grid grid-cols-[auto_80px_1fr_80px] items-center gap-x-3 sm:gap-x-4">
            <Label htmlFor="numRegularPeriods" className="text-sm whitespace-nowrap justify-self-end">Períodos Regulares (Cant)</Label>
            <Input
            id="numRegularPeriods"
            type="number"
            value={localNumRegularPeriodsInput}
            onChange={(e) => { setLocalNumRegularPeriodsInput(e.target.value); markDirty(); }}
            className={narrowInputStyle}
            placeholder="ej. 3"
            min="1"
            />
            <Label htmlFor="periodDuration" className="font-normal text-sm justify-self-end whitespace-nowrap">Duración (Min)</Label>
            <Input
            id="periodDuration"
            type="number"
            value={localPeriodDurationInput}
            onChange={(e) => { setLocalPeriodDurationInput(e.target.value); markDirty(); }}
            className={narrowInputStyle}
            placeholder="ej. 20"
            min="1"
            />
        </div>

        {/* Overtime Periods */}
        <div className="grid grid-cols-[auto_80px_1fr_80px] items-center gap-x-3 sm:gap-x-4">
            <Label htmlFor="numOTPeriods" className="text-sm whitespace-nowrap justify-self-end">Períodos Overtime (Cant)</Label>
            <Input
            id="numOTPeriods"
            type="number"
            value={localNumOTPeriodsInput}
            onChange={(e) => { setLocalNumOTPeriodsInput(e.target.value); markDirty(); }}
            className={narrowInputStyle}
            placeholder="ej. 1"
            min="0"
            />
            <Label htmlFor="otPeriodDuration" className="font-normal text-sm justify-self-end whitespace-nowrap">Duración (Min)</Label>
            <Input
            id="otPeriodDuration"
            type="number"
            value={localOTPeriodDurationInput}
            onChange={(e) => { setLocalOTPeriodDurationInput(e.target.value); markDirty(); }}
            className={narrowInputStyle}
            placeholder="ej. 5"
            min="1"
            />
        </div>
        
        {/* Timeouts */}
        <div className="grid grid-cols-[auto_80px_1fr_auto] items-center gap-x-3 sm:gap-x-4">
          <Label htmlFor="timeoutDurationConfig" className="text-sm whitespace-nowrap justify-self-end">Timeout (seg)</Label>
          <Input
            id="timeoutDurationConfig"
            type="number"
            value={localTimeoutDurationInput}
            onChange={(e) => { setLocalTimeoutDurationInput(e.target.value); markDirty(); }}
            className={narrowInputStyle}
            placeholder="ej. 30"
            min="1"
          />
          <Label htmlFor="autoStartTimeoutsConfig" className="font-normal text-sm justify-self-end whitespace-nowrap">Iniciar Autom.</Label>
          <Switch
            id="autoStartTimeoutsConfig"
            checked={localAutoStartTimeouts}
            onCheckedChange={(checked) => { setLocalAutoStartTimeouts(checked); markDirty(); }}
          />
        </div>

        {/* Regular Breaks */}
         <div className="grid grid-cols-[auto_80px_1fr_auto] items-center gap-x-3 sm:gap-x-4">
          <Label htmlFor="breakDurationConfig" className="text-sm whitespace-nowrap justify-self-end">Descanso Reg. (seg)</Label>
          <Input
            id="breakDurationConfig"
            type="number"
            value={localBreakDurationInput}
            onChange={(e) => { setLocalBreakDurationInput(e.target.value); markDirty(); }}
            className={narrowInputStyle}
            placeholder="ej. 120"
            min="1"
          />
          <Label htmlFor="autoStartBreaksConfig" className="font-normal text-sm justify-self-end whitespace-nowrap">Iniciar Autom.</Label>
          <Switch
            id="autoStartBreaksConfig"
            checked={localAutoStartBreaks}
            onCheckedChange={(checked) => { setLocalAutoStartBreaks(checked); markDirty(); }}
          />
        </div>

        {/* Pre-OT Breaks */}
        <div className="grid grid-cols-[auto_80px_1fr_auto] items-center gap-x-3 sm:gap-x-4">
          <Label htmlFor="preOTBreakDurationConfig" className="text-sm whitespace-nowrap justify-self-end">Descanso Pre-OT (seg)</Label>
          <Input
            id="preOTBreakDurationConfig"
            type="number"
            value={localPreOTBreakDurationInput}
            onChange={(e) => { setLocalPreOTBreakDurationInput(e.target.value); markDirty(); }}
            className={narrowInputStyle}
            placeholder="ej. 60"
            min="1"
          />
          <Label htmlFor="autoStartPreOTBreaksConfig" className="font-normal text-sm justify-self-end whitespace-nowrap">Iniciar Autom.</Label>
          <Switch
            id="autoStartPreOTBreaksConfig"
            checked={localAutoStartPreOTBreaks}
            onCheckedChange={(checked) => { setLocalAutoStartPreOTBreaks(checked); markDirty(); }}
          />
        </div>

        {/* Warm-up */}
        <div className="grid grid-cols-[auto_80px_1fr_auto] items-center gap-x-3 sm:gap-x-4">
            <Label htmlFor="warmUpDurationConfig" className="text-sm whitespace-nowrap justify-self-end">Calentamiento (min)</Label>
            <Input
              id="warmUpDurationConfig"
              type="number"
              value={localWarmUpDurationInput}
              onChange={(e) => { setLocalWarmUpDurationInput(e.target.value); markDirty(); }}
              className={narrowInputStyle}
              placeholder="ej. 5"
              min="1"
            />
            <Label htmlFor="autoStartWarmUpConfig" className="font-normal text-sm justify-self-end whitespace-nowrap">Iniciar Autom.</Label>
            <Switch
              id="autoStartWarmUpConfig"
              checked={localAutoStartWarmUp}
              onCheckedChange={(checked) => { setLocalAutoStartWarmUp(checked); markDirty(); }}
            />
        </div>
      </div>
    </ControlCardWrapper>
  );
});

DurationSettingsCard.displayName = "DurationSettingsCard";
    

    

    

    