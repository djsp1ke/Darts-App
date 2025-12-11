/**
 * SMS Notifications & Teams/Doubles System
 * Board calls, match notifications, team management
 */

// ==================== SMS TYPES ====================

export interface SMSNotification {
  id: string;
  player_id: string;
  phone_number: string;
  
  type: 'board_call' | 'match_reminder' | 'result' | 'tournament_update' | 'custom';
  message: string;
  
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  
  sent_at?: string;
  delivered_at?: string;
  error?: string;
  
  created_at: string;
}

export interface SMSTemplate {
  type: string;
  template: string;
  variables: string[];
}

// ==================== TEAM TYPES ====================

export interface Team {
  id: string;
  name: string;
  
  // Members
  player1_id: string;
  player2_id: string;
  
  // Optional for larger teams
  player3_id?: string;
  player4_id?: string;
  captain_id?: string;
  
  // Association
  organization_id?: string;
  league_id?: string;
  
  // Stats
  matches_played: number;
  matches_won: number;
  average: number;
  
  created_at: string;
  
  // Joined data
  player1?: any;
  player2?: any;
}

export interface DoublesMatch {
  id: string;
  
  team1_id: string;
  team2_id: string;
  
  team1_legs: number;
  team2_legs: number;
  
  // Current thrower tracking
  team1_current_thrower: 1 | 2;  // Which team member
  team2_current_thrower: 1 | 2;
  current_team: 1 | 2;
  
  // Individual stats within team
  team1_player1_stats?: any;
  team1_player2_stats?: any;
  team2_player1_stats?: any;
  team2_player2_stats?: any;
  
  starting_score: number;
  target_legs: number;
  match_type: 'first_to' | 'best_of';
  
  status: 'pending' | 'in_progress' | 'completed';
  winner_team_id?: string;
  
  created_at: string;
}

// ==================== SMS SERVICE ====================

export class SMSService {
  private db: any;
  private smsProvider: SMSProvider;

  constructor(dbClient: any, provider: SMSProvider) {
    this.db = dbClient;
    this.smsProvider = provider;
  }

  // ---- Templates ----

  private templates: Record<string, SMSTemplate> = {
    board_call: {
      type: 'board_call',
      template: '🎯 Board Call! You\'re up on Board {board} vs {opponent}. Match code: {code}',
      variables: ['board', 'opponent', 'code']
    },
    match_reminder: {
      type: 'match_reminder',
      template: '⏰ Reminder: Your match vs {opponent} starts in {time}. Don\'t be late!',
      variables: ['opponent', 'time']
    },
    result_win: {
      type: 'result',
      template: '🏆 Congratulations! You won {score} against {opponent}. Avg: {average}',
      variables: ['score', 'opponent', 'average']
    },
    result_loss: {
      type: 'result',
      template: '📊 Match complete: {opponent} won {score}. Your avg: {average}. Keep practicing!',
      variables: ['score', 'opponent', 'average']
    },
    tournament_update: {
      type: 'tournament_update',
      template: '🏆 {tournament}: {message}',
      variables: ['tournament', 'message']
    }
  };

  // ---- Send Notifications ----

  async sendBoardCall(playerId: string, data: {
    boardNumber: number;
    opponentName: string;
    matchCode: string;
  }): Promise<boolean> {
    const player = await this.getPlayerWithPhone(playerId);
    if (!player?.phone || !player.sms_notifications) return false;

    const message = this.formatMessage('board_call', {
      board: data.boardNumber.toString(),
      opponent: data.opponentName,
      code: data.matchCode
    });

    return this.sendSMS(playerId, player.phone, message, 'board_call');
  }

  async sendMatchReminder(playerId: string, data: {
    opponentName: string;
    minutesUntil: number;
  }): Promise<boolean> {
    const player = await this.getPlayerWithPhone(playerId);
    if (!player?.phone || !player.sms_notifications) return false;

    const timeStr = data.minutesUntil <= 60 
      ? `${data.minutesUntil} minutes`
      : `${Math.round(data.minutesUntil / 60)} hours`;

    const message = this.formatMessage('match_reminder', {
      opponent: data.opponentName,
      time: timeStr
    });

    return this.sendSMS(playerId, player.phone, message, 'match_reminder');
  }

  async sendMatchResult(playerId: string, data: {
    won: boolean;
    score: string;
    opponentName: string;
    average: number;
  }): Promise<boolean> {
    const player = await this.getPlayerWithPhone(playerId);
    if (!player?.phone || !player.sms_notifications) return false;

    const template = data.won ? 'result_win' : 'result_loss';
    const message = this.formatMessage(template, {
      score: data.score,
      opponent: data.opponentName,
      average: data.average.toFixed(1)
    });

    return this.sendSMS(playerId, player.phone, message, 'result');
  }

  async sendTournamentUpdate(playerId: string, data: {
    tournamentName: string;
    message: string;
  }): Promise<boolean> {
    const player = await this.getPlayerWithPhone(playerId);
    if (!player?.phone || !player.sms_notifications) return false;

    const message = this.formatMessage('tournament_update', {
      tournament: data.tournamentName,
      message: data.message
    });

    return this.sendSMS(playerId, player.phone, message, 'tournament_update');
  }

  async sendCustomMessage(playerId: string, message: string): Promise<boolean> {
    const player = await this.getPlayerWithPhone(playerId);
    if (!player?.phone || !player.sms_notifications) return false;

    return this.sendSMS(playerId, player.phone, message, 'custom');
  }

  // ---- Bulk Notifications ----

  async sendBulkBoardCalls(calls: Array<{
    playerId: string;
    boardNumber: number;
    opponentName: string;
    matchCode: string;
  }>): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const call of calls) {
      const success = await this.sendBoardCall(call.playerId, {
        boardNumber: call.boardNumber,
        opponentName: call.opponentName,
        matchCode: call.matchCode
      });
      
      if (success) sent++;
      else failed++;
    }

    return { sent, failed };
  }

  // ---- Internal Methods ----

  private async sendSMS(
    playerId: string,
    phoneNumber: string,
    message: string,
    type: SMSNotification['type']
  ): Promise<boolean> {
    // Log the notification
    const { data: notification } = await this.db
      .from('sms_notifications')
      .insert([{
        player_id: playerId,
        phone_number: phoneNumber,
        type,
        message,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    try {
      // Send via provider
      await this.smsProvider.send(phoneNumber, message);

      // Update status
      await this.db
        .from('sms_notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notification.id);

      return true;
    } catch (error: any) {
      // Log failure
      await this.db
        .from('sms_notifications')
        .update({ status: 'failed', error: error.message })
        .eq('id', notification.id);

      return false;
    }
  }

  private formatMessage(templateType: string, variables: Record<string, string>): string {
    const template = this.templates[templateType];
    if (!template) return '';

    let message = template.template;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(`{${key}}`, value);
    }
    return message;
  }

  private async getPlayerWithPhone(playerId: string): Promise<any> {
    const { data } = await this.db
      .from('players')
      .select('phone, sms_notifications')
      .eq('id', playerId)
      .single();
    return data;
  }

  // ---- Player Settings ----

  async updatePlayerPhone(playerId: string, phone: string): Promise<void> {
    await this.db
      .from('players')
      .update({ phone, phone_verified: false })
      .eq('id', playerId);
  }

  async verifyPlayerPhone(playerId: string, code: string): Promise<boolean> {
    // Check verification code (implementation depends on your verification system)
    const isValid = await this.checkVerificationCode(playerId, code);
    
    if (isValid) {
      await this.db
        .from('players')
        .update({ phone_verified: true })
        .eq('id', playerId);
    }

    return isValid;
  }

  async toggleSMSNotifications(playerId: string, enabled: boolean): Promise<void> {
    await this.db
      .from('players')
      .update({ sms_notifications: enabled })
      .eq('id', playerId);
  }

  private async checkVerificationCode(playerId: string, code: string): Promise<boolean> {
    // Implement your verification logic
    return true;
  }
}

// ==================== SMS PROVIDER INTERFACE ====================

export interface SMSProvider {
  send(phoneNumber: string, message: string): Promise<void>;
}

// Twilio Implementation
export class TwilioSMSProvider implements SMSProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(config: { accountSid: string; authToken: string; fromNumber: string }) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber;
  }

  async send(phoneNumber: string, message: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${this.accountSid}:${this.authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: this.fromNumber,
        Body: message
      })
    });

    if (!response.ok) {
      throw new Error(`Twilio error: ${response.statusText}`);
    }
  }
}

// Mock Provider for Testing
export class MockSMSProvider implements SMSProvider {
  public sentMessages: Array<{ to: string; message: string }> = [];

  async send(phoneNumber: string, message: string): Promise<void> {
    console.log(`[SMS] To: ${phoneNumber}, Message: ${message}`);
    this.sentMessages.push({ to: phoneNumber, message });
  }
}

// ==================== TEAM SERVICE ====================

export class TeamService {
  private db: any;

  constructor(dbClient: any) {
    this.db = dbClient;
  }

  // ---- Team CRUD ----

  async createTeam(data: {
    name: string;
    player1Id: string;
    player2Id: string;
    organizationId?: string;
  }): Promise<Team> {
    const { data: team, error } = await this.db
      .from('teams')
      .insert([{
        name: data.name,
        player1_id: data.player1Id,
        player2_id: data.player2Id,
        captain_id: data.player1Id,
        organization_id: data.organizationId,
        matches_played: 0,
        matches_won: 0,
        average: 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return team;
  }

  async getTeam(teamId: string): Promise<Team | null> {
    const { data, error } = await this.db
      .from('teams')
      .select(`
        *,
        player1:players!player1_id(*),
        player2:players!player2_id(*)
      `)
      .eq('id', teamId)
      .single();

    if (error) return null;
    return data;
  }

  async getPlayerTeams(playerId: string): Promise<Team[]> {
    const { data, error } = await this.db
      .from('teams')
      .select(`
        *,
        player1:players!player1_id(id, name, avatar_url),
        player2:players!player2_id(id, name, avatar_url)
      `)
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getOrganizationTeams(orgId: string): Promise<Team[]> {
    const { data, error } = await this.db
      .from('teams')
      .select(`
        *,
        player1:players!player1_id(id, name, avatar_url),
        player2:players!player2_id(id, name, avatar_url)
      `)
      .eq('organization_id', orgId)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // ---- Random Team Generation (Blind Draw) ----

  async generateRandomTeams(playerIds: string[], orgId?: string): Promise<Team[]> {
    if (playerIds.length < 2 || playerIds.length % 2 !== 0) {
      throw new Error('Need even number of players (minimum 2)');
    }

    // Shuffle players
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    const teams: Team[] = [];

    for (let i = 0; i < shuffled.length; i += 2) {
      const team = await this.createTeam({
        name: `Team ${Math.floor(i / 2) + 1}`,
        player1Id: shuffled[i],
        player2Id: shuffled[i + 1],
        organizationId: orgId
      });
      teams.push(team);
    }

    return teams;
  }

  // ---- Doubles Match Management ----

  async createDoublesMatch(data: {
    team1Id: string;
    team2Id: string;
    startingScore?: number;
    targetLegs?: number;
    matchType?: 'first_to' | 'best_of';
  }): Promise<DoublesMatch> {
    const { data: match, error } = await this.db
      .from('doubles_matches')
      .insert([{
        team1_id: data.team1Id,
        team2_id: data.team2Id,
        team1_legs: 0,
        team2_legs: 0,
        team1_current_thrower: 1,
        team2_current_thrower: 1,
        current_team: 1,
        starting_score: data.startingScore || 501,
        target_legs: data.targetLegs || 3,
        match_type: data.matchType || 'first_to',
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return match;
  }

  async updateDoublesMatchScore(
    matchId: string,
    team: 1 | 2,
    thrower: 1 | 2,
    score: number,
    isLegWon: boolean
  ): Promise<void> {
    const match = await this.getDoublesMatch(matchId);
    if (!match) throw new Error('Match not found');

    const updates: Partial<DoublesMatch> = {};

    if (isLegWon) {
      // Update legs
      if (team === 1) {
        updates.team1_legs = match.team1_legs + 1;
      } else {
        updates.team2_legs = match.team2_legs + 1;
      }

      // Check for match win
      const legsNeeded = match.match_type === 'first_to' 
        ? match.target_legs 
        : Math.ceil(match.target_legs / 2);

      if ((updates.team1_legs || match.team1_legs) >= legsNeeded) {
        updates.status = 'completed';
        updates.winner_team_id = match.team1_id;
      } else if ((updates.team2_legs || match.team2_legs) >= legsNeeded) {
        updates.status = 'completed';
        updates.winner_team_id = match.team2_id;
      }
    }

    // Rotate thrower
    // In doubles, typically alternate between team members, then switch teams
    const nextThrower = thrower === 1 ? 2 : 1;
    const nextTeam = team === 1 ? 2 : 1;
    
    if (team === 1) {
      updates.team1_current_thrower = nextThrower as 1 | 2;
    } else {
      updates.team2_current_thrower = nextThrower as 1 | 2;
    }
    updates.current_team = nextTeam as 1 | 2;

    await this.db
      .from('doubles_matches')
      .update(updates)
      .eq('id', matchId);
  }

  async getDoublesMatch(matchId: string): Promise<DoublesMatch | null> {
    const { data, error } = await this.db
      .from('doubles_matches')
      .select(`
        *,
        team1:teams!team1_id(*),
        team2:teams!team2_id(*)
      `)
      .eq('id', matchId)
      .single();

    if (error) return null;
    return data;
  }

  // ---- Team Stats ----

  async updateTeamStats(teamId: string, matchWon: boolean, average: number): Promise<void> {
    const team = await this.getTeam(teamId);
    if (!team) return;

    const newMatchesPlayed = team.matches_played + 1;
    const newMatchesWon = team.matches_won + (matchWon ? 1 : 0);
    
    // Running average calculation
    const newAverage = ((team.average * team.matches_played) + average) / newMatchesPlayed;

    await this.db
      .from('teams')
      .update({
        matches_played: newMatchesPlayed,
        matches_won: newMatchesWon,
        average: Math.round(newAverage * 100) / 100
      })
      .eq('id', teamId);
  }
}

// ==================== DATABASE SCHEMA ====================

export const SMS_TEAMS_SCHEMA = `
-- SMS notifications log
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

-- Add phone fields to players if not exists
ALTER TABLE players ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE players ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true;

-- Teams table
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

-- Doubles matches
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_notifications_player ON sms_notifications(player_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status);
CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_players ON teams(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_doubles_matches_teams ON doubles_matches(team1_id, team2_id);
`;

export default { SMSService, TeamService };
