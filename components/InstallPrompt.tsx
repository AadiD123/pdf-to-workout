'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Only show prompt if not already installed and not dismissed recently
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (!standalone && !dismissed) {
      // Show prompt after a short delay
      setTimeout(() => setShowInstallPrompt(true), 3000);
    }

    // Listen for the beforeinstallprompt event (Chrome/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Chrome/Android installation
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } else if (isIOS) {
      // Show iOS instructions
      // The prompt will stay open to show instructions
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  // Don't show if already installed or user dismissed
  if (isStandalone || !showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border-2 border-blue-500 dark:border-blue-600 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Install App
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Add to home screen
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isIOS ? (
          // iOS Instructions
          <div className="space-y-2 mb-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              To install this app on iOS:
            </p>
            <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
              <li>
                Tap the <Share className="w-3 h-3 inline mx-1" /> share button in Safari
              </li>
              <li>Scroll down and tap "Add to Home Screen"</li>
              <li>Tap "Add" to confirm</li>
            </ol>
          </div>
        ) : deferredPrompt ? (
          // Android/Chrome Installation
          <div className="mb-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Install this app for quick access and offline use.
            </p>
          </div>
        ) : (
          // Generic instructions
          <div className="mb-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Add this app to your home screen for easy access.
            </p>
          </div>
        )}

        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            Install Now
          </button>
        )}
      </div>
    </div>
  );
}

