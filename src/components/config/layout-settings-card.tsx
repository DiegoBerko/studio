
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useGameState } from "@/contexts/game-state-context";
import type { ScoreboardLayoutSettings } from "@/types";
import { ControlCardWrapper } from "@/components/controls/control-card-wrapper";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

export interface LayoutSettingsCardRef {
  handleSave: () => boolean;
  handleDiscard: () => void;
  getIsDirty: () => boolean;
}

interface LayoutSettingsCardProps {
  onDirtyChange: (isDirty: boolean) => void;
}

const SliderControl = ({ label, value, onValueChange, min, max, step, unit = "rem" }: { label: string, value: number, onValueChange: (value: number) => void, min: number, max: number, step: number, unit?: string }) => (
  <div className="grid grid-cols-3 items-center gap-x-4">
    <Label className="text-sm whitespace-nowrap">{label}</Label>
    <Slider
      value={[value]}
      onValueChange={(v) => onValueChange(v[0])}
      min={min}
      max={max}
      step={step}
    />
    <span className="text-sm text-muted-foreground tabular-nums">{value.toFixed(2)} {unit}</span>
  </div>
);

const ColorControl = ({ label, value, onValueChange }: { label: string, value: string, onValueChange: (value: string) => void }) => (
  <div className="grid grid-cols-3 items-center gap-x-4">
    <Label className="text-sm whitespace-nowrap">{label}</Label>
    <Input
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className="col-span-2 h-8"
      placeholder="H S% L% (ej: 223 65% 33%)"
    />
  </div>
);

export const LayoutSettingsCard = forwardRef<LayoutSettingsCardRef, LayoutSettingsCardProps>((props, ref) => {
  const { state, dispatch } = useGameState();
  const { onDirtyChange } = props;

  const [localSettings, setLocalSettings] = useState<ScoreboardLayoutSettings>(state.scoreboardLayout);
  const [isDirtyLocal, setIsDirtyLocal] = useState(false);

  useEffect(() => {
    onDirtyChange(isDirtyLocal);
  }, [isDirtyLocal, onDirtyChange]);

  useEffect(() => {
    if (!isDirtyLocal) {
      setLocalSettings(state.scoreboardLayout);
    }
  }, [state.scoreboardLayout, isDirtyLocal]);

  const markDirty = () => setIsDirtyLocal(true);

  const handleValueChange = (key: keyof ScoreboardLayoutSettings, value: number | string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    markDirty();
  };

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      if (!isDirtyLocal) return true;
      dispatch({ type: 'UPDATE_LAYOUT_SETTINGS', payload: localSettings });
      setIsDirtyLocal(false);
      return true;
    },
    handleDiscard: () => {
      setLocalSettings(state.scoreboardLayout);
      setIsDirtyLocal(false);
    },
    getIsDirty: () => isDirtyLocal,
  }));

  return (
    <ControlCardWrapper title="Diseño del Scoreboard">
      <div className="space-y-6">
        <div>
          <h4 className="text-base font-semibold mb-3">Posición y Tamaños (en rem)</h4>
          <div className="space-y-4">
            <SliderControl label="Posición Vertical" value={localSettings.scoreboardVerticalPosition} onValueChange={(v) => handleValueChange('scoreboardVerticalPosition', v)} min={0} max={20} step={0.5} />
            <SliderControl label="Reloj Principal" value={localSettings.clockSize} onValueChange={(v) => handleValueChange('clockSize', v)} min={6} max={20} step={0.5} />
            <SliderControl label="Nombre Equipo" value={localSettings.teamNameSize} onValueChange={(v) => handleValueChange('teamNameSize', v)} min={1.5} max={6} step={0.1} />
            <SliderControl label="Puntuación (Goles)" value={localSettings.scoreSize} onValueChange={(v) => handleValueChange('scoreSize', v)} min={4} max={12} step={0.25} />
            <SliderControl label="Período" value={localSettings.periodSize} onValueChange={(v) => handleValueChange('periodSize', v)} min={2} max={8} step={0.1} />
            <SliderControl label="Iconos Jugadores" value={localSettings.playersOnIceIconSize} onValueChange={(v) => handleValueChange('playersOnIceIconSize', v)} min={1} max={4} step={0.1} />
            <SliderControl label="Categoría Partido" value={localSettings.categorySize} onValueChange={(v) => handleValueChange('categorySize', v)} min={0.75} max={3} step={0.05} />
            <SliderControl label="Label Local/Visitante" value={localSettings.teamLabelSize} onValueChange={(v) => handleValueChange('teamLabelSize', v)} min={0.75} max={3} step={0.05} />
            <SliderControl label="Título Penalidades" value={localSettings.penaltiesTitleSize} onValueChange={(v) => handleValueChange('penaltiesTitleSize', v)} min={1} max={4} step={0.1} />
            <SliderControl label="Nº Jugador Penalidad" value={localSettings.penaltyPlayerNumberSize} onValueChange={(v) => handleValueChange('penaltyPlayerNumberSize', v)} min={1.5} max={7} step={0.1} />
            <SliderControl label="Tiempo Penalidad" value={localSettings.penaltyTimeSize} onValueChange={(v) => handleValueChange('penaltyTimeSize', v)} min={1.5} max={7} step={0.1} />
            <SliderControl label="Icono Jugador Penalidad" value={localSettings.penaltyPlayerIconSize} onValueChange={(v) => handleValueChange('penaltyPlayerIconSize', v)} min={1} max={5} step={0.1} />
          </div>
        </div>
        <div className="border-t pt-6">
           <h4 className="text-base font-semibold mb-3">Colores Principales (Formato HSL)</h4>
           <div className="space-y-3">
             <ColorControl label="Color de Fondo" value={localSettings.backgroundColor} onValueChange={(v) => handleValueChange('backgroundColor', v)} />
             <ColorControl label="Color Primario" value={localSettings.primaryColor} onValueChange={(v) => handleValueChange('primaryColor', v)} />
             <ColorControl label="Color de Acento" value={localSettings.accentColor} onValueChange={(v) => handleValueChange('accentColor', v)} />
           </div>
        </div>
      </div>
    </ControlCardWrapper>
  );
});

LayoutSettingsCard.displayName = "LayoutSettingsCard";
