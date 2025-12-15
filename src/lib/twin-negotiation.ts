/**
 * Twin P2P Negotiation Service
 * 
 * WebRTC-based twin-to-twin direct communication.
 * Delta exchange format for minimal data transfer.
 * Falls back to Supabase Realtime for signaling.
 */

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { PublicProfile } from '@/domain/entities/Twin';

// ============================================================================
// Types
// ============================================================================

export interface TwinDelta {
    type: 'traits' | 'seeking' | 'availability' | 'interest';
    action: 'add' | 'remove' | 'update';
    value: string | string[];
    timestamp: number;
}

export interface PeerTwin {
    peerId: string;
    profile: PublicProfile;
    connectionState: 'connecting' | 'connected' | 'disconnected';
    lastSeen: Date;
    deltas: TwinDelta[];
}

export interface NegotiationMessage {
    type: 'hello' | 'delta' | 'interest' | 'ack' | 'bye';
    senderId: string;
    senderProfile?: Partial<PublicProfile>;
    delta?: TwinDelta;
    interestLevel?: number; // 0-100
}

export interface NegotiationResult {
    peerId: string;
    peerProfile: PublicProfile;
    mutualInterest: number;
    negotiatedAt: Date;
}

type PeerEventHandler = (peer: PeerTwin) => void;
type MatchEventHandler = (result: NegotiationResult) => void;

// ============================================================================
// Twin Negotiator Class
// ============================================================================

export class TwinNegotiator {
    private ydoc: Y.Doc;
    private provider: WebrtcProvider | null = null;
    private myTwinId: string;
    private myProfile: PublicProfile;
    private peers: Map<string, PeerTwin> = new Map();
    private pendingNegotiations: Map<string, number> = new Map();

    // Event handlers
    private onPeerConnected: PeerEventHandler | null = null;
    private onPeerDisconnected: PeerEventHandler | null = null;
    private onMatchFound: MatchEventHandler | null = null;

    constructor(twinId: string, profile: PublicProfile) {
        this.myTwinId = twinId;
        this.myProfile = profile;
        this.ydoc = new Y.Doc();

        // Set up CRDT shared types
        this.setupSharedTypes();
    }

    /**
     * Set up Yjs shared data types for CRDT sync
     */
    private setupSharedTypes(): void {
        // Shared map for peer presence
        const presence = this.ydoc.getMap('presence');

        // Shared array for negotiation messages
        const messages = this.ydoc.getArray<NegotiationMessage>('messages');

        // Listen for presence changes
        presence.observe(() => {
            this.handlePresenceChange();
        });

        // Listen for new messages
        messages.observe((event) => {
            if (event.changes.added.size > 0) {
                this.handleNewMessages();
            }
        });
    }

    // ========================================================================
    // Connection Management
    // ========================================================================

    /**
     * Join a negotiation room (event-based)
     */
    async joinRoom(roomId: string, signalingServers?: string[]): Promise<void> {
        const servers = signalingServers || [
            'wss://signaling.yjs.dev',
            'wss://y-webrtc-signaling-eu.herokuapp.com',
            'wss://y-webrtc-signaling-us.herokuapp.com',
        ];

        this.provider = new WebrtcProvider(
            `twin-room-${roomId}`,
            this.ydoc,
            {
                signaling: servers,
                password: undefined, // Optional: add room password
                maxConns: 50,
                filterBcConns: true,
                peerOpts: {},
            }
        );

        // Set local awareness state
        this.provider.awareness.setLocalState({
            twinId: this.myTwinId,
            profile: {
                name: this.myProfile.name,
                headline: this.myProfile.headline,
            },
            joinedAt: Date.now(),
        });

        // Listen for awareness changes (peer join/leave)
        this.provider.awareness.on('change', () => {
            this.handleAwarenessChange();
        });

        // Announce presence
        this.announcePresence();
    }

    /**
     * Leave the current room
     */
    leaveRoom(): void {
        if (this.provider) {
            // Send goodbye to all peers
            this.broadcast({
                type: 'bye',
                senderId: this.myTwinId,
            });

            this.provider.destroy();
            this.provider = null;
        }

        this.peers.clear();
        this.pendingNegotiations.clear();
    }

    /**
     * Announce presence to all peers
     */
    private announcePresence(): void {
        const presence = this.ydoc.getMap('presence');
        presence.set(this.myTwinId, {
            profile: this.myProfile,
            timestamp: Date.now(),
            active: true,
        });
    }

    // ========================================================================
    // Negotiation Protocol
    // ========================================================================

    /**
     * Start negotiation with a specific peer
     */
    async negotiateWith(peerId: string): Promise<NegotiationResult | null> {
        const peer = this.peers.get(peerId);
        if (!peer || peer.connectionState !== 'connected') {
            return null;
        }

        // Send interest signal
        this.sendToPeer(peerId, {
            type: 'interest',
            senderId: this.myTwinId,
            senderProfile: this.myProfile,
            interestLevel: this.calculateInterest(peer.profile),
        });

        // Wait for response (with timeout)
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.pendingNegotiations.delete(peerId);
                resolve(null);
            }, 10000);

            this.pendingNegotiations.set(peerId, Date.now());

            // Check for response periodically
            const checkInterval = setInterval(() => {
                if (!this.pendingNegotiations.has(peerId)) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);

                    const result = this.buildNegotiationResult(peerId);
                    resolve(result);
                }
            }, 500);
        });
    }

    /**
     * Send delta update (minimal data transfer)
     */
    sendDelta(delta: TwinDelta): void {
        this.broadcast({
            type: 'delta',
            senderId: this.myTwinId,
            delta,
        });
    }

    /**
     * Broadcast message to all connected peers
     */
    private broadcast(message: NegotiationMessage): void {
        const messages = this.ydoc.getArray<NegotiationMessage>('messages');
        messages.push([message]);
    }

    /**
     * Send message to specific peer (via shared messages)
     */
    private sendToPeer(peerId: string, message: NegotiationMessage): void {
        // In y-webrtc, we use the shared doc - messages are visible to all
        // but we include target ID in the message for filtering
        const extendedMessage = {
            ...message,
            targetId: peerId,
        };
        const messages = this.ydoc.getArray<NegotiationMessage>('messages');
        messages.push([extendedMessage]);
    }

    // ========================================================================
    // Event Handlers
    // ========================================================================

    /**
     * Handle awareness state changes (peer join/leave)
     */
    private handleAwarenessChange(): void {
        if (!this.provider) return;

        const states = this.provider.awareness.getStates();
        const currentPeerIds = new Set<string>();

        states.forEach((state) => {
            if (!state || !state.twinId || state.twinId === this.myTwinId) return;

            const peerId = state.twinId as string;
            currentPeerIds.add(peerId);

            if (!this.peers.has(peerId)) {
                // New peer connected
                const peer: PeerTwin = {
                    peerId,
                    profile: state.profile as PublicProfile,
                    connectionState: 'connected',
                    lastSeen: new Date(),
                    deltas: [],
                };
                this.peers.set(peerId, peer);

                // Send hello
                this.sendToPeer(peerId, {
                    type: 'hello',
                    senderId: this.myTwinId,
                    senderProfile: this.myProfile,
                });

                this.onPeerConnected?.(peer);
            }
        });

        // Check for disconnected peers
        this.peers.forEach((peer, peerId) => {
            if (!currentPeerIds.has(peerId)) {
                peer.connectionState = 'disconnected';
                this.onPeerDisconnected?.(peer);
                this.peers.delete(peerId);
            }
        });
    }

    /**
     * Handle presence map changes
     */
    private handlePresenceChange(): void {
        const presence = this.ydoc.getMap('presence');

        presence.forEach((value, key) => {
            if (key === this.myTwinId) return;

            const data = value as { profile: PublicProfile; timestamp: number; active: boolean };

            if (data.active && !this.peers.has(key)) {
                // Discovered new peer via presence map
                const peer: PeerTwin = {
                    peerId: key,
                    profile: data.profile,
                    connectionState: 'connected',
                    lastSeen: new Date(data.timestamp),
                    deltas: [],
                };
                this.peers.set(key, peer);
            }
        });
    }

    /**
     * Handle new negotiation messages
     */
    private handleNewMessages(): void {
        const messages = this.ydoc.getArray<NegotiationMessage>('messages');
        const recentMessages = messages.toArray().slice(-10); // Last 10 messages

        for (const msg of recentMessages) {
            if (msg.senderId === this.myTwinId) continue; // Skip own messages

            // Check if targeted at us
            const extMsg = msg as NegotiationMessage & { targetId?: string };
            if (extMsg.targetId && extMsg.targetId !== this.myTwinId) continue;

            switch (msg.type) {
                case 'hello':
                    this.handleHello(msg);
                    break;
                case 'delta':
                    this.handleDelta(msg);
                    break;
                case 'interest':
                    this.handleInterest(msg);
                    break;
                case 'ack':
                    this.handleAck(msg);
                    break;
            }
        }
    }

    private handleHello(msg: NegotiationMessage): void {
        const peer = this.peers.get(msg.senderId);
        if (peer && msg.senderProfile) {
            // Update peer profile with full data
            peer.profile = {
                ...peer.profile,
                ...msg.senderProfile,
            } as PublicProfile;
        }
    }

    private handleDelta(msg: NegotiationMessage): void {
        if (!msg.delta) return;

        const peer = this.peers.get(msg.senderId);
        if (peer) {
            peer.deltas.push(msg.delta);
            peer.lastSeen = new Date();

            // Apply delta to peer profile
            this.applyDelta(peer, msg.delta);
        }
    }

    private handleInterest(msg: NegotiationMessage): void {
        const peer = this.peers.get(msg.senderId);
        if (!peer) return;

        // Calculate our interest level
        const ourInterest = this.calculateInterest(peer.profile);
        const theirInterest = msg.interestLevel ?? 0;

        // Send acknowledgment with our interest level
        this.sendToPeer(msg.senderId, {
            type: 'ack',
            senderId: this.myTwinId,
            interestLevel: ourInterest,
        });

        // If mutual interest is high, notify
        const mutualInterest = Math.min(ourInterest, theirInterest);
        if (mutualInterest >= 70) {
            const result: NegotiationResult = {
                peerId: peer.peerId,
                peerProfile: peer.profile,
                mutualInterest,
                negotiatedAt: new Date(),
            };
            this.onMatchFound?.(result);
        }
    }

    private handleAck(msg: NegotiationMessage): void {
        // Clear pending negotiation
        if (this.pendingNegotiations.has(msg.senderId)) {
            this.pendingNegotiations.delete(msg.senderId);
        }
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================

    /**
     * Apply delta update to peer profile
     */
    private applyDelta(peer: PeerTwin, delta: TwinDelta): void {
        const profile = peer.profile;

        switch (delta.type) {
            case 'traits':
                if (delta.action === 'add' && typeof delta.value === 'string') {
                    profile.skills = [...profile.skills, delta.value];
                } else if (delta.action === 'remove' && typeof delta.value === 'string') {
                    profile.skills = profile.skills.filter(s => s !== delta.value);
                }
                break;
            case 'seeking':
                if (delta.action === 'update' && typeof delta.value === 'string') {
                    profile.headline = delta.value;
                }
                break;
        }
    }

    /**
     * Calculate interest level in a peer (0-100)
     */
    private calculateInterest(peerProfile: PublicProfile): number {
        const sharedSkills = this.findSharedItems(this.myProfile.skills, peerProfile.skills);
        const sharedInterests = this.findSharedItems(this.myProfile.interests, peerProfile.interests);

        const skillScore = sharedSkills.length * 15;
        const interestScore = sharedInterests.length * 10;
        const baseScore = 30;

        return Math.min(100, baseScore + skillScore + interestScore);
    }

    /**
     * Find shared items between arrays
     */
    private findSharedItems(arr1: string[], arr2: string[]): string[] {
        const set1 = new Set(arr1.map(s => s.toLowerCase()));
        return arr2.filter(item => set1.has(item.toLowerCase()));
    }

    /**
     * Build negotiation result for a peer
     */
    private buildNegotiationResult(peerId: string): NegotiationResult | null {
        const peer = this.peers.get(peerId);
        if (!peer) return null;

        return {
            peerId: peer.peerId,
            peerProfile: peer.profile,
            mutualInterest: this.calculateInterest(peer.profile),
            negotiatedAt: new Date(),
        };
    }

    // ========================================================================
    // Event Registration
    // ========================================================================

    onPeerConnect(handler: PeerEventHandler): void {
        this.onPeerConnected = handler;
    }

    onPeerDisconnect(handler: PeerEventHandler): void {
        this.onPeerDisconnected = handler;
    }

    onMatch(handler: MatchEventHandler): void {
        this.onMatchFound = handler;
    }

    // ========================================================================
    // Getters
    // ========================================================================

    getConnectedPeers(): PeerTwin[] {
        return Array.from(this.peers.values()).filter(p => p.connectionState === 'connected');
    }

    getPeerCount(): number {
        return this.peers.size;
    }

    isConnected(): boolean {
        return this.provider !== null && this.provider.connected;
    }
}

// ============================================================================
// Factory Functions
// ============================================================================

let negotiatorInstance: TwinNegotiator | null = null;

/**
 * Create or get the negotiator instance
 */
export function getTwinNegotiator(twinId?: string, profile?: PublicProfile): TwinNegotiator | null {
    if (!negotiatorInstance && twinId && profile) {
        negotiatorInstance = new TwinNegotiator(twinId, profile);
    }
    return negotiatorInstance;
}

/**
 * Reset the negotiator (for testing or logout)
 */
export function resetNegotiator(): void {
    if (negotiatorInstance) {
        negotiatorInstance.leaveRoom();
        negotiatorInstance = null;
    }
}

// ============================================================================
// Delta Helpers
// ============================================================================

/**
 * Create a traits delta (add/remove skills)
 */
export function createTraitsDelta(skills: string[], action: 'add' | 'remove'): TwinDelta {
    return {
        type: 'traits',
        action,
        value: skills,
        timestamp: Date.now(),
    };
}

/**
 * Create a seeking delta (update headline/objective)
 */
export function createSeekingDelta(seeking: string): TwinDelta {
    return {
        type: 'seeking',
        action: 'update',
        value: seeking,
        timestamp: Date.now(),
    };
}
