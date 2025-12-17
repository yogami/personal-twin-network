/**
 * P2PTwinExchange - WebRTC-based peer-to-peer twin exchange
 * 
 * Uses y-webrtc for P2P connections with encrypted payloads.
 * Enables twins to exchange embeddings directly without central server.
 * 
 * Privacy guarantees:
 * - Only encrypted embedding hashes are exchanged
 * - Full twin profiles never leave the device
 * - Signatures verify authenticity
 */

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { getCryptoService, CryptoService } from '@/infrastructure/crypto/CryptoService';
import {
    EncryptedQRPayload,
    createEncryptedQRPayload,
    isPayloadExpired,
    serializePayload,
    deserializePayload
} from '@/domain/entities/EncryptedQRPayload';
import { Twin } from '@/domain/entities/Twin';

/**
 * Encrypted twin data for P2P exchange
 */
export interface EncryptedTwinData {
    twinId: string;
    embeddingHash: string;
    signature: string;
    publicKey: string;
    // Minimal public info for display (encrypted)
    encryptedPreview: string;
    previewIv: string;
}

/**
 * Status of P2P connection
 */
export type P2PConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Events emitted by P2PTwinExchange
 */
export interface P2PEvents {
    onStatusChange: (status: P2PConnectionStatus) => void;
    onPeerJoined: (peerId: string) => void;
    onPeerLeft: (peerId: string) => void;
    onTwinReceived: (data: EncryptedTwinData) => void;
    onError: (error: Error) => void;
}

/**
 * P2PTwinExchange - Manages peer-to-peer twin exchange
 */
export class P2PTwinExchange {
    private ydoc: Y.Doc | null = null;
    private provider: WebrtcProvider | null = null;
    private twins: Y.Map<EncryptedTwinData> | null = null;
    private cryptoService: CryptoService;
    private status: P2PConnectionStatus = 'disconnected';
    private events: Partial<P2PEvents> = {};

    constructor(cryptoService?: CryptoService) {
        this.cryptoService = cryptoService || getCryptoService();
    }

    /**
     * Generate a QR payload for this user's twin
     */
    async generateQRPayload(twin: Twin): Promise<string> {
        const keyPair = await this.cryptoService.getKeyPair();
        const publicKey = await this.cryptoService.exportPublicKey(keyPair.publicKey);

        // Hash the embedding (never expose raw embedding)
        const embeddingHash = twin.publicProfile.embedding
            ? await this.cryptoService.hashEmbedding(twin.publicProfile.embedding)
            : await this.cryptoService.hash(twin.id);

        // Sign the hash for authenticity
        const signature = await this.cryptoService.sign(embeddingHash, keyPair.privateKey);

        // Generate unique room ID
        const roomId = this.cryptoService.generateRoomId();

        const payload = createEncryptedQRPayload({
            embeddingHash,
            signature,
            publicKey,
            roomId,
            expirationMinutes: 30,
        });

        return serializePayload(payload);
    }

    /**
     * Parse a QR payload scanned from another user
     */
    parseQRPayload(encoded: string): EncryptedQRPayload | null {
        const payload = deserializePayload(encoded);
        if (!payload) return null;
        if (isPayloadExpired(payload)) return null;
        return payload;
    }

    /**
     * Connect to a P2P room using a scanned QR payload
     */
    async connect(payload: EncryptedQRPayload): Promise<void> {
        if (this.provider) {
            await this.disconnect();
        }

        this.setStatus('connecting');

        try {
            // Create Yjs document for sync
            this.ydoc = new Y.Doc();
            this.twins = this.ydoc.getMap<EncryptedTwinData>('twins');

            // Connect via WebRTC with room from payload
            this.provider = new WebrtcProvider(payload.peerInfo.roomId, this.ydoc, {
                signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com'],
            });

            // Set up event handlers
            this.setupEventHandlers();

            this.setStatus('connected');
        } catch (error) {
            this.setStatus('error');
            this.events.onError?.(error as Error);
            throw error;
        }
    }

    /**
     * Host a new P2P room for others to join
     */
    async host(twin: Twin): Promise<string> {
        const qrPayload = await this.generateQRPayload(twin);
        const payload = deserializePayload(qrPayload)!;

        await this.connect(payload);
        await this.broadcastTwin(twin);

        return qrPayload;
    }

    /**
     * Broadcast this user's twin to connected peers
     */
    async broadcastTwin(twin: Twin): Promise<void> {
        if (!this.twins) throw new Error('Not connected');

        const keyPair = await this.cryptoService.getKeyPair();
        const publicKey = await this.cryptoService.exportPublicKey(keyPair.publicKey);

        // Hash embedding
        const embeddingHash = twin.publicProfile.embedding
            ? await this.cryptoService.hashEmbedding(twin.publicProfile.embedding)
            : await this.cryptoService.hash(twin.id);

        // Sign for authenticity
        const signature = await this.cryptoService.sign(embeddingHash, keyPair.privateKey);

        // Encrypt minimal preview (name + headline only)
        const aesKey = await this.cryptoService.generateAESKey();
        const preview = JSON.stringify({
            name: twin.publicProfile.name,
            headline: twin.publicProfile.headline,
        });
        const { ciphertext, iv } = await this.cryptoService.encrypt(preview, aesKey);

        const encryptedData: EncryptedTwinData = {
            twinId: twin.id,
            embeddingHash,
            signature,
            publicKey,
            encryptedPreview: ciphertext,
            previewIv: iv,
        };

        // Add to shared map (syncs to all peers)
        this.twins.set(twin.id, encryptedData);
    }

    /**
     * Get all received twins from peers
     */
    getReceivedTwins(): EncryptedTwinData[] {
        if (!this.twins) return [];
        return Array.from(this.twins.values());
    }

    /**
     * Verify a received twin's signature
     */
    async verifyTwin(data: EncryptedTwinData): Promise<boolean> {
        try {
            const publicKey = await this.cryptoService.importPublicKey(data.publicKey);
            return this.cryptoService.verify(data.embeddingHash, data.signature, publicKey);
        } catch {
            return false;
        }
    }

    /**
     * Disconnect from P2P network
     */
    async disconnect(): Promise<void> {
        if (this.provider) {
            this.provider.destroy();
            this.provider = null;
        }
        if (this.ydoc) {
            this.ydoc.destroy();
            this.ydoc = null;
        }
        this.twins = null;
        this.setStatus('disconnected');
    }

    /**
     * Get current connection status
     */
    getStatus(): P2PConnectionStatus {
        return this.status;
    }

    /**
     * Register event handlers
     */
    on<K extends keyof P2PEvents>(event: K, handler: P2PEvents[K]): void {
        this.events[event] = handler;
    }

    private setStatus(status: P2PConnectionStatus): void {
        this.status = status;
        this.events.onStatusChange?.(status);
    }

    private setupEventHandlers(): void {
        if (!this.provider || !this.twins) return;

        // Track peer connections
        this.provider.on('peers', (event: { added: string[]; removed: string[] }) => {
            event.added.forEach(peerId => this.events.onPeerJoined?.(peerId));
            event.removed.forEach(peerId => this.events.onPeerLeft?.(peerId));
        });

        // Track twin data changes
        this.twins.observe((event) => {
            event.changes.keys.forEach((change, key) => {
                if (change.action === 'add' || change.action === 'update') {
                    const data = this.twins?.get(key);
                    if (data) {
                        this.events.onTwinReceived?.(data);
                    }
                }
            });
        });
    }
}

// Singleton for convenient access
let p2pExchangeInstance: P2PTwinExchange | null = null;

export function getP2PTwinExchange(): P2PTwinExchange {
    if (!p2pExchangeInstance) {
        p2pExchangeInstance = new P2PTwinExchange();
    }
    return p2pExchangeInstance;
}
