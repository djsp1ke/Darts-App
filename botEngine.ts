/**
 * Darts Bot Engine
 * AI opponent with configurable skill levels
 */

export interface BotLevel {
  id: number;
  name: string;
  displayName: string;
  avg: number;           // Target 3-dart average
  checkoutRate: number;  // 0-1 probability of hitting checkout
  consistency: number;   // Standard deviation (lower = more consistent)
}

// Pre-configured bot difficulty levels
export const BOT_LEVELS: BotLevel[] = [
  { 
    id: 1, 
    name: 'beginner', 
    displayName: 'Beginner',
    avg: 30, 
    checkoutRate: 0.05,
    consistency: 30
  },
  { 
    id: 2, 
    name: 'pub_player', 
    displayName: 'Pub Player',
    avg: 45, 
    checkoutRate: 0.15,
    consistency: 28
  },
  { 
    id: 3, 
    name: 'super_league', 
    displayName: 'Super League',
    avg: 60, 
    checkoutRate: 0.30,
    consistency: 25
  },
  { 
    id: 4, 
    name: 'county', 
    displayName: 'County',
    avg: 75, 
    checkoutRate: 0.50,
    consistency: 22
  },
  { 
    id: 5, 
    name: 'pro', 
    displayName: 'Professional',
    avg: 95, 
    checkoutRate: 0.75,
    consistency: 18
  },
  { 
    id: 6, 
    name: 'dartbot_3000', 
    displayName: 'Dartbot 3000',
    avg: 110, 
    checkoutRate: 0.90,
    consistency: 12
  }
];

// Impossible checkouts (can't reach these scores with 3 darts)
const INVALID_CHECKOUTS = [169, 168, 166, 165, 163, 162, 159];

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
    // 1. Check if bot can attempt checkout
    const canCheckout = currentScore <= 170 && !INVALID_CHECKOUTS.includes(currentScore);

    if (canCheckout) {
      return this.attemptCheckout(currentScore);
    }

    // 2. Normal scoring phase
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
   * Generate a normal scoring visit
   */
  private generateScoringVisit(currentScore: number): number {
    // Use Box-Muller transform for normal distribution
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
    const goodLeaves = [32, 40, 36, 24, 16, 20, 8];
    
    // Higher skill bots aim for 32 (D16)
    if (this.level.avg >= 80) {
      return 32;
    }
    
    // Lower skill bots have more varied leaves
    return goodLeaves[Math.floor(Math.random() * goodLeaves.length)];
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
      const checkoutReactions = [
        "Checkout!",
        "Game shot!",
        "💯",
        "Done!"
      ];
      return checkoutReactions[Math.floor(Math.random() * checkoutReactions.length)];
    }

    if (score === 180) {
      return "Maximum! 🎯";
    } else if (score >= 140) {
      return "Big score!";
    } else if (score >= 100) {
      return "Ton!";
    } else if (score < 20) {
      return "Unlucky...";
    }
    
    return "";
  }
}

/**
 * Find bot level by ID
 */
export function getBotLevelById(id: number): BotLevel | undefined {
  return BOT_LEVELS.find(level => level.id === id);
}

/**
 * Find bot level by name
 */
export function getBotLevelByName(name: string): BotLevel | undefined {
  return BOT_LEVELS.find(level => level.name === name);
}

export default DartsBotEngine;
