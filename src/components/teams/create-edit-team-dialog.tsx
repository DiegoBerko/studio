
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

const SPECIFIC_DEFAULT_LOGOS: Record<string, string> = {
  'HAZARD': '/logos/Logo-Hazard.png',
  'OVEJAS NEGRAS': '/logos/Logo-OvejasNegras.png',
  'FANTASY SKATE': '/logos/Logo-FantasySkate.png',
  'ACEMHH': '/logos/Logo-ACEMHH.png',
  'CAHHL': '/logos/Logo-CAHHL.png',
  'WINTER': '/logos/Logo-Winter.png',
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
// Export for CSV import usage
export { getSpecificDefaultLogoUrl as getSpecificDefaultLogoUrlForCsv };


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
  const [teamSubName, setTeamSubName] = useState(""); // New state for subName
  const [teamCategory, setTeamCategory] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null); // Can be data URI or null
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!teamToEdit;
  const { availableCategories } = state;

  useEffect(() => {
    if (isOpen) {
      if (isEditing && teamToEdit) {
        setTeamName(teamToEdit.name);
        setTeamSubName(teamToEdit.subName || ""); // Initialize subName
        setTeamCategory(teamToEdit.category || (availableCategories.length > 0 ? availableCategories[0].id : ""));
        if (teamToEdit.logoDataUrl && teamToEdit.logoDataUrl.startsWith('data:image')) {
            setLogoPreview(teamToEdit.logoDataUrl);
        } else {
            setLogoPreview(null);
        }
      } else {
        setTeamName("");
        setTeamSubName(""); // Reset subName for new team
        setTeamCategory(availableCategories.length > 0 ? availableCategories[0].id : "");
        setLogoPreview(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen, teamToEdit, isEditing, availableCategories]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
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
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    const trimmedTeamName = teamName.trim();
    const trimmedTeamSubName = teamSubName.trim(); // Get trimmed subName

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
        (t.subName?.toLowerCase() || '') === (trimmedTeamSubName?.toLowerCase() || '') &&
        t.category === teamCategory
    );

    if (isDuplicate) {
      const categoryName = availableCategories.find(c => c.id === teamCategory)?.name || teamCategory;
      toast({
        title: "Equipo Duplicado",
        description: `Ya existe un equipo con el nombre "${trimmedTeamName}" ${trimmedTeamSubName ? `y sub-nombre "${trimmedTeamSubName}" ` : ''}en la categoría "${categoryName}".`,
        variant: "destructive",
      });
      return;
    }

    let finalLogoDataUrl: string | null = null;

    if (logoPreview && logoPreview.startsWith('data:image')) {
      finalLogoDataUrl = logoPreview;
    } else {
      finalLogoDataUrl = getSpecificDefaultLogoUrl(trimmedTeamName);
      if (!finalLogoDataUrl && isEditing && teamToEdit?.logoDataUrl && !teamToEdit.logoDataUrl.startsWith('data:image') && logoPreview !== null ) {
          finalLogoDataUrl = teamToEdit.logoDataUrl;
      }
    }


    const teamPayload = {
      name: trimmedTeamName,
      subName: trimmedTeamSubName || undefined, // Set to undefined if empty
      category: teamCategory,
      logoDataUrl: finalLogoDataUrl,
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

  let currentDisplayLogoSrc: string | null = null;
  if (logoPreview && logoPreview.startsWith('data:image')) {
    currentDisplayLogoSrc = logoPreview;
  } else {
    currentDisplayLogoSrc = getSpecificDefaultLogoUrl(teamName.trim());
    if (!currentDisplayLogoSrc && isEditing && teamToEdit?.logoDataUrl && !teamToEdit.logoDataUrl.startsWith('data:image') && logoPreview !== null) {
         currentDisplayLogoSrc = teamToEdit.logoDataUrl;
    }
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
                const newName = e.target.value;
                setTeamName(newName);
                if (!(logoPreview && logoPreview.startsWith('data:image'))) {
                    setLogoPreview(null);
                }
              }}
              className="col-span-3"
              placeholder="Nombre del Equipo"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="teamSubName" className="text-right">
              Sub-Nombre
            </Label>
            <Input
              id="teamSubName"
              value={teamSubName}
              onChange={(e) => setTeamSubName(e.target.value)}
              className="col-span-3"
              placeholder="Opcional (ej. Liga, Serie, Año)"
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
                    data-ai-hint="team logo"
                    onError={() => {
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
                  { (logoPreview && logoPreview.startsWith('data:image')) && (
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
                Opcional. Máximo 2MB (PNG, JPG, GIF). Si el nombre coincide con un club conocido (Hazard, Ovejas Negras, etc.) y no se carga un logo, se usará uno predeterminado.
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
    

    



