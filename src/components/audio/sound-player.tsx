
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

  // Directly derive the src from the state. This avoids the intermediate empty string state.
  const hornSoundSrc = state.customHornSoundDataUrl || DEFAULT_SOUND_PATH;
  const penaltyBeepSoundSrc = state.customPenaltyBeepSoundDataUrl || DEFAULT_PENALTY_BEEP_PATH;


  // Effect to play the horn sound
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

  // Effect to play the penalty beep sound
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

  return (
    <>
      <audio ref={hornAudioRef} src={hornSoundSrc} preload="auto" />
      <audio ref={penaltyAudioRef} src={penaltyBeepSoundSrc} preload="auto" />
    </>
  );
}
