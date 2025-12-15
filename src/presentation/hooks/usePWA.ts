'use client';

import { useEffect, useState, useCallback } from 'react';
import { Twin } from '@/domain/entities/Twin';

// ============================================================================
// Types
// ============================================================================

interface UsePWAResult {
    // Install state
    isInstallable: boolean;
    isInstalled: boolean;
    install: () => Promise<void>;

    // Network state
    isOnline: boolean;

    // Notification state
    notificationPermission: NotificationPermission | null;
    requestNotificationPermission: () => Promise<boolean>;

    // Service Worker state
    swRegistration: ServiceWorkerRegistration | null;
    swReady: boolean;

    // Twin Brain state
    twinBrainActive: boolean;
    activateTwinBrain: (twin: Twin) => Promise<boolean>;
    deactivateTwinBrain: () => void;
    requestBackgroundMatch: (candidates: unknown[]) => Promise<unknown[]>;

    // Sync state
    lastSyncTime: Date | null;
    triggerSync: () => Promise<void>;
}

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface TwinBrainMessage {
    type: string;
    success?: boolean;
    error?: string;
    matches?: unknown[];
    twinBrainActive?: boolean;
    hasTwin?: boolean;
    twinId?: string;
    lastMatchTime?: number;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePWA(): UsePWAResult {
    // Install state
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    // Network state
    const [isOnline, setIsOnline] = useState(true);

    // Notification state
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);

    // Service Worker state
    const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
    const [swReady, setSwReady] = useState(false);

    // Twin Brain state
    const [twinBrainActive, setTwinBrainActive] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    // ========================================================================
    // Service Worker Message Handler (Hoisted)
    // ========================================================================

    const handleSWMessage = useCallback((event: MessageEvent<TwinBrainMessage>) => {
        const { type, ...data } = event.data;
        console.log('[usePWA] SW message:', type, data);

        switch (type) {
            case 'STATUS':
                setTwinBrainActive(data.twinBrainActive ?? false);
                if (data.lastMatchTime) {
                    setLastSyncTime(new Date(data.lastMatchTime));
                }
                break;

            case 'TWIN_ACTIVATED':
                setTwinBrainActive(data.success ?? false);
                break;

            case 'TWIN_DEACTIVATED':
                setTwinBrainActive(false);
                break;

            case 'SYNC_COMPLETE':
                setLastSyncTime(new Date());
                break;
        }
    }, []);

    // ========================================================================
    // Send Message to Service Worker (Hoisted)
    // ========================================================================

    const sendSWMessage = useCallback(async (message: { type: string; payload?: unknown }) => {
        const controller = navigator.serviceWorker?.controller;
        if (!controller) {
            console.warn('[usePWA] No active SW controller');
            return null;
        }

        return new Promise((resolve, reject) => {
            const messageChannel = new MessageChannel();

            messageChannel.port1.onmessage = (event) => {
                resolve(event.data);
            };

            controller.postMessage(message, [messageChannel.port2]);

            // Timeout after 10 seconds
            setTimeout(() => reject(new Error('SW message timeout')), 10000);
        });
    }, []);

    // ========================================================================
    // Initialize
    // ========================================================================

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsInstalled(true);
        }

        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('[usePWA] Service Worker registered');
                    setSwRegistration(registration);

                    // Wait for ready
                    navigator.serviceWorker.ready.then(() => {
                        setSwReady(true);
                        // Get initial status
                        sendSWMessage({ type: 'GET_STATUS' });
                    });
                })
                .catch((error) => {
                    console.error('[usePWA] SW registration failed:', error);
                });

            // Listen for SW messages
            navigator.serviceWorker.addEventListener('message', handleSWMessage);
        }

        // Listen for install prompt
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Online/offline status
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOnline(navigator.onLine);

        // Check notification permission
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', handleSWMessage);
            }
        };
    }, [handleSWMessage, sendSWMessage]);

    // ========================================================================
    // Install
    // ========================================================================

    const install = useCallback(async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsInstalled(true);
            console.log('[usePWA] App installed');
        }

        setDeferredPrompt(null);
        setIsInstallable(false);
    }, [deferredPrompt]);

    // ========================================================================
    // Notifications
    // ========================================================================

    const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
        if (!('Notification' in window)) return false;

        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);

        return permission === 'granted';
    }, []);

    // ========================================================================
    // Twin Brain Control
    // ========================================================================

    const activateTwinBrain = useCallback(async (twin: Twin): Promise<boolean> => {
        if (!swReady) {
            console.warn('[usePWA] SW not ready');
            return false;
        }

        try {
            await sendSWMessage({
                type: 'ACTIVATE_TWIN',
                payload: {
                    id: twin.id,
                    profile: twin.publicProfile,
                },
            });

            setTwinBrainActive(true);
            return true;
        } catch (error) {
            console.error('[usePWA] Failed to activate twin brain:', error);
            return false;
        }
    }, [swReady, sendSWMessage]);

    const deactivateTwinBrain = useCallback(() => {
        if (swReady) {
            sendSWMessage({ type: 'DEACTIVATE_TWIN' });
        }
        setTwinBrainActive(false);
    }, [swReady, sendSWMessage]);

    const requestBackgroundMatch = useCallback(async (candidates: unknown[]): Promise<unknown[]> => {
        if (!swReady || !twinBrainActive) {
            console.warn('[usePWA] Twin brain not ready for matching');
            return [];
        }

        try {
            const result = await sendSWMessage({
                type: 'REQUEST_MATCHES',
                payload: { candidates },
            }) as TwinBrainMessage | null;

            return result?.matches || [];
        } catch (error) {
            console.error('[usePWA] Background match failed:', error);
            return [];
        }
    }, [swReady, twinBrainActive, sendSWMessage]);

    // ========================================================================
    // Sync Control
    // ========================================================================

    const triggerSync = useCallback(async () => {
        if (!swReady) return;

        try {
            // Try Background Sync API first
            if (swRegistration && 'sync' in swRegistration) {
                await (swRegistration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('twin-background-sync');
            } else {
                // Fallback to manual sync message
                await sendSWMessage({ type: 'SYNC_NOW' });
            }

            setLastSyncTime(new Date());
        } catch (error) {
            console.error('[usePWA] Sync trigger failed:', error);
        }
    }, [swReady, swRegistration, sendSWMessage]);

    // ========================================================================
    // Return
    // ========================================================================

    return {
        // Install state
        isInstallable,
        isInstalled,
        install,

        // Network state
        isOnline,

        // Notification state
        notificationPermission,
        requestNotificationPermission,

        // Service Worker state
        swRegistration,
        swReady,

        // Twin Brain state
        twinBrainActive,
        activateTwinBrain,
        deactivateTwinBrain,
        requestBackgroundMatch,

        // Sync state
        lastSyncTime,
        triggerSync,
    };
}

// ============================================================================
// Helper Hook: Use Twin Brain Status
// ============================================================================

export function useTwinBrainStatus() {
    const { twinBrainActive, swReady, isOnline, lastSyncTime } = usePWA();

    return {
        isActive: twinBrainActive,
        isReady: swReady,
        isOnline,
        lastSync: lastSyncTime,
        status: twinBrainActive
            ? 'active'
            : swReady
                ? 'ready'
                : 'initializing',
    };
}
