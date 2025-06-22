
"use client";

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import React, { useEffect } from 'react';
import { SoundPlayer } from '@/components/audio/sound-player'; // Import SoundPlayer
import { useGameState } from '@/contexts/game-state-context';

export function MainWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state } = useGameState();
  const { scoreboardLayout } = state;
  const isScoreboardPage = pathname === '/';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--background', scoreboardLayout.backgroundColor);
      root.style.setProperty('--primary', scoreboardLayout.primaryColor);
      root.style.setProperty('--accent', scoreboardLayout.accentColor);
    }
  }, [scoreboardLayout.backgroundColor, scoreboardLayout.primaryColor, scoreboardLayout.accentColor]);

  let mainClassName;
  if (isScoreboardPage) {
    if (state.isMonitorModeEnabled) {
      mainClassName = "w-full pl-8 sm:pl-12 lg:pl-16 pr-0 pb-8 pt-0"; // Monitor mode: double left padding, zero right
    } else {
      mainClassName = "w-full px-4 sm:px-6 lg:px-8 pb-8 pt-0"; // Default scoreboard padding
    }
  } else {
    mainClassName = "container py-8"; // Default for other pages
  }

  return (
    <>
      <SoundPlayer /> {/* Add SoundPlayer here so it's always mounted */}
      <main className={cn("flex-1", mainClassName)}>
        {children}
      </main>
    </>
  );
}
