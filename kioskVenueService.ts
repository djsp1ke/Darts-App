/**
 * Kiosk Mode & Venues System
 * Public tablet scoring, venue management like Darts Atlas
 */

// ==================== TYPES ====================

export interface Venue {
  id: string;
  name: string;
  slug: string;
  
  // Location
  address: string;
  city: string;
  region?: string;
  country: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  
  // Contact
  phone?: string;
  email?: string;
  website?: string;
  
  // Details
  description?: string;
  photo_url?: string;
  banner_url?: string;
  
  // Facilities
  board_count: number;
  board_type?: 'steel' | 'soft' | 'both';
  has_lighting: boolean;
  has_oche: boolean;
  
  // Hours
  opening_hours?: VenueHours;
  
  // Association
  organization_id?: string;
  owner_id?: string;
  
  // Settings
  is_managed: boolean;       // Paid venue subscription
  is_verified: boolean;
  allows_public_play: boolean;
  
  // Stats
  total_matches: number;
  total_tournaments: number;
  
  created_at: string;
  updated_at: string;
}

export interface VenueHours {
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  wednesday?: { open: string; close: string };
  thursday?: { open: string; close: string };
  friday?: { open: string; close: string };
  saturday?: { open: string; close: string };
  sunday?: { open: string; close: string };
}

export interface KioskBoard {
  id: string;
  venue_id?: string;
  
  board_number: number;
  name?: string;
  
  // Current state
  status: 'available' | 'in_use' | 'reserved' | 'offline';
  current_match_id?: string;
  current_event_id?: string;
  
  // Config
  event_mode: boolean;        // Locked to event matches only
  auto_advance: boolean;      // Auto-load next match
  
  // Connection
  device_id?: string;
  last_ping?: string;
  
  created_at: string;
}

export interface KioskSession {
  id: string;
  board_id: string;
  
  // Auth
  player_id?: string;         // Logged in player
  guest_name?: string;        // Guest mode
  
  // Match
  match_id?: string;
  score_code?: string;        // 6-digit code to access match
  
  started_at: string;
  ended_at?: string;
}

export interface ScoreCode {
  code: string;
  match_id: string;
  expires_at: string;
  used: boolean;
}

// ==================== KIOSK SERVICE ====================

export class KioskService {
  private db: any;

  constructor(dbClient: any) {
    this.db = dbClient;
  }

  // ---- Board Management ----

  async registerBoard(venueId: string, boardNumber: number): Promise<KioskBoard> {
    const { data, error } = await this.db
      .from('kiosk_boards')
      .insert([{
        venue_id: venueId,
        board_number: boardNumber,
        status: 'available',
        event_mode: false,
        auto_advance: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getVenueBoards(venueId: string): Promise<KioskBoard[]> {
    const { data, error } = await this.db
      .from('kiosk_boards')
      .select('*')
      .eq('venue_id', venueId)
      .order('board_number');

    if (error) throw error;
    return data || [];
  }

  async updateBoardStatus(
    boardId: string,
    status: KioskBoard['status'],
    matchId?: string
  ): Promise<void> {
    await this.db
      .from('kiosk_boards')
      .update({
        status,
        current_match_id: matchId || null,
        last_ping: new Date().toISOString()
      })
      .eq('id', boardId);
  }

  async assignMatchToBoard(boardId: string, matchId: string): Promise<void> {
    await this.db
      .from('kiosk_boards')
      .update({
        status: 'in_use',
        current_match_id: matchId,
        last_ping: new Date().toISOString()
      })
      .eq('id', boardId);
  }

  async clearBoard(boardId: string): Promise<void> {
    await this.db
      .from('kiosk_boards')
      .update({
        status: 'available',
        current_match_id: null
      })
      .eq('id', boardId);
  }

  async setBoardEventMode(boardId: string, eventId: string | null): Promise<void> {
    await this.db
      .from('kiosk_boards')
      .update({
        event_mode: !!eventId,
        current_event_id: eventId
      })
      .eq('id', boardId);
  }

  // ---- Score Codes ----

  async generateScoreCode(matchId: string): Promise<string> {
    const code = this.generateCode(6);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.db
      .from('score_codes')
      .insert([{
        code,
        match_id: matchId,
        expires_at: expiresAt.toISOString(),
        used: false
      }]);

    return code;
  }

  async validateScoreCode(code: string): Promise<{ valid: boolean; matchId?: string }> {
    const { data } = await this.db
      .from('score_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!data) {
      return { valid: false };
    }

    return { valid: true, matchId: data.match_id };
  }

  async useScoreCode(code: string): Promise<string | null> {
    const result = await this.validateScoreCode(code);
    if (!result.valid) return null;

    await this.db
      .from('score_codes')
      .update({ used: true })
      .eq('code', code.toUpperCase());

    return result.matchId!;
  }

  private generateCode(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ---- Kiosk Sessions ----

  async startKioskSession(boardId: string, options: {
    playerId?: string;
    guestName?: string;
    matchId?: string;
  }): Promise<KioskSession> {
    const { data, error } = await this.db
      .from('kiosk_sessions')
      .insert([{
        board_id: boardId,
        player_id: options.playerId,
        guest_name: options.guestName,
        match_id: options.matchId,
        started_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Update board status
    await this.updateBoardStatus(boardId, 'in_use', options.matchId);

    return data;
  }

  async endKioskSession(sessionId: string): Promise<void> {
    const { data: session } = await this.db
      .from('kiosk_sessions')
      .select('board_id')
      .eq('id', sessionId)
      .single();

    await this.db
      .from('kiosk_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (session) {
      await this.clearBoard(session.board_id);
    }
  }

  // ---- Quick Match (Walk-up Play) ----

  async createQuickMatch(boardId: string, players: {
    player1: { id?: string; name: string };
    player2: { id?: string; name: string };
  }, settings: {
    startingScore: number;
    legsToWin: number;
    matchType: 'first_to' | 'best_of';
  }): Promise<{ matchId: string; scoreCode: string }> {
    // Create match
    const { data: match, error } = await this.db
      .from('matches')
      .insert([{
        player1_id: players.player1.id,
        player2_id: players.player2.id,
        player1_name: players.player1.name,
        player2_name: players.player2.name,
        starting_score: settings.startingScore,
        legs_to_win: settings.legsToWin,
        match_type: settings.matchType,
        status: 'in_progress',
        source: 'kiosk',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Generate score code
    const scoreCode = await this.generateScoreCode(match.id);

    // Assign to board
    await this.assignMatchToBoard(boardId, match.id);

    return { matchId: match.id, scoreCode };
  }
}

// ==================== VENUE SERVICE ====================

export class VenueService {
  private db: any;

  constructor(dbClient: any) {
    this.db = dbClient;
  }

  // ---- Venue CRUD ----

  async createVenue(data: Partial<Venue>, ownerId: string): Promise<Venue> {
    const slug = this.generateSlug(data.name || 'venue');

    const { data: venue, error } = await this.db
      .from('venues')
      .insert([{
        ...data,
        slug,
        owner_id: ownerId,
        is_managed: false,
        is_verified: false,
        allows_public_play: true,
        total_matches: 0,
        total_tournaments: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return venue;
  }

  async getVenue(idOrSlug: string): Promise<Venue | null> {
    let { data } = await this.db
      .from('venues')
      .select('*')
      .eq('id', idOrSlug)
      .single();

    if (!data) {
      const result = await this.db
        .from('venues')
        .select('*')
        .eq('slug', idOrSlug)
        .single();
      data = result.data;
    }

    return data;
  }

  async updateVenue(id: string, updates: Partial<Venue>): Promise<Venue> {
    const { data, error } = await this.db
      .from('venues')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async searchVenues(params: {
    query?: string;
    city?: string;
    country?: string;
    near?: { lat: number; lng: number; radius: number };
    limit?: number;
    offset?: number;
  }): Promise<Venue[]> {
    let query = this.db.from('venues').select('*');

    if (params.query) {
      query = query.or(`name.ilike.%${params.query}%,city.ilike.%${params.query}%`);
    }
    if (params.city) {
      query = query.ilike('city', `%${params.city}%`);
    }
    if (params.country) {
      query = query.eq('country', params.country);
    }
    if (params.near) {
      // PostGIS query for nearby venues
      query = query.rpc('venues_near', {
        lat: params.near.lat,
        lng: params.near.lng,
        radius_km: params.near.radius
      });
    }

    query = query
      .order('is_verified', { ascending: false })
      .order('is_managed', { ascending: false })
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 20) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getVenuesByOrganization(orgId: string): Promise<Venue[]> {
    const { data, error } = await this.db
      .from('venues')
      .select('*')
      .eq('organization_id', orgId)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async getUpcomingEvents(venueId: string, limit = 10): Promise<any[]> {
    const { data, error } = await this.db
      .from('tournaments')
      .select('*')
      .eq('venue_id', venueId)
      .gte('start_date', new Date().toISOString())
      .order('start_date')
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // ---- Managed Venue Features ----

  async activateManaged(venueId: string): Promise<void> {
    await this.db
      .from('venues')
      .update({ is_managed: true })
      .eq('id', venueId);
  }

  async verifyVenue(venueId: string): Promise<void> {
    await this.db
      .from('venues')
      .update({ is_verified: true })
      .eq('id', venueId);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 6);
  }
}

// ==================== KIOSK UI STATE ====================

export interface KioskState {
  mode: 'menu' | 'login' | 'match' | 'quick_play' | 'score_code' | 'event';
  board?: KioskBoard;
  session?: KioskSession;
  currentMatch?: any;
  eventId?: string;
}

export const KIOSK_MENU_OPTIONS = [
  { id: 'score_code', label: 'Score a Match', icon: '🎯', description: 'Enter your match score code' },
  { id: 'quick_play', label: 'Quick Play', icon: '⚡', description: 'Start a casual match' },
  { id: 'login', label: 'Player Login', icon: '👤', description: 'Sign in to your account' },
  { id: 'event', label: 'Event Mode', icon: '🏆', description: 'Tournament/League play' },
];

// ==================== DATABASE SCHEMA ====================

export const KIOSK_VENUE_SCHEMA = `
-- Venues table
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  
  address TEXT,
  city VARCHAR(100),
  region VARCHAR(100),
  country VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  
  description TEXT,
  photo_url TEXT,
  banner_url TEXT,
  
  board_count INTEGER DEFAULT 0,
  board_type VARCHAR(10),
  has_lighting BOOLEAN DEFAULT false,
  has_oche BOOLEAN DEFAULT false,
  
  opening_hours JSONB,
  
  organization_id UUID REFERENCES organizations(id),
  owner_id UUID REFERENCES players(id),
  
  is_managed BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  allows_public_play BOOLEAN DEFAULT true,
  
  total_matches INTEGER DEFAULT 0,
  total_tournaments INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kiosk boards
CREATE TABLE IF NOT EXISTS kiosk_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  
  board_number INTEGER NOT NULL,
  name VARCHAR(100),
  
  status VARCHAR(20) DEFAULT 'available',
  current_match_id UUID,
  current_event_id UUID,
  
  event_mode BOOLEAN DEFAULT false,
  auto_advance BOOLEAN DEFAULT true,
  
  device_id VARCHAR(100),
  last_ping TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(venue_id, board_number)
);

-- Score codes
CREATE TABLE IF NOT EXISTS score_codes (
  code VARCHAR(10) PRIMARY KEY,
  match_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kiosk sessions
CREATE TABLE IF NOT EXISTS kiosk_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES kiosk_boards(id),
  
  player_id UUID REFERENCES players(id),
  guest_name VARCHAR(100),
  
  match_id UUID,
  score_code VARCHAR(10),
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_venues_slug ON venues(slug);
CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_country ON venues(country);
CREATE INDEX IF NOT EXISTS idx_venues_location ON venues(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_kiosk_boards_venue ON kiosk_boards(venue_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_boards_status ON kiosk_boards(status);
CREATE INDEX IF NOT EXISTS idx_score_codes_match ON score_codes(match_id);

-- PostGIS function for nearby venues (optional, requires PostGIS extension)
CREATE OR REPLACE FUNCTION venues_near(lat DECIMAL, lng DECIMAL, radius_km INTEGER)
RETURNS SETOF venues AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM venues
  WHERE ST_DWithin(
    ST_MakePoint(longitude, latitude)::geography,
    ST_MakePoint(lng, lat)::geography,
    radius_km * 1000
  )
  ORDER BY ST_Distance(
    ST_MakePoint(longitude, latitude)::geography,
    ST_MakePoint(lng, lat)::geography
  );
END;
$$ LANGUAGE plpgsql;
`;

export default { KioskService, VenueService };
