
"use client";

import { useGameState, minutesToSeconds, secondsToMinutes } from "@/contexts/game-state-context";
import type { GameAction } from "@/contexts/game-state-context"; // Import GameAction type
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
    value: string
  ) => {
    const rawValue = parseInt(value, 10);
    if (isNaN(rawValue) || rawValue < 1) {
      toast({ title: "Valor Inválido", description: "La duración debe ser al menos 1.", variant: "destructive"});
      return;
    }
    
    let seconds = type === "timeout" ? rawValue : minutesToSeconds(rawValue);
    if (type !== "timeout" && seconds < 60) seconds = 60; // Min 1 minute for non-timeouts
    if (type === "timeout" && seconds < 10) seconds = 10; // Min 10 seconds for timeouts


    let actionType: GameAction['type'];
    let successMessage = "";

    switch (type) {
      case "period":
        actionType = "SET_DEFAULT_PERIOD_DURATION";
        successMessage = `Duración de período establecida a ${secondsToMinutes(seconds)} min.`;
        break;
      case "break":
        actionType = "SET_DEFAULT_BREAK_DURATION";
        successMessage = `Duración de descanso regular establecida a ${secondsToMinutes(seconds)} min.`;
        break;
      case "preOTBreak":
        actionType = "SET_DEFAULT_PRE_OT_BREAK_DURATION";
        successMessage = `Duración de descanso Pre-OT establecida a ${secondsToMinutes(seconds)} min.`;
        break;
      case "timeout":
        actionType = "SET_DEFAULT_TIMEOUT_DURATION";
        successMessage = `Duración de Time Out establecida a ${seconds} seg.`;
        break;
    }
    dispatch({ type: actionType, payload: seconds });
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
            <Label htmlFor="breakDuration">Duración Descanso Regular (minutos)</Label>
            <Input
              id="breakDuration"
              type="number"
              min="1"
              value={secondsToMinutes(state.defaultBreakDuration)}
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
            <Label htmlFor="preOTBreakDuration">Duración Descanso Pre-OT / Entre OTs (minutos)</Label>
            <Input
              id="preOTBreakDuration"
              type="number"
              min="1"
              value={secondsToMinutes(state.defaultPreOTBreakDuration)}
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
              min="10" // Min 10 segundos como se definió en el reducer
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
