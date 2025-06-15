
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

// Interface CategorySettingsCardProps removida ya que onDirtyChange no se usa más

export const CategorySettingsCard = forwardRef<CategorySettingsCardRef>((props, ref) => {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  const [localCategoriesString, setLocalCategoriesString] = useState(
    state.availableCategories.map(c => c.name).join(", ")
  );
  
  const [isDirty, setIsDirty] = useState(false); // Flag local de "dirty"

  useEffect(() => {
    // Este efecto se ejecuta cuando state.availableCategories cambia o cuando isDirty cambia.
    // Si la tarjeta no está marcada como "dirty" por una edición del usuario,
    // actualiza el string local para reflejar el estado global.
    if (!isDirty) {
      setLocalCategoriesString(state.availableCategories.map(c => c.name).join(", "));
    }
  }, [state.availableCategories, isDirty]);


  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      if (!isDirty) { // Si el flag local indica que no hay cambios, no hagas nada
        const globalCategoriesString = state.availableCategories.map(c => c.name).join(", ");
        if (localCategoriesString === globalCategoriesString) return true; // Verifica por si acaso
      }

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
        // No retornamos false aquí, permitimos guardar lo que es válido si el usuario insiste,
        // o podría implementarse una validación más estricta para retornar false.
        // Por ahora, se guardarán los nombres únicos.
      }
      
      const finalCategories: CategoryData[] = Array.from(new Set(categoryNames)) 
          .map(name => ({ id: name, name })); 

      // Permitir string vacío para eliminar todas las categorías.
      // La validación de "no puede estar vacío si no se quiere tener ninguna" es un poco confusa.
      // Si el usuario quiere 0 categorías, el string local será "" y finalCategories.length será 0.
      // Esto es válido.

      dispatch({ type: "SET_AVAILABLE_CATEGORIES", payload: finalCategories });
      
      setIsDirty(false); // Resetea el flag "dirty" después de guardar
      return true; 
    },
    handleDiscard: () => {
      setLocalCategoriesString(state.availableCategories.map(c => c.name).join(", "));
      setIsDirty(false); // Resetea el flag "dirty"
    },
    getIsDirty: () => {
      // Compara activamente el valor local con el valor del estado global
      const globalCategoriesString = state.availableCategories.map(c => c.name).join(", ");
      return localCategoriesString !== globalCategoriesString;
    },
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
            placeholder="Ej: A, B, C (separadas por coma)"
            value={localCategoriesString}
            onChange={(e) => {
              setLocalCategoriesString(e.target.value);
              markDirty(); // Marca como "dirty" al editar
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

    