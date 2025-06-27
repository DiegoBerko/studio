
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useGameState, DEFAULT_SOUND_PATH, DEFAULT_PENALTY_BEEP_PATH } from '@/contexts/game-state-context';
import { useToast } from '@/hooks/use-toast';

export function SoundPlayer() {
  const { state } = useGameState();
  const { toast } = useToast();
  
  const lastPlayedHornTriggerRef = useRef<number>(state.playHornTrigger);
  const hornAudioRef = useRef<HTMLAudioElement | null>(null);

  const lastPlayedBeepTriggerRef = useRef<number>(state.playPenaltyBeepTrigger);
  const penaltyAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);


  const hornSoundSrc = state.customHornSoundDataUrl || DEFAULT_SOUND_PATH;
  const penaltyBeepSoundSrc = state.customPenaltyBeepSoundDataUrl || DEFAULT_PENALTY_BEEP_PATH;

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>, soundName: string) => {
    const error = e.currentTarget.error;
    if (!error) return;
    
    let errorMessage = `Código de error: ${error.code}.`;
    switch (error.code) {
      case error.MEDIA_ERR_ABORTED:
        errorMessage = 'La carga de audio fue abortada.';
        break;
      case error.MEDIA_ERR_NETWORK:
        errorMessage = 'Ocurrió un error de red al cargar el audio.';
        break;
      case error.MEDIA_ERR_DECODE:
        errorMessage = 'El archivo de audio está corrupto o no es soportado.';
        break;
      case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
        errorMessage = 'No se encontró o no se soporta el archivo de audio. Verifica que exista en la carpeta /public.';
        break;
      default:
        errorMessage = 'Ocurrió un error desconocido al cargar el audio.';
        break;
    }

    console.error(`Error de Audio (${soundName}):`, error.message, e.currentTarget.src);
    toast({
        title: `Error de Sonido (${soundName})`,
        description: errorMessage,
        variant: "destructive"
    });
  };

  useEffect(() => {
    if (state.isLoading) return;

    if (state.playHornTrigger > lastPlayedHornTriggerRef.current) {
      lastPlayedHornTriggerRef.current = state.playHornTrigger;

      if (state.playSoundAtPeriodEnd && hornAudioRef.current) {
        hornAudioRef.current.currentTime = 0;
        hornAudioRef.current.play().catch(error => {
          console.warn("Playback prevented for horn sound:", error);
          toast({
            title: "Error de Sonido de Bocina",
            description: "El navegador impidió la reproducción automática del sonido.",
            variant: "destructive"
          });
        });
      }
    }
  }, [state.playHornTrigger, state.playSoundAtPeriodEnd, state.isLoading, toast]);

  useEffect(() => {
    if (state.isLoading) return;

    if (state.playPenaltyBeepTrigger > lastPlayedBeepTriggerRef.current) {
      lastPlayedBeepTriggerRef.current = state.playPenaltyBeepTrigger;
      
      if (state.enablePenaltyCountdownSound && penaltyAudioRef.current) {
        penaltyAudioRef.current.currentTime = 0;
        penaltyAudioRef.current.play().catch(error => {
          console.warn("Playback prevented for penalty beep:", error);
          toast({
            title: "Error de Sonido de Beep",
            description: "El navegador impidió la reproducción automática del sonido.",
            variant: "destructive"
          });
        });
      }
    }
  }, [state.playPenaltyBeepTrigger, state.enablePenaltyCountdownSound, state.isLoading, toast]);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <audio 
        ref={hornAudioRef} 
        src={hornSoundSrc} 
        preload="auto"
        onError={(e) => handleAudioError(e, 'Bocina')} 
      />
      <audio 
        ref={penaltyAudioRef} 
        src={penaltyBeepSoundSrc} 
        preload="auto" 
        onError={(e) => handleAudioError(e, 'Beep Penalidad')}
      />
    </>
  );
}
