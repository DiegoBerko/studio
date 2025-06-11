import { MiniScoreboard } from '@/components/controls/mini-scoreboard';
import { TimeControlCard } from '@/components/controls/time-control-card';
import { ScorePeriodControlCard } from '@/components/controls/score-period-control-card';
import { PenaltyControlCard } from '@/components/controls/penalty-control-card';

export default function ControlsPage() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <MiniScoreboard />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <TimeControlCard />
          <ScorePeriodControlCard />
        </div>
        <div className="space-y-6">
          <PenaltyControlCard team="home" teamName="Home Team" />
          <PenaltyControlCard team="away" teamName="Away Team" />
        </div>
      </div>
    </div>
  );
}
