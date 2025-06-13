
"use client";

import React, { useState } from 'react';
import { useGameState } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { TimerOff } from 'lucide-react';
import { ControlCardWrapper } from './control-card-wrapper';
import { useToast } from '@/hooks/use-toast';
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

export function TimeControlCard() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();
  const [isTimeoutConfirmOpen, setIsTimeoutConfirmOpen] = useState(false);

  const handlePrepareStartTimeout = () => {
    setIsTimeoutConfirmOpen(true);
  };

  const performStartTimeout = () => {
    dispatch({ type: 'START_TIMEOUT' }); 
    const autoStart = state.autoStartTimeouts;
    const timeoutDurationSec = state.defaultTimeoutDuration / 100;
    toast({ 
        title: "Time Out Iniciado", 
        description: `Time Out de ${timeoutDurationSec} segundos. Reloj ${autoStart ? 'corriendo' : 'pausado'}.`
    });
    setIsTimeoutConfirmOpen(false);
  };

  const isTimeOutButtonDisabled = 
    state.periodDisplayOverride === "Break" ||
    state.periodDisplayOverride === "Pre-OT Break" ||
    state.periodDisplayOverride === "Time Out";

  const timeoutDurationInSeconds = state.defaultTimeoutDuration / 100;
  const autoStartBehavior = state.autoStartTimeouts ? "se iniciará automáticamente" : "deberá iniciarse manualmente";

  return (
    <>
      <ControlCardWrapper title="Control de Time Out">
        <div className="space-y-4">
          <Button 
            onClick={handlePrepareStartTimeout} 
            variant="outline" 
            className="w-full" 
            aria-label="Iniciar Time Out" 
            disabled={isTimeOutButtonDisabled}
          >
              <TimerOff className="mr-2 h-4 w-4" /> Iniciar Time Out
          </Button>
          {isTimeOutButtonDisabled && (
            <p className="text-xs text-muted-foreground text-center">
              No se puede iniciar un Time Out durante un descanso o si ya hay un Time Out activo.
            </p>
          )}
        </div>
      </ControlCardWrapper>

      {isTimeoutConfirmOpen && (
        <AlertDialog open={isTimeoutConfirmOpen} onOpenChange={setIsTimeoutConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Inicio de Time Out</AlertDialogTitle>
              <AlertDialogDescription>
                Esto guardará el estado actual del reloj del partido, lo pausará e iniciará un Time Out de {timeoutDurationInSeconds} segundos.
                El reloj del Time Out {autoStartBehavior}. ¿Estás seguro?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsTimeoutConfirmOpen(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={performStartTimeout}>
                Confirmar e Iniciar Time Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

