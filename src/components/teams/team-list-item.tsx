
"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamData } from "@/types";
import { DefaultTeamLogo } from "./default-team-logo";
import { Users, ListFilter } from "lucide-react"; // Added ListFilter icon
import { useGameState, getCategoryNameById } from "@/contexts/game-state-context";
import { Badge } from "@/components/ui/badge";

interface TeamListItemProps {
  team: TeamData;
}

export function TeamListItem({ team }: TeamListItemProps) {
  const { state } = useGameState();
  const categoryName = getCategoryNameById(team.category, state.availableCategories);

  return (
    <Link href={`/teams/${team.id}`} passHref>
      <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer h-full flex flex-col">
        <CardHeader className="flex-row items-center gap-4 pb-2">
          {team.logoDataUrl ? (
            <Image
              src={team.logoDataUrl}
              alt={`${team.name} logo`}
              width={48}
              height={48}
              className="rounded-md object-contain w-12 h-12"
            />
          ) : (
            <DefaultTeamLogo teamName={team.name} size="md" />
          )}
          <CardTitle className="text-xl font-semibold text-primary-foreground truncate">
            {team.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow pt-2 flex flex-col justify-between">
          <div className="text-sm text-muted-foreground flex items-center">
            <Users className="mr-2 h-4 w-4" />
            <span>{team.players.length} Jugador{team.players.length !== 1 ? 'es' : ''}</span>
          </div>
          {categoryName && (
            <div className="mt-2">
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <ListFilter className="h-3 w-3" />
                {categoryName}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
