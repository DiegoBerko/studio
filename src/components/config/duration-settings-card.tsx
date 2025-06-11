
"use client";

import { useGameState, minutesToSeconds, secondsToMinutes } from "@/contexts/game-state-context";
import { ControlCardWrapper } from "@/components/controls/control-card-wrapper";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function DurationSettingsCard() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const handleDurationChange = (
    type: "period" | "break" | "preOTBreak",
    value: string
  ) => {
    const minutes = parseInt(value, 10);
    if (isNaN(minutes) || minutes < 1) {
      toast({ title: "Valor Inválido", description: "La duración debe ser al menos 1 minuto.", variant: "destructive"});
      return;
    }
    const seconds = minutesToSeconds(minutes);
    let actionType;
    let successMessage = "";

    if (type === "period") {
      actionType = "SET_DEFAULT_PERIOD_DURATION";
      successMessage = `Duración de período establecida a ${minutes} min.`;
    } else if (type === "break") {
      actionType = "SET_DEFAULT_BREAK_DURATION";
      successMessage = `Duración de descanso regular establecida a ${minutes} min.`;
    } else {
      actionType = "SET_DEFAULT_PRE_OT_BREAK_DURATION";
      successMessage = `Duración de descanso Pre-OT establecida a ${minutes} min.`;
    }
    dispatch({ type: actionType, payload: seconds });
    toast({ title: "Configuración Actualizada", description: successMessage });
  };

  return (
    <ControlCardWrapper title="Configuración de Duraciones">
      <div className="space-y-4">
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
      </div>
    </ControlCardWrapper>
  );
}

    