
"use client";

import { useGameState, getPeriodText, getActualPeriodText, secondsToMinutes } from '@/contexts/game-state-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
// Input ya no es necesario aquí
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Plus, Minus ya no son necesarios aquí
import { ControlCardWrapper } from './control-card-wrapper';
import { useToast } from '@/hooks/use-toast';
// Team type ya no es necesario aquí si handleScoreAdjust se elimina

const MAX_PERIOD_NUMBER = 7; 

export function ScorePeriodControlCard() {
  const { state, dispatch } = useGameState();
  const { toast } = useToast();

  // handleScoreAdjust y handleTeamNameChange ya no son necesarios aquí

  const handlePreviousPeriod = () => {
    if (state.periodDisplayOverride === "Break" || state.periodDisplayOverride === "Pre-OT Break") {
      dispatch({ type: 'SET_PERIOD', payload: state.currentPeriod });
      toast({ title: "Período Cambiado", description: `Período establecido a ${getPeriodText(state.currentPeriod)}. Reloj reiniciado y pausado.` });
    } else {
      if (state.currentPeriod > 1) {
        // const periodBeforeIntendedBreak = state.currentPeriod -1; // No se usa directamente
        dispatch({ type: 'START_BREAK_AFTER_PREVIOUS_PERIOD' }); 
        // El toast ahora debe reflejar el tipo de break que se inició y su duración
        const breakType = (state.currentPeriod -1) >= 3 ? "Pre-OT Break" : "Break";
        const duration = (state.currentPeriod -1) >= 3 ? state.defaultPreOTBreakDuration : state.defaultBreakDuration;
        const autoStart = (state.currentPeriod -1) >= 3 ? state.autoStartPreOTBreaks : state.autoStartBreaks;

        toast({ 
            title: `${breakType} Iniciado`, 
            description: `${breakType} iniciado después de ${getPeriodText(state.currentPeriod-1)} (${secondsToMinutes(duration)} min). Reloj ${autoStart ? 'corriendo' : 'pausado'}.`
        });

      } else {
        toast({ title: "Límite de Período Alcanzado", description: "No se puede retroceder más allá del 1er Período.", variant: "destructive" });
      }
    }
  };

  const handleNextPeriod = () => {
    if (state.periodDisplayOverride === "Break" || state.periodDisplayOverride === "Pre-OT Break") {
      const nextNumericPeriod = state.currentPeriod + 1;
      if (nextNumericPeriod <= MAX_PERIOD_NUMBER) {
        dispatch({ type: 'SET_PERIOD', payload: nextNumericPeriod });
        toast({ title: "Período Cambiado", description: `Período establecido a ${getPeriodText(nextNumericPeriod)}. Reloj reiniciado y pausado.` });
      } else {
        toast({ title: "Límite de Período Alcanzado", description: `No se puede avanzar más allá de ${getPeriodText(state.currentPeriod)}.`, variant: "destructive" });
      }
    } else {
      if (state.currentPeriod < MAX_PERIOD_NUMBER) {
        const isPreOT = state.currentPeriod >= 3; 
        const breakType = isPreOT ? "Pre-OT Break" : "Break";
        const duration = isPreOT ? state.defaultPreOTBreakDuration : state.defaultBreakDuration;
        const autoStart = isPreOT ? state.autoStartPreOTBreaks : state.autoStartBreaks;

        if (isPreOT) {
            dispatch({ type: 'START_PRE_OT_BREAK' });
        } else {
            dispatch({ type: 'START_BREAK' });
        }
        toast({ 
            title: `${breakType} Iniciado`, 
            description: `${breakType} iniciado después de ${getPeriodText(state.currentPeriod)} (${secondsToMinutes(duration)} min). Reloj ${autoStart ? 'corriendo' : 'pausado'}.`
        });
      } else {
        toast({ title: "Límite de Período Alcanzado", description: `No se puede avanzar más allá de ${getPeriodText(state.currentPeriod)}.`, variant: "destructive" });
      }
    }
  };
  
  const isPreviousDisabled = state.periodDisplayOverride === null && state.currentPeriod <= 1;
  const isNextDisabled = state.periodDisplayOverride === null && state.currentPeriod >= MAX_PERIOD_NUMBER;

  return (
    <ControlCardWrapper title="Controles de Período">
      <div className="space-y-6">
        {/* Secciones de Nombres de Equipos y Controles de Puntuación eliminadas */}
        <div>
          <Label className="text-base block text-center mb-2">Controles de Período</Label>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Button 
              onClick={handlePreviousPeriod} 
              variant="outline" 
              size="icon" 
              aria-label="Período Anterior"
              disabled={isPreviousDisabled}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-2xl font-bold w-36 text-center text-accent truncate">
              {getActualPeriodText(state.currentPeriod, state.periodDisplayOverride)}
            </span>
            <Button 
              onClick={handleNextPeriod} 
              variant="outline" 
              size="icon" 
              aria-label="Siguiente Período"
              disabled={isNextDisabled}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </ControlCardWrapper>
  );
}
