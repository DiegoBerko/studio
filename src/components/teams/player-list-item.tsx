
"use client";

import type { PlayerData } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Shield, Trash2 } from "lucide-react"; // Shield for goalkeeper

interface PlayerListItemProps {
  player: PlayerData;
  onRemovePlayer: (playerId: string) => void;
}

export function PlayerListItem({ player, onRemovePlayer }: PlayerListItemProps) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-grow">
          {player.type === "goalkeeper" ? (
            <Shield className="h-6 w-6 text-primary" />
          ) : (
            <User className="h-6 w-6 text-primary" />
          )}
          <div className="flex-grow">
            <p className="font-semibold text-card-foreground">
              #{player.number} - {player.name}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {player.type === "goalkeeper" ? "Arquero" : "Jugador"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive h-8 w-8"
          onClick={() => onRemovePlayer(player.id)}
          aria-label={`Eliminar jugador ${player.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
