/**
 * Shared Types for Darts Scoring Package
 * Common interfaces used across multiple modules
 */

// ==================== CORE PLAYER TYPES ====================

export interface Player {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  nickname?: string;
  country?: string;
  region?: string;
  timezone?: string;
  rating?: number;

  // Settings
  public_profile?: boolean;
  show_stats?: boolean;
  is_premium?: boolean;
  premium_until?: string;

  // Contact
  phone?: string;
  phone_verified?: boolean;
  sms_notifications?: boolean;

  created_at?: string;
  stats?: PlayerStats;
}

export interface PlayerStats {
  matches_played: number;
  matches_won: number;
  legs_won: number;
  legs_lost: number;
  average: number;
  best_checkout: number;
  total_180s: number;
}

// ==================== MATCH TYPES ====================

export interface MatchConfig {
  startingScore: 501 | 301 | 170 | 121 | number;
  matchType: 'first_to' | 'best_of';
  targetLegs: number;
  targetSets?: number;
  doubleIn?: boolean;
  doubleOut?: boolean;
}

export interface MatchStats {
  scores_65_plus: number;
  scores_90_plus: number;
  scores_100_plus: number;
  scores_140_plus: number;
  scores_170_plus: number;
  scores_180: number;
  best_leg: number | null;
  average: number;
  highest_checkout?: number;
  visit_history?: number[];
  playerName?: string;
}

export interface BaseMatch {
  id: string;
  status: 'pending' | 'ready' | 'in_progress' | 'completed';
  starting_score: number;
  match_type: 'first_to' | 'best_of';
  created_at: string;
  completed_at?: string;
}

// ==================== DATABASE CLIENT TYPE ====================

/**
 * Generic database client interface
 * Compatible with Supabase, but can be adapted for other databases
 */
export interface DatabaseClient {
  from(table: string): DatabaseQueryBuilder;
  channel?(name: string): RealtimeChannel;
  rpc?(fn: string, params?: Record<string, unknown>): Promise<{ data: unknown; error: Error | null }>;
}

export interface DatabaseQueryBuilder {
  select(columns?: string, options?: { count?: 'exact'; head?: boolean }): DatabaseQueryBuilder;
  insert(data: unknown[]): DatabaseQueryBuilder;
  update(data: unknown): DatabaseQueryBuilder;
  delete(): DatabaseQueryBuilder;
  eq(column: string, value: unknown): DatabaseQueryBuilder;
  neq(column: string, value: unknown): DatabaseQueryBuilder;
  gt(column: string, value: unknown): DatabaseQueryBuilder;
  gte(column: string, value: unknown): DatabaseQueryBuilder;
  lt(column: string, value: unknown): DatabaseQueryBuilder;
  lte(column: string, value: unknown): DatabaseQueryBuilder;
  or(filter: string): DatabaseQueryBuilder;
  ilike(column: string, value: string): DatabaseQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): DatabaseQueryBuilder;
  limit(count: number): DatabaseQueryBuilder;
  range(from: number, to: number): DatabaseQueryBuilder;
  single(): Promise<{ data: unknown; error: Error | null; count?: number }>;
}

export interface RealtimeChannel {
  on(event: string, config: unknown, callback: (payload: unknown) => void): RealtimeChannel;
  subscribe(): RealtimeChannel;
  unsubscribe(): void;
}

// ==================== COMMON STATUS TYPES ====================

export type MatchStatus = 'pending' | 'ready' | 'in_progress' | 'completed' | 'bye';
export type TournamentStatus = 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled';
export type LeagueStatus = 'draft' | 'active' | 'completed';

// ==================== UTILITY TYPES ====================

export type WithTimestamps<T> = T & {
  created_at: string;
  updated_at?: string;
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
