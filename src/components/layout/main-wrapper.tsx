
"use client";

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function MainWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isScoreboardPage = pathname === '/';

  return (
    <main className={cn(
      "flex-1 py-8",
      isScoreboardPage ? "w-full px-4 sm:px-6 lg:px-8" : "container"
    )}>
      {children}
    </main>
  );
}
