
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

// Interface DurationSettingsCardProps removida

const narrowInputStyle = "w-24 text-sm";

export const DurationSettingsCard = forwardRef<DurationSettingsCardRef>((props, ref) => {
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

  const [isDirty, setIsDirty] = useState(false); // Flag local de "dirty"

  useEffect(() => {
    // Si la tarjeta no está marcada como "dirty", actualiza los valores locales para reflejar el estado global.
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
    state.defaultWarmUpDuration, state.defaultPeriodDuration, state.defaultOTPeriodDuration,
    state.defaultBreakDuration, state.defaultPreOTBreakDuration, state.defaultTimeoutDuration,
    state.autoStartWarmUp, state.autoStartBreaks, state.autoStartPreOTBreaks, state.autoStartTimeouts,
    state.numberOfRegularPeriods, state.numberOfOvertimePeriods,
    isDirty // Dependencia importante para la condición
  ]);
  
  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      // Solo guarda si hay cambios locales "dirty" o si los valores locales difieren del estado global
      if (!isDirty && !getIsDirtyInternal()) return true;


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
      
      setIsDirty(false); // Resetea el flag "dirty"
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
      setIsDirty(false); // Resetea el flag "dirty"
    },
    getIsDirty: getIsDirtyInternal, // Usa la función de comparación activa
  }));

  const getIsDirtyInternal = () => {
    return (
      localWarmUpDurationInput !== centisecondsToDisplayMinutes(state.defaultWarmUpDuration) ||
      localPeriodDurationInput !== centisecondsToDisplayMinutes(state.defaultPeriodDuration) ||
      localOTPeriodDurationInput !== centisecondsToDisplayMinutes(state.defaultOTPeriodDuration) ||
      localBreakDurationInput !== centisecondsToDisplaySeconds(state.defaultBreakDuration) ||
      localPreOTBreakDurationInput !== centisecondsToDisplaySeconds(state.defaultPreOTBreakDuration) ||
      localTimeoutDurationInput !== centisecondsToDisplaySeconds(state.defaultTimeoutDuration) ||
      localAutoStartWarmUp !== state.autoStartWarmUp ||
      localAutoStartBreaks !== state.autoStartBreaks ||
      localAutoStartPreOTBreaks !== state.autoStartPreOTBreaks ||
      localAutoStartTimeouts !== state.autoStartTimeouts ||
      localNumRegularPeriodsInput !== String(state.numberOfRegularPeriods) ||
      localNumOTPeriodsInput !== String(state.numberOfOvertimePeriods)
    );
  };


  return (
    <ControlCardWrapper title="Configuración de Tiempos, Períodos y Arranque Automático">
      <div className="grid grid-cols-[auto_minmax(0,theme(spacing.24))_auto_auto] items-center gap-x-3 sm:gap-x-4 gap-y-6">
        
        {/* Períodos Regulares */}
        <Label htmlFor="numRegularPeriods" className="text-sm whitespace-nowrap">Períodos Regulares (Cant)</Label>
        <Input
          id="numRegularPeriods"
          type="number"
          value={localNumRegularPeriodsInput}
          onChange={(e) => { setLocalNumRegularPeriodsInput(e.target.value); markDirty(); }}
          className={narrowInputStyle}
          placeholder="ej. 3"
          min="1"
        />
        <Label htmlFor="periodDuration" className="text-sm whitespace-nowrap justify-self-end">Duración (Min)</Label>
        <Input
          id="periodDuration"
          type="number"
          value={localPeriodDurationInput}
          onChange={(e) => { setLocalPeriodDurationInput(e.target.value); markDirty(); }}
          className={narrowInputStyle}
          placeholder="ej. 20"
          min="1"
        />

        {/* Períodos Overtime */}
        <Label htmlFor="numOTPeriods" className="text-sm whitespace-nowrap">Períodos Overtime (Cant)</Label>
        <Input
          id="numOTPeriods"
          type="number"
          value={localNumOTPeriodsInput}
          onChange={(e) => { setLocalNumOTPeriodsInput(e.target.value); markDirty(); }}
          className={narrowInputStyle}
          placeholder="ej. 1"
          min="0"
        />
        <Label htmlFor="otPeriodDuration" className="text-sm whitespace-nowrap justify-self-end">Duración (Min)</Label>
        <Input
          id="otPeriodDuration"
          type="number"
          value={localOTPeriodDurationInput}
          onChange={(e) => { setLocalOTPeriodDurationInput(e.target.value); markDirty(); }}
          className={narrowInputStyle}
          placeholder="ej. 5"
          min="1"
        />
        
        {/* Timeouts */}
        <Label htmlFor="timeoutDurationConfig" className="text-sm whitespace-nowrap">Timeout (seg)</Label>
        <Input
          id="timeoutDurationConfig"
          type="number"
          value={localTimeoutDurationInput}
          onChange={(e) => { setLocalTimeoutDurationInput(e.target.value); markDirty(); }}
          className={narrowInputStyle}
          placeholder="ej. 30"
          min="1"
        />
        <Label htmlFor="autoStartTimeoutsConfig" className="font-normal text-sm whitespace-nowrap justify-self-end">Iniciar Autom.</Label>
        <Switch
          id="autoStartTimeoutsConfig"
          checked={localAutoStartTimeouts}
          onCheckedChange={(checked) => { setLocalAutoStartTimeouts(checked); markDirty(); }}
        />

        {/* Descansos Regulares */}
        <Label htmlFor="breakDurationConfig" className="text-sm whitespace-nowrap">Descanso Reg. (seg)</Label>
        <Input
          id="breakDurationConfig"
          type="number"
          value={localBreakDurationInput}
          onChange={(e) => { setLocalBreakDurationInput(e.target.value); markDirty(); }}
          className={narrowInputStyle}
          placeholder="ej. 120"
          min="1"
        />
        <Label htmlFor="autoStartBreaksConfig" className="font-normal text-sm whitespace-nowrap justify-self-end">Iniciar Autom.</Label>
        <Switch
          id="autoStartBreaksConfig"
          checked={localAutoStartBreaks}
          onCheckedChange={(checked) => { setLocalAutoStartBreaks(checked); markDirty(); }}
        />

        {/* Descansos Pre-OT */}
        <Label htmlFor="preOTBreakDurationConfig" className="text-sm whitespace-nowrap">Descanso Pre-OT (seg)</Label>
        <Input
          id="preOTBreakDurationConfig"
          type="number"
          value={localPreOTBreakDurationInput}
          onChange={(e) => { setLocalPreOTBreakDurationInput(e.target.value); markDirty(); }}
          className={narrowInputStyle}
          placeholder="ej. 60"
          min="1"
        />
        <Label htmlFor="autoStartPreOTBreaksConfig" className="font-normal text-sm whitespace-nowrap justify-self-end">Iniciar Autom.</Label>
        <Switch
          id="autoStartPreOTBreaksConfig"
          checked={localAutoStartPreOTBreaks}
          onCheckedChange={(checked) => { setLocalAutoStartPreOTBreaks(checked); markDirty(); }}
        />

        {/* Calentamiento */}
        <Label htmlFor="warmUpDurationConfig" className="text-sm whitespace-nowrap">Calentamiento (min)</Label>
        <Input
          id="warmUpDurationConfig"
          type="number"
          value={localWarmUpDurationInput}
          onChange={(e) => { setLocalWarmUpDurationInput(e.target.value); markDirty(); }}
          className={narrowInputStyle}
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

    