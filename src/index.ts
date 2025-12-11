/**
 * Darts Scoring Package
 * Complete darts scoring system with tournament management, online play, and React components
 *
 * @packageDocumentation
 */

// ==================== SCORING MODULE ====================
export {
  DartsScoringEngine,
  DartsBotEngine,
  BOT_LEVELS,
  formatAverage,
  calculateFirst9Average,
  isValidCheckout,
  calculateCheckoutPercentage,
  getBotLevelById,
  getBotLevelByName,
  getAllBotLevels,
  type PlayerState,
  type ThrowResult,
  type BotLevel
} from './scoring';

// ==================== COMPONENTS MODULE ====================
export {
  Button,
  ScoreDisplay,
  Keypad,
  InputDisplay,
  ThrowHistory,
  MatchStats,
  Modal,
  ScoreCardInput,
  CheckoutSuggestion,
  ScoreboardHorizontal,
  ScoreboardTV,
  ScoreboardDualCam,
  LastThrowWidget,
  MatchStatsWidget,
  OBS_WIDGET_CONFIGS,
  getOBSWidgetConfig,
  type BroadcastConfig,
  type BroadcastPlayer,
  type BroadcastMatchState,
  type WidgetType,
  type WidgetConfig
} from './components';

// ==================== STYLES MODULE ====================
export {
  colors,
  typography,
  tailwindExtend,
  styles,
  buttonVariants,
  buttonSizes,
  utilities,
  cssVariables,
  fontImport,
  theme
} from './styles';

// ==================== ONLINE MODULE ====================
export {
  CameraStreamManager,
  WebRTCPeer,
  OnlineMatchService,
  SpectatorStreamManager,
  DEFAULT_ICE_SERVERS,
  STREAM_QUALITY_PRESETS,
  type OnlineMatch,
  type Spectator,
  type StreamConfig,
  type ICEServer
} from './online';

// ==================== SERVICES MODULE ====================
export {
  TournamentService,
  LeagueService,
  StatisticsService,
  OrganizationService,
  SMSService,
  TeamService,
  TwilioSMSProvider,
  MockSMSProvider,
  KioskService,
  VenueService,
  BroadcastService,
  ACHIEVEMENTS,
  KIOSK_MENU_OPTIONS,
  OBS_SCRIPT_TEMPLATE,
  type Tournament,
  type TournamentFormat,
  type TournamentStatus,
  type TournamentRegistration,
  type TournamentMatch,
  type League,
  type LeagueType,
  type LeagueStanding,
  type LeagueMatch,
  type PlayerLifetimeStats,
  type FormatStats,
  type CricketStats,
  type MatchStatistics,
  type Ranking,
  type Achievement,
  type PlayerAchievement,
  type Organization,
  type MembershipRole,
  type Membership,
  type OrganizationInvite,
  type SMSNotification,
  type SMSTemplate,
  type SMSProvider,
  type Team,
  type DoublesMatch,
  type Venue,
  type VenueHours,
  type KioskBoard,
  type KioskSession,
  type ScoreCode,
  type KioskState
} from './services';

// ==================== CONSTANTS ====================
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
  CODE_CHARACTERS,
  DEFAULT_CODE_LENGTH,
  ELO_K_FACTOR,
  DEFAULT_RATING,
  MIN_MATCHES_FOR_RANKING,
  generateCode,
  getCheckoutSuggestion,
  generateSlug
} from './constants';

// ==================== TYPES ====================
export type {
  Player,
  PlayerStats,
  MatchConfig,
  MatchStats as MatchStatsType,
  BaseMatch,
  DatabaseClient,
  DatabaseQueryBuilder,
  RealtimeChannel,
  MatchStatus,
  TournamentStatus as TournamentStatusType,
  LeagueStatus,
  WithTimestamps,
  Optional
} from './types';
