
"use client";

import { cn } from "@/lib/utils";

interface DefaultTeamLogoProps {
  teamName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function DefaultTeamLogo({ teamName, size = "md", className }: DefaultTeamLogoProps) {
  const initial = teamName ? teamName.charAt(0).toUpperCase() : "?";

  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-xl",
    lg: "w-16 h-16 text-2xl",
  };

  // Generate a somewhat consistent background color based on team name
  const getBackgroundColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 50%, 60%)`; // Use HSL for varied colors
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-bold text-white",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: getBackgroundColor(teamName || "Default") }}
      aria-label={`Logo predeterminado para ${teamName}`}
    >
      {initial}
    </div>
  );
}
