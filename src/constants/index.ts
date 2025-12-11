/**
 * Shared Constants for Darts Scoring Package
 * Reduces duplication and improves maintainability
 */

// ==================== VALID CHECKOUTS ====================

/**
 * All scores that can be checked out (finished on a double)
 * Pre-computed Set for O(1) lookup performance
 */
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

/**
 * Impossible checkout scores (can't finish with 3 darts)
 * Using frozen array for immutability
 */
export const INVALID_CHECKOUTS: readonly number[] = Object.freeze([
  159, 162, 163, 165, 166, 168, 169
]);

// ==================== CHECKOUT SUGGESTIONS ====================

/**
 * Common checkout combinations
 * Frozen object for immutability and performance
 */
export const CHECKOUT_TABLE: Readonly<Record<number, string>> = Object.freeze({
  170: 'T20 T20 Bull',
  167: 'T20 T19 Bull',
  164: 'T20 T18 Bull',
  161: 'T20 T17 Bull',
  160: 'T20 T20 D20',
  158: 'T20 T20 D19',
  157: 'T20 T19 D20',
  156: 'T20 T20 D18',
  155: 'T20 T19 D19',
  154: 'T20 T18 D20',
  153: 'T20 T19 D18',
  152: 'T20 T20 D16',
  151: 'T20 T17 D20',
  150: 'T20 T18 D18',
  148: 'T20 T20 D14',
  147: 'T20 T17 D18',
  146: 'T20 T18 D16',
  145: 'T20 T15 D20',
  144: 'T20 T20 D12',
  143: 'T20 T17 D16',
  142: 'T20 T14 D20',
  141: 'T20 T19 D12',
  140: 'T20 T20 D10',
  139: 'T19 T14 D20',
  138: 'T20 T18 D12',
  137: 'T20 T19 D10',
  136: 'T20 T20 D8',
  135: 'T20 T17 D12',
  134: 'T20 T14 D16',
  133: 'T20 T19 D8',
  132: 'T20 T16 D12',
  131: 'T20 T13 D16',
  130: 'T20 T18 D8',
  129: 'T19 T16 D12',
  128: 'T18 T14 D16',
  127: 'T20 T17 D8',
  126: 'T19 T19 D6',
  125: 'T18 T19 D7',
  124: 'T20 T14 D11',
  123: 'T19 T16 D9',
  122: 'T18 T18 D7',
  121: 'T17 T10 D20',
  120: 'T20 S20 D20',
  119: 'T19 T12 D13',
  118: 'T20 S18 D20',
  117: 'T20 S17 D20',
  116: 'T20 S16 D20',
  115: 'T19 S18 D20',
  114: 'T20 S14 D20',
  113: 'T19 S16 D20',
  112: 'T20 S12 D20',
  111: 'T19 S14 D20',
  110: 'T20 S10 D20',
  109: 'T19 S12 D20',
  108: 'T20 S8 D20',
  107: 'T19 S10 D20',
  106: 'T20 S6 D20',
  105: 'T19 S8 D20',
  104: 'T18 S10 D20',
  103: 'T19 S6 D20',
  102: 'T20 S10 D16',
  101: 'T17 S10 D20',
  100: 'T20 D20',
  99: 'T19 S10 D16',
  98: 'T20 D19',
  97: 'T19 D20',
  96: 'T20 D18',
  95: 'T19 D19',
  94: 'T18 D20',
  93: 'T19 D18',
  92: 'T20 D16',
  91: 'T17 D20',
  90: 'T18 D18',
  89: 'T19 D16',
  88: 'T20 D14',
  87: 'T17 D18',
  86: 'T18 D16',
  85: 'T15 D20',
  84: 'T20 D12',
  83: 'T17 D16',
  82: 'T14 D20',
  81: 'T19 D12',
  80: 'T20 D10',
  79: 'T19 D11',
  78: 'T18 D12',
  77: 'T19 D10',
  76: 'T20 D8',
  75: 'T17 D12',
  74: 'T14 D16',
  73: 'T19 D8',
  72: 'T16 D12',
  71: 'T13 D16',
  70: 'T18 D8',
  69: 'T19 D6',
  68: 'T20 D4',
  67: 'T17 D8',
  66: 'T10 D18',
  65: 'T19 D4',
  64: 'T16 D8',
  63: 'T13 D12',
  62: 'T10 D16',
  61: 'T15 D8',
  60: 'S20 D20',
  59: 'S19 D20',
  58: 'S18 D20',
  57: 'S17 D20',
  56: 'T16 D4',
  55: 'S15 D20',
  54: 'S14 D20',
  53: 'S13 D20',
  52: 'S12 D20',
  51: 'S11 D20',
  50: 'S10 D20',
  49: 'S9 D20',
  48: 'S8 D20',
  47: 'S7 D20',
  46: 'S6 D20',
  45: 'S13 D16',
  44: 'S4 D20',
  43: 'S3 D20',
  42: 'S10 D16',
  41: 'S9 D16',
  40: 'D20',
  38: 'D19',
  36: 'D18',
  34: 'D17',
  32: 'D16',
  30: 'D15',
  28: 'D14',
  26: 'D13',
  24: 'D12',
  22: 'D11',
  20: 'D10',
  18: 'D9',
  16: 'D8',
  14: 'D7',
  12: 'D6',
  10: 'D5',
  8: 'D4',
  6: 'D3',
  4: 'D2',
  2: 'D1'
});

// ==================== SCORING CONSTANTS ====================

export const MAX_SCORE = 180;
export const MIN_CHECKOUT = 2;
export const MAX_CHECKOUT = 170;

export const STARTING_SCORES = [501, 301, 170, 121] as const;
export type StartingScore = typeof STARTING_SCORES[number];

// ==================== MATCH DEFAULTS ====================

export const DEFAULT_MATCH_CONFIG = {
  startingScore: 501,
  matchType: 'first_to',
  targetLegs: 3,
  doubleOut: true,
  doubleIn: false
} as const;

// ==================== ROOM CODE GENERATION ====================

/**
 * Characters for room/score code generation
 * Excludes confusing characters (0, O, I, 1, L)
 */
export const CODE_CHARACTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const DEFAULT_CODE_LENGTH = 6;

/**
 * Generate a random code
 */
export function generateCode(length: number = DEFAULT_CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARACTERS.charAt(Math.floor(Math.random() * CODE_CHARACTERS.length));
  }
  return code;
}

// ==================== INITIAL STATS ====================

export const INITIAL_MATCH_STATS = Object.freeze({
  scores_65_plus: 0,
  scores_90_plus: 0,
  scores_100_plus: 0,
  scores_140_plus: 0,
  scores_170_plus: 0,
  scores_180: 0,
  best_leg: null,
  average: 0
});

// ==================== RATING CONSTANTS ====================

export const ELO_K_FACTOR = 32;
export const DEFAULT_RATING = 1000;
export const MIN_MATCHES_FOR_RANKING = 5;

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if a score is a valid checkout
 */
export function isValidCheckout(score: number): boolean {
  return VALID_CHECKOUTS.has(score);
}

/**
 * Get checkout suggestion for a score
 */
export function getCheckoutSuggestion(score: number): string | null {
  return CHECKOUT_TABLE[score] ?? null;
}

/**
 * Generate a URL-friendly slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).substring(2, 6);
}
