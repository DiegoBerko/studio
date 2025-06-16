"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGameState } from "@/contexts/game-state-context";
import type { TeamData } from "@/types";
import { UploadCloud, XCircle, Image as ImageIcon } from "lucide-react";
import { DefaultTeamLogo } from "./default-team-logo";

const NO_CATEGORIES_PLACEHOLDER_VALUE_DIALOG = "__NO_CATEGORIES_DIALOG__";

// Moved outside the component for potential reuse
const SPECIFIC_DEFAULT_LOGOS: Record<string, string> = {
  'HAZAD': '/logos/Logo-Hazad.png',
  'OVEJAS NEGRAS': '/logos/Logo-OvejasNegras.png',
  'FANTASY SKATE': '/logos/Logo-FantasySkate.png',
  'ACEMHH': '/logos/Logo-ACEMHH.png',
};

function getSpecificDefaultLogoUrl(teamName: string): string | null {
  if (!teamName) return null;
  const upperTeamName = teamName.toUpperCase();
  for (const keyword in SPECIFIC_DEFAULT_LOGOS) {
    if (upperTeamName.includes(keyword)) {
      return SPECIFIC_DEFAULT_LOGOS[keyword];
    }
  }
  return null;
}

interface CreateEditTeamDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  teamToEdit?: TeamData | null;
  onTeamSaved: (teamId: string) => void;
}

export function CreateEditTeamDialog({
  isOpen,
  onOpenChange,
  teamToEdit,
  onTeamSaved,
}: CreateEditTeamDialogProps) {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const [teamName, setTeamName] = useState("");
  const [teamCategory, setTeamCategory] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null); // Can be dataURI or null (if cleared)
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!teamToEdit;
  const { availableCategories } = state;

  useEffect(() => {
    if (isOpen) {
      if (isEditing && teamToEdit) {
        setTeamName(teamToEdit.name);
        setTeamCategory(teamToEdit.category || (availableCategories.length > 0 ? availableCategories[0].id : ""));
        setLogoPreview(teamToEdit.logoDataUrl || null); // Initialize with existing logo or null
      } else {
        setTeamName("");
        setTeamCategory(availableCategories.length > 0 ? availableCategories[0].id : "");
        setLogoPreview(null); // Start fresh for new team
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen, teamToEdit, isEditing, availableCategories]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      // If user cancels file selection, logoPreview remains as it was.
      // If it was null, it stays null. If it had a dataURI, it keeps it.
      // If it was showing a default teamToEdit.logoDataUrl, that state is managed by logoPreview being the original URL or null.
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Archivo no Soportado",
        description: "Por favor, selecciona un archivo de imagen (ej. PNG, JPG, GIF).",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({
        title: "Archivo Demasiado Grande",
        description: "El tamaño máximo del logo es 2MB.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string); // This will be a data URI base64
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setLogoPreview(null); // Explicitly set to null to indicate user wants no logo or default by name
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    const trimmedTeamName = teamName.trim();
    if (!trimmedTeamName) {
      toast({
        title: "Nombre Requerido",
        description: "El nombre del equipo no puede estar vacío.",
        variant: "destructive",
      });
      return;
    }
    if (!teamCategory && availableCategories.length > 0) {
      toast({
        title: "Categoría Requerida",
        description: "Debes seleccionar una categoría para el equipo.",
        variant: "destructive",
      });
      return;
    }
    if (availableCategories.length === 0) {
        toast({
            title: "No hay Categorías",
            description: "No hay categorías definidas. Por favor, añade categorías en la página de Configuración antes de crear un equipo.",
            variant: "destructive",
        });
        return;
    }

    const isDuplicate = state.teams.some(
      (t) =>
        t.id !== teamToEdit?.id &&
        t.name.toLowerCase() === trimmedTeamName.toLowerCase() &&
        t.category === teamCategory
    );

    if (isDuplicate) {
      const categoryName = availableCategories.find(c => c.id === teamCategory)?.name || teamCategory;
      toast({
        title: "Equipo Duplicado",
        description: `Ya existe un equipo con el nombre "${trimmedTeamName}" en la categoría "${categoryName}".`,
        variant: "destructive",
      });
      return;
    }

    let finalLogoDataUrl: string | null = null;

    if (logoPreview && logoPreview.startsWith('data:image')) {
      // 1. User uploaded a new logo (logoPreview is a data URI)
      finalLogoDataUrl = logoPreview;
    } else {
      // User did not upload a new logo, or cleared the existing one (logoPreview is null or a path string)
      const specificLogoByName = getSpecificDefaultLogoUrl(trimmedTeamName);
      if (specificLogoByName) {
        // 2. Name matches a specific default logo
        finalLogoDataUrl = specificLogoByName;
      } else if (isEditing && teamToEdit?.logoDataUrl && logoPreview !== null) {
        // 3. Editing, there was an original logo, AND user did NOT explicitly clear it (logoPreview isn't null).
        // This means logoPreview might be the original teamToEdit.logoDataUrl if not touched, or a specific logo if name matched.
        // If logoPreview is the original path, it's fine. If it was null and we're here, it means no specific by name was found.
        finalLogoDataUrl = teamToEdit.logoDataUrl;
      }
      // 4. Otherwise, finalLogoDataUrl remains null (e.g., new team, no specific logo, no upload; or editing, user cleared logo, no specific found)
    }


    const teamPayload = {
      name: trimmedTeamName,
      category: teamCategory,
      logoDataUrl: finalLogoDataUrl, // This will be dataURI, path, or null
    };

    if (isEditing && teamToEdit) {
      dispatch({
        type: "UPDATE_TEAM_DETAILS",
        payload: { ...teamPayload, teamId: teamToEdit.id },
      });
      toast({
        title: "Equipo Actualizado",
        description: `El equipo "${teamPayload.name}" ha sido actualizado.`,
      });
      onTeamSaved(teamToEdit.id);
    } else {
      const newTeamId = crypto.randomUUID();
      dispatch({
        type: "ADD_TEAM",
        payload: { id: newTeamId, ...teamPayload, players: [] },
      });
      toast({
        title: "Equipo Creado",
        description: `El equipo "${teamPayload.name}" ha sido creado.`,
      });
      onTeamSaved(newTeamId);
    }
    onOpenChange(false);
  };

  // Determine what to display in the preview area
  let currentDisplayLogoSrc: string | null = null;
  if (logoPreview && logoPreview.startsWith('data:image')) { // User uploaded or has a pending dataURI
    currentDisplayLogoSrc = logoPreview;
  } else if (logoPreview === null) { // User cleared the logo, try specific by name
    currentDisplayLogoSrc = getSpecificDefaultLogoUrl(teamName);
  } else if (isEditing && teamToEdit?.logoDataUrl && !logoPreview) { // Editing, no user interaction with logo uploader yet, use existing
    currentDisplayLogoSrc = teamToEdit.logoDataUrl;
  } else if (!isEditing && !logoPreview) { // New team, no user interaction yet, try specific by name
     currentDisplayLogoSrc = getSpecificDefaultLogoUrl(teamName);
  } else if (logoPreview) { // logoPreview might be an old path if editing and user hasn't re-uploaded
    currentDisplayLogoSrc = logoPreview;
  }
  if (!currentDisplayLogoSrc) { // Fallback if all else fails for current teamName
      currentDisplayLogoSrc = getSpecificDefaultLogoUrl(teamName);
  }


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Equipo" : "Crear Nuevo Equipo"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los detalles de tu equipo."
              : "Añade un nuevo equipo a tu lista."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="teamName" className="text-right">
              Nombre
            </Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                // If logoPreview is not a dataURI (i.e., not user-uploaded), allow dynamic update of specific logo
                if (!(logoPreview && logoPreview.startsWith('data:image'))) {
                  setLogoPreview(null); // Reset preview to allow specific logo by name to take effect or clear previous path
                }
              }}
              className="col-span-3"
              placeholder="Nombre del Equipo"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="teamCategory" className="text-right">
              Categoría
            </Label>
            <Select
              value={teamCategory}
              onValueChange={setTeamCategory}
              disabled={availableCategories.length === 0}
            >
              <SelectTrigger id="teamCategory" className="col-span-3">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
                {availableCategories.length === 0 && (
                  <SelectItem value={NO_CATEGORIES_PLACEHOLDER_VALUE_DIALOG} disabled>No hay categorías disponibles</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="teamLogo" className="text-right pt-2">
              Logo
            </Label>
            <div className="col-span-3 space-y-2">
              <div className="flex items-center gap-4">
                {currentDisplayLogoSrc ? (
                  <Image
                    src={currentDisplayLogoSrc}
                    alt="Vista previa del logo"
                    width={64}
                    height={64}
                    className="rounded-md border object-contain w-16 h-16"
                    onError={() => {
                        // If an image path fails (e.g. specific logo not found in public), clear it for DefaultTeamLogo
                        console.warn("Error loading image for preview: ", currentDisplayLogoSrc);
                        setLogoPreview(null); // This will trigger re-evaluation of currentDisplayLogoSrc in next render.
                                            // If it was a specific logo that failed, it will try DefaultTeamLogo.
                    }}
                  />
                ) : teamName.trim() ? (
                  <DefaultTeamLogo teamName={teamName} size="lg" />
                ) : (
                  <div className="w-16 h-16 rounded-md border bg-muted flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                   <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <UploadCloud className="mr-2 h-4 w-4" /> Cargar Logo
                  </Button>
                  { (logoPreview && logoPreview.startsWith('data:image')) && ( // Show "Quitar" only if a data URI is in preview
                    <Button type="button" variant="ghost" size="sm" onClick={handleClearLogo} className="text-destructive hover:text-destructive">
                      <XCircle className="mr-2 h-4 w-4" /> Quitar Logo Cargado
                    </Button>
                  )}
                </div>

              </div>
              <Input
                id="teamLogo"
                type="file"
                accept="image/*,.png,.jpg,.jpeg,.gif"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Máximo 2MB (PNG, JPG, GIF). Si el nombre coincide con un club conocido (Hazad, Ovejas Negras, etc.) y no se carga un logo, se usará uno predeterminado.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={availableCategories.length === 0 && !isEditing}>
            {isEditing ? "Guardar Cambios" : "Crear Equipo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
    
// Exporting helper for CSV import use in teams-management-tab
export { getSpecificDefaultLogoUrl as getSpecificDefaultLogoUrlForCsv };
