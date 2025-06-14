
"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamData } from "@/types";
import { DefaultTeamLogo } from "./default-team-logo";
import { Users, ListFilter } from "lucide-react";
import { useGameState, getCategoryNameById } from "@/contexts/game-state-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TeamListItemProps {
  team: TeamData;
}

export function TeamListItem({ team }: TeamListItemProps) {
  const { state } = useGameState();
  const categoryName = getCategoryNameById(team.category, state.availableCategories);

  return (
    <Link href={`/teams/${team.id}`} passHref>
      <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer h-full flex flex-col relative">
        {categoryName && (
          <Badge variant="outline" className="absolute top-2 right-2 text-xs whitespace-nowrap z-10 bg-card/80">
            <ListFilter className="mr-1 h-3 w-3" />
            {categoryName}
          </Badge>
        )}
        <CardHeader className="flex-row items-center gap-4 pb-3 pt-3">
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
          <div className="flex-1 min-w-0"> {/* Ensure title can truncate if category badge is wide */}
            <CardTitle className="text-xl font-semibold text-primary-foreground truncate pr-4">
              {team.name}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-grow pt-2 pb-4 flex flex-col justify-end">
          <div className="text-sm text-muted-foreground flex items-center">
            <Users className="mr-2 h-4 w-4" />
            <span>{team.players.length} Jugador{team.players.length !== 1 ? 'es' : ''}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
