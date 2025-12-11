-- ============================================================
-- DARTS APP DATABASE SCHEMA (Darts Atlas Style)
-- Complete schema for scoring, tournaments, leagues, online play,
-- organizations, statistics, kiosks, venues, SMS, teams
-- Compatible with PostgreSQL (Supabase recommended)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PLAYERS & PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  rating INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  legs_won INTEGER DEFAULT 0,
  legs_lost INTEGER DEFAULT 0,
  total_average DECIMAL(5,2) DEFAULT 0,
  best_average DECIMAL(5,2) DEFAULT 0,
  best_checkout INTEGER DEFAULT 0,
  total_180s INTEGER DEFAULT 0,
  total_140_plus INTEGER DEFAULT 0,
  total_100_plus INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id)
);

-- ============================================================
-- MATCHES (General)
-- ============================================================

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player1_id UUID REFERENCES players(id),
  player2_id UUID REFERENCES players(id),
  winner_id UUID REFERENCES players(id),
  
  starting_score INTEGER DEFAULT 501,
  match_type VARCHAR(10) DEFAULT 'first_to', -- 'first_to' or 'best_of'
  target_legs INTEGER DEFAULT 3,
  
  player1_legs INTEGER DEFAULT 0,
  player2_legs INTEGER DEFAULT 0,
  
  -- Detailed stats stored as JSONB
  stats JSONB,
  
  status VARCHAR(20) DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- TOURNAMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  format VARCHAR(30) NOT NULL, -- single_elimination, double_elimination, round_robin, swiss, group_stage_knockout
  status VARCHAR(20) DEFAULT 'draft', -- draft, registration_open, registration_closed, in_progress, completed, cancelled
  
  max_players INTEGER NOT NULL,
  min_players INTEGER DEFAULT 2,
  entry_fee DECIMAL(10,2),
  prize_pool DECIMAL(10,2),
  
  legs_per_match INTEGER DEFAULT 3,
  match_type VARCHAR(10) DEFAULT 'first_to',
  starting_score INTEGER DEFAULT 501,
  
  registration_start TIMESTAMP WITH TIME ZONE,
  registration_end TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  
  organizer_id UUID REFERENCES players(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, withdrawn, disqualified
  payment_status VARCHAR(20), -- pending, paid, refunded
  seed INTEGER,
  
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tournament_id, player_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  
  player1_id UUID REFERENCES players(id),
  player2_id UUID REFERENCES players(id),
  winner_id UUID REFERENCES players(id),
  
  player1_legs INTEGER DEFAULT 0,
  player2_legs INTEGER DEFAULT 0,
  
  -- For bracket progression
  next_match_id UUID REFERENCES tournament_matches(id),
  loser_next_match_id UUID REFERENCES tournament_matches(id), -- For double elimination
  
  status VARCHAR(20) DEFAULT 'pending', -- pending, ready, in_progress, completed, bye
  scheduled_time TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  stats JSONB,
  
  UNIQUE(tournament_id, round, match_number)
);

-- ============================================================
-- LEAGUES
-- ============================================================

CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  type VARCHAR(20) DEFAULT 'seasonal', -- weekly, monthly, seasonal
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, completed
  
  max_players INTEGER,
  matches_per_week INTEGER DEFAULT 2,
  
  points_for_win INTEGER DEFAULT 3,
  points_for_draw INTEGER DEFAULT 1,
  points_for_loss INTEGER DEFAULT 0,
  
  legs_per_match INTEGER DEFAULT 5,
  match_type VARCHAR(10) DEFAULT 'first_to',
  starting_score INTEGER DEFAULT 501,
  
  start_date DATE,
  end_date DATE,
  current_week INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS league_standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  
  position INTEGER DEFAULT 0,
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  
  legs_for INTEGER DEFAULT 0,
  legs_against INTEGER DEFAULT 0,
  leg_difference INTEGER DEFAULT 0,
  
  points INTEGER DEFAULT 0,
  
  -- Stats
  average DECIMAL(5,2) DEFAULT 0,
  highest_checkout INTEGER DEFAULT 0,
  total_180s INTEGER DEFAULT 0,
  
  UNIQUE(league_id, player_id)
);

CREATE TABLE IF NOT EXISTS league_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  
  home_player_id UUID REFERENCES players(id),
  away_player_id UUID REFERENCES players(id),
  
  home_legs INTEGER DEFAULT 0,
  away_legs INTEGER DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, in_progress, completed, postponed
  scheduled_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  stats JSONB
);

-- ============================================================
-- ONLINE PLAY
-- ============================================================

CREATE TABLE IF NOT EXISTS online_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  
  host_id UUID REFERENCES players(id),
  guest_id UUID REFERENCES players(id),
  
  status VARCHAR(20) DEFAULT 'waiting', -- waiting, ready, in_progress, completed
  
  starting_score INTEGER DEFAULT 501,
  legs_to_win INTEGER DEFAULT 3,
  match_type VARCHAR(10) DEFAULT 'first_to',
  
  host_stream_enabled BOOLEAN DEFAULT false,
  guest_stream_enabled BOOLEAN DEFAULT false,
  spectators_allowed BOOLEAN DEFAULT true,
  
  current_player VARCHAR(10) DEFAULT 'host', -- 'host' or 'guest'
  host_score INTEGER,
  guest_score INTEGER,
  host_legs INTEGER DEFAULT 0,
  guest_legs INTEGER DEFAULT 0,
  
  stats JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS spectators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES online_matches(id) ON DELETE CASCADE,
  user_id UUID,
  display_name VARCHAR(100),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SIGNALING FOR WEBRTC
-- ============================================================

CREATE TABLE IF NOT EXISTS webrtc_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES online_matches(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  signal_type VARCHAR(20) NOT NULL, -- 'offer', 'answer', 'ice-candidate'
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT false
);

-- ============================================================
-- MATCH HISTORY & THROWS (Optional detailed tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS match_legs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL, -- Can reference matches, tournament_matches, league_matches, or online_matches
  leg_number INTEGER NOT NULL,
  winner_id UUID REFERENCES players(id),
  
  player1_darts INTEGER,
  player2_darts INTEGER,
  
  player1_average DECIMAL(5,2),
  player2_average DECIMAL(5,2),
  
  checkout_score INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS throws (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leg_id UUID REFERENCES match_legs(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  
  throw_number INTEGER NOT NULL,
  score INTEGER NOT NULL,
  remaining_after INTEGER NOT NULL,
  
  -- Individual dart tracking (optional)
  dart1 VARCHAR(10), -- e.g., 'T20', 'S19', 'D16', 'Bull'
  dart2 VARCHAR(10),
  dart3 VARCHAR(10),
  
  is_checkout BOOLEAN DEFAULT false,
  is_bust BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament ON tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_player ON tournament_registrations(player_id);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(tournament_id, round);

CREATE INDEX IF NOT EXISTS idx_leagues_status ON leagues(status);

CREATE INDEX IF NOT EXISTS idx_league_standings_league ON league_standings(league_id);
CREATE INDEX IF NOT EXISTS idx_league_standings_position ON league_standings(league_id, position);

CREATE INDEX IF NOT EXISTS idx_league_matches_league ON league_matches(league_id);
CREATE INDEX IF NOT EXISTS idx_league_matches_week ON league_matches(league_id, week);

CREATE INDEX IF NOT EXISTS idx_online_matches_room_code ON online_matches(room_code);
CREATE INDEX IF NOT EXISTS idx_online_matches_status ON online_matches(status);
CREATE INDEX IF NOT EXISTS idx_online_matches_host ON online_matches(host_id);

CREATE INDEX IF NOT EXISTS idx_spectators_match ON spectators(match_id);

CREATE INDEX IF NOT EXISTS idx_webrtc_signals_match ON webrtc_signals(match_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_to_user ON webrtc_signals(to_user_id, processed);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
    BEFORE UPDATE ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leagues_updated_at
    BEFORE UPDATE ON leagues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (For Supabase)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectators ENABLE ROW LEVEL SECURITY;

-- Example policies (adjust based on your auth setup)

-- Players: Public read, authenticated write own
CREATE POLICY "Players are viewable by everyone" ON players
    FOR SELECT USING (true);

CREATE POLICY "Users can update own player profile" ON players
    FOR UPDATE USING (auth.uid() = id);

-- Tournaments: Public read
CREATE POLICY "Tournaments are viewable by everyone" ON tournaments
    FOR SELECT USING (true);

-- Online matches: Public read for spectating
CREATE POLICY "Online matches are viewable by everyone" ON online_matches
    FOR SELECT USING (true);

-- Add more policies as needed...

-- ============================================================
-- ORGANIZATIONS (Darts Atlas Style)
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  website VARCHAR(255),
  
  email VARCHAR(255),
  phone VARCHAR(50),
  
  country VARCHAR(100) NOT NULL,
  region VARCHAR(100),
  city VARCHAR(100),
  
  membership_required BOOLEAN DEFAULT false,
  membership_fee DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'GBP',
  
  facebook_url VARCHAR(255),
  twitter_url VARCHAR(255),
  instagram_url VARCHAR(255),
  youtube_url VARCHAR(255),
  
  member_count INTEGER DEFAULT 0,
  tournament_count INTEGER DEFAULT 0,
  
  verified BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  
  role VARCHAR(20) DEFAULT 'member',
  
  paid BOOLEAN DEFAULT false,
  payment_date TIMESTAMP WITH TIME ZONE,
  expiry_date TIMESTAMP WITH TIME ZONE,
  
  member_number VARCHAR(50),
  nickname VARCHAR(100),
  
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, player_id)
);

CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  
  invited_by UUID REFERENCES players(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ADVANCED STATISTICS
-- ============================================================

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

CREATE TABLE IF NOT EXISTS player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id),
  achievement_code VARCHAR(50),
  
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  match_id UUID,
  
  UNIQUE(player_id, achievement_id)
);

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

-- ============================================================
-- VENUES & KIOSK
-- ============================================================

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

CREATE TABLE IF NOT EXISTS score_codes (
  code VARCHAR(10) PRIMARY KEY,
  match_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- ============================================================
-- SMS & TEAMS
-- ============================================================

CREATE TABLE IF NOT EXISTS sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id),
  phone_number VARCHAR(20) NOT NULL,
  
  type VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending',
  
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add phone fields to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE players ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  
  player1_id UUID REFERENCES players(id) NOT NULL,
  player2_id UUID REFERENCES players(id) NOT NULL,
  player3_id UUID REFERENCES players(id),
  player4_id UUID REFERENCES players(id),
  captain_id UUID REFERENCES players(id),
  
  organization_id UUID REFERENCES organizations(id),
  league_id UUID,
  
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  average DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doubles_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  team1_id UUID REFERENCES teams(id) NOT NULL,
  team2_id UUID REFERENCES teams(id) NOT NULL,
  
  team1_legs INTEGER DEFAULT 0,
  team2_legs INTEGER DEFAULT 0,
  
  team1_current_thrower INTEGER DEFAULT 1,
  team2_current_thrower INTEGER DEFAULT 1,
  current_team INTEGER DEFAULT 1,
  
  team1_player1_stats JSONB,
  team1_player2_stats JSONB,
  team2_player1_stats JSONB,
  team2_player2_stats JSONB,
  
  starting_score INTEGER DEFAULT 501,
  target_legs INTEGER DEFAULT 3,
  match_type VARCHAR(10) DEFAULT 'first_to',
  
  status VARCHAR(20) DEFAULT 'pending',
  winner_team_id UUID REFERENCES teams(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ADDITIONAL INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_country ON organizations(country);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_player ON memberships(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_rating ON player_lifetime_stats(rating DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_average ON player_lifetime_stats(career_average DESC);
CREATE INDEX IF NOT EXISTS idx_match_stats_player ON match_statistics(player_id);
CREATE INDEX IF NOT EXISTS idx_venues_slug ON venues(slug);
CREATE INDEX IF NOT EXISTS idx_venues_country ON venues(country);
CREATE INDEX IF NOT EXISTS idx_kiosk_boards_venue ON kiosk_boards(venue_id);
CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organization_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION increment_member_count(org_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE organizations SET member_count = member_count + 1 WHERE id = org_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_member_count(org_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE organizations SET member_count = GREATEST(0, member_count - 1) WHERE id = org_id;
END;
$$ LANGUAGE plpgsql;
