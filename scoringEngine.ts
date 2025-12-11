/**
 * Darts Scoring Engine
 * Extracted from Pinnacle Darts App
 * 
 * Core scoring logic for X01 games (501, 301, 170, 121, etc.)
 * Supports: First to X legs, Best of X sets, statistics tracking
 */

// ==================== TYPES ====================

export interface MatchStats {
  scores_65_plus: number;
  scores_90_plus: number;
  scores_100_plus: number;
  scores_140_plus: number;
  scores_170_plus: number;
  scores_180: number;
  best_leg: number | null;       // Fewest darts to win a leg
  average: number;               // 3-dart average
  highest_checkout?: number;
  visit_history?: number[];      // All throws in the match
  playerName?: string;
}

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

export interface MatchConfig {
  startingScore: 501 | 301 | 170 | 121 | number;
  matchType: 'first_to' | 'best_of';
  targetLegs: number;
  targetSets?: number;
  doubleIn?: boolean;
  doubleOut?: boolean;           // Standard darts requires double out
}

export interface ThrowResult {
  success: boolean;
  newScore: number;
  isBust: boolean;
  isLegWon: boolean;
  isMatchWon: boolean;
  message?: string;
}

// ==================== CONSTANTS ====================

export const INITIAL_STATS: MatchStats = {
  scores_65_plus: 0,
  scores_90_plus: 0,
  scores_100_plus: 0,
  scores_140_plus: 0,
  scores_170_plus: 0,
  scores_180: 0,
  best_leg: null,
  average: 0
};

// Valid checkout scores (can finish on these)
export const VALID_CHECKOUTS = new Set([
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 60,
  61, 62, 63, 64, 65, 66, 67, 68, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
  81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 100,
  101, 102, 103, 104, 105, 106, 107, 108, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
  121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140,
  141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 160,
  161, 164, 167, 170
]);

// Impossible checkouts
export const INVALID_CHECKOUTS = [169, 168, 166, 165, 163, 162, 159];

// ==================== SCORING ENGINE ====================

export class DartsScoringEngine {
  private config: MatchConfig;

  constructor(config: MatchConfig) {
    this.config = {
      doubleOut: true,  // Default: standard darts rules
      ...config
    };
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
      stats: { ...INITIAL_STATS },
      dartsThrown: 0
    };
  }

  /**
   * Process a throw (3-dart visit)
   */
  processThrow(player: PlayerState, scoreThrown: number): ThrowResult {
    // Validate score
    if (scoreThrown < 0 || scoreThrown > 180) {
      return {
        success: false,
        newScore: player.score,
        isBust: false,
        isLegWon: false,
        isMatchWon: false,
        message: 'Invalid score. Maximum is 180.'
      };
    }

    const newScore = player.score - scoreThrown;

    // Check for bust conditions
    if (this.isBust(newScore, player.score, scoreThrown)) {
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
      const isMatchWon = this.checkMatchWin(player.legs + 1);
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
   * Check if a throw results in a bust
   */
  private isBust(newScore: number, currentScore: number, scoreThrown: number): boolean {
    // Went negative
    if (newScore < 0) return true;
    
    // Left on 1 (impossible to checkout on double)
    if (newScore === 1) return true;
    
    // Double out validation: if remaining score is valid checkout, 
    // the actual checkout logic is handled by the UI/caller
    // This engine just validates the math
    
    return false;
  }

  /**
   * Check if match is won based on legs
   */
  checkMatchWin(legs: number): boolean {
    if (this.config.matchType === 'first_to') {
      return legs >= this.config.targetLegs;
    } else {
      // Best of X: need more than half
      return legs > Math.floor(this.config.targetLegs / 2);
    }
  }

  /**
   * Calculate legs needed to win
   */
  getLegsNeeded(): number {
    if (this.config.matchType === 'first_to') {
      return this.config.targetLegs;
    }
    return Math.ceil(this.config.targetLegs / 2);
  }

  /**
   * Update player statistics after a throw
   */
  updateStats(stats: MatchStats, scoreThrown: number): MatchStats {
    const newStats = { ...stats };
    
    if (scoreThrown === 180) {
      newStats.scores_180++;
    } else if (scoreThrown >= 170) {
      newStats.scores_170_plus++;
    } else if (scoreThrown >= 140) {
      newStats.scores_140_plus++;
    } else if (scoreThrown >= 100) {
      newStats.scores_100_plus++;
    } else if (scoreThrown >= 90) {
      newStats.scores_90_plus++;
    } else if (scoreThrown >= 65) {
      newStats.scores_65_plus++;
    }
    
    return newStats;
  }

  /**
   * Calculate 3-dart average from match history
   */
  calculateAverage(matchHistory: number[]): number {
    if (matchHistory.length === 0) return 0;
    const total = matchHistory.reduce((sum, score) => sum + score, 0);
    return Math.round((total / matchHistory.length) * 100) / 100;
  }

  /**
   * Update best leg stat if current leg is better
   */
  updateBestLeg(stats: MatchStats, dartsThrown: number): MatchStats {
    const newStats = { ...stats };
    if (newStats.best_leg === null || dartsThrown < newStats.best_leg) {
      newStats.best_leg = dartsThrown;
    }
    return newStats;
  }

  /**
   * Apply a throw to a player and return updated state
   */
  applyThrow(player: PlayerState, scoreThrown: number): {
    player: PlayerState;
    result: ThrowResult;
  } {
    const result = this.processThrow(player, scoreThrown);
    
    if (!result.success) {
      return { player, result };
    }

    let updatedPlayer = { ...player };
    
    if (result.isBust) {
      // Bust: only increment darts thrown
      updatedPlayer.dartsThrown += 3;
    } else if (result.isLegWon) {
      // Leg won
      const finalDarts = player.dartsThrown + 3;
      updatedPlayer = {
        ...updatedPlayer,
        score: 0,
        legs: player.legs + 1,
        history: [...player.history, scoreThrown],
        matchHistory: [...player.matchHistory, scoreThrown],
        stats: this.updateBestLeg(
          this.updateStats(player.stats, scoreThrown),
          finalDarts
        ),
        dartsThrown: 0 // Reset for next leg
      };
      
      // Update highest checkout if applicable
      if (!updatedPlayer.stats.highest_checkout || 
          player.score > updatedPlayer.stats.highest_checkout) {
        updatedPlayer.stats.highest_checkout = player.score;
      }
    } else {
      // Normal throw
      updatedPlayer = {
        ...updatedPlayer,
        score: result.newScore,
        history: [...player.history, scoreThrown],
        matchHistory: [...player.matchHistory, scoreThrown],
        stats: this.updateStats(player.stats, scoreThrown),
        dartsThrown: player.dartsThrown + 3
      };
    }
    
    // Update average
    updatedPlayer.stats.average = this.calculateAverage(updatedPlayer.matchHistory);
    updatedPlayer.stats.visit_history = updatedPlayer.matchHistory;

    return { player: updatedPlayer, result };
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
      stats: { ...INITIAL_STATS },
      dartsThrown: 0
    };
  }

  /**
   * Get suggested checkout (basic suggestions)
   */
  getSuggestedCheckout(remaining: number): string | null {
    const checkouts: Record<number, string> = {
      170: 'T20 T20 Bull',
      167: 'T20 T19 Bull',
      164: 'T20 T18 Bull',
      161: 'T20 T17 Bull',
      160: 'T20 T20 D20',
      // Add more common checkouts...
      100: 'T20 D20',
      80: 'T20 D10',
      60: 'S20 D20',
      50: 'S18 D16 or S10 D20',
      40: 'D20',
      36: 'D18',
      32: 'D16',
      20: 'D10',
      16: 'D8',
      8: 'D4',
      4: 'D2',
      2: 'D1'
    };
    
    return checkouts[remaining] || null;
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format average to 2 decimal places
 */
export function formatAverage(matchHistory: number[]): string {
  if (matchHistory.length === 0) return '0.00';
  const total = matchHistory.reduce((sum, score) => sum + score, 0);
  return (total / matchHistory.length).toFixed(2);
}

/**
 * Calculate first 9 darts average
 */
export function calculateFirst9Average(matchHistory: number[]): number {
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
