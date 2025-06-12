
"use client";

import { DurationSettingsCard } from "@/components/config/duration-settings-card";
import { PenaltySettingsCard } from "@/components/config/penalty-settings-card";
// TimeoutSettingsCard y AutoStartSettingsCard ya no son necesarios

export default function ConfigPage() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-primary-foreground mb-6">Configuración General</h1>
      <DurationSettingsCard /> {/* Ahora consolida duraciones y auto-inicios */}
      <PenaltySettingsCard />
      {/* AutoStartSettingsCard y TimeoutSettingsCard fueron removidos */}
    </div>
  );
}
