
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { DurationSettingsCard, type DurationSettingsCardRef } from "@/components/config/duration-settings-card";
import { PenaltySettingsCard, type PenaltySettingsCardRef } from "@/components/config/penalty-settings-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Undo2, Upload, Download } from 'lucide-react';
import { useGameState, type ConfigFields } from '@/contexts/game-state-context'; // Import ConfigFields
import { Separator } from '@/components/ui/separator';

export default function ConfigPage() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const durationSettingsRef = useRef<DurationSettingsCardRef>(null);
  const penaltySettingsRef = useRef<PenaltySettingsCardRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localConfigName, setLocalConfigName] = useState(state.configName);
  const [isConfigNameDirty, setIsConfigNameDirty] = useState(false);
  const [isDurationDirty, setIsDurationDirty] = useState(false);
  const [isPenaltyDirty, setIsPenaltyDirty] = useState(false);

  const pageIsDirty = isConfigNameDirty || isDurationDirty || isPenaltyDirty;

  useEffect(() => {
    if (!isConfigNameDirty) {
      setLocalConfigName(state.configName);
    }
  }, [state.configName, isConfigNameDirty]);

  const handleSaveAll = () => {
    let configNameSaveSuccess = true;
    let durationSaveSuccess = true;
    let penaltySaveSuccess = true;

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

    if (durationSettingsRef.current?.getIsDirty()) {
      durationSaveSuccess = durationSettingsRef.current.handleSave();
    }
    if (penaltySettingsRef.current?.getIsDirty()) {
      penaltySaveSuccess = penaltySettingsRef.current.handleSave();
    }

    if (configNameSaveSuccess && durationSaveSuccess && penaltySaveSuccess) {
      toast({
        title: "Configuración Guardada",
        description: "Todos los cambios han sido guardados exitosamente.",
      });
    } else if (!configNameSaveSuccess) {
      // Toast already shown for config name error
    }
     else {
      toast({
        title: "Error al Guardar",
        description: "Algunas configuraciones no pudieron ser guardadas. Revisa los campos.",
        variant: "destructive",
      });
    }
  };

  const handleDiscardAll = () => {
    if (isConfigNameDirty) {
      setLocalConfigName(state.configName);
      setIsConfigNameDirty(false);
    }
    if (durationSettingsRef.current?.getIsDirty()) {
      durationSettingsRef.current.handleDiscard();
    }
    if (penaltySettingsRef.current?.getIsDirty()) {
      penaltySettingsRef.current.handleDiscard();
    }
    toast({
      title: "Cambios Descartados",
      description: "Los cambios no guardados han sido revertidos.",
    });
  };

  const handleExportConfig = () => {
    const configToExport: ConfigFields = {
      configName: state.configName,
      defaultPeriodDuration: state.defaultPeriodDuration,
      defaultOTPeriodDuration: state.defaultOTPeriodDuration,
      defaultBreakDuration: state.defaultBreakDuration,
      defaultPreOTBreakDuration: state.defaultPreOTBreakDuration,
      defaultTimeoutDuration: state.defaultTimeoutDuration,
      maxConcurrentPenalties: state.maxConcurrentPenalties,
      autoStartBreaks: state.autoStartBreaks,
      autoStartPreOTBreaks: state.autoStartPreOTBreaks,
      autoStartTimeouts: state.autoStartTimeouts,
      numberOfRegularPeriods: state.numberOfRegularPeriods,
      numberOfOvertimePeriods: state.numberOfOvertimePeriods,
    };
    const jsonString = JSON.stringify(configToExport, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `icevision_config_${state.configName.trim().toLowerCase().replace(/\s+/g, '_') || 'default'}.json`;
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
    toast({
      title: "Configuración Exportada",
      description: `Archivo ${fileName} descargado.`,
    });
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

        // Basic validation: check for at least one known key
        if (!importedConfig.configName && !importedConfig.defaultPeriodDuration) {
          throw new Error("Archivo de configuración no válido o formato incorrecto.");
        }
        
        // Ensure all config fields from the file are applied, defaulting to current state if a field is missing in the file
        const newConfigFromFile: Partial<ConfigFields> = {
          configName: importedConfig.configName ?? state.configName,
          defaultPeriodDuration: importedConfig.defaultPeriodDuration ?? state.defaultPeriodDuration,
          defaultOTPeriodDuration: importedConfig.defaultOTPeriodDuration ?? state.defaultOTPeriodDuration,
          defaultBreakDuration: importedConfig.defaultBreakDuration ?? state.defaultBreakDuration,
          defaultPreOTBreakDuration: importedConfig.defaultPreOTBreakDuration ?? state.defaultPreOTBreakDuration,
          defaultTimeoutDuration: importedConfig.defaultTimeoutDuration ?? state.defaultTimeoutDuration,
          maxConcurrentPenalties: importedConfig.maxConcurrentPenalties ?? state.maxConcurrentPenalties,
          autoStartBreaks: importedConfig.autoStartBreaks ?? state.autoStartBreaks,
          autoStartPreOTBreaks: importedConfig.autoStartPreOTBreaks ?? state.autoStartPreOTBreaks,
          autoStartTimeouts: importedConfig.autoStartTimeouts ?? state.autoStartTimeouts,
          numberOfRegularPeriods: importedConfig.numberOfRegularPeriods ?? state.numberOfRegularPeriods,
          numberOfOvertimePeriods: importedConfig.numberOfOvertimePeriods ?? state.numberOfOvertimePeriods,
        };

        dispatch({ type: 'LOAD_CONFIG_FROM_FILE', payload: newConfigFromFile });
        
        // Reset dirty states of child cards as their values are now directly from the new config
        durationSettingsRef.current?.handleDiscard(); // This will reset its local state to new global state
        penaltySettingsRef.current?.handleDiscard(); // This will reset its local state to new global state
        setLocalConfigName(newConfigFromFile.configName!); // Update local config name directly
        setIsConfigNameDirty(false); // Config name is now "clean" as it matches new global state

        toast({
          title: "Configuración Importada",
          description: `Configuración "${newConfigFromFile.configName}" cargada exitosamente.`,
        });
      } catch (error) {
        console.error("Error importing config:", error);
        toast({
          title: "Error al Importar",
          description: (error as Error).message || "No se pudo procesar el archivo de configuración.",
          variant: "destructive",
        });
      } finally {
        // Reset file input to allow importing the same file again
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };
  
  useEffect(() => {
    // This effect handles updates to localConfigName when state.configName changes due to import or other external factors
    if (!isConfigNameDirty) { // Only update if not dirty, to preserve user input
        setLocalConfigName(state.configName);
    }
    // Also, ensure child cards are synced if their base values change externally (e.g., from import)
    // This might involve triggering a 'reset' or 'sync' method on them if available, or relying on their internal useEffects
  }, [state.configName, state.defaultPeriodDuration /* add other relevant state config fields here */, isConfigNameDirty]);


  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-foreground">Configuración General</h1>
        {pageIsDirty && (
          <div className="flex gap-2">
            <Button onClick={handleSaveAll} size="sm">
              <Save className="mr-2 h-4 w-4" /> Guardar Cambios
            </Button>
            <Button onClick={handleDiscardAll} variant="outline" size="sm">
              <Undo2 className="mr-2 h-4 w-4" /> Descartar
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4 p-6 border rounded-md bg-card">
        <Label htmlFor="configName" className="text-lg font-medium">Nombre de la Configuración</Label>
        <Input
          id="configName"
          value={localConfigName}
          onChange={(e) => { setLocalConfigName(e.target.value); setIsConfigNameDirty(true); }}
          placeholder="ej. Formato 4vs4 Juvenil"
          className="text-base"
        />
        <p className="text-xs text-muted-foreground">
          Este nombre se usará para identificar la configuración al exportarla.
        </p>
      </div>
      
      <DurationSettingsCard ref={durationSettingsRef} onDirtyChange={setIsDurationDirty} />
      <PenaltySettingsCard ref={penaltySettingsRef} onDirtyChange={setIsPenaltyDirty} />

      {pageIsDirty && (
        <div className="mt-8 flex justify-end gap-2">
          <Button onClick={handleSaveAll}>
            <Save className="mr-2 h-4 w-4" /> Guardar Cambios
          </Button>
          <Button onClick={handleDiscardAll} variant="outline">
            <Undo2 className="mr-2 h-4 w-4" /> Descartar Cambios
          </Button>
        </div>
      )}

      <Separator className="my-10" />

      <div className="space-y-6 p-6 border rounded-md bg-card">
        <h2 className="text-xl font-semibold text-primary-foreground">Importar / Exportar Configuración</h2>
        <p className="text-sm text-muted-foreground">
          Guarda tu configuración actual en un archivo o carga una configuración previamente guardada.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleExportConfig} variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" /> Exportar Configuración
          </Button>
          <Button onClick={handleImportClick} variant="outline" className="flex-1">
            <Upload className="mr-2 h-4 w-4" /> Importar Configuración
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
    </div>
  );
}
