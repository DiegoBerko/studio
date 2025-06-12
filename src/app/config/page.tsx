
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { DurationSettingsCard, type DurationSettingsCardRef } from "@/components/config/duration-settings-card";
import { PenaltySettingsCard, type PenaltySettingsCardRef } from "@/components/config/penalty-settings-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Undo2 } from 'lucide-react';

export default function ConfigPage() {
  const { toast } = useToast();
  const durationSettingsRef = useRef<DurationSettingsCardRef>(null);
  const penaltySettingsRef = useRef<PenaltySettingsCardRef>(null);

  const [isDurationDirty, setIsDurationDirty] = useState(false);
  const [isPenaltyDirty, setIsPenaltyDirty] = useState(false);

  const pageIsDirty = isDurationDirty || isPenaltyDirty;

  const handleSaveAll = () => {
    let durationSaveSuccess = true;
    let penaltySaveSuccess = true;

    if (durationSettingsRef.current?.getIsDirty()) {
      durationSaveSuccess = durationSettingsRef.current.handleSave();
    }
    if (penaltySettingsRef.current?.getIsDirty()) {
      penaltySaveSuccess = penaltySettingsRef.current.handleSave();
    }

    if (durationSaveSuccess && penaltySaveSuccess) {
      toast({
        title: "Configuración Guardada",
        description: "Todos los cambios han sido guardados exitosamente.",
      });
      // Dirty flags will be reset by the cards themselves
    } else {
      toast({
        title: "Error al Guardar",
        description: "Algunas configuraciones no pudieron ser guardadas. Revisa los campos.",
        variant: "destructive",
      });
    }
  };

  const handleDiscardAll = () => {
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
  
  // Ensure pageIsDirty updates when child dirty states change
  useEffect(() => {
    // This effect is mostly for reacting if somehow child dirty states change without re-render of this page
    // but the main update path is via onDirtyChange callbacks.
  }, [isDurationDirty, isPenaltyDirty]);

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
    </div>
  );
}

    