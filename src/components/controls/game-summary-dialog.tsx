
"use client";

import React from "react";
import { useGameState, formatTime, type Team, type GoalLog, type PenaltyLog } from "@/contexts/game-state-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Goal, Siren, X } from "lucide-react";

interface GameSummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const getEndReasonText = (reason?: PenaltyLog['endReason']): string => {
    if (!reason) return 'Activa';
    switch (reason) {
        case 'completed': return 'Cumplida';
        case 'deleted': return 'Eliminada';
        default: return 'Cerrada';
    }
};

const TeamSummaryColumn = ({ team, teamName, score, goals, penalties }: { team: Team; teamName: string; score: number; goals: GoalLog[]; penalties: PenaltyLog[] }) => (
  <div className="flex-1 space-y-4">
    <h3 className="text-2xl font-bold text-primary text-center">{teamName} - <span className="text-accent">{score}</span></h3>
    
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl"><Goal className="h-5 w-5" />Goles</CardTitle>
      </CardHeader>
      <CardContent>
        {goals.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiempo</TableHead>
                <TableHead>Jugador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map(goal => (
                <TableRow key={goal.id}>
                  <TableCell>
                    <div className="font-mono text-sm">{formatTime(goal.gameTime)}</div>
                    <div className="text-xs text-muted-foreground">{goal.periodText}</div>
                  </TableCell>
                  <TableCell>
                     <div className="font-semibold">#{goal.scorer?.playerNumber || 'S/N'}</div>
                     <div className="text-xs text-muted-foreground">{goal.scorer?.playerName || '---'}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <p className="text-sm text-muted-foreground">Sin goles registrados.</p>}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl"><Siren className="h-5 w-5" />Penalidades</CardTitle>
      </CardHeader>
      <CardContent>
        {penalties.length > 0 ? (
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jugador</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {penalties.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-semibold">#{p.playerNumber}</div>
                    <div className="text-xs text-muted-foreground">{p.playerName || '---'}</div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{formatTime(p.initialDuration * 100)}</TableCell>
                  <TableCell>
                     <div className="text-sm">{getEndReasonText(p.endReason)}</div>
                     {p.timeServed !== undefined && <div className="text-xs text-muted-foreground font-mono">({formatTime(p.timeServed * 100)})</div>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <p className="text-sm text-muted-foreground">Sin penalidades registradas.</p>}
      </CardContent>
    </Card>
  </div>
);

export function GameSummaryDialog({ isOpen, onOpenChange }: GameSummaryDialogProps) {
  const { state } = useGameState();
  const { home, away } = state.gameSummary;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-3xl">Resumen del Partido</DialogTitle>
          <DialogDescription>
            Un resumen completo de los goles y penalidades del partido actual.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow my-4 border-y py-4 pr-6 -mr-6">
          <div className="flex flex-col md:flex-row gap-6">
            <TeamSummaryColumn 
              team="home"
              teamName={state.homeTeamName}
              score={state.homeScore}
              goals={home?.goals || []}
              penalties={home?.penalties || []}
            />
            <Separator orientation="vertical" className="hidden md:block h-auto" />
            <Separator orientation="horizontal" className="block md:hidden" />
             <TeamSummaryColumn 
              team="away"
              teamName={state.awayTeamName}
              score={state.awayScore}
              goals={away?.goals || []}
              penalties={away?.penalties || []}
            />
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline"><X className="mr-2 h-4 w-4" />Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
