// ============================================================================
// Personal Twin Network - Service Worker
// Twin Brain: Runs 24/7 for background matching and P2P negotiation
// ============================================================================

const CACHE_NAME = 'twin-network-v2';
const SYNC_TAG = 'twin-background-sync';
const PERIODIC_SYNC_TAG = 'twin-periodic-match';
const DB_NAME = 'twin-brain';

// Static assets to cache for offline use
const STATIC_ASSETS = [
    '/',
    '/dashboard',
    '/manifest.json',
];

// Twin Brain State (in-memory cache for quick access)
let twinBrainActive = false;
let activeTwinData = null;
let lastMatchTime = 0;

// ============================================================================
// INSTALL - Cache static assets and initialize twin brain
// ============================================================================

self.addEventListener('install', (event) => {
    console.log('[SW] Installing Twin Brain Service Worker v2');

    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
            // Initialize twin brain state
            initTwinBrain(),
        ])
    );

    self.skipWaiting();
});

// ============================================================================
// ACTIVATE - Clean old caches and claim clients
// ============================================================================

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Twin Brain Service Worker');

    event.waitUntil(
        Promise.all([
            // Clean old caches
            caches.keys().then((names) =>
                Promise.all(
                    names
                        .filter((n) => n !== CACHE_NAME)
                        .map((n) => caches.delete(n))
                )
            ),
            // Register periodic sync if supported
            registerPeriodicSync(),
        ])
    );

    self.clients.claim();
});

// ============================================================================
// FETCH - Network first with cache fallback
// ============================================================================

self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // Skip API calls - let them go straight to network
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() =>
                caches.match(event.request).then((r) =>
                    r || new Response('Offline - Twin Brain Active', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain' }
                    })
                )
            )
    );
});

// ============================================================================
// MESSAGE HANDLER - Communication with main thread
// ============================================================================

self.addEventListener('message', (event) => {
    const { type, payload } = event.data || {};

    console.log('[SW] Received message:', type);

    switch (type) {
        case 'ACTIVATE_TWIN':
            handleTwinActivation(payload, event.source);
            break;

        case 'DEACTIVATE_TWIN':
            handleTwinDeactivation(event.source);
            break;

        case 'REQUEST_MATCHES':
            handleMatchRequest(payload, event.source);
            break;

        case 'GET_STATUS':
            handleStatusRequest(event.source);
            break;

        case 'SYNC_NOW':
            handleImmediateSync(event.source);
            break;

        default:
            console.warn('[SW] Unknown message type:', type);
    }
});

// ============================================================================
// BACKGROUND SYNC - Runs when device comes online
// ============================================================================

self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);

    if (event.tag === SYNC_TAG) {
        event.waitUntil(performTwinSync());
    }
});

// ============================================================================
// PERIODIC BACKGROUND SYNC - Runs every 30 minutes
// ============================================================================

self.addEventListener('periodicsync', (event) => {
    console.log('[SW] Periodic sync triggered:', event.tag);

    if (event.tag === PERIODIC_SYNC_TAG) {
        event.waitUntil(performPeriodicMatching());
    }
});

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    let data = { title: 'New Match!', body: 'Your twin found someone' };

    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        console.warn('[SW] Could not parse push data');
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            vibrate: [200, 100, 200],
            tag: 'twin-match',
            data: data,
            actions: [
                { action: 'view', title: 'View Match' },
                { action: 'dismiss', title: 'Later' },
            ],
        })
    );
});

// ============================================================================
// NOTIFICATION CLICK
// ============================================================================

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Try to focus existing window
                for (const client of clientList) {
                    if (client.url.includes('/dashboard') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window
                return clients.openWindow('/dashboard');
            })
    );
});

// ============================================================================
// TWIN BRAIN INITIALIZATION
// ============================================================================

async function initTwinBrain() {
    console.log('[SW] Initializing Twin Brain');

    try {
        // Check for existing twin data in IndexedDB
        const db = await openTwinDB();
        const twin = await getTwinFromDB(db);

        if (twin) {
            twinBrainActive = true;
            activeTwinData = twin;
            console.log('[SW] Twin Brain loaded existing twin');
        }

        db.close();
    } catch (error) {
        console.error('[SW] Failed to initialize twin brain:', error);
    }
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

async function handleTwinActivation(payload, source) {
    console.log('[SW] Activating twin:', payload?.id);

    try {
        activeTwinData = payload;
        twinBrainActive = true;

        // Store in IndexedDB for persistence
        const db = await openTwinDB();
        await storeTwinInDB(db, payload);
        db.close();

        // Respond to main thread
        source?.postMessage({
            type: 'TWIN_ACTIVATED',
            success: true,
            twinId: payload?.id,
        });

        // Register background sync
        await registerBackgroundSync();

    } catch (error) {
        console.error('[SW] Twin activation failed:', error);
        source?.postMessage({
            type: 'TWIN_ACTIVATED',
            success: false,
            error: error.message,
        });
    }
}

function handleTwinDeactivation(source) {
    console.log('[SW] Deactivating twin');

    twinBrainActive = false;
    activeTwinData = null;

    source?.postMessage({
        type: 'TWIN_DEACTIVATED',
        success: true,
    });
}

async function handleMatchRequest(payload, source) {
    console.log('[SW] Match request received:', payload);

    if (!twinBrainActive || !activeTwinData) {
        source?.postMessage({
            type: 'MATCH_RESULT',
            success: false,
            error: 'Twin brain not active',
        });
        return;
    }

    try {
        // Perform local matching
        const matches = await performLocalMatching(payload?.candidates || []);

        source?.postMessage({
            type: 'MATCH_RESULT',
            success: true,
            matches,
            source: 'background',
        });

    } catch (error) {
        console.error('[SW] Match request failed:', error);
        source?.postMessage({
            type: 'MATCH_RESULT',
            success: false,
            error: error.message,
        });
    }
}

function handleStatusRequest(source) {
    source?.postMessage({
        type: 'STATUS',
        twinBrainActive,
        hasTwin: !!activeTwinData,
        twinId: activeTwinData?.id,
        lastMatchTime,
    });
}

async function handleImmediateSync(source) {
    console.log('[SW] Immediate sync requested');

    try {
        await performTwinSync();
        source?.postMessage({
            type: 'SYNC_COMPLETE',
            success: true,
        });
    } catch (error) {
        source?.postMessage({
            type: 'SYNC_COMPLETE',
            success: false,
            error: error.message,
        });
    }
}

// ============================================================================
// BACKGROUND OPERATIONS
// ============================================================================

async function performTwinSync() {
    console.log('[SW] Performing twin sync');

    if (!twinBrainActive || !activeTwinData) {
        console.log('[SW] No active twin, skipping sync');
        return;
    }

    try {
        // Get pending sync operations from IndexedDB
        const db = await openTwinDB();
        const pending = await getPendingSyncs(db);

        for (const op of pending) {
            // Process each pending operation
            console.log('[SW] Processing sync op:', op.type);
            // In production, send to server here
            await removeSyncOp(db, op.id);
        }

        // Update last sync time
        await updateLastSync(db);
        db.close();

        console.log('[SW] Twin sync complete');

    } catch (error) {
        console.error('[SW] Twin sync failed:', error);
    }
}

async function performPeriodicMatching() {
    console.log('[SW] Performing periodic matching');

    if (!twinBrainActive || !activeTwinData) {
        return;
    }

    try {
        // Get candidates from local cache
        const db = await openTwinDB();
        const candidates = await getCandidatesFromDB(db);
        db.close();

        if (candidates.length === 0) {
            console.log('[SW] No candidates for matching');
            return;
        }

        // Perform local matching
        const matches = await performLocalMatching(candidates);

        // If high-quality matches found, show notification
        const topMatch = matches[0];
        if (topMatch && topMatch.score >= 80) {
            await showMatchNotification(topMatch);
        }

        lastMatchTime = Date.now();

    } catch (error) {
        console.error('[SW] Periodic matching failed:', error);
    }
}

async function performLocalMatching(candidates) {
    console.log('[SW] Local matching with', candidates.length, 'candidates');

    if (!activeTwinData?.profile) {
        return [];
    }

    const myProfile = activeTwinData.profile;
    const matches = [];

    for (const candidate of candidates) {
        const score = calculateLocalScore(myProfile, candidate);
        const shared = findSharedItems(
            [...(myProfile.skills || []), ...(myProfile.interests || [])],
            [...(candidate.skills || []), ...(candidate.interests || [])]
        );

        matches.push({
            matchedTwinId: candidate.id || `twin-${candidate.name?.toLowerCase().replace(/\s/g, '-')}`,
            matchedProfile: {
                name: candidate.name,
                headline: candidate.headline,
            },
            score,
            sharedInterests: shared,
            createdAt: new Date().toISOString(),
        });
    }

    return matches.sort((a, b) => b.score - a.score);
}

function calculateLocalScore(profile1, profile2) {
    const sharedSkills = findSharedItems(profile1.skills || [], profile2.skills || []);
    const sharedInterests = findSharedItems(profile1.interests || [], profile2.interests || []);

    const skillScore = sharedSkills.length * 15;
    const interestScore = sharedInterests.length * 10;
    const baseScore = 30;

    return Math.min(100, baseScore + skillScore + interestScore);
}

function findSharedItems(arr1, arr2) {
    const set1 = new Set((arr1 || []).map(s => s.toLowerCase()));
    return (arr2 || []).filter(item => set1.has(item.toLowerCase()));
}

async function showMatchNotification(match) {
    const title = `🎯 New Match: ${match.matchedProfile?.name}`;
    const body = `${match.score}% match - ${match.sharedInterests?.slice(0, 2).join(', ')}`;

    await self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'twin-match',
        data: { match },
        actions: [
            { action: 'view', title: 'View' },
            { action: 'dismiss', title: 'Later' },
        ],
    });
}

// ============================================================================
// SYNC REGISTRATION
// ============================================================================

async function registerBackgroundSync() {
    try {
        await self.registration.sync.register(SYNC_TAG);
        console.log('[SW] Background sync registered');
    } catch (error) {
        console.warn('[SW] Background sync not supported:', error);
    }
}

async function registerPeriodicSync() {
    try {
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' });

        if (status.state === 'granted') {
            await self.registration.periodicSync.register(PERIODIC_SYNC_TAG, {
                minInterval: 30 * 60 * 1000, // 30 minutes
            });
            console.log('[SW] Periodic sync registered (30 min interval)');
        } else {
            console.log('[SW] Periodic sync permission not granted');
        }
    } catch (error) {
        console.warn('[SW] Periodic sync not supported:', error);
    }
}

// ============================================================================
// INDEXEDDB HELPERS (Direct access without idb library)
// ============================================================================

function openTwinDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('twin')) {
                db.createObjectStore('twin');
            }
            if (!db.objectStoreNames.contains('matches')) {
                const matchStore = db.createObjectStore('matches', { keyPath: 'matchedTwinId' });
                matchStore.createIndex('by-score', 'score');
            }
            if (!db.objectStoreNames.contains('candidates')) {
                const candidateStore = db.createObjectStore('candidates', { keyPath: 'id' });
                candidateStore.createIndex('by-event', 'eventId');
            }
            if (!db.objectStoreNames.contains('sync_queue')) {
                db.createObjectStore('sync_queue', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('config')) {
                db.createObjectStore('config');
            }
        };
    });
}

function getTwinFromDB(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('twin', 'readonly');
        const store = tx.objectStore('twin');
        const request = store.get('active');

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

function storeTwinInDB(db, twinData) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('twin', 'readwrite');
        const store = tx.objectStore('twin');
        const request = store.put(twinData, 'active');

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

function getCandidatesFromDB(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('candidates', 'readonly');
        const store = tx.objectStore('candidates');
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

function getPendingSyncs(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readonly');
        const store = tx.objectStore('sync_queue');
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

function removeSyncOp(db, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readwrite');
        const store = tx.objectStore('sync_queue');
        const request = store.delete(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

function updateLastSync(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('config', 'readwrite');
        const store = tx.objectStore('config');
        const request = store.put(new Date().toISOString(), 'lastSync');

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

console.log('[SW] Twin Brain Service Worker loaded');
