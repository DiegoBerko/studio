
"use client";

import { useGameState } from "@/contexts/game-state-context";
import { ControlCardWrapper } from "@/components/controls/control-card-wrapper";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function AutoStartSettingsCard() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const handleToggle = (type: "regular" | "preOT") => {
    let actionType;
    let message = "";

    if (type === "regular") {
      actionType = "TOGGLE_AUTO_START_BREAKS";
      message = state.autoStartBreaks ? "desactivado" : "activado";
      message = `Inicio automático de descansos regulares ${message}.`;
    } else {
      actionType = "TOGGLE_AUTO_START_PRE_OT_BREAKS";
      message = state.autoStartPreOTBreaks ? "desactivado" : "activado";
      message = `Inicio automático de descansos Pre-OT ${message}.`;
    }
    dispatch({ type: actionType });
    toast({ title: "Configuración Actualizada", description: message });
  };

  return (
    <ControlCardWrapper title="Configuración de Inicio Automático de Descansos">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="autoStartBreaks" className="flex flex-col space-y-1">
            <span>Iniciar Automáticamente Descansos Regulares</span>
            <span className="font-normal leading-snug text-muted-foreground">
              Si está activo, el reloj comenzará automáticamente al iniciar un descanso regular.
            </span>
          </Label>
          <Switch
            id="autoStartBreaks"
            checked={state.autoStartBreaks}
            onCheckedChange={() => handleToggle("regular")}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="autoStartPreOTBreaks" className="flex flex-col space-y-1">
            <span>Iniciar Automáticamente Descansos Pre-OT</span>
            <span className="font-normal leading-snug text-muted-foreground">
              Si está activo, el reloj comenzará automáticamente al iniciar un descanso Pre-OT.
            </span>
          </Label>
          <Switch
            id="autoStartPreOTBreaks"
            checked={state.autoStartPreOTBreaks}
            onCheckedChange={() => handleToggle("preOT")}
          />
        </div>
      </div>
    </ControlCardWrapper>
  );
}

    