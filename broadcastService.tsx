/**
 * Broadcasting & OBS Overlay System
 * Live scoreboards, branded graphics, match widgets for livestreaming
 * Like Darts Atlas broadcasting features
 */

import React from 'react';

// ==================== TYPES ====================

export interface BroadcastConfig {
  matchId: string;
  
  // Branding
  themeColor: string;          // Hex color
  textColor: string;
  logoUrl?: string;
  
  // Display options
  showAverage: boolean;
  showLegs: boolean;
  showSets: boolean;
  show180s: boolean;
  showCheckouts: boolean;
  showFirst9: boolean;
  
  // Layout
  layout: 'horizontal' | 'vertical' | 'tv' | 'dual_cam' | 'minimal';
  
  // Animation
  animateScores: boolean;
  animateWins: boolean;
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

export interface WidgetConfig {
  type: WidgetType;
  width: number;
  height: number;
  fps: number;
  params?: Record<string, any>;
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

// ==================== BROADCAST SERVICE ====================

export class BroadcastService {
  private db: any;
  private realtimeChannels: Map<string, any> = new Map();

  constructor(dbClient: any) {
    this.db = dbClient;
  }

  // ---- Match State ----

  async getMatchState(matchId: string): Promise<BroadcastMatchState | null> {
    const { data: match, error } = await this.db
      .from('matches')
      .select(`
        *,
        player1:players!player1_id(id, name, avatar_url, country),
        player2:players!player2_id(id, name, avatar_url, country)
      `)
      .eq('id', matchId)
      .single();

    if (error || !match) return null;

    return this.formatMatchState(match);
  }

  private formatMatchState(match: any): BroadcastMatchState {
    const stats = match.stats || { player1: {}, player2: {} };

    return {
      matchId: match.id,
      
      player1: {
        id: match.player1?.id || match.player1_id,
        name: match.player1?.name || match.player1_name || 'Player 1',
        avatar: match.player1?.avatar_url,
        country: match.player1?.country,
        score: match.player1_score || match.starting_score,
        average: stats.player1?.average || 0,
        first9Average: stats.player1?.first_9_average || 0,
        scores_180: stats.player1?.scores_180 || 0,
        scores_140_plus: stats.player1?.scores_140_plus || 0,
        scores_100_plus: stats.player1?.scores_100_plus || 0,
        checkouts_hit: stats.player1?.checkouts_hit || 0,
        checkout_attempts: stats.player1?.checkout_attempts || 0,
        highest_checkout: stats.player1?.highest_checkout || 0,
        best_leg: stats.player1?.best_leg || null,
        lastThrow: stats.player1?.last_throw
      },
      
      player2: {
        id: match.player2?.id || match.player2_id,
        name: match.player2?.name || match.player2_name || 'Player 2',
        avatar: match.player2?.avatar_url,
        country: match.player2?.country,
        score: match.player2_score || match.starting_score,
        average: stats.player2?.average || 0,
        first9Average: stats.player2?.first_9_average || 0,
        scores_180: stats.player2?.scores_180 || 0,
        scores_140_plus: stats.player2?.scores_140_plus || 0,
        scores_100_plus: stats.player2?.scores_100_plus || 0,
        checkouts_hit: stats.player2?.checkouts_hit || 0,
        checkout_attempts: stats.player2?.checkout_attempts || 0,
        highest_checkout: stats.player2?.highest_checkout || 0,
        best_leg: stats.player2?.best_leg || null,
        lastThrow: stats.player2?.last_throw
      },
      
      currentThrower: match.current_player || 1,
      
      legs: {
        player1: match.player1_legs || 0,
        player2: match.player2_legs || 0
      },
      sets: match.player1_sets !== undefined ? {
        player1: match.player1_sets || 0,
        player2: match.player2_sets || 0
      } : undefined,
      
      targetLegs: match.target_legs || 3,
      targetSets: match.target_sets,
      matchType: match.match_type || 'first_to',
      startingScore: match.starting_score || 501,
      
      status: match.status || 'in_progress',
      winner: match.winner_id === match.player1_id ? 1 : match.winner_id === match.player2_id ? 2 : undefined,
      
      lastUpdate: match.updated_at || new Date().toISOString()
    };
  }

  // ---- Realtime Subscriptions ----

  subscribeToMatch(matchId: string, onUpdate: (state: BroadcastMatchState) => void): () => void {
    const channel = this.db
      .channel(`broadcast:${matchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`
      }, async () => {
        const state = await this.getMatchState(matchId);
        if (state) onUpdate(state);
      })
      .subscribe();

    this.realtimeChannels.set(matchId, channel);

    return () => {
      channel.unsubscribe();
      this.realtimeChannels.delete(matchId);
    };
  }

  // ---- Widget URLs ----

  generateWidgetUrl(
    matchId: string,
    widgetType: WidgetType,
    config?: Partial<BroadcastConfig>
  ): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams();
    
    params.set('mode', widgetType);
    
    if (config?.themeColor) params.set('theme', config.themeColor);
    if (config?.textColor) params.set('text', config.textColor);
    if (config?.logoUrl) params.set('logo', encodeURIComponent(config.logoUrl));
    if (config?.showAverage === false) params.set('avg', '0');
    if (config?.show180s === false) params.set('180s', '0');
    
    return `${baseUrl}/matches/${matchId}/broadcast?${params.toString()}`;
  }

  // ---- OBS Integration ----

  getOBSSourceConfig(widgetType: WidgetType): WidgetConfig {
    const configs: Record<WidgetType, WidgetConfig> = {
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
    };

    return configs[widgetType];
  }
}

// ==================== REACT BROADCAST COMPONENTS ====================

// Horizontal Scoreboard (Bottom of screen)
export const ScoreboardHorizontal: React.FC<{
  state: BroadcastMatchState;
  config?: Partial<BroadcastConfig>;
}> = ({ state, config }) => {
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
};

// TV Style Scoreboard (Classic look)
export const ScoreboardTV: React.FC<{
  state: BroadcastMatchState;
  config?: Partial<BroadcastConfig>;
}> = ({ state, config }) => {
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
};

// Dual Camera Layout (Side by side players)
export const ScoreboardDualCam: React.FC<{
  state: BroadcastMatchState;
  config?: Partial<BroadcastConfig>;
}> = ({ state, config }) => {
  const themeColor = config?.themeColor || '#1e293b';
  
  return (
    <div className="flex gap-4">
      {/* Player 1 */}
      <div 
        className="flex-1 rounded-lg p-4"
        style={{ backgroundColor: themeColor }}
      >
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
      <div 
        className="flex-1 rounded-lg p-4"
        style={{ backgroundColor: themeColor }}
      >
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
};

// Last Throw Popup
export const LastThrowWidget: React.FC<{
  throw_: number;
  playerName: string;
  themeColor?: string;
}> = ({ throw_, playerName, themeColor = '#1e293b' }) => {
  const isHighScore = throw_ >= 100;
  const is180 = throw_ === 180;

  return (
    <div 
      className={`rounded-lg p-4 text-center ${is180 ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: themeColor }}
    >
      <div className="text-white/60 text-xs uppercase mb-1">{playerName}</div>
      <div className={`font-black text-4xl ${is180 ? 'text-yellow-400' : isHighScore ? 'text-green-400' : 'text-white'}`}>
        {throw_}
        {is180 && <span className="ml-2">🎯</span>}
      </div>
    </div>
  );
};

// Match Stats Widget
export const MatchStatsWidget: React.FC<{
  state: BroadcastMatchState;
  themeColor?: string;
}> = ({ state, themeColor = '#1e293b' }) => {
  const StatRow = ({ label, p1, p2 }: { label: string; p1: string | number; p2: string | number }) => (
    <div className="flex items-center py-2 border-b border-white/10">
      <div className="w-16 text-white text-right font-bold">{p1}</div>
      <div className="flex-1 text-center text-white/60 text-sm">{label}</div>
      <div className="w-16 text-white text-left font-bold">{p2}</div>
    </div>
  );

  return (
    <div 
      className="rounded-lg p-4"
      style={{ backgroundColor: themeColor }}
    >
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
};

// ==================== OBS LUA SCRIPT TEMPLATE ====================

export const OBS_SCRIPT_TEMPLATE = `
-- Darts Atlas Style OBS Script
-- Automatically updates browser sources with new match ID

obs = obslua

-- Script properties
match_id = ""
theme_color = ""
text_color = ""
base_url = "https://your-app-url.com"

function script_properties()
    local props = obs.obs_properties_create()
    
    obs.obs_properties_add_text(props, "match_id", "Match ID", obs.OBS_TEXT_DEFAULT)
    obs.obs_properties_add_text(props, "theme_color", "Theme Color (hex)", obs.OBS_TEXT_DEFAULT)
    obs.obs_properties_add_text(props, "text_color", "Text Color (hex)", obs.OBS_TEXT_DEFAULT)
    obs.obs_properties_add_text(props, "base_url", "Base URL", obs.OBS_TEXT_DEFAULT)
    
    obs.obs_properties_add_button(props, "apply_button", "Apply", apply_settings)
    
    return props
end

function script_defaults(settings)
    obs.obs_data_set_default_string(settings, "theme_color", "EAB308")
    obs.obs_data_set_default_string(settings, "text_color", "FFFFFF")
end

function script_update(settings)
    match_id = obs.obs_data_get_string(settings, "match_id")
    theme_color = obs.obs_data_get_string(settings, "theme_color")
    text_color = obs.obs_data_get_string(settings, "text_color")
    base_url = obs.obs_data_get_string(settings, "base_url")
end

function apply_settings(props, p)
    update_all_sources()
    return true
end

function update_all_sources()
    local sources = obs.obs_enum_sources()
    
    for _, source in ipairs(sources) do
        local source_id = obs.obs_source_get_id(source)
        local source_name = obs.obs_source_get_name(source)
        
        if source_id == "browser_source" and string.find(source_name, "DA_") then
            update_browser_source(source, source_name)
        end
    end
    
    obs.source_list_release(sources)
end

function update_browser_source(source, name)
    local settings = obs.obs_source_get_settings(source)
    local current_url = obs.obs_data_get_string(settings, "url")
    
    -- Determine widget type from source name
    local widget_type = "scoreboard_tv"
    if string.find(name, "horizontal") then widget_type = "scoreboard_horizontal"
    elseif string.find(name, "dual") then widget_type = "scoreboard_dual_cam"
    elseif string.find(name, "stats") then widget_type = "match_stats"
    end
    
    -- Build new URL
    local new_url = base_url .. "/matches/" .. match_id .. "/broadcast?mode=" .. widget_type
    if theme_color ~= "" then new_url = new_url .. "&theme=" .. theme_color end
    if text_color ~= "" then new_url = new_url .. "&text=" .. text_color end
    
    obs.obs_data_set_string(settings, "url", new_url)
    obs.obs_source_update(source, settings)
    obs.obs_data_release(settings)
    
    -- Refresh the source
    obs.obs_source_media_restart(source)
end

function script_description()
    return "Updates Darts Atlas broadcast sources with match ID and branding"
end
`;

export default BroadcastService;
