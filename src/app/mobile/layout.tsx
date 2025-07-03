"use client";

import type { ReactNode } from 'react';

// The root layout now handles the core providers and structure.
// The PageShell component handles the conditional display of the header
// and main content wrapper, so this mobile layout can be very simple.
export default function MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
