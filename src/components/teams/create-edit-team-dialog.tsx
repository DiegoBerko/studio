
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
  'HAZAD': '/logos/Logo-Hazard.png',
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
  const [teamCategory, setTeamCategory] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null); // Can be data URI or null
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!teamToEdit;
  const { availableCategories } = state;

  useEffect(() => {
    if (isOpen) {
      if (isEditing && teamToEdit) {
        setTeamName(teamToEdit.name);
        setTeamCategory(teamToEdit.category || (availableCategories.length > 0 ? availableCategories[0].id : ""));
        // Si el logo existente del equipo a editar es una data URI (cargado por el usuario),
        // lo usamos para el preview.
        // Si es un path (uno de nuestros logos por defecto), NO lo ponemos en logoPreview.
        // Dejamos logoPreview como null para que la lógica de visualización
        // intente buscar un logo por defecto basado en el teamName actual.
        if (teamToEdit.logoDataUrl && teamToEdit.logoDataUrl.startsWith('data:image')) {
            setLogoPreview(teamToEdit.logoDataUrl);
        } else {
            setLogoPreview(null); // Clave: Forzar reevaluación de logo por defecto si el existente era un path
        }
      } else {
        // Creando un equipo nuevo
        setTeamName("");
        setTeamCategory(availableCategories.length > 0 ? availableCategories[0].id : "");
        setLogoPreview(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Limpiar el input de archivo
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
      setLogoPreview(e.target?.result as string); // Esto siempre será una data URI
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setLogoPreview(null); // Indica que el usuario quiere borrar el logo cargado
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
      // Prioridad 1: Logo explícitamente cargado por el usuario.
      finalLogoDataUrl = logoPreview;
    } else {
      // Prioridad 2: Logo específico por nombre.
      finalLogoDataUrl = getSpecificDefaultLogoUrl(trimmedTeamName);

      // Prioridad 3: Si no hay data URI cargada, y NO hay logo específico por el NUEVO nombre,
      // Y estamos EDITANDO, Y el equipo original TENÍA un logo (que NO era data URI),
      // Y el usuario NO borró explícitamente el logo (logoPreview sería null si lo borró).
      // Se mantiene el logo original (path) solo si el nuevo nombre NO resulta en un logo específico.
      if (!finalLogoDataUrl && isEditing && teamToEdit?.logoDataUrl && !teamToEdit.logoDataUrl.startsWith('data:image') && logoPreview !== null ) {
          finalLogoDataUrl = teamToEdit.logoDataUrl;
      }
    }


    const teamPayload = {
      name: trimmedTeamName,
      category: teamCategory,
      logoDataUrl: finalLogoDataUrl, // Puede ser data URI, path, o null
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

  // Lógica para determinar qué logo mostrar en el diálogo (currentDisplayLogoSrc)
  let currentDisplayLogoSrc: string | null = null;
  if (logoPreview && logoPreview.startsWith('data:image')) {
    // 1. Si hay un logo cargado por el usuario (data URI), SIEMPRE mostrar ese.
    currentDisplayLogoSrc = logoPreview;
  } else {
    // 2. Si no hay logo cargado, intentar obtener uno específico por el nombre actual.
    currentDisplayLogoSrc = getSpecificDefaultLogoUrl(teamName.trim());
    
    // 3. Si AÚN no hay logo (ni cargado por usuario, ni específico por nombre actual),
    //    Y estamos editando, Y el equipo original TENÍA un logo (que NO era data URI),
    //    Y el usuario NO ha hecho clic en "Quitar logo" (logoPreview sería null si lo hubiera hecho,
    //    lo que significa que currentDisplayLogoSrc seguiría siendo el específico o null en ese punto).
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
                // Si el logo actual no es uno cargado por el usuario (data URI),
                // lo reseteamos para que se intente buscar uno por defecto con el nuevo nombre.
                if (!(logoPreview && logoPreview.startsWith('data:image'))) {
                    setLogoPreview(null);
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
                        // Si hay un error cargando un logo que es un path (no data URI),
                        // podríamos querer limpiar currentDisplayLogoSrc para que muestre DefaultTeamLogo.
                        // Pero currentDisplayLogoSrc se recalcula en cada render, así que si getSpecificDefaultLogoUrl
                        // devuelve un path inválido, DefaultTeamLogo ya debería mostrarse.
                        // Esta onError es más para data URIs corruptas o problemas de red con URLs externas (no aplica aquí).
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
                  { (logoPreview && logoPreview.startsWith('data:image')) && ( // Solo mostrar si el PREVIEW es una data URI
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
    

    