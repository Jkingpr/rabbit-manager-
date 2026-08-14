import { useState, useEffect } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { useNavigate } from 'react-router';
import NotificationBell from './NotificationBell';
import { Breeding } from '@/react-app/hooks/useBreedings';
import { Litter } from '@/react-app/hooks/useLitters';

interface TopNavProps {
  breedings?: Breeding[];
  litters?: Litter[];
}

export default function TopNav({ breedings = [], litters = [] }: TopNavProps) {
  const [isDark, setIsDark] = useState(true);
  
  // Apply dark mode on initial mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-ios bg-white/80 dark:bg-background-dark/80 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center shadow-soft">
                <span className="material-icons-round text-white text-2xl">pets</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">CuniControl</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleDarkMode}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Cambiar tema"
              >
                <span className="material-icons-round text-gray-600 dark:text-gray-400">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
              </button>

              <NotificationBell breedings={breedings} litters={litters} />

              <button 
                onClick={() => navigate('/settings')}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Ajustes"
              >
                <span className="material-icons-round text-gray-600 dark:text-gray-400">settings</span>
              </button>

              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {user.google_user_data?.picture ? (
                      <img
                        src={user.google_user_data.picture}
                        alt={user.email}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <span className="material-icons-round text-white text-sm">person</span>
                      </div>
                    )}
                  </button>

                  {showUserMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-premium border border-gray-200 dark:border-gray-800 overflow-hidden z-50">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                          <p className="font-semibold text-gray-900 dark:text-white">{user.google_user_data?.name || 'Usuario'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                        <button
                          onClick={() => {
                            navigate('/settings');
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center space-x-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                        >
                          <span className="material-icons-round text-sm">settings</span>
                          <span>Ajustes</span>
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-red-600 dark:text-red-400"
                        >
                          <span className="material-icons-round text-sm">logout</span>
                          <span>Cerrar sesión</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
