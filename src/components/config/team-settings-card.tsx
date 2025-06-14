"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useGameState } from "@/contexts/game-state-context";
import { ControlCardWrapper } from "@/components/controls/control-card-wrapper";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

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

  const [localEnableTeamSelection, setLocalEnableTeamSelection] = useState(state.enableTeamSelectionInMiniScoreboard);
  const [localEnablePlayerSelection, setLocalEnablePlayerSelection] = useState(state.enablePlayerSelectionForPenalties);
  const [localShowAliasInSelector, setLocalShowAliasInSelector] = useState(state.showAliasInPenaltyPlayerSelector);
  const [localShowAliasInControlsList, setLocalShowAliasInControlsList] = useState(state.showAliasInControlsPenaltyList);
  const [localShowAliasInScoreboard, setLocalShowAliasInScoreboard] = useState(state.showAliasInScoreboardPenalties);
  
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setLocalEnableTeamSelection(state.enableTeamSelectionInMiniScoreboard);
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

      dispatch({ type: "SET_ENABLE_TEAM_SELECTION_IN_MINI_SCOREBOARD", payload: localEnableTeamSelection });
      dispatch({ type: "SET_ENABLE_PLAYER_SELECTION_FOR_PENALTIES", payload: localEnablePlayerSelection });
      dispatch({ type: "SET_SHOW_ALIAS_IN_PENALTY_PLAYER_SELECTOR", payload: localShowAliasInSelector });
      dispatch({ type: "SET_SHOW_ALIAS_IN_CONTROLS_PENALTY_LIST", payload: localShowAliasInControlsList });
      dispatch({ type: "SET_SHOW_ALIAS_IN_SCOREBOARD_PENALTIES", payload: localShowAliasInScoreboard });
      
      setIsDirty(false);
      return true; 
    },
    handleDiscard: () => {
      setLocalEnableTeamSelection(state.enableTeamSelectionInMiniScoreboard);
      setLocalEnablePlayerSelection(state.enablePlayerSelectionForPenalties);
      setLocalShowAliasInSelector(state.showAliasInPenaltyPlayerSelector);
      setLocalShowAliasInControlsList(state.showAliasInControlsPenaltyList);
      setLocalShowAliasInScoreboard(state.showAliasInScoreboardPenalties);
      setIsDirty(false);
    },
    getIsDirty: () => isDirty,
  }));

  return (
    <ControlCardWrapper title="Configuración de Equipos y Alias">
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-md bg-muted/20">
          <Label htmlFor="enableTeamSelectionSwitch" className="flex flex-col space-y-1">
            <span>Habilitar selección de equipo en Mini Marcador</span>
            <span className="font-normal leading-snug text-muted-foreground text-xs">
              Permite usar la lupa para buscar y seleccionar equipos en la página de Controles.
            </span>
          </Label>
          <Switch
            id="enableTeamSelectionSwitch"
            checked={localEnableTeamSelection}
            onCheckedChange={(checked) => { setLocalEnableTeamSelection(checked); markDirty(); }}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-md bg-muted/20">
          <Label htmlFor="enablePlayerSelectionSwitch" className="flex flex-col space-y-1">
            <span>Habilitar selector de jugador para penalidades</span>
            <span className="font-normal leading-snug text-muted-foreground text-xs">
              Si un equipo está cargado, permite seleccionar jugadores de una lista al añadir penalidades.
            </span>
          </Label>
          <Switch
            id="enablePlayerSelectionSwitch"
            checked={localEnablePlayerSelection}
            onCheckedChange={(checked) => { setLocalEnablePlayerSelection(checked); markDirty(); }}
          />
        </div>

        {/* Conditional Switches based on localEnablePlayerSelection */}
        <div className={`space-y-4 transition-opacity duration-300 ${localEnablePlayerSelection ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="flex items-center justify-between p-4 border rounded-md bg-muted/20 ml-0 sm:ml-4">
              <Label htmlFor="showAliasInSelectorSwitch" className="flex flex-col space-y-1">
                <span>Mostrar alias en lista del selector de jugador</span>
                <span className="font-normal leading-snug text-muted-foreground text-xs">
                  (Si selector activado) Muestra el nombre/alias junto al número en el desplegable.
                </span>
              </Label>
              <Switch
                id="showAliasInSelectorSwitch"
                checked={localShowAliasInSelector}
                onCheckedChange={(checked) => { setLocalShowAliasInSelector(checked); markDirty(); }}
                disabled={!localEnablePlayerSelection}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-md bg-muted/20 ml-0 sm:ml-4">
              <Label htmlFor="showAliasInControlsListSwitch" className="flex flex-col space-y-1">
                <span>Mostrar alias en lista de penalidades (Controles)</span>
                <span className="font-normal leading-snug text-muted-foreground text-xs">
                  (Si selector activado) Muestra el alias en la lista de penalidades activas en la página de Controles.
                </span>
              </Label>
              <Switch
                id="showAliasInControlsListSwitch"
                checked={localShowAliasInControlsList}
                onCheckedChange={(checked) => { setLocalShowAliasInControlsList(checked); markDirty(); }}
                disabled={!localEnablePlayerSelection}
              />
            </div>
        </div>

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
          />
        </div>
      </div>
    </ControlCardWrapper>
  );
});

TeamSettingsCard.displayName = "TeamSettingsCard";
