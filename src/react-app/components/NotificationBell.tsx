import { useState, useEffect } from 'react';
import { Breeding } from '@/react-app/hooks/useBreedings';
import { Litter } from '@/react-app/hooks/useLitters';

interface NotificationBellProps {
  breedings: Breeding[];
  litters: Litter[];
}

interface Notification {
  id: string;
  type: 'birth' | 'weaning';
  message: string;
  date: string;
  daysUntil: number;
}

export default function NotificationBell({ breedings, litters }: NotificationBellProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [previousCount, setPreviousCount] = useState(0);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('dismissedNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const dismissNotification = (id: string) => {
    const newDismissed = new Set(dismissedNotifications);
    newDismissed.add(id);
    setDismissedNotifications(newDismissed);
    localStorage.setItem('dismissedNotifications', JSON.stringify(Array.from(newDismissed)));
  };

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const notifs: Notification[] = [];

    // Check breedings for upcoming births
    breedings.forEach((breeding) => {
      if (breeding.expected_birth_date && breeding.status === 'pending') {
        const [expectedYear, expectedMonth, expectedDay] = breeding.expected_birth_date.split('-').map(Number);
        const expectedDate = new Date(expectedYear, expectedMonth - 1, expectedDay);
        expectedDate.setHours(0, 0, 0, 0);
        
        const diffTime = expectedDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysUntil >= 0 && daysUntil <= 3) {
          const femaleName = breeding.female_name || 'Coneja';
          let message = '';
          
          if (daysUntil === 0) {
            message = `🐰 ¡Parto de ${femaleName} HOY!`;
          } else if (daysUntil === 1) {
            message = `🐰 Parto de ${femaleName} mañana`;
          } else {
            message = `🐰 Parto de ${femaleName} en ${daysUntil} días`;
          }
          
          notifs.push({
            id: `birth-${breeding.id}`,
            type: 'birth',
            message,
            date: breeding.expected_birth_date,
            daysUntil,
          });
        }
      }
    });

    // Check litters for upcoming weanings
    litters.forEach((litter) => {
      if (litter.weaning_date) {
        const [weaningYear, weaningMonth, weaningDay] = litter.weaning_date.split('-').map(Number);
        const weaningDate = new Date(weaningYear, weaningMonth - 1, weaningDay);
        weaningDate.setHours(0, 0, 0, 0);
        
        const diffTime = weaningDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysUntil >= 0 && daysUntil <= 3) {
          const femaleName = litter.female_name || 'Coneja';
          let message = '';
          
          if (daysUntil === 0) {
            message = `👶 ¡Destete de ${femaleName} HOY! (${litter.alive_kits} gazapos)`;
          } else if (daysUntil === 1) {
            message = `👶 Destete de ${femaleName} mañana (${litter.alive_kits} gazapos)`;
          } else {
            message = `👶 Destete de ${femaleName} en ${daysUntil} días (${litter.alive_kits} gazapos)`;
          }
          
          notifs.push({
            id: `weaning-${litter.id}`,
            type: 'weaning',
            message,
            date: litter.weaning_date,
            daysUntil,
          });
        }
      }
    });

    // Sort by days until (soonest first)
    notifs.sort((a, b) => a.daysUntil - b.daysUntil);
    setNotifications(notifs);
    
    // Play sound if new notifications appeared
    const currentCount = notifs.filter(n => !dismissedNotifications.has(n.id)).length;
    if (currentCount > previousCount && previousCount > 0) {
      playNotificationSound();
    }
    setPreviousCount(currentCount);
  }, [breedings, litters, dismissedNotifications, previousCount]);

  // Filter out dismissed notifications
  const activeNotifications = notifications.filter(n => !dismissedNotifications.has(n.id));
  const unreadCount = activeNotifications.length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notificaciones"
      >
        <span className="material-icons-round text-gray-600 dark:text-gray-400">
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed sm:absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-premium border border-gray-200 dark:border-gray-800 overflow-hidden z-50 max-h-[70vh] sm:max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white">Notificaciones</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Próximos eventos importantes</p>
            </div>
            
            {activeNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-icons-round text-gray-400 dark:text-gray-600 text-5xl mb-3">
                  notifications_none
                </span>
                <p className="text-gray-500 dark:text-gray-400">No hay eventos próximos</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Te avisaremos de partos y destetes en los próximos 3 días
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {activeNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {(() => {
                          const [year, month, day] = notification.date.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          });
                        })()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notification.id);
                      }}
                      className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                      aria-label="Descartar notificación"
                    >
                      <span className="material-icons-round text-gray-400 dark:text-gray-500 text-sm">
                        close
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
