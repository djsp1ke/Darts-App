/**
 * Darts Bot Engine
 * AI opponent with configurable skill levels
 *
 * Performance optimizations:
 * - Pre-computed difficulty levels as frozen objects
 * - Cached ideal leaves per difficulty
 * - Optimized random generation using Box-Muller transform
 */

import { INVALID_CHECKOUTS } from '../constants';

// ==================== TYPES ====================

export interface BotLevel {
  readonly id: number;
  readonly name: string;
  readonly displayName: string;
  readonly avg: number;           // Target 3-dart average
  readonly checkoutRate: number;  // 0-1 probability of hitting checkout
  readonly consistency: number;   // Standard deviation (lower = more consistent)
}

// ==================== BOT LEVELS (Frozen for immutability) ====================

export const BOT_LEVELS: readonly BotLevel[] = Object.freeze([
  Object.freeze({
    id: 1,
    name: 'beginner',
    displayName: 'Beginner',
    avg: 30,
    checkoutRate: 0.05,
    consistency: 30
  }),
  Object.freeze({
    id: 2,
    name: 'pub_player',
    displayName: 'Pub Player',
    avg: 45,
    checkoutRate: 0.15,
    consistency: 28
  }),
  Object.freeze({
    id: 3,
    name: 'super_league',
    displayName: 'Super League',
    avg: 60,
    checkoutRate: 0.30,
    consistency: 25
  }),
  Object.freeze({
    id: 4,
    name: 'county',
    displayName: 'County',
    avg: 75,
    checkoutRate: 0.50,
    consistency: 22
  }),
  Object.freeze({
    id: 5,
    name: 'pro',
    displayName: 'Professional',
    avg: 95,
    checkoutRate: 0.75,
    consistency: 18
  }),
  Object.freeze({
    id: 6,
    name: 'dartbot_3000',
    displayName: 'Dartbot 3000',
    avg: 110,
    checkoutRate: 0.90,
    consistency: 12
  })
]);

// Pre-computed lookup maps for O(1) access
const LEVEL_BY_ID = new Map(BOT_LEVELS.map(l => [l.id, l]));
const LEVEL_BY_NAME = new Map(BOT_LEVELS.map(l => [l.name, l]));

// Good checkout leaves
const GOOD_LEAVES: readonly number[] = Object.freeze([32, 40, 36, 24, 16, 20, 8]);

// ==================== BOT ENGINE CLASS ====================

export class DartsBotEngine {
  private level: BotLevel;

  constructor(level: BotLevel) {
    this.level = level;
  }

  /**
   * Set a new difficulty level
   */
  setLevel(level: BotLevel): void {
    this.level = level;
  }

  /**
   * Get current level
   */
  getLevel(): BotLevel {
    return this.level;
  }

  /**
   * Generate a bot's score based on current remaining score
   */
  generateScore(currentScore: number): number {
    // Check if bot can attempt checkout
    const canCheckout = currentScore <= 170 && !INVALID_CHECKOUTS.includes(currentScore);

    if (canCheckout) {
      return this.attemptCheckout(currentScore);
    }

    // Normal scoring phase
    return this.generateScoringVisit(currentScore);
  }

  /**
   * Attempt a checkout
   */
  private attemptCheckout(currentScore: number): number {
    const roll = Math.random();

    // Successful checkout
    if (roll < this.level.checkoutRate) {
      return currentScore;
    }

    // Failed checkout - calculate realistic miss
    if (currentScore <= 40) {
      // Low checkout: missed the double, hit single or adjacent
      const missedScore = Math.floor(currentScore / 2);
      const variance = Math.floor(Math.random() * 10) - 5;
      return Math.max(0, missedScore + variance);
    }

    // Higher checkout: setup shot that missed
    const targetLeave = this.getIdealLeave();
    let potentialScore = currentScore - targetLeave;

    if (potentialScore > 180) potentialScore = 100;
    if (potentialScore <= 0) potentialScore = 0;

    // Add variance to setup shot
    const variance = Math.floor(Math.random() * 20) - 10;
    return Math.max(0, Math.min(180, potentialScore + variance));
  }

  /**
   * Generate a normal scoring visit using Box-Muller transform
   * for more realistic normal distribution
   */
  private generateScoringVisit(currentScore: number): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    let score = Math.round(this.level.avg + z * this.level.consistency);

    // Clamp to valid range
    score = Math.max(0, Math.min(180, score));

    // Prevent bust if near finish
    if (currentScore - score <= 1 && currentScore > 40) {
      // Leave a good checkout number
      const idealLeave = this.getIdealLeave();
      if (currentScore > idealLeave) {
        score = currentScore - idealLeave;
      } else {
        score = Math.max(0, currentScore - 40);
      }
    }

    return score;
  }

  /**
   * Get ideal checkout leave based on skill level
   */
  private getIdealLeave(): number {
    // Higher skill bots aim for 32 (D16)
    if (this.level.avg >= 80) {
      return 32;
    }

    // Lower skill bots have more varied leaves
    return GOOD_LEAVES[Math.floor(Math.random() * GOOD_LEAVES.length)];
  }

  /**
   * Get simulated "thinking" delay in ms
   */
  getThinkingDelay(): number {
    // Base delay 800-1200ms, faster for higher level bots
    const baseDelay = 1000;
    const skillModifier = (6 - this.level.id) * 50; // Higher skill = less thinking
    const variance = Math.random() * 400 - 200;

    return Math.max(500, baseDelay + skillModifier + variance);
  }

  /**
   * Generate commentary/reaction based on score
   */
  getReaction(score: number, isCheckout: boolean): string {
    if (isCheckout) {
      const checkoutReactions = ['Checkout!', 'Game shot!', 'Done!'];
      return checkoutReactions[Math.floor(Math.random() * checkoutReactions.length)];
    }

    if (score === 180) return 'Maximum!';
    if (score >= 140) return 'Big score!';
    if (score >= 100) return 'Ton!';
    if (score < 20) return 'Unlucky...';

    return '';
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Find bot level by ID (O(1) lookup)
 */
export function getBotLevelById(id: number): BotLevel | undefined {
  return LEVEL_BY_ID.get(id);
}

/**
 * Find bot level by name (O(1) lookup)
 */
export function getBotLevelByName(name: string): BotLevel | undefined {
  return LEVEL_BY_NAME.get(name);
}

/**
 * Get all bot levels
 */
export function getAllBotLevels(): readonly BotLevel[] {
  return BOT_LEVELS;
}

export default DartsBotEngine;
