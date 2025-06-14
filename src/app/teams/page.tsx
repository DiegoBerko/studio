
"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useGameState } from "@/contexts/game-state-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Users, Info, Upload, Download, ListFilter } from "lucide-react";
import { TeamListItem } from "@/components/teams/team-list-item";
import { CreateEditTeamDialog } from "@/components/teams/create-edit-team-dialog";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { TeamData } from "@/types";
import { Separator } from "@/components/ui/separator";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_CATEGORIES_FILTER_KEY = "__ALL_CATEGORIES__";
const NO_CATEGORIES_PLACEHOLDER_VALUE = "__NO_CATEGORIES_DEFINED__";

export default function TeamsPage() {
  const { state, dispatch } = useGameState();
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES_FILTER_KEY);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [currentExportFilename, setCurrentExportFilename] = useState('');
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<TeamData[] | null>(null);


  const filteredTeams = useMemo(() => {
    let teamsToFilter = state.teams;

    if (categoryFilter && categoryFilter !== ALL_CATEGORIES_FILTER_KEY) {
      teamsToFilter = teamsToFilter.filter((team) => team.category === categoryFilter);
    }

    if (!searchTerm.trim()) {
      return teamsToFilter;
    }
    return teamsToFilter.filter((team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.teams, searchTerm, categoryFilter]);

  const handleTeamSaved = (teamId: string) => {
    // Potentially navigate to the new/edited team's page, or just close dialog
    // For now, just closes dialog, list will update.
  };

  const prepareExportTeams = () => {
    const date = new Date();
    const dateString = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const suggestedFilename = `icevision_equipos_${dateString}.json`;
    setCurrentExportFilename(suggestedFilename);
    setIsExportDialogOpen(true);
  };

  const performExport = (filename: string) => {
    if (!filename.trim().endsWith('.json')) {
        filename = filename.trim() + '.json';
    }
    if (filename.trim() === '.json'){
        toast({
            title: "Nombre de Archivo Inválido",
            description: "El nombre del archivo no puede estar vacío.",
            variant: "destructive",
        });
        return;
    }

    const jsonString = JSON.stringify(state.teams, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename.trim();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);

    toast({
      title: "Equipos Exportados",
      description: `Archivo ${filename.trim()} descargado con ${state.teams.length} equipo(s).`,
    });
    setIsExportDialogOpen(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("Error al leer el archivo.");
        const importedData = JSON.parse(text);

        if (!Array.isArray(importedData) || !importedData.every(item => 
            item && typeof item.id === 'string' && 
            typeof item.name === 'string' && 
            (typeof item.category === 'string' || item.category === undefined) && 
            Array.isArray(item.players))
           ) {
          throw new Error("Archivo de equipos no válido o formato incorrecto. Se esperaba un array de equipos.");
        }
        
        const validatedTeams = importedData.map(team => ({
          id: team.id,
          name: team.name,
          logoDataUrl: team.logoDataUrl || null,
          category: team.category || (state.availableCategories.length > 0 ? state.availableCategories[0].id : ''),
          players: Array.isArray(team.players) ? team.players.map((player: any) => ({
            id: player.id || crypto.randomUUID(),
            number: String(player.number || '0'),
            name: String(player.name || 'Jugador Desconocido'),
            type: player.type === 'goalkeeper' ? 'goalkeeper' : 'player',
          })) : [],
        }));


        if (state.teams.length > 0) {
            setPendingImportData(validatedTeams as TeamData[]);
            setIsImportConfirmOpen(true);
        } else {
            dispatch({ type: 'LOAD_TEAMS_FROM_FILE', payload: validatedTeams as TeamData[] });
            toast({
            title: "Equipos Importados",
            description: `${validatedTeams.length} equipo(s) cargado(s) exitosamente.`,
            });
        }

      } catch (error) {
        console.error("Error importing teams:", error);
        toast({
          title: "Error al Importar",
          description: (error as Error).message || "No se pudo procesar el archivo de equipos.",
          variant: "destructive",
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; 
        }
      }
    };
    reader.readAsText(file);
  };
  
  const confirmImport = () => {
    if (pendingImportData) {
        dispatch({ type: 'LOAD_TEAMS_FROM_FILE', payload: pendingImportData });
        toast({
            title: "Equipos Importados",
            description: `${pendingImportData.length} equipo(s) cargado(s) exitosamente (reemplazando los existentes).`,
        });
        setPendingImportData(null);
    }
    setIsImportConfirmOpen(false);
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

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Buscar equipo por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 text-base"
            />
        </div>
        <div className="sm:w-auto min-w-[200px]">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full text-base h-10">
                    <ListFilter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filtrar por categoría..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL_CATEGORIES_FILTER_KEY}>Todas las Categorías</SelectItem>
                    {state.availableCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-sm">
                            {cat.name}
                        </SelectItem>
                    ))}
                     {state.availableCategories.length === 0 && (
                        <SelectItem value={NO_CATEGORIES_PLACEHOLDER_VALUE} disabled>No hay categorías definidas</SelectItem>
                    )}
                </SelectContent>
            </Select>
        </div>
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
            {state.teams.length === 0 
              ? "No hay equipos creados" 
              : (searchTerm || (categoryFilter && categoryFilter !== ALL_CATEGORIES_FILTER_KEY)) 
                ? "No se encontraron equipos con los filtros aplicados"
                : "No se encontraron equipos"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {state.teams.length === 0
              ? "Comienza creando tu primer equipo."
              : (searchTerm || (categoryFilter && categoryFilter !== ALL_CATEGORIES_FILTER_KEY))
                ? "Intenta con otros filtros o crea un nuevo equipo."
                : "Crea un nuevo equipo para empezar."}
          </p>
          {(searchTerm || (categoryFilter && categoryFilter !== ALL_CATEGORIES_FILTER_KEY)) && state.teams.length > 0 && (
             <Button variant="outline" onClick={() => { setSearchTerm(""); setCategoryFilter(ALL_CATEGORIES_FILTER_KEY); }}>Limpiar filtros</Button>
          )}
        </div>
      )}

      <Separator className="my-10" />

      <div className="space-y-6 p-6 border rounded-md bg-card">
        <h2 className="text-xl font-semibold text-primary-foreground">Acciones de Datos de Equipos</h2>
        <p className="text-sm text-muted-foreground">
          Exporta todos tus equipos a un archivo JSON o importa equipos desde un archivo previamente guardado.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={prepareExportTeams} variant="outline" className="flex-1" disabled={state.teams.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Exportar Todos los Equipos
          </Button>
          <Button onClick={handleImportClick} variant="outline" className="flex-1">
            <Upload className="mr-2 h-4 w-4" /> Importar Equipos
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>


      <CreateEditTeamDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTeamSaved={handleTeamSaved}
      />

      {isExportDialogOpen && (
        <AlertDialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Nombre del Archivo de Exportación</AlertDialogTitle>
              <AlertDialogDescription>
                Ingresa el nombre deseado para el archivo de equipos. Se añadirá la extensión ".json" automáticamente si no se incluye.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={currentExportFilename}
              onChange={(e) => setCurrentExportFilename(e.target.value)}
              placeholder="nombre_de_archivo_equipos.json"
              className="my-4"
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsExportDialogOpen(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => performExport(currentExportFilename)}>
                Exportar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isImportConfirmOpen && (
        <AlertDialog open={isImportConfirmOpen} onOpenChange={setIsImportConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Importación</AlertDialogTitle>
                    <AlertDialogDescription>
                        Ya tienes equipos guardados. Al importar este archivo, se reemplazarán todos los equipos existentes. ¿Deseas continuar?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => { setIsImportConfirmOpen(false); setPendingImportData(null); }}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmImport}>
                        Sí, Reemplazar Equipos
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
