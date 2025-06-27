
"use client";

import React, { useEffect, useRef } from 'react';
import { useGameState, DEFAULT_SOUND_PATH, DEFAULT_PENALTY_BEEP_PATH } from '@/contexts/game-state-context';
import { useToast } from '@/hooks/use-toast';

export function SoundPlayer() {
  const { state } = useGameState();
  const { toast } = useToast();
  
  const lastPlayedHornTriggerRef = useRef<number>(state.playHornTrigger);
  const hornAudioRef = useRef<HTMLAudioElement | null>(null);

  const lastPlayedBeepTriggerRef = useRef<number>(state.playPenaltyBeepTrigger);
  const penaltyAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (state.isLoading) return;

    if (state.playHornTrigger > lastPlayedHornTriggerRef.current) {
      lastPlayedHornTriggerRef.current = state.playHornTrigger;

      if (state.playSoundAtPeriodEnd) {
        const soundSrc = state.customHornSoundDataUrl || DEFAULT_SOUND_PATH;
        
        if (soundSrc) {
          if (hornAudioRef.current && hornAudioRef.current.src !== soundSrc) {
            hornAudioRef.current.pause();
            hornAudioRef.current = null; // Force re-creation if source changed
          }

          if (!hornAudioRef.current) {
            hornAudioRef.current = new Audio(soundSrc);
            hornAudioRef.current.onerror = () => {
              let description = `No se pudo cargar el archivo de sonido. Verifique la configuración.`;
              if (soundSrc === DEFAULT_SOUND_PATH && !state.customHornSoundDataUrl) {
                description = `No se pudo cargar el sonido predeterminado: ${DEFAULT_SOUND_PATH}. Asegúrate de que el archivo exista en la carpeta 'public/audio'.`;
              } else if (soundSrc.startsWith('data:')) { 
                description = `No se pudo cargar el sonido personalizado. Verifica el archivo cargado.`;
              }
              toast({
                title: "Error de Sonido de Bocina",
                description: description,
                variant: "destructive",
              });
              if (hornAudioRef.current) hornAudioRef.current = null; // Ensure it's nullified on error
            };
            hornAudioRef.current.oncanplaythrough = () => {
                hornAudioRef.current?.play().catch(error => {
                    console.warn("Playback prevented for horn:", error);
                });
            };
          } else {
            hornAudioRef.current.currentTime = 0; // Rewind to start
            hornAudioRef.current.play().catch(error => {
                console.warn("Playback prevented for horn:", error);
            });
          }
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playHornTrigger, state.playSoundAtPeriodEnd, state.customHornSoundDataUrl, state.isLoading, toast]);

  useEffect(() => {
    if (state.isLoading) return;

    if (state.playPenaltyBeepTrigger > lastPlayedBeepTriggerRef.current) {
      lastPlayedBeepTriggerRef.current = state.playPenaltyBeepTrigger;
      
      if (state.enablePenaltyCountdownSound) {
        const soundSrc = state.customPenaltyBeepSoundDataUrl || DEFAULT_PENALTY_BEEP_PATH;
        
        if (soundSrc) {
          if (penaltyAudioRef.current && penaltyAudioRef.current.src !== soundSrc) {
            penaltyAudioRef.current.pause();
            penaltyAudioRef.current = null; 
          }

          if (!penaltyAudioRef.current) {
            penaltyAudioRef.current = new Audio(soundSrc);
            penaltyAudioRef.current.onerror = () => {
              let description = `No se pudo cargar el archivo de sonido de beep. Verifique la configuración.`;
              if (soundSrc === DEFAULT_PENALTY_BEEP_PATH && !state.customPenaltyBeepSoundDataUrl) {
                description = `No se pudo cargar el sonido predeterminado: ${DEFAULT_PENALTY_BEEP_PATH}. Asegúrate de que el archivo exista en la carpeta 'public/audio'.`;
              } else if (soundSrc.startsWith('data:')) { 
                description = `No se pudo cargar el sonido de beep personalizado. Verifica el archivo cargado.`;
              }
              toast({
                title: "Error de Sonido de Beep",
                description: description,
                variant: "destructive",
              });
              if (penaltyAudioRef.current) penaltyAudioRef.current = null;
            };
            penaltyAudioRef.current.oncanplaythrough = () => {
                penaltyAudioRef.current?.play().catch(error => {
                    console.warn("Playback prevented for penalty beep:", error);
                });
            };
          } else {
            penaltyAudioRef.current.currentTime = 0;
            penaltyAudioRef.current.play().catch(error => {
                console.warn("Playback prevented for penalty beep:", error);
            });
          }
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playPenaltyBeepTrigger, state.enablePenaltyCountdownSound, state.customPenaltyBeepSoundDataUrl, state.isLoading, toast]);

  useEffect(() => {
    return () => {
      if (hornAudioRef.current) {
        hornAudioRef.current.pause();
        hornAudioRef.current.src = ''; 
        hornAudioRef.current = null;
      }
      if (penaltyAudioRef.current) {
        penaltyAudioRef.current.pause();
        penaltyAudioRef.current.src = '';
        penaltyAudioRef.current = null;
      }
    };
  }, []);

  return null;
}
