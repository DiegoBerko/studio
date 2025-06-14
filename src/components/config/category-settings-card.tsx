
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useGameState, type CategoryData } from "@/contexts/game-state-context";
import { ControlCardWrapper } from "@/components/controls/control-card-wrapper";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, ListFilter } from "lucide-react";
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

export interface CategorySettingsCardRef {
  handleSave: () => boolean;
  handleDiscard: () => void;
  getIsDirty: () => boolean;
}

interface CategorySettingsCardProps {
  onDirtyChange: (isDirty: boolean) => void;
}

export const CategorySettingsCard = forwardRef<CategorySettingsCardRef, CategorySettingsCardProps>(({ onDirtyChange }, ref) => {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const [localAvailableCategories, setLocalAvailableCategories] = useState<CategoryData[]>(state.availableCategories);
  const [localSelectedMatchCategory, setLocalSelectedMatchCategory] = useState<string>(state.selectedMatchCategory);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryData | null>(null);
  
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setLocalAvailableCategories(state.availableCategories);
      setLocalSelectedMatchCategory(state.selectedMatchCategory);
    }
  }, [state.availableCategories, state.selectedMatchCategory, isDirty]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      if (!isDirty) return true;

      // Validate no empty category names before saving
      if (localAvailableCategories.some(cat => cat.name.trim() === "")) {
        toast({
            title: "Error en Categorías",
            description: "Los nombres de las categorías no pueden estar vacíos.",
            variant: "destructive",
        });
        return false;
      }
       // Validate unique category names (case-insensitive)
      const categoryNames = localAvailableCategories.map(cat => cat.name.trim().toLowerCase());
      const uniqueCategoryNames = new Set(categoryNames);
      if (categoryNames.length !== uniqueCategoryNames.size) {
        toast({
            title: "Error en Categorías",
            description: "Los nombres de las categorías deben ser únicos (ignorando mayúsculas/minúsculas).",
            variant: "destructive",
        });
        return false;
      }


      dispatch({ type: "SET_AVAILABLE_CATEGORIES", payload: localAvailableCategories });
      dispatch({ type: "SET_SELECTED_MATCH_CATEGORY", payload: localSelectedMatchCategory });
      
      setIsDirty(false);
      return true; 
    },
    handleDiscard: () => {
      setLocalAvailableCategories(state.availableCategories);
      setLocalSelectedMatchCategory(state.selectedMatchCategory);
      setNewCategoryName("");
      setIsDirty(false);
    },
    getIsDirty: () => isDirty,
  }));

  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      toast({ title: "Nombre Requerido", description: "El nombre de la categoría no puede estar vacío.", variant: "destructive" });
      return;
    }
    if (localAvailableCategories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Categoría Duplicada", description: "Ya existe una categoría con este nombre.", variant: "destructive" });
      return;
    }
    // For simplicity, using trimmedName as ID, assuming it will be unique after trim and validation
    setLocalAvailableCategories([...localAvailableCategories, { id: trimmedName, name: trimmedName }]);
    setNewCategoryName("");
    markDirty();
  };

  const handleRemoveCategory = (categoryId: string) => {
    const category = localAvailableCategories.find(c => c.id === categoryId);
    if (category) {
        setCategoryToDelete(category);
    }
  };
  
  const confirmRemoveCategory = () => {
    if (categoryToDelete) {
        const updatedCategories = localAvailableCategories.filter(c => c.id !== categoryToDelete.id);
        setLocalAvailableCategories(updatedCategories);
        if (localSelectedMatchCategory === categoryToDelete.id) {
            setLocalSelectedMatchCategory(updatedCategories.length > 0 ? updatedCategories[0].id : "");
        }
        markDirty();
        toast({ title: "Categoría Eliminada", description: `Categoría "${categoryToDelete.name}" eliminada.` });
        setCategoryToDelete(null);
    }
  };

  return (
    <ControlCardWrapper title="Configuración de Categorías">
      <div className="space-y-6">
        {/* Match Category Selection */}
        <div className="space-y-2 p-4 border rounded-md bg-muted/20">
          <Label htmlFor="selectedMatchCategory" className="text-base font-medium">Categoría del Partido Actual</Label>
          <Select
            value={localSelectedMatchCategory}
            onValueChange={(value) => { setLocalSelectedMatchCategory(value); markDirty(); }}
            disabled={localAvailableCategories.length === 0}
          >
            <SelectTrigger id="selectedMatchCategory">
              <SelectValue placeholder="Seleccionar categoría del partido" />
            </SelectTrigger>
            <SelectContent>
              {localAvailableCategories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
              {localAvailableCategories.length === 0 && <SelectItem value="" disabled>No hay categorías definidas</SelectItem>}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Selecciona la categoría que se mostrará en el marcador principal y controles.
          </p>
        </div>

        {/* Manage Available Categories */}
        <div className="space-y-3 p-4 border rounded-md bg-muted/20">
          <h3 className="text-base font-medium">Categorías Disponibles para Equipos</h3>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Nombre de nueva categoría"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory();}}}
            />
            <Button type="button" onClick={handleAddCategory}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir
            </Button>
          </div>

          {localAvailableCategories.length > 0 ? (
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {localAvailableCategories.map(cat => (
                <li key={cat.id} className="flex items-center justify-between p-2 bg-background/50 rounded-md text-sm">
                  <span>{cat.name}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveCategory(cat.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">No hay categorías definidas.</p>
          )}
           <p className="text-xs text-muted-foreground">
            Estas categorías estarán disponibles al crear o editar equipos.
          </p>
        </div>
      </div>

      {categoryToDelete && (
        <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
                    <AlertDialogDescription>
                        ¿Estás seguro de que quieres eliminar la categoría "{categoryToDelete.name}"? 
                        Si algún equipo está usando esta categoría, se le asignará la primera categoría disponible o ninguna si no quedan más.
                        Esta acción no se puede deshacer una vez guardados los cambios.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmRemoveCategory}>
                        Eliminar Categoría
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </ControlCardWrapper>
  );
});

CategorySettingsCard.displayName = "CategorySettingsCard";
