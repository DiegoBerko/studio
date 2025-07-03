"use client";

import type { Metadata } from 'next';
import { GameStateProvider } from '@/contexts/game-state-context';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { SoundPlayer } from '@/components/audio/sound-player';
import '../globals.css';

// Note: Metadata export is not effective in a client component layout,
// but can be kept for static analysis or future refactoring.
// export const metadata: Metadata = {
//   title: 'IceVision - Mobile Scoreboard',
//   description: 'Mobile-friendly scoreboard for ice hockey games.',
// };

export default function MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <title>IceVision - Mobile Scoreboard</title>
        <meta name="description" content="Mobile-friendly scoreboard for ice hockey games." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("min-h-screen bg-background font-body antialiased")}>
        <GameStateProvider>
          <SoundPlayer />
          <main className="w-full h-full">
            {children}
          </main>
          <Toaster />
        </GameStateProvider>
      </body>
    </html>
  );
}
