
"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DurationSettingsCard, type DurationSettingsCardRef } from "@/components/config/duration-settings-card";
import { PenaltySettingsCard, type PenaltySettingsCardRef } from "@/components/config/penalty-settings-card";
import { SoundSettingsCard, type SoundSettingsCardRef } from "@/components/config/sound-settings-card";
import { TeamSettingsCard, type TeamSettingsCardRef } from "@/components/config/team-settings-card";
import { CategorySettingsCard, type CategorySettingsCardRef } from "@/components/config/category-settings-card";
import { LayoutSettingsCard, type LayoutSettingsCardRef } from "@/components/config/layout-settings-card";
import { TeamsManagementTab } from '@/components/config/teams-management-tab';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Undo2, Upload, Download, RotateCcw, Plus, Edit3, Trash2, XCircle } from 'lucide-react';
import { useGameState, type ConfigFields, type FormatAndTimingsProfile, type FormatAndTimingsProfileData, createDefaultFormatAndTimingsProfile, type CategoryData, ScoreboardLayoutSettings } from '@/contexts/game-state-context';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as FormDialogTitle,
  DialogDescription as FormDialogDescription,
  DialogFooter as FormDialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';


const VALID_TAB_VALUES = ["formatAndTimings", "soundAndDisplay", "categoriesAndTeams"];

type ExportableSoundAndDisplayConfig = Pick<ConfigFields,
  | 'playSoundAtPeriodEnd' | 'customHornSoundDataUrl'
  | 'enableTeamSelectionInMiniScoreboard' | 'enablePlayerSelectionForPenalties'
  | 'showAliasInPenaltyPlayerSelector' | 'showAliasInControlsPenaltyList' | 'showAliasInScoreboardPenalties'
  | 'isMonitorModeEnabled' | 'scoreboardLayout'
>;


export default function ConfigPage() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const durationSettingsRef = useRef<DurationSettingsCardRef>(null);
  const penaltySettingsRef = useRef<PenaltySettingsCardRef>(null);
  const soundSettingsRef = useRef<SoundSettingsCardRef>(null);
  const teamSettingsRef = useRef<TeamSettingsCardRef>(null);
  const categorySettingsRef = useRef<CategorySettingsCardRef>(null);
  const layoutSettingsRef = useRef<LayoutSettingsCardRef>(null);
  
  const fileInputFormatAndTimingsRef = useRef<HTMLInputElement>(null);
  const fileInputSoundAndDisplayRef = useRef<HTMLInputElement>(null);
  
  const [isDurationDirty, setIsDurationDirty] = useState(false);
  const [isPenaltyDirty, setIsPenaltyDirty] = useState(false);
  const [isSoundDirty, setIsSoundDirty] = useState(false);
  const [isTeamSettingsDirty, setIsTeamSettingsDirty] = useState(false);
  const [isCategorySettingsDirty, setIsCategorySettingsDirty] = useState(false);
  const [isLayoutSettingsDirty, setIsLayoutSettingsDirty] = useState(false);
  
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [currentExportFilename, setCurrentExportFilename] = useState('');
  const [currentExportAction, setCurrentExportAction] = useState<(() => void) | null>(null);

  const [isResetConfigDialogOpen, setIsResetConfigDialogOpen] = useState(false);

  const urlTab = searchParams.get('tab');
  const initialTab = urlTab && VALID_TAB_VALUES.includes(urlTab) ? urlTab : "formatAndTimings";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [isNewProfileDialogOpen, setIsNewProfileDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [isEditProfileNameDialogOpen, setIsEditProfileNameDialogOpen] = useState(false);
  const [editingProfileName, setEditingProfileName] = useState("");
  const [profileToDelete, setProfileToDelete] = useState<FormatAndTimingsProfile | null>(null);

  const [isConfirmSwitchProfileDialogOpen, setIsConfirmSwitchProfileDialogOpen] = useState(false);
  const [pendingProfileIdToSelect, setPendingProfileIdToSelect] = useState<string | null>(null);

  const [isConfirmSwitchTabDialogOpen, setIsConfirmSwitchTabDialogOpen] = useState(false);
  const [pendingTabSwitchData, setPendingTabSwitchData] = useState<{ newTabValue: string; discardAction: (() => void) | null; sectionName: string } | null>(null);


  useEffect(() => {
    const currentUrlTab = searchParams.get('tab');
    if (activeTab !== currentUrlTab && VALID_TAB_VALUES.includes(activeTab)) {
      router.push(`/config?tab=${activeTab}`, { scroll: false });
    }
  }, [activeTab, router, searchParams]);

  const selectedProfile = useMemo(() => {
    return state.formatAndTimingsProfiles.find(p => p.id === state.selectedFormatAndTimingsProfileId) || state.formatAndTimingsProfiles[0] || createDefaultFormatAndTimingsProfile();
  }, [state.formatAndTimingsProfiles, state.selectedFormatAndTimingsProfileId]);

  useEffect(() => {
    if (durationSettingsRef.current) {
      durationSettingsRef.current.setValues(selectedProfile);
    }
    if (penaltySettingsRef.current) {
      penaltySettingsRef.current.setValues(selectedProfile);
    }
    setIsDurationDirty(false);
    setIsPenaltyDirty(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfile.id]); 

  const isFormatAndTimingsSectionDirty = isDurationDirty || isPenaltyDirty;
  const isSoundAndDisplaySectionDirty = isSoundDirty || isTeamSettingsDirty || isLayoutSettingsDirty;

  const handleSaveChanges_FormatAndTimings = () => {
    let durationSaveSuccess = true;
    let penaltySaveSuccess = true;
    if (durationSettingsRef.current && isDurationDirty) {
      durationSaveSuccess = durationSettingsRef.current.handleSave();
      if (durationSaveSuccess) setIsDurationDirty(false);
    }
    if (penaltySettingsRef.current && isPenaltyDirty) {
      penaltySaveSuccess = penaltySettingsRef.current.handleSave();
      if (penaltySaveSuccess) setIsPenaltyDirty(false);
    }
    if (durationSaveSuccess && penaltySaveSuccess) {
      toast({ title: "Formato y Tiempos Guardados", description: "Los cambios en Formato y Tiempos han sido guardados en la configuración activa." });
    } else {
      toast({ title: "Error al Guardar", description: "No se pudieron guardar todos los cambios en Formato y Tiempos.", variant: "destructive" });
    }
  };

  const handleDiscardChanges_FormatAndTimings = () => {
    if (durationSettingsRef.current && isDurationDirty) {
      durationSettingsRef.current.handleDiscard();
      setIsDurationDirty(false);
    }
    if (penaltySettingsRef.current && isPenaltyDirty) {
      penaltySettingsRef.current.handleDiscard();
      setIsPenaltyDirty(false);
    }
    toast({ title: "Cambios Descartados", description: "Los cambios no guardados en Formato y Tiempos han sido revertidos." });
  };

  const handleSaveChanges_SoundAndDisplay = () => {
    let soundSaveSuccess = true;
    let teamSettingsSaveSuccess = true;
    let layoutSettingsSaveSuccess = true;
    if (soundSettingsRef.current && isSoundDirty) {
      soundSaveSuccess = soundSettingsRef.current.handleSave();
      if (soundSaveSuccess) setIsSoundDirty(false);
    }
    if (teamSettingsRef.current && isTeamSettingsDirty) {
      teamSettingsSaveSuccess = teamSettingsRef.current.handleSave();
      if (teamSettingsSaveSuccess) setIsTeamSettingsDirty(false);
    }
    if (layoutSettingsRef.current && isLayoutSettingsDirty) {
      layoutSettingsSaveSuccess = layoutSettingsRef.current.handleSave();
      if (layoutSettingsSaveSuccess) setIsLayoutSettingsDirty(false);
    }
    if (soundSaveSuccess && teamSettingsSaveSuccess && layoutSettingsSaveSuccess) {
      toast({ title: "Sonido y Display Guardados", description: "Los cambios en Sonido y Display han sido guardados en la configuración activa." });
    } else {
      toast({ title: "Error al Guardar", description: "No se pudieron guardar todos los cambios en Sonido y Display.", variant: "destructive" });
    }
  };

  const handleDiscardChanges_SoundAndDisplay = () => {
    if (soundSettingsRef.current && isSoundDirty) {
      soundSettingsRef.current.handleDiscard();
      setIsSoundDirty(false);
    }
    if (teamSettingsRef.current && isTeamSettingsDirty) {
      teamSettingsRef.current.handleDiscard();
      setIsTeamSettingsDirty(false);
    }
    if (layoutSettingsRef.current && isLayoutSettingsDirty) {
      layoutSettingsRef.current.handleDiscard();
      setIsLayoutSettingsDirty(false);
    }
    toast({ title: "Cambios Descartados", description: "Los cambios no guardados en Sonido y Display han sido revertidos." });
  };

  const handleSaveChanges_Categories = () => {
    if (categorySettingsRef.current && isCategorySettingsDirty) {
      if (categorySettingsRef.current.handleSave()) {
        setIsCategorySettingsDirty(false);
        toast({ title: "Categorías Guardadas", description: "Los cambios en Categorías han sido guardados en la configuración activa." });
      } else {
        toast({ title: "Error al Guardar", description: "No se pudieron guardar los cambios en Categorías.", variant: "destructive" });
      }
    }
  };

  const handleDiscardChanges_Categories = () => {
    if (categorySettingsRef.current && isCategorySettingsDirty) {
      categorySettingsRef.current.handleDiscard();
      setIsCategorySettingsDirty(false);
      toast({ title: "Cambios Descartados", description: "Los cambios no guardados en Categorías han sido revertidos." });
    }
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
    localStorage.setItem('lastExportFilename', filename.trim()); 
    currentExportAction(); 
    setIsExportDialogOpen(false);
    setCurrentExportAction(null);
  };

  const exportSection = (sectionName: string, configData: object, suggestedBaseName: string) => {
    const lastFilename = localStorage.getItem('lastExportFilename');
    const suggestedFilename = lastFilename || `${suggestedBaseName}_config.json`;
    setCurrentExportFilename(suggestedFilename);

    setCurrentExportAction(() => () => { 
        const jsonString = JSON.stringify(configData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = currentExportFilename.trim(); 
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
    exportSection("Perfiles de Formato y Tiempos", state.formatAndTimingsProfiles, "icevision_formatos_tiempos_perfiles");
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
      scoreboardLayout: state.scoreboardLayout,
    };
    exportSection("Configuración de Sonido y Display", configToExport, "icevision_sonido_display");
  };
  
  const genericImportHandler = (
    event: React.ChangeEvent<HTMLInputElement>,
    sectionName: string,
    requiredFields: string[],
    dispatchActionType: 
        | 'LOAD_FORMAT_AND_TIMINGS_PROFILES' 
        | 'LOAD_SOUND_AND_DISPLAY_CONFIG',
    fileInputRef: React.RefObject<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("Error al leer el archivo.");
        const importedConfig = JSON.parse(text);

        if (dispatchActionType === 'LOAD_FORMAT_AND_TIMINGS_PROFILES' && !Array.isArray(importedConfig)) {
            throw new Error(`Archivo de perfiles de ${sectionName} no válido. Se esperaba un array de perfiles.`);
        }
        if (dispatchActionType !== 'LOAD_FORMAT_AND_TIMINGS_PROFILES' && (typeof importedConfig !== 'object' || Array.isArray(importedConfig))) {
            throw new Error(`Archivo de configuración para ${sectionName} no válido. Se esperaba un objeto.`);
        }

        if (requiredFields.length > 0) {
            const dataToCheck = dispatchActionType === 'LOAD_FORMAT_AND_TIMINGS_PROFILES' ? importedConfig[0] : importedConfig;
            if (dataToCheck) { 
                const missingFields = requiredFields.filter(field => !(field in dataToCheck));
                if (missingFields.length > 0) { 
                    throw new Error(`Archivo de configuración para ${sectionName} no válido. Faltan campos: ${missingFields.join(', ')}`);
                }
            } else if (dispatchActionType === 'LOAD_FORMAT_AND_TIMINGS_PROFILES' && importedConfig.length === 0) {
                // Allow empty array for profiles, but it won't have fields to check
            } else {
                 throw new Error(`Archivo de configuración para ${sectionName} no válido o vacío.`);
            }
        }
        
        let payload: any;
        payload = importedConfig;

        dispatch({ type: dispatchActionType, payload });
        
        if (dispatchActionType === 'LOAD_FORMAT_AND_TIMINGS_PROFILES') {
            setIsDurationDirty(false);
            setIsPenaltyDirty(false);
        } else if (dispatchActionType === 'LOAD_SOUND_AND_DISPLAY_CONFIG') {
            setIsSoundDirty(false);
            setIsTeamSettingsDirty(false);
            setIsLayoutSettingsDirty(false);
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
    genericImportHandler(event, "Perfiles de Formato y Tiempos", 
      ['name', 'defaultPeriodDuration'], 
      'LOAD_FORMAT_AND_TIMINGS_PROFILES',
      fileInputFormatAndTimingsRef
    );
  };

  const handleImportSoundAndDisplay = (event: React.ChangeEvent<HTMLInputElement>) => {
    genericImportHandler(event, "Sonido y Display",
      ['playSoundAtPeriodEnd', 'isMonitorModeEnabled', 'scoreboardLayout'], 
      'LOAD_SOUND_AND_DISPLAY_CONFIG',
      fileInputSoundAndDisplayRef
    );
  };
  
  const handlePrepareResetConfig = () => {
    setIsResetConfigDialogOpen(true);
  };

  const performConfigReset = () => {
    dispatch({ type: 'RESET_CONFIG_TO_DEFAULTS' });
    setIsDurationDirty(false);
    setIsPenaltyDirty(false);
    setIsSoundDirty(false);
    setIsTeamSettingsDirty(false);
    setIsCategorySettingsDirty(false);
    setIsLayoutSettingsDirty(false);

    toast({
      title: "Configuración Restablecida",
      description: "Todas las configuraciones han vuelto a sus valores predeterminados de fábrica.",
    });
    setIsResetConfigDialogOpen(false);
  };

  const handleCreateNewProfile = () => {
    if (!newProfileName.trim()) {
      toast({ title: "Nombre Requerido", description: "El nombre del perfil no puede estar vacío.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'ADD_FORMAT_AND_TIMINGS_PROFILE', payload: { name: newProfileName.trim() } });
    toast({ title: "Perfil Creado", description: `Perfil "${newProfileName.trim()}" añadido.` });
    setNewProfileName("");
    setIsNewProfileDialogOpen(false);
  };

  const handleSelectProfile = (profileId: string) => {
    if (isFormatAndTimingsSectionDirty) {
        setPendingProfileIdToSelect(profileId);
        setIsConfirmSwitchProfileDialogOpen(true);
    } else {
        dispatch({ type: 'SELECT_FORMAT_AND_TIMINGS_PROFILE', payload: { profileId } });
    }
  };

  const confirmSwitchProfile = () => {
    if (pendingProfileIdToSelect) {
        if (durationSettingsRef.current) durationSettingsRef.current.handleDiscard();
        if (penaltySettingsRef.current) penaltySettingsRef.current.handleDiscard();
        setIsDurationDirty(false);
        setIsPenaltyDirty(false);
        dispatch({ type: 'SELECT_FORMAT_AND_TIMINGS_PROFILE', payload: { profileId: pendingProfileIdToSelect } });
    }
    setIsConfirmSwitchProfileDialogOpen(false);
    setPendingProfileIdToSelect(null);
  };
  
  const handlePrepareEditProfileName = () => {
    if (selectedProfile) {
      setEditingProfileName(selectedProfile.name);
      setIsEditProfileNameDialogOpen(true);
    }
  };

  const handleUpdateProfileName = () => {
    if (!editingProfileName.trim()) {
      toast({ title: "Nombre Requerido", description: "El nombre del perfil no puede estar vacío.", variant: "destructive" });
      return;
    }
    if (selectedProfile) {
      dispatch({ type: 'UPDATE_FORMAT_AND_TIMINGS_PROFILE_NAME', payload: { profileId: selectedProfile.id, newName: editingProfileName.trim() } });
      toast({ title: "Nombre de Perfil Actualizado" });
    }
    setIsEditProfileNameDialogOpen(false);
  };

  const handlePrepareDeleteProfile = () => {
    if (selectedProfile && state.formatAndTimingsProfiles.length > 1) {
      setProfileToDelete(selectedProfile);
    } else if (state.formatAndTimingsProfiles.length <= 1) {
        toast({ title: "Acción no permitida", description: "Debe existir al menos un perfil de formato y tiempos.", variant: "destructive" });
    }
  };

  const confirmDeleteProfile = () => {
    if (profileToDelete) {
      dispatch({ type: 'DELETE_FORMAT_AND_TIMINGS_PROFILE', payload: { profileId: profileToDelete.id } });
      toast({ title: "Perfil Eliminado", description: `Perfil "${profileToDelete.name}" eliminado.` });
      setProfileToDelete(null);
    }
  };

  const handleTabChange = (newTabValue: string) => {
    let discardAction: (() => void) | null = null;
    let sectionName = "";
    let isDirty = false;

    if (activeTab === "formatAndTimings" && isFormatAndTimingsSectionDirty) {
      sectionName = "Formato y Tiempos";
      isDirty = true;
      discardAction = handleDiscardChanges_FormatAndTimings;
    } else if (activeTab === "soundAndDisplay" && isSoundAndDisplaySectionDirty) {
      sectionName = "Sonido y Display";
      isDirty = true;
      discardAction = handleDiscardChanges_SoundAndDisplay;
    } else if (activeTab === "categoriesAndTeams" && isCategorySettingsDirty) {
      sectionName = "Categorías";
      isDirty = true;
      discardAction = handleDiscardChanges_Categories;
    }

    if (isDirty) {
      setPendingTabSwitchData({ newTabValue, discardAction, sectionName });
      setIsConfirmSwitchTabDialogOpen(true);
    } else {
      setActiveTab(newTabValue);
    }
  };

  const confirmSwitchTab = () => {
    if (pendingTabSwitchData) {
      if (pendingTabSwitchData.discardAction) {
        pendingTabSwitchData.discardAction();
      }
      setActiveTab(pendingTabSwitchData.newTabValue);
    }
    setIsConfirmSwitchTabDialogOpen(false);
    setPendingTabSwitchData(null);
  };

  const tabContentClassName = "mt-6 p-0 sm:p-6 border-0 sm:border rounded-md sm:bg-card/30 sm:shadow-sm";
  const sectionCardClassName = "mb-8 p-6 border rounded-md bg-card shadow-sm";
  const sectionActionsContainerClass = "mt-6 mb-4 flex justify-end gap-2 border-t pt-6";


  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-foreground">Configuración General</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 h-auto sm:h-10">
          <TabsTrigger value="formatAndTimings" className="py-2 sm:py-1.5">Formato y Tiempos</TabsTrigger>
          <TabsTrigger value="soundAndDisplay" className="py-2 sm:py-1.5">Sonido y Display</TabsTrigger>
          <TabsTrigger value="categoriesAndTeams" className="py-2 sm:py-1.5">Categorías y Equipos</TabsTrigger>
        </TabsList>

        <TabsContent value="formatAndTimings" className={tabContentClassName}>
          <div className="space-y-6">
            <div className={cn(sectionCardClassName, "mb-6")}>
                <Label className="text-lg font-medium mb-2 block">Perfil de Configuración (Formato y Tiempos)</Label>
                <div className="flex items-center gap-2">
                    <Select
                        value={selectedProfile.id || ""}
                        onValueChange={handleSelectProfile}
                    >
                        <SelectTrigger className="flex-grow text-base">
                            <SelectValue placeholder="Seleccionar perfil..." />
                        </SelectTrigger>
                        <SelectContent>
                            {state.formatAndTimingsProfiles.map(profile => (
                                <SelectItem key={profile.id} value={profile.id} className="text-sm">
                                    {profile.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => setIsNewProfileDialogOpen(true)} aria-label="Crear nuevo perfil">
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handlePrepareEditProfileName} disabled={!selectedProfile} aria-label="Editar nombre del perfil seleccionado">
                        <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={handlePrepareDeleteProfile} disabled={!selectedProfile || state.formatAndTimingsProfiles.length <= 1} aria-label="Eliminar perfil seleccionado">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                 <p className="text-xs text-muted-foreground mt-1.5">
                    Crea y selecciona diferentes perfiles para guardar conjuntos de configuraciones de formato y tiempos.
                </p>
            </div>
            <PenaltySettingsCard ref={penaltySettingsRef} onDirtyChange={setIsPenaltyDirty} initialValues={selectedProfile} />
            <Separator />
            <DurationSettingsCard ref={durationSettingsRef} onDirtyChange={setIsDurationDirty} initialValues={selectedProfile} />
            
            {isFormatAndTimingsSectionDirty && (
              <div className={sectionActionsContainerClass}>
                <Button onClick={handleSaveChanges_FormatAndTimings} size="sm">
                  <Save className="mr-2 h-4 w-4" /> Guardar Cambios F&T
                </Button>
                <Button onClick={handleDiscardChanges_FormatAndTimings} variant="outline" size="sm">
                  <Undo2 className="mr-2 h-4 w-4" /> Descartar Cambios F&T
                </Button>
              </div>
            )}
            <Separator />
             <div className="space-y-3 pt-4">
                <h3 className="text-lg font-semibold text-primary-foreground">Exportar/Importar Perfiles de Formato y Tiempos</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleExportFormatAndTimings} variant="outline" className="flex-1">
                        <Download className="mr-2 h-4 w-4" /> Exportar Perfiles (JSON)
                    </Button>
                    <Button onClick={() => fileInputFormatAndTimingsRef.current?.click()} variant="outline" className="flex-1">
                        <Upload className="mr-2 h-4 w-4" /> Importar Perfiles (JSON)
                    </Button>
                    <input
                        type="file" ref={fileInputFormatAndTimingsRef} onChange={handleImportFormatAndTimings}
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
            <LayoutSettingsCard ref={layoutSettingsRef} onDirtyChange={setIsLayoutSettingsDirty} />
            
            {isSoundAndDisplaySectionDirty && (
              <div className={sectionActionsContainerClass}>
                <Button onClick={handleSaveChanges_SoundAndDisplay} size="sm">
                  <Save className="mr-2 h-4 w-4" /> Guardar Cambios S&D
                </Button>
                <Button onClick={handleDiscardChanges_SoundAndDisplay} variant="outline" size="sm">
                  <Undo2 className="mr-2 h-4 w-4" /> Descartar Cambios S&D
                </Button>
              </div>
            )}
            <Separator />
            <div className="space-y-3 pt-4">
                <h3 className="text-lg font-semibold text-primary-foreground">Exportar/Importar Configuración de Sonido y Display</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleExportSoundAndDisplay} variant="outline" className="flex-1">
                        <Download className="mr-2 h-4 w-4" /> Exportar (JSON)
                    </Button>
                    <Button onClick={() => fileInputSoundAndDisplayRef.current?.click()} variant="outline" className="flex-1">
                        <Upload className="mr-2 h-4 w-4" /> Importar (JSON)
                    </Button>
                     <input
                        type="file" ref={fileInputSoundAndDisplayRef} onChange={handleImportSoundAndDisplay}
                        accept=".json" className="hidden"
                    />
                </div>
            </div>
           </div>
        </TabsContent>

        <TabsContent value="categoriesAndTeams" className={tabContentClassName}>
          <div className="space-y-8">
            <CategorySettingsCard ref={categorySettingsRef} onDirtyChange={setIsCategorySettingsDirty} />
            {isCategorySettingsDirty && (
              <div className={cn(sectionActionsContainerClass, "mt-0 mb-6")}>
                <Button onClick={handleSaveChanges_Categories} size="sm">
                  <Save className="mr-2 h-4 w-4" /> Guardar Cambios de Categorías
                </Button>
                <Button onClick={handleDiscardChanges_Categories} variant="outline" size="sm">
                  <Undo2 className="mr-2 h-4 w-4" /> Descartar Cambios de Categorías
                </Button>
              </div>
            )}
            <Separator />
            <TeamsManagementTab />
          </div>
        </TabsContent>
      </Tabs>

      <Separator className="my-10" />

      <div className="space-y-6 p-6 border rounded-md bg-card">
        <h2 className="text-xl font-semibold text-primary-foreground">Restablecer Todas las Configuraciones</h2>
        <p className="text-sm text-muted-foreground">
          Restablece todas las configuraciones de todas las secciones (el perfil de Formato y Tiempos actualmente seleccionado, Sonido y Display, y lista de Categorías) a sus valores predeterminados de fábrica. Esta acción no se puede deshacer.
          La lista de Equipos y Jugadores NO será afectada. Otros perfiles de Formato y Tiempos no seleccionados no se verán afectados.
        </p>
        <div className="flex justify-start">
          <Button onClick={handlePrepareResetConfig} variant="destructive" >
            <RotateCcw className="mr-2 h-4 w-4" /> Restablecer Configuraciones
          </Button>
        </div>
      </div>

      {isExportDialogOpen && (
        <AlertDialog open={isExportDialogOpen} onOpenChange={(open) => {
            if (!open) {
                setCurrentExportAction(null); 
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
              <AlertDialogTitle>Confirmar Restablecimiento</AlertDialogTitle>
              <AlertDialogDescription>
                Esto restablecerá el perfil de Formato y Tiempos actualmente seleccionado, Sonido y Display, y lista de Categorías a sus valores predeterminados de fábrica. La lista de Equipos y sus jugadores NO se verá afectada. Otros perfiles de Formato y Tiempos no seleccionados no se verán afectados. ¿Estás seguro?
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

      <Dialog open={isNewProfileDialogOpen} onOpenChange={setIsNewProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <FormDialogTitle>Nuevo Perfil de Formato y Tiempos</FormDialogTitle>
            <FormDialogDescription>Ingresa un nombre para el nuevo perfil.</FormDialogDescription>
          </DialogHeader>
          <Input
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder="Nombre del perfil"
            className="my-4"
            onKeyDown={(e) => {if (e.key === 'Enter') handleCreateNewProfile();}}
          />
          <FormDialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleCreateNewProfile}>Crear Perfil</Button>
          </FormDialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditProfileNameDialogOpen} onOpenChange={setIsEditProfileNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <FormDialogTitle>Editar Nombre del Perfil</FormDialogTitle>
            <FormDialogDescription>Actualiza el nombre del perfil seleccionado.</FormDialogDescription>
          </DialogHeader>
          <Input
            value={editingProfileName}
            onChange={(e) => setEditingProfileName(e.target.value)}
            placeholder="Nombre del perfil"
            className="my-4"
            onKeyDown={(e) => {if (e.key === 'Enter') handleUpdateProfileName();}}
          />
          <FormDialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleUpdateProfileName}>Guardar Nombre</Button>
          </FormDialogFooter>
        </DialogContent>
      </Dialog>

       {profileToDelete && (
        <AlertDialog open={!!profileToDelete} onOpenChange={() => setProfileToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Eliminación de Perfil</AlertDialogTitle>
                <AlertDialogDescription>
                    ¿Estás seguro de que quieres eliminar el perfil "{profileToDelete.name}"? Esta acción no se puede deshacer.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setProfileToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteProfile} className="bg-destructive hover:bg-destructive/90">
                    Eliminar Perfil
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
       )}

      {isConfirmSwitchProfileDialogOpen && (
        <AlertDialog open={isConfirmSwitchProfileDialogOpen} onOpenChange={setIsConfirmSwitchProfileDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Descartar Cambios</AlertDialogTitle>
              <AlertDialogDescription>
                Tienes cambios sin guardar en la sección de Formato y Tiempos. ¿Deseas descartarlos y cambiar de perfil?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsConfirmSwitchProfileDialogOpen(false); setPendingProfileIdToSelect(null); }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSwitchProfile}>
                Descartar y Cambiar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isConfirmSwitchTabDialogOpen && pendingTabSwitchData && (
        <AlertDialog open={isConfirmSwitchTabDialogOpen} onOpenChange={setIsConfirmSwitchTabDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Descartar Cambios</AlertDialogTitle>
              <AlertDialogDescription>
                Tienes cambios sin guardar en la sección de {pendingTabSwitchData.sectionName}. ¿Deseas descartarlos y cambiar de pestaña?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsConfirmSwitchTabDialogOpen(false); setPendingTabSwitchData(null); }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSwitchTab}>
                Descartar y Cambiar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
