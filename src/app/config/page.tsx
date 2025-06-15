
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { DurationSettingsCard, type DurationSettingsCardRef } from "@/components/config/duration-settings-card";
import { PenaltySettingsCard, type PenaltySettingsCardRef } from "@/components/config/penalty-settings-card";
import { SoundSettingsCard, type SoundSettingsCardRef } from "@/components/config/sound-settings-card";
import { TeamSettingsCard, type TeamSettingsCardRef } from "@/components/config/team-settings-card";
import { CategorySettingsCard, type CategorySettingsCardRef } from "@/components/config/category-settings-card";
import { TeamsManagementTab } from '@/components/config/teams-management-tab';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Undo2, Upload, Download, RotateCcw } from 'lucide-react';
import { useGameState, type ConfigFields, type GameState } from '@/contexts/game-state-context'; // GameState for initialGlobalState
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

// Helper to get initial state for ConfigPage's configName reset
// (Simplified as full initialGlobalState is complex and not fully needed here)
const initialConfigStateForReset = {
  configName: "Configuración Predeterminada",
};


export default function ConfigPage() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const durationSettingsRef = useRef<DurationSettingsCardRef>(null);
  const penaltySettingsRef = useRef<PenaltySettingsCardRef>(null);
  const soundSettingsRef = useRef<SoundSettingsCardRef>(null);
  const teamSettingsRef = useRef<TeamSettingsCardRef>(null);
  const categorySettingsRef = useRef<CategorySettingsCardRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localConfigName, setLocalConfigName] = useState(state.configName || '');
  const [isConfigNameDirty, setIsConfigNameDirty] = useState(false);
  const [isDurationDirty, setIsDurationDirty] = useState(false);
  const [isPenaltyDirty, setIsPenaltyDirty] = useState(false);
  const [isSoundDirty, setIsSoundDirty] = useState(false);
  const [isTeamSettingsDirty, setIsTeamSettingsDirty] = useState(false);
  const [isCategorySettingsDirty, setIsCategorySettingsDirty] = useState(false);
  
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [currentExportFilename, setCurrentExportFilename] = useState('');
  const [isResetConfigDialogOpen, setIsResetConfigDialogOpen] = useState(false);

  useEffect(() => {
    // Sync local config name if global state changes and this component isn't dirty for configName
    if (!isConfigNameDirty) {
      setLocalConfigName(state.configName || '');
    }
  }, [state.configName, isConfigNameDirty]);

  const handleLocalConfigNameChange = (newName: string) => {
    setLocalConfigName(newName);
    setIsConfigNameDirty(newName !== (state.configName || ''));
  };

  const pageIsDirty = isConfigNameDirty || isDurationDirty || isPenaltyDirty || isSoundDirty || isTeamSettingsDirty || isCategorySettingsDirty;

  const handleSaveAllConfig = () => {
    let configNameSaveSuccess = true;
    let durationSaveSuccess = true;
    let penaltySaveSuccess = true;
    let soundSaveSuccess = true;
    let teamSettingsSaveSuccess = true;
    let categorySettingsSaveSuccess = true;

    if (isConfigNameDirty) {
      if (localConfigName.trim() === "") {
        toast({
          title: "Nombre de Configuración Requerido",
          description: "El nombre de la configuración no puede estar vacío.",
          variant: "destructive",
        });
        configNameSaveSuccess = false;
      } else {
        dispatch({ type: 'SET_CONFIG_NAME', payload: localConfigName.trim() });
        setIsConfigNameDirty(false); 
      }
    }

    if (durationSettingsRef.current && isDurationDirty) {
      durationSaveSuccess = durationSettingsRef.current.handleSave();
      if (durationSaveSuccess) setIsDurationDirty(false);
    }
    if (penaltySettingsRef.current && isPenaltyDirty) {
      penaltySaveSuccess = penaltySettingsRef.current.handleSave();
      if (penaltySaveSuccess) setIsPenaltyDirty(false);
    }
    if (soundSettingsRef.current && isSoundDirty) {
      soundSaveSuccess = soundSettingsRef.current.handleSave();
      if (soundSaveSuccess) setIsSoundDirty(false);
    }
    if (teamSettingsRef.current && isTeamSettingsDirty) {
      teamSettingsSaveSuccess = teamSettingsRef.current.handleSave();
      if (teamSettingsSaveSuccess) setIsTeamSettingsDirty(false);
    }
    if (categorySettingsRef.current && isCategorySettingsDirty) {
      categorySettingsSaveSuccess = categorySettingsRef.current.handleSave();
      if (categorySettingsSaveSuccess) setIsCategorySettingsDirty(false);
    }

    if (configNameSaveSuccess && durationSaveSuccess && penaltySaveSuccess && soundSaveSuccess && teamSettingsSaveSuccess && categorySettingsSaveSuccess) {
      toast({
        title: "Configuración Guardada",
        description: "Todos los cambios de configuración han sido guardados exitosamente.",
      });
    } else if (!configNameSaveSuccess) {
      // Toast already shown for config name
    } else {
      toast({
        title: "Error al Guardar Configuración",
        description: "Algunas configuraciones no pudieron ser guardadas. Revisa los campos.",
        variant: "destructive",
      });
    }
  };

  const handleDiscardAllConfig = () => {
    if (isConfigNameDirty) {
      setLocalConfigName(state.configName || '');
      setIsConfigNameDirty(false);
    }
    if (durationSettingsRef.current && isDurationDirty) {
      durationSettingsRef.current.handleDiscard();
      setIsDurationDirty(false);
    }
    if (penaltySettingsRef.current && isPenaltyDirty) {
      penaltySettingsRef.current.handleDiscard();
      setIsPenaltyDirty(false);
    }
    if (soundSettingsRef.current && isSoundDirty) {
      soundSettingsRef.current.handleDiscard();
      setIsSoundDirty(false);
    }
    if (teamSettingsRef.current && isTeamSettingsDirty) {
      teamSettingsRef.current.handleDiscard();
      setIsTeamSettingsDirty(false);
    }
    if (categorySettingsRef.current && isCategorySettingsDirty) {
      categorySettingsRef.current.handleDiscard();
      setIsCategorySettingsDirty(false);
    }
    toast({
      title: "Cambios de Configuración Descartados",
      description: "Los cambios no guardados en la configuración han sido revertidos.",
    });
  };

  const prepareExportConfig = () => {
    const suggestedFilename = `icevision_config_${state.configName.trim().toLowerCase().replace(/\s+/g, '_') || 'default'}.json`;
    setCurrentExportFilename(suggestedFilename);
    setIsExportDialogOpen(true);
  };

  const performExport = (filename: string) => {
    if (!filename.trim().endsWith('.json')) {
        filename = filename.trim() + '.json';
    }
    if (filename.trim() === '.json'){
        toast({
            title: "Nombre de Archivo Inválido",
            description: "El nombre del archivo no puede estar vacío.",
            variant: "destructive",
        });
        return;
    }

    const configToExport: ConfigFields = {
      configName: state.configName,
      defaultWarmUpDuration: state.defaultWarmUpDuration,
      defaultPeriodDuration: state.defaultPeriodDuration,
      defaultOTPeriodDuration: state.defaultOTPeriodDuration,
      defaultBreakDuration: state.defaultBreakDuration,
      defaultPreOTBreakDuration: state.defaultPreOTBreakDuration,
      defaultTimeoutDuration: state.defaultTimeoutDuration,
      maxConcurrentPenalties: state.maxConcurrentPenalties,
      autoStartWarmUp: state.autoStartWarmUp,
      autoStartBreaks: state.autoStartBreaks,
      autoStartPreOTBreaks: state.autoStartPreOTBreaks,
      autoStartTimeouts: state.autoStartTimeouts,
      numberOfRegularPeriods: state.numberOfRegularPeriods,
      numberOfOvertimePeriods: state.numberOfOvertimePeriods,
      playersPerTeamOnIce: state.playersPerTeamOnIce,
      playSoundAtPeriodEnd: state.playSoundAtPeriodEnd,
      customHornSoundDataUrl: state.customHornSoundDataUrl,
      enableTeamSelectionInMiniScoreboard: state.enableTeamSelectionInMiniScoreboard,
      enablePlayerSelectionForPenalties: state.enablePlayerSelectionForPenalties,
      showAliasInPenaltyPlayerSelector: state.showAliasInPenaltyPlayerSelector,
      showAliasInControlsPenaltyList: state.showAliasInControlsPenaltyList,
      showAliasInScoreboardPenalties: state.showAliasInScoreboardPenalties,
      availableCategories: state.availableCategories,
      selectedMatchCategory: state.selectedMatchCategory,
    };
    const jsonString = JSON.stringify(configToExport, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = href;
    link.download = filename.trim();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);

    toast({
      title: "Configuración Exportada",
      description: `Archivo ${filename.trim()} descargado.`,
    });
    setIsExportDialogOpen(false);
  };


  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("Error al leer el archivo.");
        const importedConfig = JSON.parse(text) as Partial<ConfigFields>;

        if (!importedConfig.configName &&
            importedConfig.defaultPeriodDuration === undefined &&
            importedConfig.playersPerTeamOnIce === undefined &&
            importedConfig.playSoundAtPeriodEnd === undefined &&
            importedConfig.enablePlayerSelectionForPenalties === undefined &&
            importedConfig.availableCategories === undefined
           ) {
          throw new Error("Archivo de configuración no válido o formato incorrecto.");
        }

        const newConfigFromFile: Partial<ConfigFields> = {
          configName: importedConfig.configName ?? state.configName,
          defaultWarmUpDuration: importedConfig.defaultWarmUpDuration ?? state.defaultWarmUpDuration,
          defaultPeriodDuration: importedConfig.defaultPeriodDuration ?? state.defaultPeriodDuration,
          defaultOTPeriodDuration: importedConfig.defaultOTPeriodDuration ?? state.defaultOTPeriodDuration,
          defaultBreakDuration: importedConfig.defaultBreakDuration ?? state.defaultBreakDuration,
          defaultPreOTBreakDuration: importedConfig.defaultPreOTBreakDuration ?? state.defaultPreOTBreakDuration,
          defaultTimeoutDuration: importedConfig.defaultTimeoutDuration ?? state.defaultTimeoutDuration,
          maxConcurrentPenalties: importedConfig.maxConcurrentPenalties ?? state.maxConcurrentPenalties,
          autoStartWarmUp: importedConfig.autoStartWarmUp ?? state.autoStartWarmUp,
          autoStartBreaks: importedConfig.autoStartBreaks ?? state.autoStartBreaks,
          autoStartPreOTBreaks: importedConfig.autoStartPreOTBreaks ?? state.autoStartPreOTBreaks,
          autoStartTimeouts: importedConfig.autoStartTimeouts ?? state.autoStartTimeouts,
          numberOfRegularPeriods: importedConfig.numberOfRegularPeriods ?? state.numberOfRegularPeriods,
          numberOfOvertimePeriods: importedConfig.numberOfOvertimePeriods ?? state.numberOfOvertimePeriods,
          playersPerTeamOnIce: importedConfig.playersPerTeamOnIce ?? state.playersPerTeamOnIce,
          playSoundAtPeriodEnd: importedConfig.playSoundAtPeriodEnd ?? state.playSoundAtPeriodEnd,
          customHornSoundDataUrl: importedConfig.customHornSoundDataUrl === undefined ? state.customHornSoundDataUrl : importedConfig.customHornSoundDataUrl,
          enableTeamSelectionInMiniScoreboard: importedConfig.enableTeamSelectionInMiniScoreboard ?? state.enableTeamSelectionInMiniScoreboard,
          enablePlayerSelectionForPenalties: importedConfig.enablePlayerSelectionForPenalties ?? state.enablePlayerSelectionForPenalties,
          showAliasInPenaltyPlayerSelector: importedConfig.showAliasInPenaltyPlayerSelector ?? state.showAliasInPenaltyPlayerSelector,
          showAliasInControlsPenaltyList: importedConfig.showAliasInControlsPenaltyList ?? state.showAliasInControlsPenaltyList,
          showAliasInScoreboardPenalties: importedConfig.showAliasInScoreboardPenalties ?? state.showAliasInScoreboardPenalties,
          availableCategories: importedConfig.availableCategories ?? state.availableCategories,
          selectedMatchCategory: importedConfig.selectedMatchCategory ?? state.selectedMatchCategory,
        };

        dispatch({ type: 'LOAD_CONFIG_FROM_FILE', payload: newConfigFromFile });
        setLocalConfigName(newConfigFromFile.configName || '');
        setIsConfigNameDirty(false);
        setIsDurationDirty(false);
        setIsPenaltyDirty(false);
        setIsSoundDirty(false);
        setIsTeamSettingsDirty(false);
        setIsCategorySettingsDirty(false);
        // Cards will re-sync due to global state change and their internal useEffects

        toast({
          title: "Configuración Importada",
          description: `Configuración "${newConfigFromFile.configName || ''}" cargada exitosamente.`,
        });
      } catch (error) {
        console.error("Error importing config:", error);
        toast({
          title: "Error al Importar",
          description: (error as Error).message || "No se pudo procesar el archivo de configuración.",
          variant: "destructive",
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  const handlePrepareResetConfig = () => {
    setIsResetConfigDialogOpen(true);
  };

  const performConfigReset = () => {
    dispatch({ type: 'RESET_CONFIG_TO_DEFAULTS' });
    setLocalConfigName(initialConfigStateForReset.configName);
    setIsConfigNameDirty(false);
    setIsDurationDirty(false);
    setIsPenaltyDirty(false);
    setIsSoundDirty(false);
    setIsTeamSettingsDirty(false);
    setIsCategorySettingsDirty(false);
    // Cards will re-sync due to global state change

    toast({
      title: "Configuración Restablecida",
      description: "Todas las configuraciones han vuelto a sus valores predeterminados.",
    });
    setIsResetConfigDialogOpen(false);
  };

  const tabContentClassName = "mt-6 p-6 border rounded-md bg-card/30 shadow-sm";

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-foreground">Configuración General</h1>
        {pageIsDirty && (
          <div className="flex gap-2">
            <Button onClick={handleSaveAllConfig} size="sm">
              <Save className="mr-2 h-4 w-4" /> Guardar Config.
            </Button>
            <Button onClick={handleDiscardAllConfig} variant="outline" size="sm">
              <Undo2 className="mr-2 h-4 w-4" /> Descartar Config.
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4 p-6 border rounded-md bg-card">
        <Label htmlFor="configName" className="text-lg font-medium">Nombre de la Configuración</Label>
        <Input
          id="configName"
          value={localConfigName}
          onChange={(e) => handleLocalConfigNameChange(e.target.value)}
          placeholder="ej. Formato 4vs4 Juvenil"
          className="text-base"
        />
        <p className="text-xs text-muted-foreground">
          Este nombre se usará para identificar la configuración al exportarla.
        </p>
      </div>
      
      <Tabs defaultValue="gameFormat" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="gameFormat">Formato Juego</TabsTrigger>
          <TabsTrigger value="timings">Tiempos</TabsTrigger>
          <TabsTrigger value="sound">Sonido</TabsTrigger>
          <TabsTrigger value="teamsAndDisplay">Equipos y Display</TabsTrigger>
        </TabsList>
        <TabsContent value="gameFormat" className={tabContentClassName} /* Removed forceMount */>
          <div className="space-y-6">
            <PenaltySettingsCard ref={penaltySettingsRef} onDirtyChange={setIsPenaltyDirty} />
          </div>
        </TabsContent>
        <TabsContent value="timings" className={tabContentClassName} /* Removed forceMount */>
           <DurationSettingsCard ref={durationSettingsRef} onDirtyChange={setIsDurationDirty} />
        </TabsContent>
        <TabsContent value="sound" className={tabContentClassName} /* Removed forceMount */>
           <SoundSettingsCard ref={soundSettingsRef} onDirtyChange={setIsSoundDirty} />
        </TabsContent>
        <TabsContent value="teamsAndDisplay" className={tabContentClassName} /* Removed forceMount */>
          <div className="space-y-8">
            <CategorySettingsCard ref={categorySettingsRef} onDirtyChange={setIsCategorySettingsDirty} />
            <Separator />
            <TeamsManagementTab />
            <Separator />
            <TeamSettingsCard ref={teamSettingsRef} onDirtyChange={setIsTeamSettingsDirty}/>
          </div>
        </TabsContent>
      </Tabs>

      {pageIsDirty && (
        <div className="mt-8 flex justify-end gap-2">
          <Button onClick={handleSaveAllConfig}>
            <Save className="mr-2 h-4 w-4" /> Guardar Configuración
          </Button>
          <Button onClick={handleDiscardAllConfig} variant="outline">
            <Undo2 className="mr-2 h-4 w-4" /> Descartar Configuración
          </Button>
        </div>
      )}

      <Separator className="my-10" />

      <div className="space-y-6 p-6 border rounded-md bg-card">
        <h2 className="text-xl font-semibold text-primary-foreground">Acciones de Configuración</h2>
        <p className="text-sm text-muted-foreground">
          Guarda tu configuración general actual en un archivo, carga una configuración previamente guardada, o restablece todas las configuraciones a sus valores predeterminados de fábrica.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={prepareExportConfig} variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" /> Exportar Configuración
          </Button>
          <Button onClick={handleImportClick} variant="outline" className="flex-1">
            <Upload className="mr-2 h-4 w-4" /> Importar Configuración
          </Button>
          <Button onClick={handlePrepareResetConfig} variant="destructive" >
            <RotateCcw className="mr-2 h-4 w-4" /> Restablecer
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      {isExportDialogOpen && (
        <AlertDialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Nombre del Archivo de Exportación</AlertDialogTitle>
              <AlertDialogDescription>
                Ingresa el nombre deseado para el archivo de configuración. Se añadirá la extensión ".json" automáticamente si no se incluye.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={currentExportFilename}
              onChange={(e) => setCurrentExportFilename(e.target.value)}
              placeholder="nombre_de_configuracion.json"
              className="my-4"
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsExportDialogOpen(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => performExport(currentExportFilename)}>
                Exportar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isResetConfigDialogOpen && (
        <AlertDialog open={isResetConfigDialogOpen} onOpenChange={setIsResetConfigDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Restablecimiento</AlertDialogTitle>
              <AlertDialogDescription>
                Esto restablecerá TODAS las configuraciones de esta página (nombre, duraciones, máximos, arranques automáticos, número de períodos, jugadores en cancha, sonido, configuraciones de equipo/alias y categorías) a sus valores predeterminados de fábrica. Esta acción no se puede deshacer. ¿Estás seguro?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsResetConfigDialogOpen(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={performConfigReset}>
                Restablecer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
