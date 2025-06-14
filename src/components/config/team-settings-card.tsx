
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useGameState } from "@/contexts/game-state-context";
import { ControlCardWrapper } from "@/components/controls/control-card-wrapper";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface TeamSettingsCardRef {
  handleSave: () => boolean;
  handleDiscard: () => void;
  getIsDirty: () => boolean;
}

interface TeamSettingsCardProps {
  onDirtyChange: (isDirty: boolean) => void;
}

export const TeamSettingsCard = forwardRef<TeamSettingsCardRef, TeamSettingsCardProps>(({ onDirtyChange }, ref) => {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  // Local state for "Habilitar el uso de Equipos" (master switch)
  const [localEnableTeamUsage, setLocalEnableTeamUsage] = useState(state.enableTeamSelectionInMiniScoreboard);
  
  // Local states for dependent switches
  const [localEnablePlayerSelection, setLocalEnablePlayerSelection] = useState(state.enablePlayerSelectionForPenalties);
  const [localShowAliasInSelector, setLocalShowAliasInSelector] = useState(state.showAliasInPenaltyPlayerSelector);
  const [localShowAliasInControlsList, setLocalShowAliasInControlsList] = useState(state.showAliasInControlsPenaltyList);
  const [localShowAliasInScoreboard, setLocalShowAliasInScoreboard] = useState(state.showAliasInScoreboardPenalties);
  
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setLocalEnableTeamUsage(state.enableTeamSelectionInMiniScoreboard);
      setLocalEnablePlayerSelection(state.enablePlayerSelectionForPenalties);
      setLocalShowAliasInSelector(state.showAliasInPenaltyPlayerSelector);
      setLocalShowAliasInControlsList(state.showAliasInControlsPenaltyList);
      setLocalShowAliasInScoreboard(state.showAliasInScoreboardPenalties);
    }
  }, [
    state.enableTeamSelectionInMiniScoreboard, 
    state.enablePlayerSelectionForPenalties,
    state.showAliasInPenaltyPlayerSelector,
    state.showAliasInControlsPenaltyList,
    state.showAliasInScoreboardPenalties,
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

      dispatch({ type: "SET_ENABLE_TEAM_SELECTION_IN_MINI_SCOREBOARD", payload: localEnableTeamUsage });
      // If team usage is disabled, other settings are forced to false by the reducer.
      // If team usage is enabled, dispatch the individual values.
      if (localEnableTeamUsage) {
        dispatch({ type: "SET_ENABLE_PLAYER_SELECTION_FOR_PENALTIES", payload: localEnablePlayerSelection });
        if (localEnablePlayerSelection) {
            dispatch({ type: "SET_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR", payload: localShowAliasInSelector });
            dispatch({ type: "SET_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST", payload: localShowAliasInControlsList });
        } else {
            dispatch({ type: "SET_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR", payload: false });
            dispatch({ type: "SET_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST", payload: false });
        }
        dispatch({ type: "SET_SHOW_ALIAS_IN_SCOREBOARD_PENALTIES", payload: localShowAliasInScoreboard });
      }
      
      setIsDirty(false);
      return true; 
    },
    handleDiscard: () => {
      setLocalEnableTeamUsage(state.enableTeamSelectionInMiniScoreboard);
      setLocalEnablePlayerSelection(state.enablePlayerSelectionForPenalties);
      setLocalShowAliasInSelector(state.showAliasInPenaltyPlayerSelector);
      setLocalShowAliasInControlsList(state.showAliasInControlsPenaltyList);
      setLocalShowAliasInScoreboard(state.showAliasInScoreboardPenalties);
      setIsDirty(false);
    },
    getIsDirty: () => isDirty,
  }));
  
  const handleMasterToggleChange = (checked: boolean) => {
    setLocalEnableTeamUsage(checked);
    markDirty();
    if (!checked) {
      // If master is turned off, also turn off dependent local states for immediate UI feedback
      setLocalEnablePlayerSelection(false);
      setLocalShowAliasInSelector(false);
      setLocalShowAliasInControlsList(false);
      setLocalShowAliasInScoreboard(false);
    }
  };
  
  const handlePlayerSelectionToggleChange = (checked: boolean) => {
    setLocalEnablePlayerSelection(checked);
    markDirty();
    if (!checked) {
        setLocalShowAliasInSelector(false);
        setLocalShowAliasInControlsList(false);
    }
  };


  return (
    <ControlCardWrapper title="Configuración de Equipos y Alias">
      <div className="space-y-6">
        {/* Master Switch */}
        <div className="flex items-center justify-between p-4 border rounded-md bg-card shadow-sm">
          <Label htmlFor="enableTeamUsageSwitch" className="flex flex-col space-y-1">
            <span className="font-semibold text-base">Habilitar el uso de Equipos</span>
            <span className="font-normal leading-snug text-muted-foreground text-xs">
              Activa todas las funcionalidades relacionadas con equipos (selección, jugadores, alias). Desactivarlo ocultará las opciones dependientes.
            </span>
          </Label>
          <Switch
            id="enableTeamUsageSwitch"
            checked={localEnableTeamUsage}
            onCheckedChange={handleMasterToggleChange}
          />
        </div>

        {/* Dependent Settings Container */}
        <div className={cn(
          "space-y-4 transition-opacity duration-300",
          !localEnableTeamUsage && "opacity-50 pointer-events-none"
        )}>
            {/* Enable Player Selection for Penalties */}
            <div className="flex items-center justify-between p-4 border rounded-md bg-muted/20">
              <Label htmlFor="enablePlayerSelectionSwitch" className="flex flex-col space-y-1">
                <span>Habilitar selector de jugador para penalidades</span>
                <span className="font-normal leading-snug text-muted-foreground text-xs">
                  Permite seleccionar jugadores de una lista al añadir penalidades si un equipo está cargado.
                </span>
              </Label>
              <Switch
                id="enablePlayerSelectionSwitch"
                checked={localEnablePlayerSelection}
                onCheckedChange={handlePlayerSelectionToggleChange}
                disabled={!localEnableTeamUsage}
              />
            </div>

            {/* Conditional Switches for Player Selection Aliases */}
            <div className={cn(
                "space-y-4 transition-opacity duration-300 ml-0 sm:ml-4",
                (!localEnableTeamUsage || !localEnablePlayerSelection) && "opacity-60 pointer-events-none"
            )}>
                <div className="flex items-center justify-between p-4 border rounded-md bg-muted/30">
                <Label htmlFor="showAliasInSelectorSwitch" className="flex flex-col space-y-1">
                    <span>Mostrar alias en lista del selector de jugador</span>
                    <span className="font-normal leading-snug text-muted-foreground text-xs">
                    Muestra el nombre/alias junto al número en el desplegable.
                    </span>
                </Label>
                <Switch
                    id="showAliasInSelectorSwitch"
                    checked={localShowAliasInSelector}
                    onCheckedChange={(checked) => { setLocalShowAliasInSelector(checked); markDirty(); }}
                    disabled={!localEnableTeamUsage || !localEnablePlayerSelection}
                />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-md bg-muted/30">
                <Label htmlFor="showAliasInControlsListSwitch" className="flex flex-col space-y-1">
                    <span>Mostrar alias en lista de penalidades del tablero de Controles</span>
                    <span className="font-normal leading-snug text-muted-foreground text-xs">
                    Muestra el alias en la lista de penalidades activas en la página de Controles.
                    </span>
                </Label>
                <Switch
                    id="showAliasInControlsListSwitch"
                    checked={localShowAliasInControlsList}
                    onCheckedChange={(checked) => { setLocalShowAliasInControlsList(checked); markDirty(); }}
                    disabled={!localEnableTeamUsage || !localEnablePlayerSelection}
                />
                </div>
            </div>
            
            {/* Show Alias in Scoreboard Penalties */}
            <div className="flex items-center justify-between p-4 border rounded-md bg-muted/20">
            <Label htmlFor="showAliasInScoreboardSwitch" className="flex flex-col space-y-1">
                <span>Mostrar alias en penalidades del Scoreboard</span>
                <span className="font-normal leading-snug text-muted-foreground text-xs">
                Muestra el alias del jugador en las tarjetas de penalidad del Scoreboard principal.
                </span>
            </Label>
            <Switch
                id="showAliasInScoreboardSwitch"
                checked={localShowAliasInScoreboard}
                onCheckedChange={(checked) => { setLocalShowAliasInScoreboard(checked); markDirty(); }}
                disabled={!localEnableTeamUsage}
            />
            </div>
        </div>
      </div>
    </ControlCardWrapper>
  );
});

TeamSettingsCard.displayName = "TeamSettingsCard";
