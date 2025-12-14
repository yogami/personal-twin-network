'use client';

import { useEffect, useState } from 'react';

interface UsePWAResult {
    isInstallable: boolean;
    isInstalled: boolean;
    isOnline: boolean;
    install: () => Promise<void>;
    notificationPermission: NotificationPermission | null;
    requestNotificationPermission: () => Promise<boolean>;
}

export function usePWA(): UsePWAResult {
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(console.error);
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
        };
    }, []);

    const install = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    const requestNotificationPermission = async (): Promise<boolean> => {
        if (!('Notification' in window)) return false;
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        return permission === 'granted';
    };

    return {
        isInstallable,
        isInstalled,
        isOnline,
        install,
        notificationPermission,
        requestNotificationPermission,
    };
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
