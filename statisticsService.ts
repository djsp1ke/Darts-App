/**
 * Advanced Statistics & Rankings System
 * Lifetime stats, rankings, achievements like Darts Atlas
 */

// ==================== TYPES ====================

export interface PlayerLifetimeStats {
  player_id: string;
  
  // Match stats
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  win_percentage: number;
  
  // Leg stats
  legs_played: number;
  legs_won: number;
  legs_lost: number;
  
  // Scoring
  total_darts_thrown: number;
  total_points_scored: number;
  
  // Averages
  career_average: number;
  best_match_average: number;
  best_leg_average: number;
  
  // First 9
  best_first_9: number;
  avg_first_9: number;
  
  // High scores
  total_180s: number;
  total_140_plus: number;
  total_100_plus: number;
  total_tons: number;           // 100+
  highest_score: number;
  
  // Checkouts
  total_checkouts: number;
  checkout_attempts: number;
  checkout_percentage: number;
  highest_checkout: number;
  
  // Best performances
  best_leg_darts: number;       // Fewest darts to win leg
  most_180s_match: number;
  longest_win_streak: number;
  current_win_streak: number;
  
  // By format
  stats_501: FormatStats;
  stats_301: FormatStats;
  stats_cricket?: CricketStats;
  
  // Calculated
  rating: number;               // ELO-style rating
  rank?: number;
  
  last_match_date?: string;
  updated_at: string;
}

export interface FormatStats {
  matches_played: number;
  matches_won: number;
  average: number;
  best_average: number;
  checkout_percentage: number;
  highest_checkout: number;
  total_180s: number;
  best_leg: number;
}

export interface CricketStats {
  matches_played: number;
  matches_won: number;
  marks_per_round: number;
  best_mpr: number;
  perfect_rounds: number;      // All 9 marks
}

export interface MatchStatistics {
  match_id: string;
  player_id: string;
  
  // Basic
  legs_won: number;
  legs_lost: number;
  is_winner: boolean;
  
  // Scoring
  darts_thrown: number;
  points_scored: number;
  average: number;
  first_9_average: number;
  
  // High scores
  scores_180: number;
  scores_140_plus: number;
  scores_100_plus: number;
  scores_60_plus: number;
  highest_visit: number;
  
  // Checkouts
  checkouts_hit: number;
  checkout_attempts: number;
  checkout_percentage: number;
  highest_checkout: number;
  
  // Best leg
  best_leg_darts: number;
  
  // Visit breakdown (optional detailed)
  visit_history?: number[];
  checkout_history?: number[];
  
  created_at: string;
}

export interface Ranking {
  player_id: string;
  organization_id?: string;    // null for global
  
  rank: number;
  previous_rank?: number;
  rank_change: number;
  
  rating: number;
  points: number;
  
  matches_counted: number;
  
  player?: {
    id: string;
    name: string;
    avatar_url?: string;
    country?: string;
  };
  
  updated_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: 'scoring' | 'checkout' | 'winning' | 'milestone' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  requirement: any;
}

export interface PlayerAchievement {
  id: string;
  player_id: string;
  achievement_id: string;
  
  earned_at: string;
  match_id?: string;
  
  achievement?: Achievement;
}

// ==================== STATS SERVICE ====================

export class StatisticsService {
  private db: any;

  constructor(dbClient: any) {
    this.db = dbClient;
  }

  // ---- Player Lifetime Stats ----

  async getPlayerStats(playerId: string): Promise<PlayerLifetimeStats | null> {
    const { data, error } = await this.db
      .from('player_lifetime_stats')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async initializePlayerStats(playerId: string): Promise<PlayerLifetimeStats> {
    const initialStats: Partial<PlayerLifetimeStats> = {
      player_id: playerId,
      matches_played: 0,
      matches_won: 0,
      matches_lost: 0,
      win_percentage: 0,
      legs_played: 0,
      legs_won: 0,
      legs_lost: 0,
      total_darts_thrown: 0,
      total_points_scored: 0,
      career_average: 0,
      best_match_average: 0,
      best_leg_average: 0,
      best_first_9: 0,
      avg_first_9: 0,
      total_180s: 0,
      total_140_plus: 0,
      total_100_plus: 0,
      total_tons: 0,
      highest_score: 180,
      total_checkouts: 0,
      checkout_attempts: 0,
      checkout_percentage: 0,
      highest_checkout: 0,
      best_leg_darts: 999,
      most_180s_match: 0,
      longest_win_streak: 0,
      current_win_streak: 0,
      stats_501: this.emptyFormatStats(),
      stats_301: this.emptyFormatStats(),
      rating: 1000,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.db
      .from('player_lifetime_stats')
      .insert([initialStats])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private emptyFormatStats(): FormatStats {
    return {
      matches_played: 0,
      matches_won: 0,
      average: 0,
      best_average: 0,
      checkout_percentage: 0,
      highest_checkout: 0,
      total_180s: 0,
      best_leg: 999
    };
  }

  // ---- Record Match Statistics ----

  async recordMatchStats(matchStats: MatchStatistics): Promise<void> {
    // Save match stats
    await this.db.from('match_statistics').insert([matchStats]);

    // Update lifetime stats
    await this.updateLifetimeStats(matchStats);

    // Check for achievements
    await this.checkAchievements(matchStats);
  }

  private async updateLifetimeStats(matchStats: MatchStatistics): Promise<void> {
    const existing = await this.getPlayerStats(matchStats.player_id);
    
    if (!existing) {
      await this.initializePlayerStats(matchStats.player_id);
      return this.updateLifetimeStats(matchStats);
    }

    const newMatchesPlayed = existing.matches_played + 1;
    const newMatchesWon = existing.matches_won + (matchStats.is_winner ? 1 : 0);
    const newMatchesLost = existing.matches_lost + (matchStats.is_winner ? 0 : 1);
    
    const newLegsPlayed = existing.legs_played + matchStats.legs_won + matchStats.legs_lost;
    const newLegsWon = existing.legs_won + matchStats.legs_won;
    const newLegsLost = existing.legs_lost + matchStats.legs_lost;
    
    const newDartsThrown = existing.total_darts_thrown + matchStats.darts_thrown;
    const newPointsScored = existing.total_points_scored + matchStats.points_scored;
    
    // Calculate new career average
    const newCareerAverage = newDartsThrown > 0 
      ? (newPointsScored / (newDartsThrown / 3)) 
      : 0;
    
    // Update streak
    let newCurrentStreak = matchStats.is_winner 
      ? existing.current_win_streak + 1 
      : 0;
    let newLongestStreak = Math.max(existing.longest_win_streak, newCurrentStreak);
    
    // New totals
    const new180s = existing.total_180s + matchStats.scores_180;
    const new140Plus = existing.total_140_plus + matchStats.scores_140_plus;
    const new100Plus = existing.total_100_plus + matchStats.scores_100_plus;
    
    const newCheckouts = existing.total_checkouts + matchStats.checkouts_hit;
    const newCheckoutAttempts = existing.checkout_attempts + matchStats.checkout_attempts;
    const newCheckoutPct = newCheckoutAttempts > 0 
      ? (newCheckouts / newCheckoutAttempts) * 100 
      : 0;

    // Update record bests
    const bestMatchAvg = Math.max(existing.best_match_average, matchStats.average);
    const bestFirst9 = Math.max(existing.best_first_9, matchStats.first_9_average);
    const highestCheckout = Math.max(existing.highest_checkout, matchStats.highest_checkout);
    const bestLeg = Math.min(existing.best_leg_darts, matchStats.best_leg_darts);
    const most180sMatch = Math.max(existing.most_180s_match, matchStats.scores_180);

    // Calculate new rating using simplified ELO
    const newRating = this.calculateNewRating(
      existing.rating,
      matchStats.is_winner,
      1000 // Opponent rating - would need actual value
    );

    await this.db
      .from('player_lifetime_stats')
      .update({
        matches_played: newMatchesPlayed,
        matches_won: newMatchesWon,
        matches_lost: newMatchesLost,
        win_percentage: (newMatchesWon / newMatchesPlayed) * 100,
        
        legs_played: newLegsPlayed,
        legs_won: newLegsWon,
        legs_lost: newLegsLost,
        
        total_darts_thrown: newDartsThrown,
        total_points_scored: newPointsScored,
        career_average: Math.round(newCareerAverage * 100) / 100,
        
        best_match_average: bestMatchAvg,
        best_first_9: bestFirst9,
        
        total_180s: new180s,
        total_140_plus: new140Plus,
        total_100_plus: new100Plus,
        total_tons: new100Plus,
        
        total_checkouts: newCheckouts,
        checkout_attempts: newCheckoutAttempts,
        checkout_percentage: Math.round(newCheckoutPct * 100) / 100,
        highest_checkout: highestCheckout,
        
        best_leg_darts: bestLeg < 999 ? bestLeg : null,
        most_180s_match: most180sMatch,
        longest_win_streak: newLongestStreak,
        current_win_streak: newCurrentStreak,
        
        rating: newRating,
        last_match_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('player_id', matchStats.player_id);
  }

  private calculateNewRating(currentRating: number, won: boolean, opponentRating: number): number {
    const K = 32; // K-factor
    const expected = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));
    const actual = won ? 1 : 0;
    return Math.round(currentRating + K * (actual - expected));
  }

  // ---- Rankings ----

  async getGlobalRankings(options?: {
    limit?: number;
    offset?: number;
    country?: string;
  }): Promise<Ranking[]> {
    let query = this.db
      .from('player_lifetime_stats')
      .select(`
        player_id,
        rating,
        matches_played,
        win_percentage,
        career_average,
        player:players(id, name, avatar_url, country)
      `)
      .gte('matches_played', 5) // Minimum matches for ranking
      .order('rating', { ascending: false });

    if (options?.country) {
      query = query.eq('player.country', options.country);
    }

    query = query.range(
      options?.offset || 0,
      (options?.offset || 0) + (options?.limit || 100) - 1
    );

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row: any, index: number) => ({
      player_id: row.player_id,
      rank: (options?.offset || 0) + index + 1,
      rating: row.rating,
      points: row.rating,
      matches_counted: row.matches_played,
      player: row.player,
      updated_at: new Date().toISOString()
    }));
  }

  async getOrganizationRankings(orgId: string, limit = 50): Promise<Ranking[]> {
    const { data, error } = await this.db
      .from('organization_rankings')
      .select(`
        *,
        player:players(id, name, avatar_url)
      `)
      .eq('organization_id', orgId)
      .order('rank')
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getPlayerRank(playerId: string): Promise<{ global: number; byCountry?: number }> {
    // Get global rank
    const { count: globalRank } = await this.db
      .from('player_lifetime_stats')
      .select('*', { count: 'exact', head: true })
      .gte('matches_played', 5)
      .gt('rating', await this.getPlayerRating(playerId));

    return {
      global: (globalRank || 0) + 1
    };
  }

  private async getPlayerRating(playerId: string): Promise<number> {
    const { data } = await this.db
      .from('player_lifetime_stats')
      .select('rating')
      .eq('player_id', playerId)
      .single();
    return data?.rating || 1000;
  }

  // ---- Achievements ----

  async checkAchievements(matchStats: MatchStatistics): Promise<PlayerAchievement[]> {
    const earned: PlayerAchievement[] = [];
    
    // Check various achievement conditions
    const checks = [
      { code: 'first_180', condition: matchStats.scores_180 > 0, name: 'First 180!' },
      { code: 'triple_180', condition: matchStats.scores_180 >= 3, name: 'Hat Trick' },
      { code: 'checkout_100', condition: matchStats.highest_checkout >= 100, name: 'Ton Out' },
      { code: 'checkout_150', condition: matchStats.highest_checkout >= 150, name: 'Big Fish' },
      { code: 'checkout_170', condition: matchStats.highest_checkout === 170, name: 'Maximum Checkout' },
      { code: 'nine_darter', condition: matchStats.best_leg_darts === 9, name: 'Nine Darter!' },
      { code: 'avg_100', condition: matchStats.average >= 100, name: 'Ton Average' },
    ];

    for (const check of checks) {
      if (check.condition) {
        const achievement = await this.awardAchievement(
          matchStats.player_id,
          check.code,
          matchStats.match_id
        );
        if (achievement) earned.push(achievement);
      }
    }

    return earned;
  }

  async awardAchievement(
    playerId: string,
    achievementCode: string,
    matchId?: string
  ): Promise<PlayerAchievement | null> {
    // Check if already earned
    const { data: existing } = await this.db
      .from('player_achievements')
      .select('id')
      .eq('player_id', playerId)
      .eq('achievement_code', achievementCode)
      .single();

    if (existing) return null;

    // Get achievement details
    const { data: achievement } = await this.db
      .from('achievements')
      .select('id')
      .eq('code', achievementCode)
      .single();

    if (!achievement) return null;

    // Award it
    const { data, error } = await this.db
      .from('player_achievements')
      .insert([{
        player_id: playerId,
        achievement_id: achievement.id,
        achievement_code: achievementCode,
        match_id: matchId,
        earned_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPlayerAchievements(playerId: string): Promise<PlayerAchievement[]> {
    const { data, error } = await this.db
      .from('player_achievements')
      .select('*, achievement:achievements(*)')
      .eq('player_id', playerId)
      .order('earned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ---- Match History ----

  async getPlayerMatchHistory(playerId: string, limit = 20): Promise<MatchStatistics[]> {
    const { data, error } = await this.db
      .from('match_statistics')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // ---- Leaderboards ----

  async getLeaderboard(
    metric: 'average' | '180s' | 'checkouts' | 'wins',
    options?: { limit?: number; period?: 'all' | 'month' | 'week' }
  ): Promise<any[]> {
    const column = {
      average: 'career_average',
      '180s': 'total_180s',
      checkouts: 'highest_checkout',
      wins: 'matches_won'
    }[metric];

    let query = this.db
      .from('player_lifetime_stats')
      .select(`
        player_id,
        ${column},
        player:players(id, name, avatar_url)
      `)
      .gte('matches_played', 3)
      .order(column, { ascending: false })
      .limit(options?.limit || 50);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}

// ==================== PREDEFINED ACHIEVEMENTS ====================

export const ACHIEVEMENTS: Achievement[] = [
  // Scoring
  { id: '1', code: 'first_180', name: 'Maximum!', description: 'Hit your first 180', icon: '🎯', category: 'scoring', rarity: 'common', requirement: { type: '180', count: 1 } },
  { id: '2', code: 'ten_180s', name: 'Ton Machine', description: 'Hit 10 career 180s', icon: '💯', category: 'scoring', rarity: 'uncommon', requirement: { type: '180', count: 10 } },
  { id: '3', code: 'hundred_180s', name: 'Century of Maximums', description: 'Hit 100 career 180s', icon: '🏆', category: 'scoring', rarity: 'rare', requirement: { type: '180', count: 100 } },
  { id: '4', code: 'triple_180', name: 'Hat Trick', description: 'Hit 3+ 180s in a single match', icon: '🎩', category: 'scoring', rarity: 'rare', requirement: { type: '180_match', count: 3 } },
  
  // Checkouts
  { id: '5', code: 'checkout_100', name: 'Ton Out', description: 'Hit a checkout of 100+', icon: '💫', category: 'checkout', rarity: 'common', requirement: { type: 'checkout', min: 100 } },
  { id: '6', code: 'checkout_150', name: 'Big Fish', description: 'Hit a checkout of 150+', icon: '🐟', category: 'checkout', rarity: 'uncommon', requirement: { type: 'checkout', min: 150 } },
  { id: '7', code: 'checkout_170', name: 'Maximum Checkout', description: 'Hit the legendary 170 checkout', icon: '👑', category: 'checkout', rarity: 'epic', requirement: { type: 'checkout', exact: 170 } },
  
  // Performance
  { id: '8', code: 'nine_darter', name: 'Perfect Leg', description: 'Win a leg in 9 darts', icon: '⭐', category: 'special', rarity: 'legendary', requirement: { type: 'leg_darts', exact: 9 } },
  { id: '9', code: 'avg_100', name: 'Ton Average', description: 'Average 100+ in a match', icon: '📊', category: 'scoring', rarity: 'rare', requirement: { type: 'average', min: 100 } },
  { id: '10', code: 'avg_110', name: 'Elite Average', description: 'Average 110+ in a match', icon: '🔥', category: 'scoring', rarity: 'epic', requirement: { type: 'average', min: 110 } },
  
  // Winning
  { id: '11', code: 'first_win', name: 'First Blood', description: 'Win your first match', icon: '🥇', category: 'winning', rarity: 'common', requirement: { type: 'wins', count: 1 } },
  { id: '12', code: 'ten_wins', name: 'Getting Started', description: 'Win 10 matches', icon: '🏅', category: 'winning', rarity: 'common', requirement: { type: 'wins', count: 10 } },
  { id: '13', code: 'hundred_wins', name: 'Centurion', description: 'Win 100 matches', icon: '🎖️', category: 'winning', rarity: 'rare', requirement: { type: 'wins', count: 100 } },
  { id: '14', code: 'win_streak_5', name: 'On Fire', description: 'Win 5 matches in a row', icon: '🔥', category: 'winning', rarity: 'uncommon', requirement: { type: 'streak', count: 5 } },
  { id: '15', code: 'win_streak_10', name: 'Unstoppable', description: 'Win 10 matches in a row', icon: '⚡', category: 'winning', rarity: 'rare', requirement: { type: 'streak', count: 10 } },
  
  // Milestones
  { id: '16', code: 'matches_50', name: 'Regular', description: 'Play 50 matches', icon: '📈', category: 'milestone', rarity: 'common', requirement: { type: 'matches', count: 50 } },
  { id: '17', code: 'matches_500', name: 'Veteran', description: 'Play 500 matches', icon: '🎗️', category: 'milestone', rarity: 'rare', requirement: { type: 'matches', count: 500 } },
];

// ==================== DATABASE SCHEMA ====================

export const STATISTICS_SCHEMA = `
-- Player lifetime statistics
CREATE TABLE IF NOT EXISTS player_lifetime_stats (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,
  win_percentage DECIMAL(5,2) DEFAULT 0,
  
  legs_played INTEGER DEFAULT 0,
  legs_won INTEGER DEFAULT 0,
  legs_lost INTEGER DEFAULT 0,
  
  total_darts_thrown INTEGER DEFAULT 0,
  total_points_scored INTEGER DEFAULT 0,
  
  career_average DECIMAL(5,2) DEFAULT 0,
  best_match_average DECIMAL(5,2) DEFAULT 0,
  best_leg_average DECIMAL(5,2) DEFAULT 0,
  
  best_first_9 DECIMAL(5,2) DEFAULT 0,
  avg_first_9 DECIMAL(5,2) DEFAULT 0,
  
  total_180s INTEGER DEFAULT 0,
  total_140_plus INTEGER DEFAULT 0,
  total_100_plus INTEGER DEFAULT 0,
  total_tons INTEGER DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  
  total_checkouts INTEGER DEFAULT 0,
  checkout_attempts INTEGER DEFAULT 0,
  checkout_percentage DECIMAL(5,2) DEFAULT 0,
  highest_checkout INTEGER DEFAULT 0,
  
  best_leg_darts INTEGER,
  most_180s_match INTEGER DEFAULT 0,
  longest_win_streak INTEGER DEFAULT 0,
  current_win_streak INTEGER DEFAULT 0,
  
  stats_501 JSONB DEFAULT '{}',
  stats_301 JSONB DEFAULT '{}',
  stats_cricket JSONB,
  
  rating INTEGER DEFAULT 1000,
  
  last_match_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual match statistics
CREATE TABLE IF NOT EXISTS match_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,
  player_id UUID REFERENCES players(id),
  
  legs_won INTEGER DEFAULT 0,
  legs_lost INTEGER DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  
  darts_thrown INTEGER DEFAULT 0,
  points_scored INTEGER DEFAULT 0,
  average DECIMAL(5,2) DEFAULT 0,
  first_9_average DECIMAL(5,2) DEFAULT 0,
  
  scores_180 INTEGER DEFAULT 0,
  scores_140_plus INTEGER DEFAULT 0,
  scores_100_plus INTEGER DEFAULT 0,
  scores_60_plus INTEGER DEFAULT 0,
  highest_visit INTEGER DEFAULT 0,
  
  checkouts_hit INTEGER DEFAULT 0,
  checkout_attempts INTEGER DEFAULT 0,
  checkout_percentage DECIMAL(5,2) DEFAULT 0,
  highest_checkout INTEGER DEFAULT 0,
  
  best_leg_darts INTEGER,
  
  visit_history JSONB,
  checkout_history JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements definitions
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  category VARCHAR(20),
  rarity VARCHAR(20),
  requirement JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player achievements
CREATE TABLE IF NOT EXISTS player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id),
  achievement_code VARCHAR(50),
  
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  match_id UUID,
  
  UNIQUE(player_id, achievement_id)
);

-- Organization rankings
CREATE TABLE IF NOT EXISTS organization_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  
  rank INTEGER NOT NULL,
  previous_rank INTEGER,
  rank_change INTEGER DEFAULT 0,
  
  rating INTEGER DEFAULT 1000,
  points INTEGER DEFAULT 0,
  
  matches_counted INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, player_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_player_stats_rating ON player_lifetime_stats(rating DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_average ON player_lifetime_stats(career_average DESC);
CREATE INDEX IF NOT EXISTS idx_match_stats_player ON match_statistics(player_id);
CREATE INDEX IF NOT EXISTS idx_match_stats_match ON match_statistics(match_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON player_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_org_rankings_org ON organization_rankings(organization_id, rank);
`;

export default StatisticsService;
