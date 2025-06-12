
"use client";

import { useGameState, secondsToMinutes } from "@/contexts/game-state-context";
import type { GameAction } from "@/contexts/game-state-context";
import { ControlCardWrapper } from "@/components/controls/control-card-wrapper";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function DurationSettingsCard() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const handleDurationChange = (
    type: "period" | "break" | "preOTBreak" | "timeout",
    value: string // Value from input field
  ) => {
    let numericValue = parseInt(value, 10);
    const isDeletion = value === ''; // Check if input was cleared by user

    let descriptionForToast = "";
    let minVal = 1; // Default minimum for seconds-based inputs
    let actionType: GameAction['type'];
    let successMessage = "";
    let finalValueInSeconds: number;

    if (type === "period") {
      descriptionForToast = "La duración del período debe ser al menos 1 minuto.";
      minVal = 1; // minutes for period
      if (isDeletion) {
        numericValue = 1; // Default to 1 minute if cleared
      } else if (isNaN(numericValue) || numericValue < minVal) {
        toast({ title: "Valor Inválido", description: descriptionForToast, variant: "destructive"});
        return;
      }
      finalValueInSeconds = numericValue * 60;
      actionType = "SET_DEFAULT_PERIOD_DURATION";
      successMessage = `Duración de período establecida a ${numericValue} min.`;

    } else { // break, preOTBreak, timeout (all in seconds)
      minVal = 1; // seconds
      descriptionForToast = "La duración debe ser al menos 1 segundo.";

      if (isDeletion) {
        numericValue = 1; // Default to 1 second if cleared
      } else if (isNaN(numericValue) || numericValue < minVal) {
        toast({ title: "Valor Inválido", description: descriptionForToast, variant: "destructive"});
        return;
      }
      finalValueInSeconds = numericValue;

      switch (type) {
        case "break":
          actionType = "SET_DEFAULT_BREAK_DURATION";
          successMessage = `Duración de descanso regular establecida a ${finalValueInSeconds} seg.`;
          break;
        case "preOTBreak":
          actionType = "SET_DEFAULT_PRE_OT_BREAK_DURATION";
          successMessage = `Duración de descanso Pre-OT establecida a ${finalValueInSeconds} seg.`;
          break;
        case "timeout":
          actionType = "SET_DEFAULT_TIMEOUT_DURATION";
          successMessage = `Duración de Time Out establecida a ${finalValueInSeconds} seg.`;
          break;
        default:
          return; // Should not happen
      }
    }
    
    dispatch({ type: actionType, payload: finalValueInSeconds });
    toast({ title: "Configuración Actualizada", description: successMessage });
  };

  const handleToggle = (
    type: "autoStartBreaks" | "autoStartPreOTBreaks" | "autoStartTimeouts"
  ) => {
    let actionType: GameAction['type'];
    let messagePart = "";
    let currentFlag: boolean;

    switch (type) {
      case "autoStartBreaks":
        actionType = "TOGGLE_AUTO_START_BREAKS";
        messagePart = "descansos regulares";
        currentFlag = state.autoStartBreaks;
        break;
      case "autoStartPreOTBreaks":
        actionType = "TOGGLE_AUTO_START_PRE_OT_BREAKS";
        messagePart = "descansos Pre-OT";
        currentFlag = state.autoStartPreOTBreaks;
        break;
      case "autoStartTimeouts":
        actionType = "TOGGLE_AUTO_START_TIMEOUTS";
        messagePart = "Time Outs";
        currentFlag = state.autoStartTimeouts;
        break;
    }
    dispatch({ type: actionType });
    toast({
      title: "Configuración Actualizada",
      description: `Inicio automático de ${messagePart} ${currentFlag ? "desactivado" : "activado"}.`,
    });
  };


  return (
    <ControlCardWrapper title="Configuración de Tiempos y Arranque Automático">
      <div className="space-y-6">
        {/* Period Duration */}
        <div>
          <Label htmlFor="periodDuration">Duración del Período (minutos)</Label>
          <Input
            id="periodDuration"
            type="number"
            min="1"
            value={secondsToMinutes(state.defaultPeriodDuration)}
            onChange={(e) => handleDurationChange("period", e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Regular Break Duration & Auto-Start */}
        <div className="space-y-3 p-4 border rounded-md bg-muted/20">
          <div>
            <Label htmlFor="breakDuration">Duración Descanso Regular (segundos)</Label>
            <Input
              id="breakDuration"
              type="number"
              min="1"
              value={state.defaultBreakDuration}
              onChange={(e) => handleDurationChange("break", e.target.value)}
              className="mt-1"
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
              checked={state.autoStartBreaks}
              onCheckedChange={() => handleToggle("autoStartBreaks")}
            />
          </div>
        </div>

        {/* Pre-OT Break Duration & Auto-Start */}
        <div className="space-y-3 p-4 border rounded-md bg-muted/20">
          <div>
            <Label htmlFor="preOTBreakDuration">Duración Descanso Pre-OT / Entre OTs (segundos)</Label>
            <Input
              id="preOTBreakDuration"
              type="number"
              min="1"
              value={state.defaultPreOTBreakDuration}
              onChange={(e) => handleDurationChange("preOTBreak", e.target.value)}
              className="mt-1"
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
              checked={state.autoStartPreOTBreaks}
              onCheckedChange={() => handleToggle("autoStartPreOTBreaks")}
            />
          </div>
        </div>
        
        {/* Timeout Duration & Auto-Start */}
        <div className="space-y-3 p-4 border rounded-md bg-muted/20">
          <div>
            <Label htmlFor="timeoutDuration">Duración del Time Out (segundos)</Label>
            <Input
              id="timeoutDuration"
              type="number"
              min="1" 
              value={state.defaultTimeoutDuration}
              onChange={(e) => handleDurationChange("timeout", e.target.value)}
              className="mt-1"
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
              checked={state.autoStartTimeouts}
              onCheckedChange={() => handleToggle("autoStartTimeouts")}
            />
          </div>
        </div>
      </div>
    </ControlCardWrapper>
  );
}
