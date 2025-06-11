
"use client";

import { useGameState } from "@/contexts/game-state-context";
import { ControlCardWrapper } from "@/components/controls/control-card-wrapper";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function PenaltySettingsCard() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const handleMaxPenaltiesChange = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) {
      toast({ title: "Valor Inválido", description: "El número debe ser al menos 1.", variant: "destructive"});
      return;
    }
    dispatch({ type: "SET_MAX_CONCURRENT_PENALTIES", payload: num });
    toast({ title: "Configuración Actualizada", description: `Máximo de penalidades concurrentes por equipo: ${num}.` });
  };

  return (
    <ControlCardWrapper title="Configuración de Penalidades">
      <div className="space-y-4">
        <div>
          <Label htmlFor="maxConcurrentPenalties">Máximo Penalidades Concurrentes por Equipo</Label>
          <Input
            id="maxConcurrentPenalties"
            type="number"
            min="1"
            value={state.maxConcurrentPenalties}
            onChange={(e) => handleMaxPenaltiesChange(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Define cuántas penalidades pueden correr su tiempo simultáneamente para un mismo equipo.
          </p>
        </div>
      </div>
    </ControlCardWrapper>
  );
}

    