
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { 
  useGameState, 
  centisecondsToDisplayMinutes, 
  centisecondsToDisplaySeconds,
  type FormatAndTimingsProfileData // Import this
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
  setValues: (values: FormatAndTimingsProfileData) => void; // To set values from selected profile
}

interface DurationSettingsCardProps {
  onDirtyChange: (isDirty: boolean) => void;
  initialValues: FormatAndTimingsProfileData; // Pass initial values from selected profile
  // No need for selectedProfileId here, dispatch will handle it from parent
}

const narrowInputStyle = "w-24 text-sm";

export const DurationSettingsCard = forwardRef<DurationSettingsCardRef, DurationSettingsCardProps>((props, ref) => {
  const { dispatch } = useGameState(); // Only need dispatch
  const { onDirtyChange, initialValues } = props;

  const [localWarmUpDurationInput, setLocalWarmUpDurationInput] = useState(centisecondsToDisplayMinutes(initialValues.defaultWarmUpDuration));
  const [localPeriodDurationInput, setLocalPeriodDurationInput] = useState(centisecondsToDisplayMinutes(initialValues.defaultPeriodDuration));
  const [localOTPeriodDurationInput, setLocalOTPeriodDurationInput] = useState(centisecondsToDisplayMinutes(initialValues.defaultOTPeriodDuration));
  const [localBreakDurationInput, setLocalBreakDurationInput] = useState(centisecondsToDisplaySeconds(initialValues.defaultBreakDuration));
  const [localPreOTBreakDurationInput, setLocalPreOTBreakDurationInput] = useState(centisecondsToDisplaySeconds(initialValues.defaultPreOTBreakDuration));
  const [localTimeoutDurationInput, setLocalTimeoutDurationInput] = useState(centisecondsToDisplaySeconds(initialValues.defaultTimeoutDuration));
  
  const [localAutoStartWarmUp, setLocalAutoStartWarmUp] = useState(initialValues.autoStartWarmUp);
  const [localAutoStartBreaks, setLocalAutoStartBreaks] = useState(initialValues.autoStartBreaks);
  const [localAutoStartPreOTBreaks, setLocalAutoStartPreOTBreaks] = useState(initialValues.autoStartPreOTBreaks);
  const [localAutoStartTimeouts, setLocalAutoStartTimeouts] = useState(initialValues.autoStartTimeouts);

  const [localNumRegularPeriodsInput, setLocalNumRegularPeriodsInput] = useState(String(initialValues.numberOfRegularPeriods));
  const [localNumOTPeriodsInput, setLocalNumOTPeriodsInput] = useState(String(initialValues.numberOfOvertimePeriods));

  const [isDirtyLocal, setIsDirtyLocal] = useState(false);

  const setValuesFromProfile = (values: FormatAndTimingsProfileData) => {
    setLocalWarmUpDurationInput(centisecondsToDisplayMinutes(values.defaultWarmUpDuration));
    setLocalPeriodDurationInput(centisecondsToDisplayMinutes(values.defaultPeriodDuration));
    setLocalOTPeriodDurationInput(centisecondsToDisplayMinutes(values.defaultOTPeriodDuration));
    setLocalBreakDurationInput(centisecondsToDisplaySeconds(values.defaultBreakDuration));
    setLocalPreOTBreakDurationInput(centisecondsToDisplaySeconds(values.defaultPreOTBreakDuration));
    setLocalTimeoutDurationInput(centisecondsToDisplaySeconds(values.defaultTimeoutDuration));
    setLocalAutoStartWarmUp(values.autoStartWarmUp);
    setLocalAutoStartBreaks(values.autoStartBreaks);
    setLocalAutoStartPreOTBreaks(values.autoStartPreOTBreaks);
    setLocalAutoStartTimeouts(values.autoStartTimeouts);
    setLocalNumRegularPeriodsInput(String(values.numberOfRegularPeriods));
    setLocalNumOTPeriodsInput(String(values.numberOfOvertimePeriods));
    setIsDirtyLocal(false); // Reset dirty state when loading new profile
  };
  
  useEffect(() => {
    setValuesFromProfile(initialValues);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);


  useEffect(() => {
    onDirtyChange(isDirtyLocal);
  }, [isDirtyLocal, onDirtyChange]);
  
  const markDirty = () => setIsDirtyLocal(true);

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      if (!isDirtyLocal) return true;

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

      // No direct dispatch for auto-start values, parent will handle using new values
      // dispatch({ type: "SET_AUTO_START_WARM_UP_VALUE", payload: localAutoStartWarmUp });
      // dispatch({ type: "SET_AUTO_START_BREAKS_VALUE", payload: localAutoStartBreaks });
      // dispatch({ type: "SET_AUTO_START_PRE_OT_BREAKS_VALUE", payload: localAutoStartPreOTBreaks });
      // dispatch({ type: "SET_AUTO_START_TIMEOUTS_VALUE", payload: localAutoStartTimeouts });

      // Dispatch all auto-start values
      dispatch({ type: "SET_AUTO_START_WARM_UP_VALUE", payload: localAutoStartWarmUp });
      dispatch({ type: "SET_AUTO_START_BREAKS_VALUE", payload: localAutoStartBreaks });
      dispatch({ type: "SET_AUTO_START_PRE_OT_BREAKS_VALUE", payload: localAutoStartPreOTBreaks });
      dispatch({ type: "SET_AUTO_START_TIMEOUTS_VALUE", payload: localAutoStartTimeouts });
      
      setIsDirtyLocal(false);
      return true;
    },
    handleDiscard: () => {
      setValuesFromProfile(initialValues); // Discard to initialValues of the current profile
    },
    getIsDirty: () => isDirtyLocal,
    setValues: setValuesFromProfile,
  }));

  return (
    <ControlCardWrapper title="Configuración de Tiempos, Períodos y Arranque Automático">
      <div className="grid grid-cols-[auto_theme(spacing.24)_auto_auto] items-center gap-x-3 sm:gap-x-4 gap-y-6">
        
        <Label htmlFor="numRegularPeriods" className="text-sm whitespace-nowrap">Períodos Regulares (Cant)</Label>
        <Input
          id="numRegularPeriods"
          type="number"
          value={localNumRegularPeriodsInput}
          onChange={(e) => { setLocalNumRegularPeriodsInput(e.target.value); markDirty(); }}
          className={cn(narrowInputStyle)}
          placeholder="ej. 3"
          min="1"
        />
        <Label htmlFor="periodDuration" className="text-sm whitespace-nowrap justify-self-end">Duración (Min)</Label>
        <Input
          id="periodDuration"
          type="number"
          value={localPeriodDurationInput}
          onChange={(e) => { setLocalPeriodDurationInput(e.target.value); markDirty(); }}
          className={cn(narrowInputStyle)}
          placeholder="ej. 20"
          min="1"
        />

        <Label htmlFor="numOTPeriods" className="text-sm whitespace-nowrap">Períodos Overtime (Cant)</Label>
        <Input
          id="numOTPeriods"
          type="number"
          value={localNumOTPeriodsInput}
          onChange={(e) => { setLocalNumOTPeriodsInput(e.target.value); markDirty(); }}
          className={cn(narrowInputStyle)}
          placeholder="ej. 1"
          min="0"
        />
        <Label htmlFor="otPeriodDuration" className="text-sm whitespace-nowrap justify-self-end">Duración (Min)</Label>
        <Input
          id="otPeriodDuration"
          type="number"
          value={localOTPeriodDurationInput}
          onChange={(e) => { setLocalOTPeriodDurationInput(e.target.value); markDirty(); }}
          className={cn(narrowInputStyle)}
          placeholder="ej. 5"
          min="1"
        />
        
        <Label htmlFor="timeoutDurationConfig" className="text-sm whitespace-nowrap">Timeout (seg)</Label>
        <Input
          id="timeoutDurationConfig"
          type="number"
          value={localTimeoutDurationInput}
          onChange={(e) => { setLocalTimeoutDurationInput(e.target.value); markDirty(); }}
          className={cn(narrowInputStyle)}
          placeholder="ej. 30"
          min="1"
        />
        <Label htmlFor="autoStartTimeoutsConfig" className="font-normal text-sm whitespace-nowrap justify-self-end">Iniciar Autom.</Label>
        <Switch
          id="autoStartTimeoutsConfig"
          checked={localAutoStartTimeouts}
          onCheckedChange={(checked) => { setLocalAutoStartTimeouts(checked); markDirty(); }}
        />

        <Label htmlFor="breakDurationConfig" className="text-sm whitespace-nowrap">Descanso Reg. (seg)</Label>
        <Input
          id="breakDurationConfig"
          type="number"
          value={localBreakDurationInput}
          onChange={(e) => { setLocalBreakDurationInput(e.target.value); markDirty(); }}
          className={cn(narrowInputStyle)}
          placeholder="ej. 120"
          min="1"
        />
        <Label htmlFor="autoStartBreaksConfig" className="font-normal text-sm whitespace-nowrap justify-self-end">Iniciar Autom.</Label>
        <Switch
          id="autoStartBreaksConfig"
          checked={localAutoStartBreaks}
          onCheckedChange={(checked) => { setLocalAutoStartBreaks(checked); markDirty(); }}
        />

        <Label htmlFor="preOTBreakDurationConfig" className="text-sm whitespace-nowrap">Descanso Pre-OT (seg)</Label>
        <Input
          id="preOTBreakDurationConfig"
          type="number"
          value={localPreOTBreakDurationInput}
          onChange={(e) => { setLocalPreOTBreakDurationInput(e.target.value); markDirty(); }}
          className={cn(narrowInputStyle)}
          placeholder="ej. 60"
          min="1"
        />
        <Label htmlFor="autoStartPreOTBreaksConfig" className="font-normal text-sm whitespace-nowrap justify-self-end">Iniciar Autom.</Label>
        <Switch
          id="autoStartPreOTBreaksConfig"
          checked={localAutoStartPreOTBreaks}
          onCheckedChange={(checked) => { setLocalAutoStartPreOTBreaks(checked); markDirty(); }}
        />

        <Label htmlFor="warmUpDurationConfig" className="text-sm whitespace-nowrap">Calentamiento (min)</Label>
        <Input
          id="warmUpDurationConfig"
          type="number"
          value={localWarmUpDurationInput}
          onChange={(e) => { setLocalWarmUpDurationInput(e.target.value); markDirty(); }}
          className={cn(narrowInputStyle)}
          placeholder="ej. 5"
          min="1"
        />
        <Label htmlFor="autoStartWarmUpConfig" className="font-normal text-sm whitespace-nowrap justify-self-end">Iniciar Autom.</Label>
        <Switch
          id="autoStartWarmUpConfig"
          checked={localAutoStartWarmUp}
          onCheckedChange={(checked) => { setLocalAutoStartWarmUp(checked); markDirty(); }}
        />
      </div>
    </ControlCardWrapper>
  );
});

DurationSettingsCard.displayName = "DurationSettingsCard";
