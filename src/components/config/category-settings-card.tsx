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

export const CategorySettingsCard = forwardRef<CategorySettingsCardRef, CategorySettingsCardProps>((props, ref) => {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const { onDirtyChange } = props;

  const [localCategoriesString, setLocalCategoriesString] = useState(
    state.availableCategories.map(c => c.name).join(", ")
  );
  const [isDirtyLocal, setIsDirtyLocal] = useState(false);

  useEffect(() => {
    onDirtyChange(isDirtyLocal);
  }, [isDirtyLocal, onDirtyChange]);

  useEffect(() => {
     if (!isDirtyLocal) {
      setLocalCategoriesString(state.availableCategories.map(c => c.name).join(", "));
    }
  }, [state.availableCategories, isDirtyLocal]);

  const markDirty = () => setIsDirtyLocal(true);

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      if (!isDirtyLocal) return true;

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
        // Do not set isDirtyLocal to false here, let user correct or discard
        return false; 
      }
      
      const finalCategories: CategoryData[] = Array.from(new Set(categoryNames)) 
          .map(name => ({ id: name, name })); 

      dispatch({ type: "SET_AVAILABLE_CATEGORIES", payload: finalCategories });
      setIsDirtyLocal(false);
      return true; 
    },
    handleDiscard: () => {
      setLocalCategoriesString(state.availableCategories.map(c => c.name).join(", "));
      setIsDirtyLocal(false);
    },
    getIsDirty: () => isDirtyLocal,
  }));

  return (
    <ControlCardWrapper title="Configuración de Categorías Disponibles">
      <div className="space-y-2">
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-4">
          <Label htmlFor="categoriesInput" className="text-base font-medium whitespace-nowrap">
            Nombres de Categorías
          </Label>
          <Input
            id="categoriesInput"
            type="text"
            placeholder="Ej: A, B, C (separadas por coma)"
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
