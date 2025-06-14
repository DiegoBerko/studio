
"use client";

import React, { useEffect, useRef } from 'react';
import { useGameState, DEFAULT_SOUND_PATH } from '@/contexts/game-state-context';
import { useToast } from '@/hooks/use-toast';

export function SoundPlayer() {
  const { state } = useGameState();
  const { toast } = useToast();
  const lastPlayedTriggerRef = useRef<number>(state.playHornTrigger);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (state.isLoading) return;

    if (state.playHornTrigger > lastPlayedTriggerRef.current) {
      lastPlayedTriggerRef.current = state.playHornTrigger;

      if (state.playSoundAtPeriodEnd) {
        const soundSrc = state.customHornSoundDataUrl || DEFAULT_SOUND_PATH;
        
        if (soundSrc) {
          if (audioRef.current && audioRef.current.src !== soundSrc) {
            audioRef.current.pause();
            audioRef.current = null;
          }

          if (!audioRef.current) {
            audioRef.current = new Audio(soundSrc);
            audioRef.current.onerror = () => {
              let description = `No se pudo cargar el archivo de sonido. Verifique la configuración.`;
              if (soundSrc === DEFAULT_SOUND_PATH && !state.customHornSoundDataUrl) {
                description = `No se pudo cargar el sonido predeterminado: ${DEFAULT_SOUND_PATH}. Asegúrate de que el archivo exista en la carpeta 'public/audio'.`;
              } else if (soundSrc.startsWith('data:')) { 
                description = `No se pudo cargar el sonido personalizado. Verifica el archivo cargado.`;
              }
              toast({
                title: "Error de Sonido",
                description: description,
                variant: "destructive",
              });
              console.error(`Error loading audio from src: '${soundSrc}'. If this is the default sound ('${DEFAULT_SOUND_PATH}'), ensure the file exists at 'public${DEFAULT_SOUND_PATH}'.`);
              if (audioRef.current) audioRef.current = null; // Ensure it's nullified on error
            };
            audioRef.current.oncanplaythrough = () => {
                audioRef.current?.play().catch(error => {
                    console.warn("Playback prevented:", error);
                });
            };
          } else {
            audioRef.current.currentTime = 0; 
            audioRef.current.play().catch(error => {
                console.warn("Playback prevented:", error);
            });
          }
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playHornTrigger, state.playSoundAtPeriodEnd, state.customHornSoundDataUrl, state.isLoading, toast]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ''; 
        audioRef.current = null;
      }
    };
  }, []);

  return null;
}
