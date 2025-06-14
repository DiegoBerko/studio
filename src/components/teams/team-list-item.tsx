
"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamData } from "@/types";
import { DefaultTeamLogo } from "./default-team-logo";
import { Users } from "lucide-react";

interface TeamListItemProps {
  team: TeamData;
}

export function TeamListItem({ team }: TeamListItemProps) {
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
        <CardContent className="flex-grow pt-2">
          <div className="text-sm text-muted-foreground flex items-center">
            <Users className="mr-2 h-4 w-4" />
            <span>{team.players.length} Jugador{team.players.length !== 1 ? 'es' : ''}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
