/**
 * Online Features Module
 * WebRTC camera streaming, spectator mode, and real-time sync
 *
 * Performance optimizations:
 * - Lazy stream initialization
 * - Efficient WebRTC connection management
 * - Memory-safe cleanup methods
 */

import { generateCode } from '../constants';
import type { DatabaseClient } from '../types';

// ==================== TYPES ====================

export interface OnlineMatch {
  id: string;
  room_code: string;
  host_id: string;
  guest_id?: string;
  status: 'waiting' | 'ready' | 'in_progress' | 'completed';

  starting_score: number;
  legs_to_win: number;
  match_type: 'first_to' | 'best_of';

  host_stream_enabled: boolean;
  guest_stream_enabled: boolean;
  spectators_allowed: boolean;

  current_player: 'host' | 'guest';
  host_score: number;
  guest_score: number;
  host_legs: number;
  guest_legs: number;

  created_at: string;
}

export interface Spectator {
  id: string;
  match_id: string;
  user_id: string;
  display_name: string;
  joined_at: string;
}

export interface StreamConfig {
  video: boolean;
  audio: boolean;
  quality: 'low' | 'medium' | 'high';
  frameRate: number;
}

export interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

// ==================== WEBRTC CONFIGURATION ====================

export const DEFAULT_ICE_SERVERS: readonly ICEServer[] = Object.freeze([
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]);

export const STREAM_QUALITY_PRESETS: Readonly<Record<string, MediaTrackConstraints>> = Object.freeze({
  low: {
    width: { ideal: 320 },
    height: { ideal: 240 },
    frameRate: { ideal: 15 }
  },
  medium: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 24 }
  },
  high: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  }
});

// ==================== CAMERA STREAM MANAGER ====================

export class CameraStreamManager {
  private localStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;

  /**
   * Request camera access and start local preview
   */
  async startLocalStream(
    videoElement: HTMLVideoElement,
    config: StreamConfig = { video: true, audio: false, quality: 'medium', frameRate: 24 }
  ): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        video: config.video ? STREAM_QUALITY_PRESETS[config.quality] : false,
        audio: config.audio
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement = videoElement;
      videoElement.srcObject = this.localStream;
      videoElement.muted = true; // Mute local playback to prevent echo

      return this.localStream;
    } catch (error) {
      console.error('Failed to access camera:', error);
      throw new Error('Camera access denied or unavailable');
    }
  }

  /**
   * Stop local stream and cleanup
   */
  stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  /**
   * Get current local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Check if camera is available
   */
  static async isCameraAvailable(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  /**
   * List available cameras
   */
  static async listCameras(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  }
}

// ==================== WEBRTC PEER CONNECTION ====================

export class WebRTCPeer {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;

  private onRemoteStreamCallback?: (stream: MediaStream) => void;
  private onDataMessageCallback?: (message: unknown) => void;
  private onConnectionStateCallback?: (state: RTCPeerConnectionState) => void;

  constructor(iceServers: ICEServer[] = [...DEFAULT_ICE_SERVERS]) {
    this.peerConnection = new RTCPeerConnection({
      iceServers: iceServers as RTCIceServer[]
    });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.peerConnection) return;

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.onRemoteStreamCallback?.(this.remoteStream);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection) {
        this.onConnectionStateCallback?.(this.peerConnection.connectionState);
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.onDataMessageCallback?.(message);
      } catch (e) {
        console.error('Failed to parse data channel message:', e);
      }
    };
  }

  /**
   * Add local stream to connection
   */
  addLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    stream.getTracks().forEach(track => {
      this.peerConnection?.addTrack(track, stream);
    });
  }

  /**
   * Create offer (for initiator/host)
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');

    this.dataChannel = this.peerConnection.createDataChannel('gameState', {
      ordered: true
    });
    this.setupDataChannel();

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Handle incoming offer (for joiner/guest)
   */
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  /**
   * Handle incoming answer (for initiator/host)
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * Send game data through data channel
   */
  sendGameData(data: unknown): void {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(data));
    }
  }

  /**
   * Set callbacks
   */
  onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback;
  }

  onDataMessage(callback: (message: unknown) => void): void {
    this.onDataMessageCallback = callback;
  }

  onConnectionState(callback: (state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateCallback = callback;
  }

  /**
   * Override to send messages through signaling server
   */
  protected sendSignalingMessage(message: unknown): void {
    console.log('Signaling message:', message);
  }

  /**
   * Close connection and cleanup
   */
  close(): void {
    this.dataChannel?.close();
    this.dataChannel = null;
    this.peerConnection?.close();
    this.peerConnection = null;
  }
}

// ==================== ONLINE MATCH SERVICE ====================

export class OnlineMatchService {
  private db: DatabaseClient;
  private realtimeChannel: unknown;
  private webrtcPeer: WebRTCPeer | null = null;

  constructor(dbClient: DatabaseClient) {
    this.db = dbClient;
  }

  /**
   * Create a new online match room
   */
  async createMatch(
    hostId: string,
    settings: Partial<OnlineMatch>
  ): Promise<OnlineMatch> {
    const roomCode = generateCode(6);

    const { data, error } = await this.db
      .from('online_matches')
      .insert([{
        room_code: roomCode,
        host_id: hostId,
        status: 'waiting',
        starting_score: settings.starting_score || 501,
        legs_to_win: settings.legs_to_win || 3,
        match_type: settings.match_type || 'first_to',
        host_stream_enabled: settings.host_stream_enabled || false,
        guest_stream_enabled: settings.guest_stream_enabled || false,
        spectators_allowed: settings.spectators_allowed ?? true,
        current_player: 'host',
        host_score: settings.starting_score || 501,
        guest_score: settings.starting_score || 501,
        host_legs: 0,
        guest_legs: 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data as OnlineMatch;
  }

  /**
   * Join an existing match by room code
   */
  async joinMatch(roomCode: string, guestId: string): Promise<OnlineMatch> {
    const { data: match } = await this.db
      .from('online_matches')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .eq('status', 'waiting')
      .single();

    if (!match) {
      throw new Error('Match not found or already started');
    }

    const { data, error } = await this.db
      .from('online_matches')
      .update({
        guest_id: guestId,
        status: 'ready'
      })
      .eq('id', (match as OnlineMatch).id)
      .select()
      .single();

    if (error) throw error;
    return data as OnlineMatch;
  }

  /**
   * Subscribe to match updates (real-time)
   */
  subscribeToMatch(
    matchId: string,
    onUpdate: (match: OnlineMatch) => void,
    onSpectatorJoin?: (spectator: Spectator) => void
  ): void {
    if (!this.db.channel) return;

    this.realtimeChannel = this.db
      .channel(`match:${matchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'online_matches',
        filter: `id=eq.${matchId}`
      }, (payload: { new: OnlineMatch }) => {
        onUpdate(payload.new);
      });

    if (onSpectatorJoin) {
      (this.realtimeChannel as { on: Function }).on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'spectators',
        filter: `match_id=eq.${matchId}`
      }, (payload: { new: Spectator }) => {
        onSpectatorJoin(payload.new);
      });
    }

    (this.realtimeChannel as { subscribe: Function }).subscribe();
  }

  /**
   * Unsubscribe from match updates
   */
  unsubscribe(): void {
    if (this.realtimeChannel) {
      (this.realtimeChannel as { unsubscribe: Function }).unsubscribe();
      this.realtimeChannel = null;
    }
  }

  /**
   * Update match state
   */
  async updateMatchState(
    matchId: string,
    updates: Partial<OnlineMatch>
  ): Promise<void> {
    await this.db
      .from('online_matches')
      .update(updates)
      .eq('id', matchId);
  }

  /**
   * Record a throw and update scores
   */
  async recordThrow(
    matchId: string,
    player: 'host' | 'guest',
    score: number
  ): Promise<void> {
    const { data: match } = await this.db
      .from('online_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!match) throw new Error('Match not found');

    const typedMatch = match as OnlineMatch;
    const currentScore = player === 'host' ? typedMatch.host_score : typedMatch.guest_score;
    const newScore = currentScore - score;

    // Handle bust
    if (newScore < 0 || newScore === 1) {
      await this.updateMatchState(matchId, {
        current_player: player === 'host' ? 'guest' : 'host'
      });
      return;
    }

    // Handle checkout
    if (newScore === 0) {
      const newLegs = player === 'host'
        ? typedMatch.host_legs + 1
        : typedMatch.guest_legs + 1;

      const isMatchWon = newLegs >= typedMatch.legs_to_win;

      const updates: Partial<OnlineMatch> = {
        current_player: player,
        status: isMatchWon ? 'completed' : 'in_progress'
      };

      if (player === 'host') {
        updates.host_score = typedMatch.starting_score;
        updates.host_legs = newLegs;
        updates.guest_score = typedMatch.starting_score;
      } else {
        updates.guest_score = typedMatch.starting_score;
        updates.guest_legs = newLegs;
        updates.host_score = typedMatch.starting_score;
      }

      await this.updateMatchState(matchId, updates);
      return;
    }

    // Normal throw
    const updates: Partial<OnlineMatch> = {
      current_player: player === 'host' ? 'guest' : 'host'
    };

    if (player === 'host') {
      updates.host_score = newScore;
    } else {
      updates.guest_score = newScore;
    }

    await this.updateMatchState(matchId, updates);
  }

  /**
   * Join as spectator
   */
  async joinAsSpectator(
    matchId: string,
    userId: string,
    displayName: string
  ): Promise<Spectator> {
    const { data, error } = await this.db
      .from('spectators')
      .insert([{
        match_id: matchId,
        user_id: userId,
        display_name: displayName,
        joined_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Spectator;
  }

  /**
   * Get spectators for a match
   */
  async getSpectators(matchId: string): Promise<Spectator[]> {
    const { data, error } = await this.db
      .from('spectators')
      .select('*')
      .eq('match_id', matchId)
      .order('joined_at');

    if (error) throw error;
    return (data || []) as Spectator[];
  }

  /**
   * Leave spectator mode
   */
  async leaveSpectator(matchId: string, userId: string): Promise<void> {
    await this.db
      .from('spectators')
      .delete()
      .eq('match_id', matchId)
      .eq('user_id', userId);
  }
}

// ==================== SPECTATOR STREAM MANAGER ====================

export class SpectatorStreamManager {
  private streams: Map<string, MediaStream> = new Map();
  private viewers: number = 0;

  /**
   * Add a stream for spectators
   */
  addStream(playerId: string, stream: MediaStream): void {
    this.streams.set(playerId, stream);
  }

  /**
   * Remove a stream
   */
  removeStream(playerId: string): void {
    const stream = this.streams.get(playerId);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.streams.delete(playerId);
    }
  }

  /**
   * Get stream for a player
   */
  getStream(playerId: string): MediaStream | undefined {
    return this.streams.get(playerId);
  }

  /**
   * Get all available streams
   */
  getAllStreams(): Map<string, MediaStream> {
    return this.streams;
  }

  /**
   * Increment viewer count
   */
  addViewer(): number {
    return ++this.viewers;
  }

  /**
   * Decrement viewer count
   */
  removeViewer(): number {
    return Math.max(0, --this.viewers);
  }

  /**
   * Get current viewer count
   */
  getViewerCount(): number {
    return this.viewers;
  }

  /**
   * Cleanup all streams
   */
  cleanup(): void {
    this.streams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    this.streams.clear();
    this.viewers = 0;
  }
}

// ==================== DEFAULT EXPORT ====================

export default {
  CameraStreamManager,
  WebRTCPeer,
  OnlineMatchService,
  SpectatorStreamManager,
  DEFAULT_ICE_SERVERS,
  STREAM_QUALITY_PRESETS
};
