/**
 * Broadcasting & OBS Overlay Components
 * Live scoreboards, branded graphics, match widgets for livestreaming
 *
 * Performance optimizations:
 * - React.memo for all components
 * - useMemo for computed values
 * - Frozen constant objects
 */

import React, { memo, useMemo } from 'react';

// ==================== TYPES ====================

export interface BroadcastConfig {
  matchId: string;
  themeColor: string;
  textColor: string;
  logoUrl?: string;
  showAverage: boolean;
  showLegs: boolean;
  showSets: boolean;
  show180s: boolean;
  showCheckouts: boolean;
  showFirst9: boolean;
  layout: 'horizontal' | 'vertical' | 'tv' | 'dual_cam' | 'minimal';
  animateScores: boolean;
  animateWins: boolean;
}

export interface BroadcastPlayer {
  id: string;
  name: string;
  avatar?: string;
  country?: string;
  score: number;
  average: number;
  first9Average: number;
  scores_180: number;
  scores_140_plus: number;
  scores_100_plus: number;
  checkouts_hit: number;
  checkout_attempts: number;
  highest_checkout: number;
  best_leg: number | null;
  lastThrow?: number;
}

export interface BroadcastMatchState {
  matchId: string;
  player1: BroadcastPlayer;
  player2: BroadcastPlayer;
  currentThrower: 1 | 2;
  legs: { player1: number; player2: number };
  sets?: { player1: number; player2: number };
  targetLegs: number;
  targetSets?: number;
  matchType: 'first_to' | 'best_of';
  startingScore: number;
  status: 'waiting' | 'in_progress' | 'completed';
  winner?: 1 | 2;
  lastUpdate: string;
}

export type WidgetType =
  | 'scoreboard_horizontal'
  | 'scoreboard_vertical'
  | 'scoreboard_tv'
  | 'scoreboard_dual_cam'
  | 'scoreboard_minimal'
  | 'player_stats'
  | 'match_stats'
  | 'last_throw'
  | 'checkout_suggestion'
  | 'leaderboard'
  | 'schedule'
  | 'commentator_booth';

export interface WidgetConfig {
  type: WidgetType;
  width: number;
  height: number;
  fps: number;
  params?: Record<string, unknown>;
}

// ==================== HORIZONTAL SCOREBOARD ====================

interface ScoreboardHorizontalProps {
  state: BroadcastMatchState;
  config?: Partial<BroadcastConfig>;
}

export const ScoreboardHorizontal: React.FC<ScoreboardHorizontalProps> = memo(({
  state,
  config
}) => {
  const themeColor = config?.themeColor || '#EAB308';

  return (
    <div
      className="flex items-center justify-between h-24 px-4"
      style={{ backgroundColor: themeColor }}
    >
      {/* Player 1 */}
      <div className="flex items-center gap-4">
        <div className={`w-3 h-3 rounded-full ${state.currentThrower === 1 ? 'bg-white' : 'bg-white/30'}`} />
        <div className="text-white font-bold text-xl">{state.player1.name}</div>
        <div className="text-white/80 text-sm">AVG: {state.player1.average.toFixed(1)}</div>
      </div>

      {/* Scores */}
      <div className="flex items-center gap-8">
        <div className="text-white font-black text-5xl">{state.player1.score}</div>

        <div className="flex flex-col items-center">
          <div className="text-white/80 text-xs uppercase">Legs</div>
          <div className="text-white font-bold text-2xl">
            {state.legs.player1} - {state.legs.player2}
          </div>
        </div>

        <div className="text-white font-black text-5xl">{state.player2.score}</div>
      </div>

      {/* Player 2 */}
      <div className="flex items-center gap-4">
        <div className="text-white/80 text-sm">AVG: {state.player2.average.toFixed(1)}</div>
        <div className="text-white font-bold text-xl">{state.player2.name}</div>
        <div className={`w-3 h-3 rounded-full ${state.currentThrower === 2 ? 'bg-white' : 'bg-white/30'}`} />
      </div>
    </div>
  );
});

ScoreboardHorizontal.displayName = 'ScoreboardHorizontal';

// ==================== TV STYLE SCOREBOARD ====================

interface ScoreboardTVProps {
  state: BroadcastMatchState;
  config?: Partial<BroadcastConfig>;
}

export const ScoreboardTV: React.FC<ScoreboardTVProps> = memo(({
  state,
  config
}) => {
  const themeColor = config?.themeColor || '#1e293b';
  const accentColor = config?.textColor || '#EAB308';

  return (
    <div
      className="rounded-lg overflow-hidden shadow-2xl"
      style={{ backgroundColor: themeColor }}
    >
      {/* Player 1 Row */}
      <div className="flex items-center border-b border-white/10">
        <div
          className={`w-2 h-16 ${state.currentThrower === 1 ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundColor: accentColor }}
        />
        <div className="flex-1 flex items-center px-4 py-2 gap-4">
          <div className="text-white font-bold text-lg flex-1">{state.player1.name}</div>
          <div className="text-white/60 text-sm w-16 text-center">{state.player1.average.toFixed(1)}</div>
          <div className="text-white font-bold text-lg w-8 text-center">{state.legs.player1}</div>
          <div
            className="text-4xl font-black w-24 text-center"
            style={{ color: accentColor }}
          >
            {state.player1.score}
          </div>
        </div>
      </div>

      {/* Player 2 Row */}
      <div className="flex items-center">
        <div
          className={`w-2 h-16 ${state.currentThrower === 2 ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundColor: accentColor }}
        />
        <div className="flex-1 flex items-center px-4 py-2 gap-4">
          <div className="text-white font-bold text-lg flex-1">{state.player2.name}</div>
          <div className="text-white/60 text-sm w-16 text-center">{state.player2.average.toFixed(1)}</div>
          <div className="text-white font-bold text-lg w-8 text-center">{state.legs.player2}</div>
          <div
            className="text-4xl font-black w-24 text-center"
            style={{ color: accentColor }}
          >
            {state.player2.score}
          </div>
        </div>
      </div>
    </div>
  );
});

ScoreboardTV.displayName = 'ScoreboardTV';

// ==================== DUAL CAMERA LAYOUT ====================

interface ScoreboardDualCamProps {
  state: BroadcastMatchState;
  config?: Partial<BroadcastConfig>;
}

export const ScoreboardDualCam: React.FC<ScoreboardDualCamProps> = memo(({
  state,
  config
}) => {
  const themeColor = config?.themeColor || '#1e293b';

  return (
    <div className="flex gap-4">
      {/* Player 1 */}
      <div className="flex-1 rounded-lg p-4" style={{ backgroundColor: themeColor }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-bold">{state.player1.name}</span>
          {state.currentThrower === 1 && (
            <span className="text-yellow-400 text-xs uppercase">Throwing</span>
          )}
        </div>
        <div className="text-white font-black text-4xl text-center">
          {state.player1.score}
        </div>
        <div className="flex justify-center gap-4 mt-2 text-white/60 text-sm">
          <span>AVG: {state.player1.average.toFixed(1)}</span>
          <span>180s: {state.player1.scores_180}</span>
        </div>
      </div>

      {/* Center - Legs */}
      <div
        className="flex flex-col items-center justify-center px-4 rounded-lg"
        style={{ backgroundColor: themeColor }}
      >
        <div className="text-white/60 text-xs uppercase mb-1">Legs</div>
        <div className="text-white font-bold text-2xl">
          {state.legs.player1} - {state.legs.player2}
        </div>
      </div>

      {/* Player 2 */}
      <div className="flex-1 rounded-lg p-4" style={{ backgroundColor: themeColor }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-bold">{state.player2.name}</span>
          {state.currentThrower === 2 && (
            <span className="text-yellow-400 text-xs uppercase">Throwing</span>
          )}
        </div>
        <div className="text-white font-black text-4xl text-center">
          {state.player2.score}
        </div>
        <div className="flex justify-center gap-4 mt-2 text-white/60 text-sm">
          <span>AVG: {state.player2.average.toFixed(1)}</span>
          <span>180s: {state.player2.scores_180}</span>
        </div>
      </div>
    </div>
  );
});

ScoreboardDualCam.displayName = 'ScoreboardDualCam';

// ==================== LAST THROW WIDGET ====================

interface LastThrowWidgetProps {
  throw_: number;
  playerName: string;
  themeColor?: string;
}

export const LastThrowWidget: React.FC<LastThrowWidgetProps> = memo(({
  throw_,
  playerName,
  themeColor = '#1e293b'
}) => {
  const isHighScore = throw_ >= 100;
  const is180 = throw_ === 180;

  const scoreClass = useMemo(() => {
    if (is180) return 'text-yellow-400';
    if (isHighScore) return 'text-green-400';
    return 'text-white';
  }, [is180, isHighScore]);

  return (
    <div
      className={`rounded-lg p-4 text-center ${is180 ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: themeColor }}
    >
      <div className="text-white/60 text-xs uppercase mb-1">{playerName}</div>
      <div className={`font-black text-4xl ${scoreClass}`}>
        {throw_}
      </div>
    </div>
  );
});

LastThrowWidget.displayName = 'LastThrowWidget';

// ==================== MATCH STATS WIDGET ====================

interface MatchStatsWidgetProps {
  state: BroadcastMatchState;
  themeColor?: string;
}

interface StatRowProps {
  label: string;
  p1: string | number;
  p2: string | number;
}

const StatRow: React.FC<StatRowProps> = memo(({ label, p1, p2 }) => (
  <div className="flex items-center py-2 border-b border-white/10">
    <div className="w-16 text-white text-right font-bold">{p1}</div>
    <div className="flex-1 text-center text-white/60 text-sm">{label}</div>
    <div className="w-16 text-white text-left font-bold">{p2}</div>
  </div>
));

StatRow.displayName = 'StatRow';

export const MatchStatsWidget: React.FC<MatchStatsWidgetProps> = memo(({
  state,
  themeColor = '#1e293b'
}) => {
  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: themeColor }}>
      <div className="text-center text-white font-bold mb-4">Match Statistics</div>

      <div className="flex justify-between text-white/60 text-sm mb-2">
        <span>{state.player1.name}</span>
        <span>{state.player2.name}</span>
      </div>

      <StatRow
        label="3-Dart Avg"
        p1={state.player1.average.toFixed(1)}
        p2={state.player2.average.toFixed(1)}
      />
      <StatRow
        label="First 9 Avg"
        p1={state.player1.first9Average.toFixed(1)}
        p2={state.player2.first9Average.toFixed(1)}
      />
      <StatRow
        label="180s"
        p1={state.player1.scores_180}
        p2={state.player2.scores_180}
      />
      <StatRow
        label="140+"
        p1={state.player1.scores_140_plus}
        p2={state.player2.scores_140_plus}
      />
      <StatRow
        label="100+"
        p1={state.player1.scores_100_plus}
        p2={state.player2.scores_100_plus}
      />
      <StatRow
        label="High Checkout"
        p1={state.player1.highest_checkout || '-'}
        p2={state.player2.highest_checkout || '-'}
      />
      <StatRow
        label="Best Leg"
        p1={state.player1.best_leg || '-'}
        p2={state.player2.best_leg || '-'}
      />
    </div>
  );
});

MatchStatsWidget.displayName = 'MatchStatsWidget';

// ==================== OBS CONFIG HELPER ====================

export const OBS_WIDGET_CONFIGS: Readonly<Record<WidgetType, WidgetConfig>> = Object.freeze({
  scoreboard_horizontal: { type: 'scoreboard_horizontal', width: 1200, height: 100, fps: 30 },
  scoreboard_vertical: { type: 'scoreboard_vertical', width: 300, height: 600, fps: 30 },
  scoreboard_tv: { type: 'scoreboard_tv', width: 500, height: 130, fps: 30 },
  scoreboard_dual_cam: { type: 'scoreboard_dual_cam', width: 600, height: 120, fps: 30 },
  scoreboard_minimal: { type: 'scoreboard_minimal', width: 400, height: 60, fps: 30 },
  player_stats: { type: 'player_stats', width: 300, height: 400, fps: 5 },
  match_stats: { type: 'match_stats', width: 400, height: 300, fps: 5 },
  last_throw: { type: 'last_throw', width: 200, height: 100, fps: 30 },
  checkout_suggestion: { type: 'checkout_suggestion', width: 250, height: 80, fps: 10 },
  leaderboard: { type: 'leaderboard', width: 740, height: 510, fps: 1 },
  schedule: { type: 'schedule', width: 400, height: 600, fps: 1 },
  commentator_booth: { type: 'commentator_booth', width: 1280, height: 200, fps: 30 }
});

export function getOBSWidgetConfig(widgetType: WidgetType): WidgetConfig {
  return OBS_WIDGET_CONFIGS[widgetType];
}

// ==================== DEFAULT EXPORT ====================

export default {
  ScoreboardHorizontal,
  ScoreboardTV,
  ScoreboardDualCam,
  LastThrowWidget,
  MatchStatsWidget,
  OBS_WIDGET_CONFIGS,
  getOBSWidgetConfig
};
