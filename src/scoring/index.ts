/**
 * Scoring Module
 * Core game logic for darts scoring
 */

export {
  DartsScoringEngine,
  formatAverage,
  calculateFirst9Average,
  isValidCheckout,
  calculateCheckoutPercentage,
  type PlayerState,
  type ThrowResult
} from './scoringEngine';

export {
  DartsBotEngine,
  BOT_LEVELS,
  getBotLevelById,
  getBotLevelByName,
  getAllBotLevels,
  type BotLevel
} from './botEngine';

// Re-export constants used by scoring
export {
  VALID_CHECKOUTS,
  INVALID_CHECKOUTS,
  CHECKOUT_TABLE,
  MAX_SCORE,
  MIN_CHECKOUT,
  MAX_CHECKOUT,
  STARTING_SCORES,
  DEFAULT_MATCH_CONFIG,
  INITIAL_MATCH_STATS,
  getCheckoutSuggestion
} from '../constants';
