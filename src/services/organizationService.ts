/**
 * Organizations & Memberships System
 * Like Darts Atlas - manage clubs, leagues, and player memberships
 */

// ==================== TYPES ====================

export interface Organization {
  id: string;
  name: string;
  slug: string;                    // URL-friendly name
  description?: string;
  logo_url?: string;
  banner_url?: string;
  website?: string;
  
  // Contact
  email?: string;
  phone?: string;
  
  // Location
  country: string;
  region?: string;
  city?: string;
  
  // Settings
  membership_required: boolean;
  membership_fee?: number;
  currency: string;
  
  // Social
  facebook_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  
  // Stats
  member_count: number;
  tournament_count: number;
  
  // Status
  verified: boolean;
  featured: boolean;
  
  created_at: string;
  updated_at: string;
}

export type MembershipRole = 'owner' | 'admin' | 'manager' | 'member' | 'pending';

export interface Membership {
  id: string;
  organization_id: string;
  player_id: string;
  
  role: MembershipRole;
  
  // Payment
  paid: boolean;
  payment_date?: string;
  expiry_date?: string;
  
  // Profile within org
  member_number?: string;
  nickname?: string;
  
  joined_at: string;
  
  organization?: Organization;
  player?: Player;
}

export interface Player {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  
  // Profile
  nickname?: string;
  country?: string;
  region?: string;
  timezone?: string;
  
  // Settings
  public_profile: boolean;
  show_stats: boolean;
  
  // Premium
  is_premium: boolean;
  premium_until?: string;
  
  // Contact
  phone?: string;
  phone_verified: boolean;
  sms_notifications: boolean;
  
  created_at: string;
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: MembershipRole;
  
  invited_by: string;
  expires_at: string;
  
  accepted: boolean;
  accepted_at?: string;
  
  created_at: string;
}

// ==================== ORGANIZATION SERVICE ====================

export class OrganizationService {
  private db: any;

  constructor(dbClient: any) {
    this.db = dbClient;
  }

  // ---- Organization CRUD ----

  async createOrganization(data: Partial<Organization>, ownerId: string): Promise<Organization> {
    const slug = this.generateSlug(data.name || 'org');
    
    const { data: org, error } = await this.db
      .from('organizations')
      .insert([{
        ...data,
        slug,
        member_count: 1,
        tournament_count: 0,
        verified: false,
        featured: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Add creator as owner
    await this.db.from('memberships').insert([{
      organization_id: org.id,
      player_id: ownerId,
      role: 'owner',
      paid: true,
      joined_at: new Date().toISOString()
    }]);

    return org;
  }

  async getOrganization(idOrSlug: string): Promise<Organization | null> {
    // Try by ID first
    let { data } = await this.db
      .from('organizations')
      .select('*')
      .eq('id', idOrSlug)
      .single();

    // Try by slug if not found
    if (!data) {
      const result = await this.db
        .from('organizations')
        .select('*')
        .eq('slug', idOrSlug)
        .single();
      data = result.data;
    }

    return data;
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const { data, error } = await this.db
      .from('organizations')
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

  async searchOrganizations(params: {
    query?: string;
    country?: string;
    region?: string;
    verified?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Organization[]> {
    let query = this.db.from('organizations').select('*');

    if (params.query) {
      query = query.or(`name.ilike.%${params.query}%,description.ilike.%${params.query}%`);
    }
    if (params.country) {
      query = query.eq('country', params.country);
    }
    if (params.region) {
      query = query.eq('region', params.region);
    }
    if (params.verified !== undefined) {
      query = query.eq('verified', params.verified);
    }

    query = query
      .order('featured', { ascending: false })
      .order('member_count', { ascending: false })
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 20) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // ---- Membership Management ----

  async joinOrganization(orgId: string, playerId: string): Promise<Membership> {
    const org = await this.getOrganization(orgId);
    if (!org) throw new Error('Organization not found');

    // Check if already a member
    const { data: existing } = await this.db
      .from('memberships')
      .select('*')
      .eq('organization_id', orgId)
      .eq('player_id', playerId)
      .single();

    if (existing) {
      throw new Error('Already a member of this organization');
    }

    const status = org.membership_required ? 'pending' : 'member';
    const paid = !org.membership_fee;

    const { data: membership, error } = await this.db
      .from('memberships')
      .insert([{
        organization_id: orgId,
        player_id: playerId,
        role: status,
        paid,
        joined_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Update member count
    await this.db.rpc('increment_member_count', { org_id: orgId });

    return membership;
  }

  async leaveOrganization(orgId: string, playerId: string): Promise<void> {
    const { data: membership } = await this.db
      .from('memberships')
      .select('role')
      .eq('organization_id', orgId)
      .eq('player_id', playerId)
      .single();

    if (membership?.role === 'owner') {
      throw new Error('Owners cannot leave. Transfer ownership first.');
    }

    await this.db
      .from('memberships')
      .delete()
      .eq('organization_id', orgId)
      .eq('player_id', playerId);

    await this.db.rpc('decrement_member_count', { org_id: orgId });
  }

  async getMembers(orgId: string, options?: {
    role?: MembershipRole;
    limit?: number;
    offset?: number;
  }): Promise<Membership[]> {
    let query = this.db
      .from('memberships')
      .select('*, player:players(*)')
      .eq('organization_id', orgId);

    if (options?.role) {
      query = query.eq('role', options.role);
    }

    query = query
      .order('joined_at')
      .range(options?.offset || 0, (options?.offset || 0) + (options?.limit || 50) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async updateMemberRole(orgId: string, playerId: string, newRole: MembershipRole): Promise<void> {
    await this.db
      .from('memberships')
      .update({ role: newRole })
      .eq('organization_id', orgId)
      .eq('player_id', playerId);
  }

  async getPlayerMemberships(playerId: string): Promise<Membership[]> {
    const { data, error } = await this.db
      .from('memberships')
      .select('*, organization:organizations(*)')
      .eq('player_id', playerId)
      .order('joined_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ---- Invites ----

  async invitePlayer(orgId: string, email: string, role: MembershipRole, invitedBy: string): Promise<OrganizationInvite> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    const { data, error } = await this.db
      .from('organization_invites')
      .insert([{
        organization_id: orgId,
        email: email.toLowerCase(),
        role,
        invited_by: invitedBy,
        expires_at: expiresAt.toISOString(),
        accepted: false,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    
    // TODO: Send email notification
    
    return data;
  }

  async acceptInvite(inviteId: string, playerId: string): Promise<Membership> {
    const { data: invite } = await this.db
      .from('organization_invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (!invite) throw new Error('Invite not found');
    if (invite.accepted) throw new Error('Invite already used');
    if (new Date(invite.expires_at) < new Date()) throw new Error('Invite expired');

    // Create membership
    const { data: membership, error } = await this.db
      .from('memberships')
      .insert([{
        organization_id: invite.organization_id,
        player_id: playerId,
        role: invite.role,
        paid: true,
        joined_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Mark invite as used
    await this.db
      .from('organization_invites')
      .update({ accepted: true, accepted_at: new Date().toISOString() })
      .eq('id', inviteId);

    // Update member count
    await this.db.rpc('increment_member_count', { org_id: invite.organization_id });

    return membership;
  }

  // ---- Utils ----

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 6);
  }

  // ---- Permission Checks ----

  async canManageOrg(orgId: string, playerId: string): Promise<boolean> {
    const { data } = await this.db
      .from('memberships')
      .select('role')
      .eq('organization_id', orgId)
      .eq('player_id', playerId)
      .single();

    return ['owner', 'admin', 'manager'].includes(data?.role);
  }

  async isOrgAdmin(orgId: string, playerId: string): Promise<boolean> {
    const { data } = await this.db
      .from('memberships')
      .select('role')
      .eq('organization_id', orgId)
      .eq('player_id', playerId)
      .single();

    return ['owner', 'admin'].includes(data?.role);
  }
}

// ==================== DATABASE SCHEMA ====================

export const ORGANIZATIONS_SCHEMA = `
-- Organizations table
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

-- Memberships table
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

-- Organization invites
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_country ON organizations(country);
CREATE INDEX IF NOT EXISTS idx_organizations_verified ON organizations(verified);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_player ON memberships(player_id);

-- Helper functions
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
`;

export default OrganizationService;
