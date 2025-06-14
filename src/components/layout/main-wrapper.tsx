
"use client";

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { SoundPlayer } from '@/components/audio/sound-player'; // Import SoundPlayer

export function MainWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isScoreboardPage = pathname === '/';

  return (
    <>
      <SoundPlayer /> {/* Add SoundPlayer here so it's always mounted */}
      <main className={cn(
        "flex-1",
        isScoreboardPage ? "w-full px-4 sm:px-6 lg:px-8 pb-8 pt-0" : "container py-8"
      )}>
        {children}
      </main>
    </>
  );
}
