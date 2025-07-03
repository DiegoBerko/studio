
"use client";

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Header } from '@/components/layout/header';
import { MainWrapper } from '@/components/layout/main-wrapper';
import { SoundPlayer } from '@/components/audio/sound-player';

export function PageShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMobilePage = pathname === '/mobile';

  if (isMobilePage) {
    // For the mobile page, provide a simple main wrapper without the header and sound
    return (
      <main className="w-full h-full">
        {children}
      </main>
    );
  }

  // For all other pages, render the standard layout with Header and MainWrapper
  return (
    <>
      <SoundPlayer />
      <Header />
      <MainWrapper>
        {children}
      </MainWrapper>
    </>
  );
}
