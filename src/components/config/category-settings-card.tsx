
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useGameState, type CategoryData } from "@/contexts/game-state-context";
import { ControlCardWrapper } from "@/components/controls/control-card-wrapper";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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

  const [localCategoriesString, setLocalCategoriesString] = useState(
    state.availableCategories.map(c => c.name).join(", ")
  );
  
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setLocalCategoriesString(state.availableCategories.map(c => c.name).join(", "));
    }
  }, [state.availableCategories, isDirty]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      if (!isDirty) return true;

      const categoryNames = localCategoriesString
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      const uniqueCategoryNames = Array.from(new Set(categoryNames.map(name => name.toLowerCase())));
      
      if (uniqueCategoryNames.length !== categoryNames.length) {
         toast({
            title: "Error en Categorías",
            description: "Los nombres de las categorías deben ser únicos (ignorando mayúsculas/minúsculas y después de eliminar duplicados exactos).",
            variant: "destructive",
        });
      }
      
      const finalCategories: CategoryData[] = Array.from(new Set(categoryNames)) 
          .map(name => ({ id: name, name })); 

      if (finalCategories.length === 0 && localCategoriesString.trim() !== "") {
          toast({
              title: "Error en Categorías",
              description: "La cadena de categorías no puede estar vacía si no se quiere tener ninguna categoría. Para eliminar todas, deje el campo vacío.",
              variant: "destructive"
          });
      }

      dispatch({ type: "SET_AVAILABLE_CATEGORIES", payload: finalCategories });
      
      setIsDirty(false);
      return true; 
    },
    handleDiscard: () => {
      setLocalCategoriesString(state.availableCategories.map(c => c.name).join(", "));
      setIsDirty(false);
    },
    getIsDirty: () => isDirty,
  }));

  return (
    <ControlCardWrapper title="Configuración de Categorías Disponibles">
      <div className="space-y-2 p-4 border rounded-md bg-muted/20">
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-4">
          <Label htmlFor="categoriesInput" className="text-base font-medium whitespace-nowrap">
            Nombres de Categorías
          </Label>
          <Input
            id="categoriesInput"
            type="text"
            placeholder="Ej: A, B, C, Menores, Damas (separadas por coma)"
            value={localCategoriesString}
            onChange={(e) => {
              setLocalCategoriesString(e.target.value);
              markDirty();
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground pl-1">
          Estas categorías estarán disponibles al crear o editar equipos, y para seleccionar la categoría del partido.
          Los nombres deben ser únicos (se ignoran mayúsculas/minúsculas para la unicidad).
        </p>
      </div>
    </ControlCardWrapper>
  );
});

CategorySettingsCard.displayName = "CategorySettingsCard";

