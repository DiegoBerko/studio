
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { DurationSettingsCard, type DurationSettingsCardRef } from "@/components/config/duration-settings-card";
import { PenaltySettingsCard, type PenaltySettingsCardRef } from "@/components/config/penalty-settings-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Undo2, Upload, Download } from 'lucide-react';
import { useGameState, type ConfigFields } from '@/contexts/game-state-context';
import { Separator } from '@/components/ui/separator';
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

export default function ConfigPage() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const durationSettingsRef = useRef<DurationSettingsCardRef>(null);
  const penaltySettingsRef = useRef<PenaltySettingsCardRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localConfigName, setLocalConfigName] = useState(state.configName || '');
  const [isConfigNameDirty, setIsConfigNameDirty] = useState(false);
  const [isDurationDirty, setIsDurationDirty] = useState(false);
  const [isPenaltyDirty, setIsPenaltyDirty] = useState(false);

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [currentExportFilename, setCurrentExportFilename] = useState('');

  const pageIsDirty = isConfigNameDirty || isDurationDirty || isPenaltyDirty;

  useEffect(() => {
    if (!isConfigNameDirty) {
      setLocalConfigName(state.configName || '');
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
      setLocalConfigName(state.configName || '');
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

        // Basic validation for a potentially valid config file
        if (!importedConfig.configName && !importedConfig.defaultPeriodDuration && !importedConfig.defaultWarmUpDuration) {
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
        };

        dispatch({ type: 'LOAD_CONFIG_FROM_FILE', payload: newConfigFromFile });
        
        durationSettingsRef.current?.handleDiscard(); 
        penaltySettingsRef.current?.handleDiscard(); 
        setLocalConfigName((newConfigFromFile.configName || '')); 
        setIsConfigNameDirty(false); 

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
  
  useEffect(() => {
    if (!isConfigNameDirty) { 
        setLocalConfigName(state.configName || ''); 
    }
  }, [state.configName, state.defaultWarmUpDuration, state.defaultPeriodDuration, state.defaultOTPeriodDuration, state.defaultBreakDuration, state.defaultPreOTBreakDuration, state.defaultTimeoutDuration, state.maxConcurrentPenalties, state.autoStartWarmUp, state.autoStartBreaks, state.autoStartPreOTBreaks, state.autoStartTimeouts, state.numberOfRegularPeriods, state.numberOfOvertimePeriods, isConfigNameDirty]);


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
          <Button onClick={prepareExportConfig} variant="outline" className="flex-1">
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
    </div>
  );
}
