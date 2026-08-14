import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { useNavigate } from 'react-router';

export default function AuthCallback() {
  const { exchangeCodeForSessionToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent duplicate calls (React 18 strict mode runs effects twice)
      if (hasRun.current) {
        console.log('[AuthCallback] Already processing, skipping duplicate call');
        return;
      }
      hasRun.current = true;
      
      try {
        console.log('[AuthCallback] Starting authentication callback...');
        await exchangeCodeForSessionToken();
        console.log('[AuthCallback] Session token exchanged successfully');
        
        // Ensure user exists in database and check if profile is complete
        console.log('[AuthCallback] Fetching user profile...');
        const response = await fetch('/api/users/profile');
        
        if (!response.ok) {
          console.error('[AuthCallback] Error fetching profile:', response.status);
          navigate('/complete-registration');
          return;
        }
        
        const profile = await response.json();
        console.log('[AuthCallback] Profile fetched successfully:', { hasName: !!profile.name });
        
        // If user doesn't have a name, they need to complete registration
        if (!profile.name) {
          console.log('[AuthCallback] Redirecting to registration');
          navigate('/complete-registration');
        } else {
          console.log('[AuthCallback] Redirecting to home');
          navigate('/home');
        }
      } catch (err) {
        console.error('[AuthCallback] Error during authentication:', err);
        setError('Error al iniciar sesión. Por favor, cierra esta pestaña e intenta nuevamente desde la app.');
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-light/5 via-white to-primary/5 dark:from-gray-900 dark:via-background-dark dark:to-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span className="material-icons-round text-red-500 text-5xl">error</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Error de Autenticación
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary-light to-primary text-white hover:scale-105 transition-all shadow-soft"
          >
            Volver a intentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/5 via-white to-primary/5 dark:from-gray-900 dark:via-background-dark dark:to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-16 h-16 mx-auto mb-6 border-4 border-primary border-t-transparent rounded-full"></div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Completando inicio de sesión...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Un momento por favor
        </p>
      </div>
    </div>
  );
}
