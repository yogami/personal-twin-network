'use client';

import { usePWA } from '@/presentation/hooks/usePWA';

export function PWAInstallBanner() {
    const { isInstallable, isInstalled, install, isOnline, notificationPermission, requestNotificationPermission } = usePWA();

    if (isInstalled) {
        return (
            <div className="pwa-banner installed">
                <span>✓ App Installed</span>
                {notificationPermission !== 'granted' && (
                    <button onClick={requestNotificationPermission} className="notify-btn">
                        🔔 Enable Notifications
                    </button>
                )}
                <style jsx>{styles}</style>
            </div>
        );
    }

    if (!isInstallable) return null;

    return (
        <div className="pwa-banner">
            <div className="banner-content">
                <span className="icon">📱</span>
                <div className="text">
                    <strong>Install App</strong>
                    <span>Get matches faster with offline access</span>
                </div>
            </div>
            <button onClick={install} className="install-btn">
                Install
            </button>
            <style jsx>{styles}</style>
        </div>
    );
}

const styles = `
  .pwa-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
    border: 1px solid rgba(102, 126, 234, 0.3);
    border-radius: 12px;
    margin-bottom: 1rem;
    color: white;
  }
  .pwa-banner.installed {
    background: rgba(74, 222, 128, 0.1);
    border-color: rgba(74, 222, 128, 0.3);
    color: #4ade80;
    justify-content: center;
    gap: 1rem;
  }
  .banner-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .icon {
    font-size: 1.5rem;
  }
  .text {
    display: flex;
    flex-direction: column;
  }
  .text strong {
    font-size: 0.875rem;
  }
  .text span {
    font-size: 0.75rem;
    opacity: 0.8;
  }
  .install-btn {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  }
  .install-btn:hover {
    transform: scale(1.05);
  }
  .notify-btn {
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: white;
    font-size: 0.75rem;
    cursor: pointer;
  }
`;

export function OfflineBanner() {
    const { isOnline } = usePWA();

    if (isOnline) return null;

    return (
        <div className="offline-banner">
            ⚡ You&apos;re offline - some features may be limited
            <style jsx>{`
        .offline-banner {
          padding: 0.75rem;
          background: rgba(250, 204, 21, 0.2);
          border: 1px solid rgba(250, 204, 21, 0.3);
          border-radius: 8px;
          text-align: center;
          color: #facc15;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
      `}</style>
        </div>
    );
}
