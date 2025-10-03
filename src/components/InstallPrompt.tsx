import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);

  useEffect(() => {
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;
    setIsInStandaloneMode(standalone);

    // Show prompt only on iOS and not in standalone mode
    if (iOS && !standalone) {
      const dismissed = localStorage.getItem('install-prompt-dismissed');
      if (!dismissed) {
        // Show after 3 seconds
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('install-prompt-dismissed', 'true');
  };

  if (!showPrompt || !isIOS || isInStandaloneMode) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-black p-4 shadow-lg animate-slide-down">
      <div className="max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="font-bold text-sm mb-1">📱 Установите приложение</p>
            <p className="text-xs">
              Нажмите{' '}
              <svg className="inline w-4 h-4 mx-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 5l-1.42 1.42-1.59-1.59V16h-2V4.83L9.42 6.42 8 5l4-4 4 4zm4 10v6H4v-6H2v6a2 2 0 002 2h16a2 2 0 002-2v-6h-2z"/>
              </svg>
              {' '}внизу, затем "На экран «Домой»"
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-black/70 hover:text-black font-bold text-xl leading-none"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
