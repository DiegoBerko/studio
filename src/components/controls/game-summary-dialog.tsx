
"use client";

import React from 'react';
import { useGameState, formatTime, getPeriodText } from '@/contexts/game-state-context';
import type { GoalLog, PenaltyLog } from '@/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from '@/components/ui/separator';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GameSummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const SummarySection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="mb-4">
    <h4 className="text-lg font-semibold text-primary-foreground mb-2 pb-1 border-b">{title}</h4>
    {children}
  </div>
);

const NoEntries = () => <p className="text-sm text-muted-foreground">Sin registros.</p>;

export function GameSummaryDialog({ isOpen, onOpenChange }: GameSummaryDialogProps) {
  const { state } = useGameState();
  const { toast } = useToast();
  const { gameSummary, homeTeamName, awayTeamName } = state;

  const generateSummaryText = () => {
    let summary = `Resumen del Partido\n`;
    summary += `=====================\n`;
    summary += `Partido: ${homeTeamName} vs ${awayTeamName}\n`;
    summary += `Fecha: ${new Date().toLocaleString()}\n\n`;

    const processTeam = (teamName: string, teamSummary: { goals: GoalLog[], penalties: PenaltyLog[] }) => {
      summary += `--- ${teamName} ---\n\n`;
      
      summary += `Goles (${teamSummary.goals.length}):\n`;
      if (teamSummary.goals.length === 0) {
        summary += "Sin goles.\n";
      } else {
        teamSummary.goals.forEach(goal => {
          summary += `- [${new Date(goal.timestamp).toLocaleTimeString()}] Gol en ${goal.periodText} (${formatTime(goal.gameTime)}) - Marcador: ${goal.scoreAfterGoal.home}-${goal.scoreAfterGoal.away}\n`;
        });
      }
      summary += "\n";

      summary += `Penalidades (${teamSummary.penalties.length}):\n`;
      if (teamSummary.penalties.length === 0) {
        summary += "Sin penalidades.\n";
      } else {
        teamSummary.penalties.forEach(p => {
          const playerName = p.playerName ? `(${p.playerName})` : '';
          summary += `- [${new Date(p.addTimestamp).toLocaleTimeString()}] Penalidad para #${p.playerNumber} ${playerName} en ${p.addPeriodText} (${formatTime(p.addGameTime)}) - ${p.initialDuration / 60}'\n`;
          if (p.endReason) {
            const reasonText = p.endReason === 'completed' ? 'Minutos cumplidos' : 'Borrada';
            const timeServedText = p.timeServed !== undefined ? ` (Cumplido: ${formatTime(p.timeServed * 100)})` : '';
            summary += `  -> Finalizada en ${p.endPeriodText} (${formatTime(p.endGameTime || 0)}) - Motivo: ${reasonText}${timeServedText}\n`;
          }
        });
      }
      summary += "\n";
    };

    processTeam(homeTeamName, gameSummary.home);
    processTeam(awayTeamName, gameSummary.away);

    return summary;
  };

  const handleDownload = () => {
    const summaryText = generateSummaryText();
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    const date = new Date();
    const dateString = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    link.download = `Resumen_Partido_${homeTeamName}_vs_${awayTeamName}_${dateString}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);

    toast({
        title: "Resumen Descargado",
        description: "El archivo de resumen del partido se ha descargado.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Resumen del Partido</DialogTitle>
          <DialogDescription>
            Registro de eventos clave del partido actual.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4 -mr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            {/* Home Team Section */}
            <div>
              <h3 className="text-xl font-bold text-accent mb-3 truncate">{homeTeamName}</h3>
              <SummarySection title="Goles">
                {gameSummary.home.goals.length > 0 ? (
                  <ul className="space-y-1.5 text-sm">
                    {gameSummary.home.goals.map(goal => (
                      <li key={goal.id}>
                        <span className="font-mono text-muted-foreground text-xs mr-2">[{new Date(goal.timestamp).toLocaleTimeString()}]</span>
                        <span className="font-semibold">{goal.periodText} ({formatTime(goal.gameTime)})</span>
                        <span className="ml-2">» {goal.scoreAfterGoal.home}-{goal.scoreAfterGoal.away}</span>
                      </li>
                    ))}
                  </ul>
                ) : <NoEntries />}
              </SummarySection>
              <SummarySection title="Penalidades">
                 {gameSummary.home.penalties.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                        {gameSummary.home.penalties.map(p => (
                            <li key={p.id}>
                                <div className="font-semibold">
                                    <span className="font-mono text-muted-foreground text-xs mr-2">[{new Date(p.addTimestamp).toLocaleTimeString()}]</span>
                                    #{p.playerNumber} {p.playerName && `(${p.playerName})`} - {p.initialDuration/60}'
                                </div>
                                <div className="pl-4 text-muted-foreground text-xs">
                                    <span>Agregada: {p.addPeriodText} ({formatTime(p.addGameTime)})</span>
                                    {p.endReason && (
                                        <span className="ml-3">
                                            Finalizada: {p.endPeriodText} ({formatTime(p.endGameTime || 0)}) - {p.endReason === 'completed' ? 'Cumplida' : 'Borrada'}
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                 ) : <NoEntries />}
              </SummarySection>
            </div>
            
            <Separator orientation="vertical" className="hidden md:block" />

            {/* Away Team Section */}
            <div>
              <h3 className="text-xl font-bold text-accent mb-3 truncate">{awayTeamName}</h3>
               <SummarySection title="Goles">
                {gameSummary.away.goals.length > 0 ? (
                  <ul className="space-y-1.5 text-sm">
                    {gameSummary.away.goals.map(goal => (
                      <li key={goal.id}>
                        <span className="font-mono text-muted-foreground text-xs mr-2">[{new Date(goal.timestamp).toLocaleTimeString()}]</span>
                        <span className="font-semibold">{goal.periodText} ({formatTime(goal.gameTime)})</span>
                         <span className="ml-2">» {goal.scoreAfterGoal.home}-{goal.scoreAfterGoal.away}</span>
                      </li>
                    ))}
                  </ul>
                ) : <NoEntries />}
              </SummarySection>
              <SummarySection title="Penalidades">
                 {gameSummary.away.penalties.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                        {gameSummary.away.penalties.map(p => (
                            <li key={p.id}>
                                <div className="font-semibold">
                                    <span className="font-mono text-muted-foreground text-xs mr-2">[{new Date(p.addTimestamp).toLocaleTimeString()}]</span>
                                    #{p.playerNumber} {p.playerName && `(${p.playerName})`} - {p.initialDuration/60}'
                                </div>
                                <div className="pl-4 text-muted-foreground text-xs">
                                    <span>Agregada: {p.addPeriodText} ({formatTime(p.addGameTime)})</span>
                                    {p.endReason && (
                                        <span className="ml-3">
                                            Finalizada: {p.endPeriodText} ({formatTime(p.endGameTime || 0)}) - {p.endReason === 'completed' ? 'Cumplida' : 'Borrada'}
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                 ) : <NoEntries />}
              </SummarySection>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Descargar Resumen (.txt)
            </Button>
            <DialogClose asChild>
                <Button type="button">Cerrar</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
