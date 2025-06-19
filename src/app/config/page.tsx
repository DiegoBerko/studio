
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Save, Undo2, Upload, Download, RotateCcw, FileJson } from 'lucide-react';
import { useGameState, type ConfigFields, type CategoryData } from '@/contexts/game-state-context';
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

const initialFormatAndTimingsConfigNameForReset = "Formato y Tiempos Predeterminado";

const VALID_TAB_VALUES = ["formatAndTimings", "soundAndDisplay", "categoriesAndTeams"];

type ExportableFormatAndTimingsConfig = Pick<ConfigFields,
  | 'formatAndTimingsConfigName'
  | 'defaultWarmUpDuration' | 'defaultPeriodDuration' | 'defaultOTPeriodDuration'
  | 'defaultBreakDuration' | 'defaultPreOTBreakDuration' | 'defaultTimeoutDuration'
  | 'maxConcurrentPenalties'
  | 'autoStartWarmUp' | 'autoStartBreaks' | 'autoStartPreOTBreaks' | 'autoStartTimeouts'
  | 'numberOfRegularPeriods' | 'numberOfOvertimePeriods'
  | 'playersPerTeamOnIce'
>;

type ExportableSoundAndDisplayConfig = Pick<ConfigFields,
  | 'playSoundAtPeriodEnd' | 'customHornSoundDataUrl'
  | 'enableTeamSelectionInMiniScoreboard' | 'enablePlayerSelectionForPenalties'
  | 'showAliasInPenaltyPlayerSelector' | 'showAliasInControlsPenaltyList' | 'showAliasInScoreboardPenalties'
  | 'isMonitorModeEnabled'
>;

type ExportableCategoriesConfig = Pick<ConfigFields, 'availableCategories' | 'selectedMatchCategory'>;


export default function ConfigPage() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const durationSettingsRef = useRef<DurationSettingsCardRef>(null);
  const penaltySettingsRef = useRef<PenaltySettingsCardRef>(null);
  const soundSettingsRef = useRef<SoundSettingsCardRef>(null);
  const teamSettingsRef = useRef<TeamSettingsCardRef>(null);
  const categorySettingsRef = useRef<CategorySettingsCardRef>(null);
  
  const fileInputRefFormatAndTimings = useRef<HTMLInputElement>(null);
  const fileInputRefSoundAndDisplay = useRef<HTMLInputElement>(null);
  const fileInputRefCategories = useRef<HTMLInputElement>(null);


  const [localFormatAndTimingsConfigName, setLocalFormatAndTimingsConfigName] = useState(state.formatAndTimingsConfigName || '');
  const [isFormatAndTimingsConfigNameDirty, setIsFormatAndTimingsConfigNameDirty] = useState(false);
  
  const [isDurationDirty, setIsDurationDirty] = useState(false);
  const [isPenaltyDirty, setIsPenaltyDirty] = useState(false);
  const [isSoundDirty, setIsSoundDirty] = useState(false);
  const [isTeamSettingsDirty, setIsTeamSettingsDirty] = useState(false);
  const [isCategorySettingsDirty, setIsCategorySettingsDirty] = useState(false);
  
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [currentExportFilename, setCurrentExportFilename] = useState('');
  const [currentExportAction, setCurrentExportAction] = useState<(() => void) | null>(null);

  const [isResetConfigDialogOpen, setIsResetConfigDialogOpen] = useState(false);

  const urlTab = searchParams.get('tab');
  const initialTab = urlTab && VALID_TAB_VALUES.includes(urlTab) ? urlTab : "formatAndTimings";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (!isFormatAndTimingsConfigNameDirty) {
      setLocalFormatAndTimingsConfigName(state.formatAndTimingsConfigName || '');
    }
  }, [state.formatAndTimingsConfigName, isFormatAndTimingsConfigNameDirty]);

  const handleLocalFormatAndTimingsConfigNameChange = (newName: string) => {
    setLocalFormatAndTimingsConfigName(newName);
    setIsFormatAndTimingsConfigNameDirty(newName !== (state.formatAndTimingsConfigName || ''));
  };

  const pageIsDirty = isFormatAndTimingsConfigNameDirty || isDurationDirty || isPenaltyDirty || isSoundDirty || isTeamSettingsDirty || isCategorySettingsDirty;

  const handleSaveAllConfig = () => {
    let formatAndTimingsNameSaveSuccess = true;
    let durationSaveSuccess = true;
    let penaltySaveSuccess = true;
    let soundSaveSuccess = true;
    let teamSettingsSaveSuccess = true;
    let categorySettingsSaveSuccess = true;

    if (isFormatAndTimingsConfigNameDirty) {
      if (localFormatAndTimingsConfigName.trim() === "") {
        toast({
          title: "Nombre de Configuración F&T Requerido",
          description: "El nombre de la configuración de Formato y Tiempos no puede estar vacío.",
          variant: "destructive",
        });
        formatAndTimingsNameSaveSuccess = false;
      } else {
        dispatch({ type: 'SET_FORMAT_AND_TIMINGS_CONFIG_NAME', payload: localFormatAndTimingsConfigName.trim() });
        setIsFormatAndTimingsConfigNameDirty(false); 
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

    if (formatAndTimingsNameSaveSuccess && durationSaveSuccess && penaltySaveSuccess && soundSaveSuccess && teamSettingsSaveSuccess && categorySettingsSaveSuccess) {
      toast({
        title: "Configuración Guardada",
        description: "Todos los cambios de configuración han sido guardados exitosamente.",
      });
    } else if (!formatAndTimingsNameSaveSuccess) {
      // Toast already shown
    } else {
      toast({
        title: "Error al Guardar Configuración",
        description: "Algunas configuraciones no pudieron ser guardadas. Revisa los campos.",
        variant: "destructive",
      });
    }
  };

  const handleDiscardAllConfig = () => {
    if (isFormatAndTimingsConfigNameDirty) {
      setLocalFormatAndTimingsConfigName(state.formatAndTimingsConfigName || '');
      setIsFormatAndTimingsConfigNameDirty(false);
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

  const performExportActionWithDialog = (filename: string) => {
    if (!currentExportAction) return;

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
    localStorage.setItem('lastExportFilename', filename.trim()); // Save for next time
    currentExportAction(); // This will use the validated currentExportFilename
    setIsExportDialogOpen(false);
    setCurrentExportAction(null);
  };

  const exportSection = (sectionName: string, configData: object, suggestedBaseName: string) => {
    const lastFilename = localStorage.getItem('lastExportFilename');
    const suggestedFilename = lastFilename || `${suggestedBaseName}_config.json`;
    setCurrentExportFilename(suggestedFilename);

    setCurrentExportAction(() => () => { // This inner function is what performExportActionWithDialog calls
        const jsonString = JSON.stringify(configData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = currentExportFilename.trim(); // Use the (potentially edited) filename from dialog
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
        toast({
            title: `${sectionName} Exportado`,
            description: `Archivo ${currentExportFilename.trim()} descargado.`,
        });
    });
    setIsExportDialogOpen(true);
  };

  const handleExportFormatAndTimings = () => {
    const configToExport: ExportableFormatAndTimingsConfig = {
      formatAndTimingsConfigName: state.formatAndTimingsConfigName,
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
      numberOfRegularPeriods: state.numberOfRegularPeriods,
      numberOfOvertimePeriods: state.numberOfOvertimePeriods,
      playersPerTeamOnIce: state.playersPerTeamOnIce,
    };
    exportSection("Configuración de Formato y Tiempos", configToExport, "icevision_formato_tiempos");
  };

  const handleExportSoundAndDisplay = () => {
    const configToExport: ExportableSoundAndDisplayConfig = {
      playSoundAtPeriodEnd: state.playSoundAtPeriodEnd,
      customHornSoundDataUrl: state.customHornSoundDataUrl,
      enableTeamSelectionInMiniScoreboard: state.enableTeamSelectionInMiniScoreboard,
      enablePlayerSelectionForPenalties: state.enablePlayerSelectionForPenalties,
      showAliasInPenaltyPlayerSelector: state.showAliasInPenaltyPlayerSelector,
      showAliasInControlsPenaltyList: state.showAliasInControlsPenaltyList,
      showAliasInScoreboardPenalties: state.showAliasInScoreboardPenalties,
      isMonitorModeEnabled: state.isMonitorModeEnabled,
    };
    exportSection("Configuración de Sonido y Display", configToExport, "icevision_sonido_display");
  };
  
  const handleExportCategories = () => {
    const configToExport: ExportableCategoriesConfig = {
      availableCategories: state.availableCategories,
      selectedMatchCategory: state.selectedMatchCategory,
    };
    exportSection("Configuración de Categorías", configToExport, "icevision_categorias");
  };
  
  const genericImportHandler = (
    event: React.ChangeEvent<HTMLInputElement>,
    sectionName: string,
    requiredFields: string[],
    dispatchActionType: 
        | 'LOAD_FORMAT_AND_TIMINGS_CONFIG' 
        | 'LOAD_SOUND_AND_DISPLAY_CONFIG' 
        | 'LOAD_CATEGORIES_CONFIG',
    fileInputRef: React.RefObject<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("Error al leer el archivo.");
        const importedConfig = JSON.parse(text) as Partial<ConfigFields>;

        const missingFields = requiredFields.filter(field => !(field in importedConfig));
        if (missingFields.length > 0 && requiredFields.length > 0) { // Check if any required fields are actually expected
          throw new Error(`Archivo de configuración para ${sectionName} no válido. Faltan campos: ${missingFields.join(', ')}`);
        }
        
        // Type assertion for payload
        let payload: any;
        if (dispatchActionType === 'LOAD_CATEGORIES_CONFIG') {
            payload = {
                availableCategories: importedConfig.availableCategories,
                selectedMatchCategory: importedConfig.selectedMatchCategory,
            } as Pick<ConfigFields, 'availableCategories' | 'selectedMatchCategory'>;
        } else {
            payload = importedConfig;
        }


        dispatch({ type: dispatchActionType, payload });
        
        // Reset relevant dirty flags after successful import
        if (dispatchActionType === 'LOAD_FORMAT_AND_TIMINGS_CONFIG') {
            setIsFormatAndTimingsConfigNameDirty(false);
            setIsDurationDirty(false);
            setIsPenaltyDirty(false);
        } else if (dispatchActionType === 'LOAD_SOUND_AND_DISPLAY_CONFIG') {
            setIsSoundDirty(false);
            setIsTeamSettingsDirty(false);
        } else if (dispatchActionType === 'LOAD_CATEGORIES_CONFIG') {
            setIsCategorySettingsDirty(false);
        }

        toast({
          title: `${sectionName} Importado`,
          description: `Configuración de ${sectionName.toLowerCase()} cargada exitosamente.`,
        });
      } catch (error) {
        console.error(`Error importing ${sectionName}:`, error);
        toast({
          title: `Error al Importar ${sectionName}`,
          description: (error as Error).message || `No se pudo procesar el archivo de ${sectionName.toLowerCase()}.`,
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

  const handleImportFormatAndTimings = (event: React.ChangeEvent<HTMLInputElement>) => {
    genericImportHandler(event, "Formato y Tiempos", 
      ['formatAndTimingsConfigName', 'defaultPeriodDuration'], // Sample required fields
      'LOAD_FORMAT_AND_TIMINGS_CONFIG',
      fileInputRefFormatAndTimings
    );
  };

  const handleImportSoundAndDisplay = (event: React.ChangeEvent<HTMLInputElement>) => {
    genericImportHandler(event, "Sonido y Display",
      ['playSoundAtPeriodEnd', 'isMonitorModeEnabled'], // Sample required fields
      'LOAD_SOUND_AND_DISPLAY_CONFIG',
      fileInputRefSoundAndDisplay
    );
  };
  
  const handleImportCategories = (event: React.ChangeEvent<HTMLInputElement>) => {
    genericImportHandler(event, "Categorías",
      ['availableCategories'], // Sample required field
      'LOAD_CATEGORIES_CONFIG',
      fileInputRefCategories
    );
  };


  const handlePrepareResetConfig = () => {
    setIsResetConfigDialogOpen(true);
  };

  const performConfigReset = () => {
    dispatch({ type: 'RESET_CONFIG_TO_DEFAULTS' });
    setLocalFormatAndTimingsConfigName(initialFormatAndTimingsConfigNameForReset); // Reset specific name
    setIsFormatAndTimingsConfigNameDirty(false);
    setIsDurationDirty(false);
    setIsPenaltyDirty(false);
    setIsSoundDirty(false);
    setIsTeamSettingsDirty(false);
    setIsCategorySettingsDirty(false);

    toast({
      title: "Configuración Restablecida",
      description: "Todas las configuraciones han vuelto a sus valores predeterminados.",
    });
    setIsResetConfigDialogOpen(false);
  };

  const tabContentClassName = "mt-6 p-0 sm:p-6 border-0 sm:border rounded-md sm:bg-card/30 sm:shadow-sm";
  const sectionCardClassName = "mb-8 p-6 border rounded-md bg-card shadow-sm";


  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-foreground">Configuración General</h1>
        {pageIsDirty && (
          <div className="flex gap-2">
            <Button onClick={handleSaveAllConfig} size="sm">
              <Save className="mr-2 h-4 w-4" /> Guardar Cambios
            </Button>
            <Button onClick={handleDiscardAllConfig} variant="outline" size="sm">
              <Undo2 className="mr-2 h-4 w-4" /> Descartar Cambios
            </Button>
          </div>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 h-auto sm:h-10">
          <TabsTrigger value="formatAndTimings" className="py-2 sm:py-1.5">Formato y Tiempos</TabsTrigger>
          <TabsTrigger value="soundAndDisplay" className="py-2 sm:py-1.5">Sonido y Display</TabsTrigger>
          <TabsTrigger value="categoriesAndTeams" className="py-2 sm:py-1.5">Categorías y Equipos</TabsTrigger>
        </TabsList>

        <TabsContent value="formatAndTimings" className={tabContentClassName}>
          <div className="space-y-6">
             <div className={sectionCardClassName}>
                <Label htmlFor="formatAndTimingsConfigName" className="text-lg font-medium">Nombre de Config. (Formato y Tiempos)</Label>
                <Input
                id="formatAndTimingsConfigName"
                value={localFormatAndTimingsConfigName}
                onChange={(e) => handleLocalFormatAndTimingsConfigNameChange(e.target.value)}
                placeholder="ej. Torneo Apertura 2024"
                className="text-base mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                Este nombre se usará para identificar esta sección de configuración al exportarla.
                </p>
            </div>
            <PenaltySettingsCard ref={penaltySettingsRef} onDirtyChange={setIsPenaltyDirty} />
            <Separator />
            <DurationSettingsCard ref={durationSettingsRef} onDirtyChange={setIsDurationDirty} />
            <Separator />
             <div className="space-y-3 pt-4">
                <h3 className="text-lg font-semibold text-primary-foreground">Exportar/Importar Configuración de Formato y Tiempos</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleExportFormatAndTimings} variant="outline" className="flex-1">
                        <Download className="mr-2 h-4 w-4" /> Exportar (JSON)
                    </Button>
                    <Button onClick={() => fileInputRefFormatAndTimings.current?.click()} variant="outline" className="flex-1">
                        <Upload className="mr-2 h-4 w-4" /> Importar (JSON)
                    </Button>
                    <input
                        type="file" ref={fileInputRefFormatAndTimings} onChange={handleImportFormatAndTimings}
                        accept=".json" className="hidden"
                    />
                </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="soundAndDisplay" className={tabContentClassName}>
           <div className="space-y-6">
            <SoundSettingsCard ref={soundSettingsRef} onDirtyChange={setIsSoundDirty} />
            <Separator />
            <TeamSettingsCard ref={teamSettingsRef} onDirtyChange={setIsTeamSettingsDirty}/>
            <Separator />
            <div className="space-y-3 pt-4">
                <h3 className="text-lg font-semibold text-primary-foreground">Exportar/Importar Configuración de Sonido y Display</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleExportSoundAndDisplay} variant="outline" className="flex-1">
                        <Download className="mr-2 h-4 w-4" /> Exportar (JSON)
                    </Button>
                    <Button onClick={() => fileInputRefSoundAndDisplay.current?.click()} variant="outline" className="flex-1">
                        <Upload className="mr-2 h-4 w-4" /> Importar (JSON)
                    </Button>
                     <input
                        type="file" ref={fileInputRefSoundAndDisplay} onChange={handleImportSoundAndDisplay}
                        accept=".json" className="hidden"
                    />
                </div>
            </div>
           </div>
        </TabsContent>

        <TabsContent value="categoriesAndTeams" className={tabContentClassName}>
          <div className="space-y-8">
            <CategorySettingsCard ref={categorySettingsRef} onDirtyChange={setIsCategorySettingsDirty} />
             <Separator />
            <div className="space-y-3 pt-0"> {/* Adjusted pt-0 as CategorySettingsCard has its own padding */}
                <h3 className="text-lg font-semibold text-primary-foreground">Exportar/Importar Configuración de Categorías</h3>
                 <p className="text-sm text-muted-foreground">
                    Guarda o carga la lista de categorías disponibles y la categoría seleccionada por defecto para los partidos.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleExportCategories} variant="outline" className="flex-1">
                        <Download className="mr-2 h-4 w-4" /> Exportar Categorías (JSON)
                    </Button>
                    <Button onClick={() => fileInputRefCategories.current?.click()} variant="outline" className="flex-1">
                        <Upload className="mr-2 h-4 w-4" /> Importar Categorías (JSON)
                    </Button>
                     <input
                        type="file" ref={fileInputRefCategories} onChange={handleImportCategories}
                        accept=".json" className="hidden"
                    />
                </div>
            </div>
            <Separator />
            <TeamsManagementTab />
          </div>
        </TabsContent>
      </Tabs>

      {pageIsDirty && (
        <div className="mt-8 flex justify-end gap-2">
          <Button onClick={handleSaveAllConfig}>
            <Save className="mr-2 h-4 w-4" /> Guardar Cambios Pendientes
          </Button>
          <Button onClick={handleDiscardAllConfig} variant="outline">
            <Undo2 className="mr-2 h-4 w-4" /> Descartar Cambios Pendientes
          </Button>
        </div>
      )}

      <Separator className="my-10" />

      <div className="space-y-6 p-6 border rounded-md bg-card">
        <h2 className="text-xl font-semibold text-primary-foreground">Restablecer Todas las Configuraciones</h2>
        <p className="text-sm text-muted-foreground">
          Restablece todas las configuraciones de todas las secciones (Formato y Tiempos, Sonido y Display, y Categorías) a sus valores predeterminados de fábrica. Esta acción no se puede deshacer.
          La lista de Equipos y Jugadores NO será afectada.
        </p>
        <div className="flex justify-start">
          <Button onClick={handlePrepareResetConfig} variant="destructive" >
            <RotateCcw className="mr-2 h-4 w-4" /> Restablecer Todas las Configuraciones
          </Button>
        </div>
      </div>

      {isExportDialogOpen && (
        <AlertDialog open={isExportDialogOpen} onOpenChange={(open) => {
            if (!open) {
                setCurrentExportAction(null); // Clear action when dialog closes
            }
            setIsExportDialogOpen(open);
        }}>
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
              <AlertDialogCancel onClick={() => { setIsExportDialogOpen(false); setCurrentExportAction(null); }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => performExportActionWithDialog(currentExportFilename)}>
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
              <AlertDialogTitle>Confirmar Restablecimiento Total</AlertDialogTitle>
              <AlertDialogDescription>
                Esto restablecerá TODAS las configuraciones de esta página (Formato y Tiempos, Sonido y Display, y lista de Categorías) a sus valores predeterminados de fábrica. La lista de Equipos y sus jugadores NO se verá afectada. Esta acción no se puede deshacer. ¿Estás seguro?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsResetConfigDialogOpen(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={performConfigReset} className="bg-destructive hover:bg-destructive/90">
                Confirmar Restablecimiento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
