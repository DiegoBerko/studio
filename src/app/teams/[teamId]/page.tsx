
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useGameState } from "@/contexts/game-state-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2, Users, Info } from "lucide-react";
import { AddPlayerForm } from "@/components/teams/add-player-form";
import { PlayerListItem } from "@/components/teams/player-list-item";
import { DefaultTeamLogo } from "@/components/teams/default-team-logo";
import { CreateEditTeamDialog } from "@/components/teams/create-edit-team-dialog";
import { useToast } from "@/hooks/use-toast";
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
import { Separator } from "@/components/ui/separator";

export default function ManageTeamPage() {
  const params = useParams();
  const router = useRouter();
  const { state, dispatch, isLoading } = useGameState();
  const { toast } = useToast();

  const teamId = typeof params.teamId === 'string' ? params.teamId : undefined;
  const [team, setTeam] = useState(teamId ? state.teams.find(t => t.id === teamId) : undefined);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (teamId) {
      setTeam(state.teams.find(t => t.id === teamId));
    }
  }, [teamId, state.teams]);

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-10">Cargando datos del equipo...</div>;
  }

  if (!team) {
    return (
      <div className="text-center py-10">
        <Info className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive-foreground mb-2">Equipo no encontrado</h2>
        <p className="text-muted-foreground mb-6">
          El equipo que estás buscando no existe o ha sido eliminado.
        </p>
        <Button onClick={() => router.push('/teams')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Equipos
        </Button>
      </div>
    );
  }

  const handleRemovePlayer = (playerId: string) => {
    dispatch({ type: "REMOVE_PLAYER_FROM_TEAM", payload: { teamId: team.id, playerId } });
    toast({
      title: "Jugador Eliminado",
      description: "El jugador ha sido eliminado del equipo.",
    });
  };

  const handleDeleteTeam = () => {
    dispatch({ type: "DELETE_TEAM", payload: { teamId: team.id } });
    toast({
      title: "Equipo Eliminado",
      description: `El equipo "${team.name}" ha sido eliminado.`,
      variant: "destructive",
    });
    router.push('/teams');
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      <Button variant="outline" onClick={() => router.push('/teams')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Equipos
      </Button>

      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 border rounded-lg bg-card shadow-md">
        {team.logoDataUrl ? (
          <Image
            src={team.logoDataUrl}
            alt={`${team.name} logo`}
            width={100}
            height={100}
            className="rounded-lg border object-contain w-24 h-24 sm:w-28 sm:h-28"
          />
        ) : (
          <DefaultTeamLogo teamName={team.name} size="lg" className="w-24 h-24 sm:w-28 sm:h-28 text-4xl" />
        )}
        <div className="flex-grow text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-foreground">{team.name}</h1>
          <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            <span>{team.players.length} Jugador{team.players.length !== 1 ? 'es' : ''}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0 self-center sm:self-start">
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Editar Equipo
          </Button>
           <Button variant="destructive" onClick={() => setIsDeleteConfirmOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar Equipo
          </Button>
        </div>
      </div>

      <Separator />

      <AddPlayerForm teamId={team.id} />

      <Separator />
      
      <div>
        <h2 className="text-2xl font-semibold text-primary-foreground mb-4">Lista de Jugadores</h2>
        {team.players.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {team.players.map(player => (
              <PlayerListItem key={player.id} player={player} onRemovePlayer={handleRemovePlayer} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 px-4 border border-dashed rounded-md bg-card">
            <Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Este equipo aún no tiene jugadores.</p>
            <p className="text-sm text-muted-foreground">Usa el formulario de arriba para añadir el primero.</p>
          </div>
        )}
      </div>

      <CreateEditTeamDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        teamToEdit={team}
        onTeamSaved={() => { /* Could refresh data or rely on state update */ }}
      />

      {isDeleteConfirmOpen && (
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que quieres eliminar el equipo "{team.name}"? Esta acción eliminará también a todos sus jugadores y no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTeam} className="bg-destructive hover:bg-destructive/90">
                Eliminar Equipo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
