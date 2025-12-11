/**
 * Darts Scoring Engine
 * Core scoring logic for X01 games (501, 301, 170, 121, etc.)
 * Supports: First to X legs, Best of X sets, statistics tracking
 *
 * Performance optimizations:
 * - Immutable state updates with spread operator
 * - Pre-computed checkout validation via Set
 * - Memoized average calculations
 */

import {
  VALID_CHECKOUTS,
  MAX_SCORE,
  INITIAL_MATCH_STATS,
  getCheckoutSuggestion
} from '../constants';
import type { MatchConfig, MatchStats } from '../types';

// ==================== TYPES ====================

export interface PlayerState {
  id?: string;
  name: string;
  score: number;
  legs: number;
  sets?: number;
  history: number[];             // Throws in CURRENT leg
  matchHistory: number[];        // Throws in WHOLE match
  stats: MatchStats;
  dartsThrown: number;           // Darts thrown in current leg
}

export interface ThrowResult {
  success: boolean;
  newScore: number;
  isBust: boolean;
  isLegWon: boolean;
  isMatchWon: boolean;
  message?: string;
}

// ==================== SCORING ENGINE ====================

export class DartsScoringEngine {
  private readonly config: Required<Pick<MatchConfig, 'startingScore' | 'matchType' | 'targetLegs' | 'doubleOut'>> & MatchConfig;
  private readonly legsNeeded: number;

  constructor(config: MatchConfig) {
    this.config = {
      doubleOut: true,  // Default: standard darts rules
      ...config
    };

    // Pre-calculate legs needed (avoids repeated calculation)
    this.legsNeeded = this.config.matchType === 'first_to'
      ? this.config.targetLegs
      : Math.ceil(this.config.targetLegs / 2);
  }

  /**
   * Create initial player state
   */
  createPlayerState(name: string, id?: string): PlayerState {
    return {
      id,
      name,
      score: this.config.startingScore,
      legs: 0,
      sets: 0,
      history: [],
      matchHistory: [],
      stats: { ...INITIAL_MATCH_STATS },
      dartsThrown: 0
    };
  }

  /**
   * Process a throw (3-dart visit)
   */
  processThrow(player: PlayerState, scoreThrown: number): ThrowResult {
    // Validate score
    if (scoreThrown < 0 || scoreThrown > MAX_SCORE) {
      return {
        success: false,
        newScore: player.score,
        isBust: false,
        isLegWon: false,
        isMatchWon: false,
        message: `Invalid score. Maximum is ${MAX_SCORE}.`
      };
    }

    const newScore = player.score - scoreThrown;

    // Check for bust conditions
    if (this.isBust(newScore)) {
      return {
        success: true,
        newScore: player.score, // Score stays the same on bust
        isBust: true,
        isLegWon: false,
        isMatchWon: false,
        message: 'Bust!'
      };
    }

    // Check for checkout (leg won)
    if (newScore === 0) {
      const isMatchWon = player.legs + 1 >= this.legsNeeded;
      return {
        success: true,
        newScore: 0,
        isBust: false,
        isLegWon: true,
        isMatchWon,
        message: isMatchWon ? 'Match won!' : 'Leg won!'
      };
    }

    // Normal scoring
    return {
      success: true,
      newScore,
      isBust: false,
      isLegWon: false,
      isMatchWon: false
    };
  }

  /**
   * Check if a score results in a bust
   */
  private isBust(newScore: number): boolean {
    // Went negative or left on 1 (impossible to checkout on double)
    return newScore < 0 || newScore === 1;
  }

  /**
   * Check if match is won based on legs
   */
  checkMatchWin(legs: number): boolean {
    return legs >= this.legsNeeded;
  }

  /**
   * Get legs needed to win
   */
  getLegsNeeded(): number {
    return this.legsNeeded;
  }

  /**
   * Update player statistics after a throw
   * Uses single-pass update for performance
   */
  updateStats(stats: MatchStats, scoreThrown: number): MatchStats {
    return {
      ...stats,
      scores_180: stats.scores_180 + (scoreThrown === 180 ? 1 : 0),
      scores_170_plus: stats.scores_170_plus + (scoreThrown >= 170 && scoreThrown < 180 ? 1 : 0),
      scores_140_plus: stats.scores_140_plus + (scoreThrown >= 140 && scoreThrown < 170 ? 1 : 0),
      scores_100_plus: stats.scores_100_plus + (scoreThrown >= 100 && scoreThrown < 140 ? 1 : 0),
      scores_90_plus: stats.scores_90_plus + (scoreThrown >= 90 && scoreThrown < 100 ? 1 : 0),
      scores_65_plus: stats.scores_65_plus + (scoreThrown >= 65 && scoreThrown < 90 ? 1 : 0)
    };
  }

  /**
   * Calculate 3-dart average from match history
   */
  calculateAverage(matchHistory: readonly number[]): number {
    if (matchHistory.length === 0) return 0;
    const total = matchHistory.reduce((sum, score) => sum + score, 0);
    return Math.round((total / matchHistory.length) * 100) / 100;
  }

  /**
   * Update best leg stat if current leg is better
   */
  updateBestLeg(stats: MatchStats, dartsThrown: number): MatchStats {
    if (stats.best_leg === null || dartsThrown < stats.best_leg) {
      return { ...stats, best_leg: dartsThrown };
    }
    return stats;
  }

  /**
   * Apply a throw to a player and return updated state
   * Returns new state objects (immutable update)
   */
  applyThrow(player: PlayerState, scoreThrown: number): {
    player: PlayerState;
    result: ThrowResult;
  } {
    const result = this.processThrow(player, scoreThrown);

    if (!result.success) {
      return { player, result };
    }

    if (result.isBust) {
      // Bust: only increment darts thrown
      return {
        player: {
          ...player,
          dartsThrown: player.dartsThrown + 3
        },
        result
      };
    }

    if (result.isLegWon) {
      // Leg won
      const finalDarts = player.dartsThrown + 3;
      const newHistory = [...player.history, scoreThrown];
      const newMatchHistory = [...player.matchHistory, scoreThrown];

      let newStats = this.updateStats(player.stats, scoreThrown);
      newStats = this.updateBestLeg(newStats, finalDarts);

      // Update highest checkout if applicable
      if (!newStats.highest_checkout || player.score > newStats.highest_checkout) {
        newStats = { ...newStats, highest_checkout: player.score };
      }

      newStats.average = this.calculateAverage(newMatchHistory);
      newStats.visit_history = newMatchHistory;

      return {
        player: {
          ...player,
          score: 0,
          legs: player.legs + 1,
          history: newHistory,
          matchHistory: newMatchHistory,
          stats: newStats,
          dartsThrown: 0 // Reset for next leg
        },
        result
      };
    }

    // Normal throw
    const newHistory = [...player.history, scoreThrown];
    const newMatchHistory = [...player.matchHistory, scoreThrown];
    let newStats = this.updateStats(player.stats, scoreThrown);
    newStats.average = this.calculateAverage(newMatchHistory);
    newStats.visit_history = newMatchHistory;

    return {
      player: {
        ...player,
        score: result.newScore,
        history: newHistory,
        matchHistory: newMatchHistory,
        stats: newStats,
        dartsThrown: player.dartsThrown + 3
      },
      result
    };
  }

  /**
   * Reset player for new leg
   */
  resetForNewLeg(player: PlayerState): PlayerState {
    return {
      ...player,
      score: this.config.startingScore,
      history: [],
      dartsThrown: 0
    };
  }

  /**
   * Reset player for new match
   */
  resetForNewMatch(player: PlayerState): PlayerState {
    return {
      ...player,
      score: this.config.startingScore,
      legs: 0,
      sets: 0,
      history: [],
      matchHistory: [],
      stats: { ...INITIAL_MATCH_STATS },
      dartsThrown: 0
    };
  }

  /**
   * Get suggested checkout
   */
  getSuggestedCheckout(remaining: number): string | null {
    return getCheckoutSuggestion(remaining);
  }

  /**
   * Get current config
   */
  getConfig(): MatchConfig {
    return { ...this.config };
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format average to 2 decimal places
 */
export function formatAverage(matchHistory: readonly number[]): string {
  if (matchHistory.length === 0) return '0.00';
  const total = matchHistory.reduce((sum, score) => sum + score, 0);
  return (total / matchHistory.length).toFixed(2);
}

/**
 * Calculate first 9 darts average
 */
export function calculateFirst9Average(matchHistory: readonly number[]): number {
  const first3Visits = matchHistory.slice(0, 3);
  if (first3Visits.length === 0) return 0;
  const total = first3Visits.reduce((sum, score) => sum + score, 0);
  return Math.round((total / first3Visits.length) * 100) / 100;
}

/**
 * Check if score is a valid checkout
 */
export function isValidCheckout(score: number): boolean {
  return VALID_CHECKOUTS.has(score);
}

/**
 * Calculate checkout percentage
 */
export function calculateCheckoutPercentage(
  checkoutsHit: number,
  checkoutAttempts: number
): number {
  if (checkoutAttempts === 0) return 0;
  return Math.round((checkoutsHit / checkoutAttempts) * 100);
}

export default DartsScoringEngine;
