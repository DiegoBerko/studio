
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useGameState } from "@/contexts/game-state-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Users, Info } from "lucide-react";
import { TeamListItem } from "@/components/teams/team-list-item";
import { CreateEditTeamDialog } from "@/components/teams/create-edit-team-dialog";
import { useRouter } from "next/navigation";

export default function TeamsPage() {
  const { state } = useGameState();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredTeams = useMemo(() => {
    if (!searchTerm.trim()) {
      return state.teams;
    }
    return state.teams.filter((team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.teams, searchTerm]);

  const handleTeamSaved = (teamId: string) => {
    // Potentially navigate to the new/edited team's page, or just close dialog
    // For now, just closes dialog, list will update.
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary-foreground">Equipos</h1>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-5 w-5" /> Crear Nuevo Equipo
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar equipo por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 text-base"
        />
      </div>

      {state.isLoading ? (
        <p className="text-center text-muted-foreground">Cargando equipos...</p>
      ) : filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <TeamListItem key={team.id} team={team} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-card-foreground mb-2">
            {state.teams.length === 0 ? "No hay equipos creados" : "No se encontraron equipos"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {state.teams.length === 0
              ? "Comienza creando tu primer equipo."
              : "Intenta con otro término de búsqueda o crea un nuevo equipo."}
          </p>
          {state.teams.length > 0 && searchTerm && (
             <Button variant="outline" onClick={() => setSearchTerm("")}>Limpiar búsqueda</Button>
          )}
        </div>
      )}

      <CreateEditTeamDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTeamSaved={handleTeamSaved}
      />
    </div>
  );
}
