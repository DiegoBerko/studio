
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
            // Source changed, clean up old audio object if any
            audioRef.current.pause();
            audioRef.current = null;
          }

          if (!audioRef.current) {
            audioRef.current = new Audio(soundSrc);
            audioRef.current.onerror = () => {
              let description = `No se pudo cargar el archivo de sonido. Verifique la configuración.`;
              if (soundSrc === DEFAULT_SOUND_PATH && !state.customHornSoundDataUrl) {
                description = `No se pudo cargar el sonido predeterminado: ${DEFAULT_SOUND_PATH}. Asegúrate de que el archivo exista en la carpeta 'public/audio'.`;
              } else if (soundSrc.startsWith('data:')) { // Custom sound was from Data URL
                description = `No se pudo cargar el sonido personalizado. Verifica el archivo cargado.`;
              }
              toast({
                title: "Error de Sonido",
                description: description,
                variant: "destructive",
              });
              console.error("Error loading audio:", soundSrc);
              audioRef.current = null; // Clear ref on error
            };
            audioRef.current.oncanplaythrough = () => {
                 // Attempt to play only once ready
                audioRef.current?.play().catch(error => {
                    console.warn("Playback prevented:", error);
                    // This can happen if the user hasn't interacted with the page yet.
                    // Browsers often block auto-play in such cases.
                    // A toast here might be too intrusive.
                });
            };
          } else {
             // If audio object exists and source is the same, just play
            audioRef.current.currentTime = 0; // Rewind to start
            audioRef.current.play().catch(error => {
                console.warn("Playback prevented:", error);
            });
          }
        } else {
            // console.log("Sound play skipped: No sound source defined (custom or default).");
        }
      }
    }
  }, [state.playHornTrigger, state.playSoundAtPeriodEnd, state.customHornSoundDataUrl, state.isLoading, toast, DEFAULT_SOUND_PATH]);

  // Cleanup audio element on component unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ''; // Release resources
        audioRef.current = null;
      }
    };
  }, []);

  return null; // This component does not render anything
}
