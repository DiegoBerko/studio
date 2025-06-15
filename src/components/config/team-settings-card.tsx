
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

export const TeamSettingsCard = forwardRef<TeamSettingsCardRef, TeamSettingsCardProps>((props, ref) => {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const { onDirtyChange } = props;

  const [localEnableTeamUsage, setLocalEnableTeamUsage] = useState(state.enableTeamSelectionInMiniScoreboard);
  const [localEnablePlayerSelection, setLocalEnablePlayerSelection] = useState(state.enablePlayerSelectionForPenalties);
  const [localShowAliasInSelector, setLocalShowAliasInSelector] = useState(state.showAliasInPenaltyPlayerSelector);
  const [localShowAliasInControlsList, setLocalShowAliasInControlsList] = useState(state.showAliasInControlsPenaltyList);
  const [localShowAliasInScoreboard, setLocalShowAliasInScoreboard] = useState(state.showAliasInScoreboardPenalties);
  const [isDirtyLocal, setIsDirtyLocal] = useState(false);

  useEffect(() => {
    onDirtyChange(isDirtyLocal);
  }, [isDirtyLocal, onDirtyChange]);
  
  useEffect(() => {
    if (!isDirtyLocal) {
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
    isDirtyLocal,
  ]);

  const markDirty = () => setIsDirtyLocal(true);

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      if (!isDirtyLocal) return true;

      dispatch({ type: "SET_ENABLE_TEAM_SELECTION_IN_MINI_SCOREBOARD", payload: localEnableTeamUsage });
      
      if (localEnableTeamUsage) {
        dispatch({ type: "SET_ENABLE_PLAYER_SELECTION_FOR_PENALTIES", payload: localEnablePlayerSelection });
        
        if (localEnablePlayerSelection) {
            dispatch({ type: "SET_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR", payload: localShowAliasInSelector });
            dispatch({ type: "SET_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST", payload: localShowAliasInControlsList });
            dispatch({ type: "SET_SHOW_ALIAS_IN_SCOREBOARD_PENALTIES", payload: localShowAliasInScoreboard });
        } else {
            // Player selection is OFF, but team usage is ON
            dispatch({ type: "SET_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR", payload: false });
            dispatch({ type: "SET_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST", payload: false });
            dispatch({ type: "SET_SHOW_ALIAS_IN_SCOREBOARD_PENALTIES", payload: false });
        }
      } else {
        // Team usage is OFF, all sub-settings must be OFF
        dispatch({ type: "SET_ENABLE_PLAYER_SELECTION_FOR_PENALTIES", payload: false });
        dispatch({ type: "SET_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR", payload: false });
        dispatch({ type: "SET_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST", payload: false });
        dispatch({ type: "SET_SHOW_ALIAS_IN_SCOREBOARD_PENALTIES", payload: false });
      }
      
      setIsDirtyLocal(false);
      return true; 
    },
    handleDiscard: () => {
      setLocalEnableTeamUsage(state.enableTeamSelectionInMiniScoreboard);
      setLocalEnablePlayerSelection(state.enablePlayerSelectionForPenalties);
      setLocalShowAliasInSelector(state.showAliasInPenaltyPlayerSelector);
      setLocalShowAliasInControlsList(state.showAliasInControlsPenaltyList);
      setLocalShowAliasInScoreboard(state.showAliasInScoreboardPenalties);
      setIsDirtyLocal(false);
    },
    getIsDirty: () => {
      if (localEnableTeamUsage !== state.enableTeamSelectionInMiniScoreboard) return true;
      if (localEnablePlayerSelection !== state.enablePlayerSelectionForPenalties) return true;
      if (localShowAliasInSelector !== state.showAliasInPenaltyPlayerSelector) return true;
      if (localShowAliasInControlsList !== state.showAliasInControlsPenaltyList) return true;
      if (localShowAliasInScoreboard !== state.showAliasInScoreboardPenalties) return true;
      return false;
    },
  }));
  
  const handleMasterToggleChange = (checked: boolean) => {
    setLocalEnableTeamUsage(checked);
    markDirty();
    if (!checked) {
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
        setLocalShowAliasInScoreboard(false); // Also disable scoreboard alias if player selection is off
    }
  };

  return (
    <ControlCardWrapper title="Configuración de Display (Alias y Selección)">
      <div className="space-y-6">
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

        <div className={cn(
          "space-y-4 transition-opacity duration-300",
          !localEnableTeamUsage && "opacity-50 pointer-events-none"
        )}>
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
                
                <div className="flex items-center justify-between p-4 border rounded-md bg-muted/30">
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
                      disabled={!localEnableTeamUsage || !localEnablePlayerSelection}
                  />
                </div>
            </div>
        </div>
      </div>
    </ControlCardWrapper>
  );
});

TeamSettingsCard.displayName = "TeamSettingsCard";
