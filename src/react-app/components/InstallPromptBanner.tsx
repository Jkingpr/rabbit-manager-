import { useState, useEffect } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function InstallPromptBanner() {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed the banner
    const wasDismissed = localStorage.getItem('install-prompt-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('install-prompt-dismissed', 'true');
  };

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setDismissed(true);
    }
  };

  // Don't show if already installed, dismissed, or not installable
  if (isInstalled || dismissed) {
    return null;
  }

  // Show iOS-specific instructions
  if (isIOS && !isInstalled) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
        <div className="bg-gradient-to-r from-primary to-primary/90 text-white rounded-2xl shadow-2xl p-4 max-w-md mx-auto border border-white/20">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <span className="material-icons-round text-2xl">install_mobile</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg mb-2">Instalar CuniControl</h3>
              <div className="text-sm space-y-2 text-white/90">
                <p className="flex items-center space-x-2">
                  <span className="material-icons-round text-base">touch_app</span>
                  <span>Toca el botón "Compartir" <span className="material-icons-round text-xs align-middle">ios_share</span></span>
                </p>
                <p className="flex items-center space-x-2">
                  <span className="material-icons-round text-base">add_box</span>
                  <span>Selecciona "Añadir a pantalla de inicio"</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <span className="material-icons-round text-xl">close</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show Android/Chrome install banner
  if (isInstallable) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
        <div className="bg-gradient-to-r from-primary to-primary/90 text-white rounded-2xl shadow-2xl p-4 max-w-md mx-auto border border-white/20">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <span className="material-icons-round text-3xl">install_mobile</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg mb-1">Instalar CuniControl</h3>
              <p className="text-sm text-white/90 mb-3">
                Instala la app para acceso rápido y notificaciones
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 bg-white text-primary font-semibold px-4 py-2 rounded-xl hover:bg-white/90 transition-colors text-sm"
                >
                  Instalar
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium"
                >
                  Ahora no
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <span className="material-icons-round text-xl">close</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
