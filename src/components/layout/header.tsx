
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Home, Settings, Wrench } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export function Header() {
  const pathname = usePathname();
  const isScoreboardPage = pathname === '/';

  // Si no es la scoreboard page, el header es visible por defecto.
  // Si es la scoreboard page, empieza oculto y se maneja con hover/mouse position.
  const [isVisible, setIsVisible] = useState(!isScoreboardPage);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Efecto para manejar la visibilidad inicial basada en la ruta y al cambiar de ruta
  useEffect(() => {
    if (isScoreboardPage) {
      setIsVisible(false); // En scoreboard, asegurar que empiece oculto
    } else {
      setIsVisible(true);  // En otras páginas, asegurar que empiece visible
    }
  }, [isScoreboardPage]); // Solo se ejecuta cuando isScoreboardPage cambia

  // Efecto para añadir/quitar listeners de mousemove, solo en la scoreboard page
  useEffect(() => {
    if (!isScoreboardPage) {
      // Limpiar listeners si existían y salimos de la scoreboard page
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      // No se necesitan listeners de mousemove si no es la scoreboard page
      return;
    }

    // Si estamos en la scoreboard page
    const handleMouseMove = (event: MouseEvent) => {
      if (event.clientY < 80) { // Si el mouse está cerca del top (ej: 80px)
        setIsVisible(true);
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
      }
      // No se oculta aquí; onMouseLeave del header se encarga de eso.
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isScoreboardPage]); // Solo se activa/desactiva con el cambio de isScoreboardPage

  const handleHeaderMouseEnter = () => {
    if (isScoreboardPage) {
      setIsVisible(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    }
  };

  const handleHeaderMouseLeave = () => {
    if (isScoreboardPage) {
      // Si ya hay un timeout, no crear otro
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 300); // Ocultar después de 300ms
    }
  };

  return (
    <header
      onMouseEnter={handleHeaderMouseEnter}
      onMouseLeave={handleHeaderMouseLeave}
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "transition-all duration-300 ease-in-out", // Para opacity y transform
        isScoreboardPage
          ? (isVisible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-full pointer-events-none")
          : "opacity-100 translate-y-0 pointer-events-auto" // Siempre visible y interactuable si no es scoreboard
      )}
    >
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-headline text-xl font-bold text-primary-foreground">IceVision</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className={cn(
              "transition-colors hover:text-foreground/80",
              pathname === "/" ? "text-foreground" : "text-foreground/60"
            )}
          >
            Scoreboard
          </Link>
          <Link
            href="/controls"
            className={cn(
              "transition-colors hover:text-foreground/80",
              pathname === "/controls" ? "text-foreground" : "text-foreground/60"
            )}
          >
            Controles
          </Link>
          <Link
            href="/config"
            className={cn(
              "transition-colors hover:text-foreground/80",
              pathname === "/config" ? "text-foreground" : "text-foreground/60"
            )}
          >
            Configuración
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
           <Button variant="ghost" size="icon" asChild className={pathname === "/" ? "text-primary-foreground bg-primary/80" : "text-foreground/60"}>
            <Link href="/" aria-label="Scoreboard">
              <Home className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className={pathname === "/controls" ? "text-primary-foreground bg-primary/80" : "text-foreground/60"}>
            <Link href="/controls" aria-label="Controls">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className={pathname === "/config" ? "text-primary-foreground bg-primary/80" : "text-foreground/60"}>
            <Link href="/config" aria-label="Configuración">
              <Wrench className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
