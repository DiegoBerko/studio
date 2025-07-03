
"use client";

import { useState, useEffect } from 'react';
import type { LiveGameState, ClockState } from '@/types';
import { formatTime, getActualPeriodText } from '@/contexts/game-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { PenaltiesDisplay } from '@/components/scoreboard/penalties-display';
import { User, WifiOff } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function MobileScoreboard() {
  const [gameState, setGameState] = useState<LiveGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Effect for SSE subscription
  useEffect(() => {
    const eventSource = new EventSource('/api/game-state/events');

    eventSource.onopen = () => {
      setError(null);
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: LiveGameState = JSON.parse(event.data);
        setGameState(data);
      } catch (e) {
        console.error("Failed to parse game state from server event:", e);
        setError("Datos del servidor corruptos.");
      }
    };

    eventSource.onerror = () => {
      console.error("EventSource failed.");
      setError("No se pudo conectar con el servidor.");
      setIsConnected(false);
      // EventSource will automatically try to reconnect.
    };

    // Cleanup on component unmount
    return () => {
      eventSource.close();
    };
  }, []); // Empty dependency array means this effect runs once on mount

  // Effect for the client-side visual timer tick
  useEffect(() => {
    // Stop if we have no state, or if the clock shouldn't be running.
    if (!gameState || !gameState.clock.isClockRunning || gameState.clock.currentTime <= 0) {
      return;
    }

    // This interval makes the clock tick down smoothly on the client's screen.
    const timerId = setInterval(() => {
      setGameState(prevState => {
        // Double-check state in case it became null between ticks
        if (!prevState || !prevState.clock.isClockRunning || prevState.clock.currentTime <= 0) {
          return prevState;
        }

        // Decrement by 10 centiseconds (because the interval is 100ms)
        const newTime = prevState.clock.currentTime - 10;

        return {
          ...prevState,
          clock: {
            ...prevState.clock,
            currentTime: Math.max(0, newTime),
          }
        };
      });
    }, 100);

    return () => clearInterval(timerId);
  }, [gameState?.clock.isClockRunning, gameState?.clock.currentTime]);

  if (error && !isConnected) {
    return (
      <div className="flex flex-col h-screen p-4 gap-4 bg-background text-destructive items-center justify-center text-center">
        <WifiOff className="h-16 w-16" />
        <h1 className="text-2xl font-bold">Error de Conexión</h1>
        <p className="text-destructive-foreground/80">{error}</p>
        <p className="text-xs text-muted-foreground mt-4">Intentando reconectar...</p>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex flex-col h-screen p-4 gap-4 bg-background items-center justify-center">
        <LoadingSpinner className="h-12 w-12 text-primary" />
        <p className="text-muted-foreground mt-4">Esperando datos del partido...</p>
      </div>
    );
  }

  // Calculate players on ice
  const playersPerTeam = gameState.playersPerTeamOnIce || 5;
  const activeHomePenaltiesCount = gameState.penalties.home.filter(p => p._status === 'running').length;
  const playersOnIceForHome = Math.max(0, playersPerTeam - activeHomePenaltiesCount);

  const activeAwayPenaltiesCount = gameState.penalties.away.filter(p => p._status === 'running').length;
  const playersOnIceForAway = Math.max(0, playersPerTeam - activeAwayPenaltiesCount);

  // Render the scoreboard using `gameState`
  return (
    <div className="flex flex-col h-screen p-2 sm:p-4 gap-4 bg-background text-foreground">
      {/* Main Info Card: Clock and Scores */}
      <Card className="bg-card shadow-lg">
        <CardContent className="p-4">
          <div className="text-center mb-4">
            <div className="font-bold font-headline tabular-nums tracking-tighter text-6xl text-accent">
              {formatTime(gameState.clock.currentTime, { showTenths: gameState.clock.currentTime < 6000, includeMinutesForTenths: false })}
            </div>
            <div className="mt-1 font-semibold text-primary-foreground uppercase tracking-wider text-2xl">
              {getActualPeriodText(gameState.clock.currentPeriod, gameState.clock.periodDisplayOverride, gameState.numberOfRegularPeriods || 2)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            {/* Home Team */}
            <div className="text-center">
              <div className="flex justify-center items-center gap-1 mb-1 h-5">
                {playersOnIceForHome > 0 && Array(playersOnIceForHome).fill(null).map((_, index) => (
                  <User key={`home-player-${index}`} className="h-5 w-5 text-primary-foreground/80" />
                ))}
              </div>
              <div className="text-xl font-bold uppercase truncate" title={gameState.homeTeamName}>{gameState.homeTeamName}</div>
              <div className="text-sm text-muted-foreground">(Local)</div>
              <div className="text-6xl font-bold text-accent">{gameState.score.home}</div>
            </div>
            {/* Away Team */}
            <div className="text-center">
              <div className="flex justify-center items-center gap-1 mb-1 h-5">
                 {playersOnIceForAway > 0 && Array(playersOnIceForAway).fill(null).map((_, index) => (
                  <User key={`away-player-${index}`} className="h-5 w-5 text-primary-foreground/80" />
                ))}
              </div>
              <div className="text-xl font-bold uppercase truncate" title={gameState.awayTeamName}>{gameState.awayTeamName}</div>
              <div className="text-sm text-muted-foreground">(Visitante)</div>
              <div className="text-6xl font-bold text-accent">{gameState.score.away}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Penalties */}
      <div className="flex-grow grid grid-cols-1 gap-4 overflow-y-auto pb-4">
         <PenaltiesDisplay teamDisplayType="Local" teamName={gameState.homeTeamName} penalties={gameState.penalties.home} mode="mobile" clock={gameState.clock} />
         <PenaltiesDisplay teamDisplayType="Visitante" teamName={gameState.awayTeamName} penalties={gameState.penalties.away} mode="mobile" clock={gameState.clock} />
      </div>
    </div>
  );
}
