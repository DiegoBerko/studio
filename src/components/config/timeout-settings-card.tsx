
"use client";

import { useGameState, secondsToMinutes } from "@/contexts/game-state-context";
import { ControlCardWrapper } from "@/components/controls/control-card-wrapper";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function TimeoutSettingsCard() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const handleDurationChange = (value: string) => {
    const seconds = parseInt(value, 10);
    if (isNaN(seconds) || seconds < 1) {
      toast({ title: "Valor Inválido", description: "La duración debe ser al menos 1 segundo.", variant: "destructive"});
      return;
    }
    dispatch({ type: "SET_DEFAULT_TIMEOUT_DURATION", payload: seconds });
    toast({ title: "Configuración Actualizada", description: `Duración de Time Out establecida a ${seconds} seg.` });
  };

  const handleToggleAutoStart = () => {
    dispatch({ type: "TOGGLE_AUTO_START_TIMEOUTS" });
    toast({ 
      title: "Configuración Actualizada", 
      description: `Inicio automático de Time Outs ${state.autoStartTimeouts ? "desactivado" : "activado"}.` 
    });
  };

  return (
    <ControlCardWrapper title="Configuración de Time Out">
      <div className="space-y-4">
        <div>
          <Label htmlFor="timeoutDuration">Duración del Time Out (segundos)</Label>
          <Input
            id="timeoutDuration"
            type="number"
            min="1"
            value={state.defaultTimeoutDuration}
            onChange={(e) => handleDurationChange(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="autoStartTimeouts" className="flex flex-col space-y-1">
            <span>Iniciar Automáticamente Time Outs</span>
            <span className="font-normal leading-snug text-muted-foreground">
              Si está activo, el reloj comenzará automáticamente al iniciar un Time Out.
            </span>
          </Label>
          <Switch
            id="autoStartTimeouts"
            checked={state.autoStartTimeouts}
            onCheckedChange={handleToggleAutoStart}
          />
        </div>
      </div>
    </ControlCardWrapper>
  );
}
