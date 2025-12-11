/**
 * Tournament & League System
 * Complete signup, bracket generation, and management
 */

// ==================== TYPES ====================

export interface Player {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  rating?: number;          // ELO or similar rating
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

export type TournamentFormat = 
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'swiss'
  | 'group_stage_knockout';

export type TournamentStatus = 
  | 'draft'
  | 'registration_open'
  | 'registration_closed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  format: TournamentFormat;
  status: TournamentStatus;
  
  // Settings
  max_players: number;
  min_players: number;
  entry_fee?: number;
  prize_pool?: number;
  
  // Match settings
  legs_per_match: number;
  match_type: 'first_to' | 'best_of';
  starting_score: number;
  
  // Dates
  registration_start: string;
  registration_end: string;
  start_date: string;
  end_date?: string;
  
  // Organizer
  organizer_id: string;
  created_at: string;
  updated_at: string;
}

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  player_id: string;
  registered_at: string;
  seed?: number;
  status: 'pending' | 'confirmed' | 'withdrawn' | 'disqualified';
  payment_status?: 'pending' | 'paid' | 'refunded';
  player?: Player;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  
  player1_id?: string;
  player2_id?: string;
  winner_id?: string;
  
  player1_legs: number;
  player2_legs: number;
  
  // For bracket progression
  next_match_id?: string;
  loser_next_match_id?: string;  // For double elimination
  
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'bye';
  scheduled_time?: string;
  completed_at?: string;
  
  // Match stats
  stats?: {
    player1: any;
    player2: any;
  };
}

// ==================== LEAGUE TYPES ====================

export type LeagueType = 'weekly' | 'monthly' | 'seasonal';

export interface League {
  id: string;
  name: string;
  description?: string;
  type: LeagueType;
  
  // Settings
  max_players?: number;
  matches_per_week: number;
  points_for_win: number;
  points_for_draw: number;
  points_for_loss: number;
  
  // Match settings
  legs_per_match: number;
  match_type: 'first_to' | 'best_of';
  starting_score: number;
  
  // Dates
  start_date: string;
  end_date: string;
  
  // Status
  status: 'draft' | 'active' | 'completed';
  current_week?: number;
  
  created_at: string;
  updated_at: string;
}

export interface LeagueStanding {
  player_id: string;
  league_id: string;
  player?: Player;
  
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  legs_for: number;
  legs_against: number;
  leg_difference: number;
  points: number;
  
  // Stats
  average: number;
  highest_checkout: number;
  total_180s: number;
}

export interface LeagueMatch {
  id: string;
  league_id: string;
  week: number;
  
  home_player_id: string;
  away_player_id: string;
  
  home_legs: number;
  away_legs: number;
  
  status: 'scheduled' | 'in_progress' | 'completed' | 'postponed';
  scheduled_date?: string;
  completed_at?: string;
  
  stats?: any;
}

// ==================== TOURNAMENT SERVICE ====================

export class TournamentService {
  private db: any; // Your database client (Supabase, etc.)

  constructor(dbClient: any) {
    this.db = dbClient;
  }

  // ---- Tournament CRUD ----

  async createTournament(data: Partial<Tournament>): Promise<Tournament> {
    const { data: tournament, error } = await this.db
      .from('tournaments')
      .insert([{
        ...data,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return tournament;
  }

  async getTournament(id: string): Promise<Tournament | null> {
    const { data, error } = await this.db
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  }

  async listTournaments(status?: TournamentStatus): Promise<Tournament[]> {
    let query = this.db.from('tournaments').select('*');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query.order('start_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async updateTournamentStatus(id: string, status: TournamentStatus): Promise<void> {
    await this.db
      .from('tournaments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  // ---- Registration ----

  async registerPlayer(tournamentId: string, playerId: string): Promise<TournamentRegistration> {
    // Check tournament is open for registration
    const tournament = await this.getTournament(tournamentId);
    if (!tournament || tournament.status !== 'registration_open') {
      throw new Error('Tournament is not open for registration');
    }

    // Check player count
    const { count } = await this.db
      .from('tournament_registrations')
      .select('*', { count: 'exact' })
      .eq('tournament_id', tournamentId)
      .eq('status', 'confirmed');

    if (count && count >= tournament.max_players) {
      throw new Error('Tournament is full');
    }

    // Check if already registered
    const { data: existing } = await this.db
      .from('tournament_registrations')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('player_id', playerId)
      .single();

    if (existing) {
      throw new Error('Already registered for this tournament');
    }

    // Register
    const { data, error } = await this.db
      .from('tournament_registrations')
      .insert([{
        tournament_id: tournamentId,
        player_id: playerId,
        status: tournament.entry_fee ? 'pending' : 'confirmed',
        payment_status: tournament.entry_fee ? 'pending' : undefined,
        registered_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async withdrawRegistration(tournamentId: string, playerId: string): Promise<void> {
    await this.db
      .from('tournament_registrations')
      .update({ status: 'withdrawn' })
      .eq('tournament_id', tournamentId)
      .eq('player_id', playerId);
  }

  async getRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
    const { data, error } = await this.db
      .from('tournament_registrations')
      .select('*, player:players(*)')
      .eq('tournament_id', tournamentId)
      .order('registered_at');

    if (error) throw error;
    return data || [];
  }

  // ---- Bracket Generation ----

  async generateBracket(tournamentId: string): Promise<TournamentMatch[]> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const registrations = await this.getRegistrations(tournamentId);
    const confirmedPlayers = registrations
      .filter(r => r.status === 'confirmed')
      .map(r => r.player_id);

    if (confirmedPlayers.length < tournament.min_players) {
      throw new Error(`Not enough players. Need at least ${tournament.min_players}`);
    }

    let matches: Partial<TournamentMatch>[];

    switch (tournament.format) {
      case 'single_elimination':
        matches = this.generateSingleEliminationBracket(tournamentId, confirmedPlayers);
        break;
      case 'double_elimination':
        matches = this.generateDoubleEliminationBracket(tournamentId, confirmedPlayers);
        break;
      case 'round_robin':
        matches = this.generateRoundRobinSchedule(tournamentId, confirmedPlayers);
        break;
      default:
        throw new Error(`Unsupported format: ${tournament.format}`);
    }

    // Insert matches
    const { data, error } = await this.db
      .from('tournament_matches')
      .insert(matches)
      .select();

    if (error) throw error;

    // Update tournament status
    await this.updateTournamentStatus(tournamentId, 'in_progress');

    return data;
  }

  private generateSingleEliminationBracket(
    tournamentId: string, 
    playerIds: string[]
  ): Partial<TournamentMatch>[] {
    const matches: Partial<TournamentMatch>[] = [];
    
    // Shuffle players for random seeding
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    
    // Calculate rounds needed
    const playerCount = shuffled.length;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerCount)));
    const rounds = Math.log2(bracketSize);
    const byes = bracketSize - playerCount;
    
    let matchNumber = 1;
    
    // First round
    let firstRoundMatches = bracketSize / 2;
    let playerIndex = 0;
    let byeCount = 0;
    
    for (let i = 0; i < firstRoundMatches; i++) {
      const match: Partial<TournamentMatch> = {
        tournament_id: tournamentId,
        round: 1,
        match_number: matchNumber++,
        player1_id: shuffled[playerIndex++],
        player2_id: byeCount < byes ? undefined : shuffled[playerIndex++],
        player1_legs: 0,
        player2_legs: 0,
        status: 'pending'
      };
      
      // Handle byes
      if (!match.player2_id) {
        match.status = 'bye';
        match.winner_id = match.player1_id;
        byeCount++;
      }
      
      matches.push(match);
    }

    // Subsequent rounds (placeholders)
    for (let round = 2; round <= rounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round);
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          tournament_id: tournamentId,
          round,
          match_number: matchNumber++,
          player1_legs: 0,
          player2_legs: 0,
          status: 'pending'
        });
      }
    }

    return matches;
  }

  private generateDoubleEliminationBracket(
    tournamentId: string,
    playerIds: string[]
  ): Partial<TournamentMatch>[] {
    // Similar to single elimination but with losers bracket
    // This is a simplified version
    const matches = this.generateSingleEliminationBracket(tournamentId, playerIds);
    
    // Add losers bracket matches
    // Implementation depends on specific requirements
    
    return matches;
  }

  private generateRoundRobinSchedule(
    tournamentId: string,
    playerIds: string[]
  ): Partial<TournamentMatch>[] {
    const matches: Partial<TournamentMatch>[] = [];
    const n = playerIds.length;
    let matchNumber = 1;

    // Each player plays every other player once
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        // Calculate round (simplified)
        const round = Math.floor(matchNumber / (n / 2)) + 1;
        
        matches.push({
          tournament_id: tournamentId,
          round,
          match_number: matchNumber++,
          player1_id: playerIds[i],
          player2_id: playerIds[j],
          player1_legs: 0,
          player2_legs: 0,
          status: 'pending'
        });
      }
    }

    return matches;
  }

  // ---- Match Management ----

  async recordMatchResult(
    matchId: string, 
    player1Legs: number, 
    player2Legs: number,
    stats?: any
  ): Promise<void> {
    const { data: match } = await this.db
      .from('tournament_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!match) throw new Error('Match not found');

    const winnerId = player1Legs > player2Legs ? match.player1_id : match.player2_id;

    await this.db
      .from('tournament_matches')
      .update({
        player1_legs: player1Legs,
        player2_legs: player2Legs,
        winner_id: winnerId,
        status: 'completed',
        completed_at: new Date().toISOString(),
        stats
      })
      .eq('id', matchId);

    // Progress winner to next match if applicable
    if (match.next_match_id) {
      await this.advanceToNextMatch(match.next_match_id, winnerId);
    }
  }

  private async advanceToNextMatch(nextMatchId: string, playerId: string): Promise<void> {
    const { data: nextMatch } = await this.db
      .from('tournament_matches')
      .select('*')
      .eq('id', nextMatchId)
      .single();

    if (!nextMatch) return;

    const update = nextMatch.player1_id ? { player2_id: playerId } : { player1_id: playerId };
    
    await this.db
      .from('tournament_matches')
      .update(update)
      .eq('id', nextMatchId);
  }
}

// ==================== LEAGUE SERVICE ====================

export class LeagueService {
  private db: any;

  constructor(dbClient: any) {
    this.db = dbClient;
  }

  async createLeague(data: Partial<League>): Promise<League> {
    const { data: league, error } = await this.db
      .from('leagues')
      .insert([{
        ...data,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return league;
  }

  async joinLeague(leagueId: string, playerId: string): Promise<void> {
    // Create standing entry
    await this.db
      .from('league_standings')
      .insert([{
        league_id: leagueId,
        player_id: playerId,
        position: 0,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        legs_for: 0,
        legs_against: 0,
        leg_difference: 0,
        points: 0,
        average: 0,
        highest_checkout: 0,
        total_180s: 0
      }]);
  }

  async generateWeeklyFixtures(leagueId: string, week: number): Promise<LeagueMatch[]> {
    const { data: standings } = await this.db
      .from('league_standings')
      .select('player_id')
      .eq('league_id', leagueId);

    if (!standings || standings.length < 2) {
      throw new Error('Not enough players');
    }

    const playerIds = standings.map((s: any) => s.player_id);
    const matches: Partial<LeagueMatch>[] = [];

    // Simple fixture generation (rotate pairings)
    // For a proper implementation, use a round-robin algorithm
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      matches.push({
        league_id: leagueId,
        week,
        home_player_id: shuffled[i],
        away_player_id: shuffled[i + 1],
        home_legs: 0,
        away_legs: 0,
        status: 'scheduled'
      });
    }

    const { data, error } = await this.db
      .from('league_matches')
      .insert(matches)
      .select();

    if (error) throw error;
    return data;
  }

  async recordLeagueMatchResult(
    matchId: string,
    homeLegs: number,
    awayLegs: number,
    stats?: any
  ): Promise<void> {
    const { data: match } = await this.db
      .from('league_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!match) throw new Error('Match not found');

    // Update match
    await this.db
      .from('league_matches')
      .update({
        home_legs: homeLegs,
        away_legs: awayLegs,
        status: 'completed',
        completed_at: new Date().toISOString(),
        stats
      })
      .eq('id', matchId);

    // Get league for point values
    const { data: league } = await this.db
      .from('leagues')
      .select('*')
      .eq('id', match.league_id)
      .single();

    // Update standings
    await this.updateStanding(match.league_id, match.home_player_id, homeLegs, awayLegs, league);
    await this.updateStanding(match.league_id, match.away_player_id, awayLegs, homeLegs, league);

    // Recalculate positions
    await this.recalculatePositions(match.league_id);
  }

  private async updateStanding(
    leagueId: string,
    playerId: string,
    legsFor: number,
    legsAgainst: number,
    league: League
  ): Promise<void> {
    const { data: standing } = await this.db
      .from('league_standings')
      .select('*')
      .eq('league_id', leagueId)
      .eq('player_id', playerId)
      .single();

    if (!standing) return;

    const isWin = legsFor > legsAgainst;
    const isDraw = legsFor === legsAgainst;

    const points = isWin 
      ? league.points_for_win 
      : isDraw 
        ? league.points_for_draw 
        : league.points_for_loss;

    await this.db
      .from('league_standings')
      .update({
        played: standing.played + 1,
        won: standing.won + (isWin ? 1 : 0),
        drawn: standing.drawn + (isDraw ? 1 : 0),
        lost: standing.lost + (!isWin && !isDraw ? 1 : 0),
        legs_for: standing.legs_for + legsFor,
        legs_against: standing.legs_against + legsAgainst,
        leg_difference: standing.leg_difference + (legsFor - legsAgainst),
        points: standing.points + points
      })
      .eq('league_id', leagueId)
      .eq('player_id', playerId);
  }

  private async recalculatePositions(leagueId: string): Promise<void> {
    const { data: standings } = await this.db
      .from('league_standings')
      .select('*')
      .eq('league_id', leagueId)
      .order('points', { ascending: false })
      .order('leg_difference', { ascending: false })
      .order('legs_for', { ascending: false });

    if (!standings) return;

    for (let i = 0; i < standings.length; i++) {
      await this.db
        .from('league_standings')
        .update({ position: i + 1 })
        .eq('league_id', leagueId)
        .eq('player_id', standings[i].player_id);
    }
  }

  async getStandings(leagueId: string): Promise<LeagueStanding[]> {
    const { data, error } = await this.db
      .from('league_standings')
      .select('*, player:players(*)')
      .eq('league_id', leagueId)
      .order('position');

    if (error) throw error;
    return data || [];
  }
}

export default { TournamentService, LeagueService };
