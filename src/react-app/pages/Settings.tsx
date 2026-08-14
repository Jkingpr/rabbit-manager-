import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import { usePlan } from '@/react-app/hooks/usePlan';
import { formatDateForDisplay } from '@/react-app/utils/dateUtils';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  ranch_name: string;
  ranch_initials: string;
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { planInfo } = usePlan();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    location: '',
    ranch_name: '',
    ranch_initials: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalProfile, setOriginalProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    location: '',
    ranch_name: '',
    ranch_initials: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/profile');
      if (response.ok) {
        const data = await response.json();
        const profileData = {
          name: data.name || '',
          email: data.email || user?.email || '',
          phone: data.phone || '',
          location: data.location || '',
          ranch_name: data.ranch_name || '',
          ranch_initials: data.ranch_initials || '',
        };
        setProfile(profileData);
        setOriginalProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          location: profile.location,
          ranch_name: profile.ranch_name,
          ranch_initials: profile.ranch_initials,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedProfile = {
          name: data.name || '',
          email: data.email || user?.email || '',
          phone: data.phone || '',
          location: data.location || '',
          ranch_name: data.ranch_name || '',
          ranch_initials: data.ranch_initials || '',
        };
        setProfile(updatedProfile);
        setOriginalProfile(updatedProfile);
        setIsEditing(false);
      } else {
        alert('Error al guardar los cambios');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setProfile(originalProfile);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-white to-primary-lighter">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ajustes</h1>
          <button
            onClick={() => navigate('/home')}
            className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-colors"
          >
            <span className="material-icons-round">arrow_back</span>
            <span>Volver</span>
          </button>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-squircle shadow-soft p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <span className="material-icons-round text-primary">person</span>
              <span>Información de Cuenta</span>
            </h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl transition-colors"
              >
                <span className="material-icons-round text-sm">edit</span>
                <span>Editar</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Nombre Completo
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              ) : (
                <p className="px-4 py-3 rounded-xl bg-gray-50 text-gray-900">
                  {profile.name || user?.google_user_data?.name || 'No especificado'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Email
              </label>
              <p className="px-4 py-3 rounded-xl bg-gray-50 text-gray-500">
                {profile.email || user?.email || 'No especificado'}
              </p>
              <p className="text-xs text-gray-500 mt-1">El email no se puede modificar</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Teléfono
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="Ej: +34 600 123 456"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              ) : (
                <p className="px-4 py-3 rounded-xl bg-gray-50 text-gray-900">
                  {profile.phone || 'No especificado'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Ubicación
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  placeholder="Ej: Madrid, España"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              ) : (
                <p className="px-4 py-3 rounded-xl bg-gray-50 text-gray-900">
                  {profile.location || 'No especificado'}
                </p>
              )}
            </div>

            <div className="col-span-2 mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <span className="material-icons-round text-primary">home_work</span>
                <span>Configuración del Rancho</span>
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Nombre del Rancho
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.ranch_name}
                  onChange={(e) => setProfile({ ...profile, ranch_name: e.target.value })}
                  placeholder="Ej: El Paraíso"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              ) : (
                <p className="px-4 py-3 rounded-xl bg-gray-50 text-gray-900">
                  {profile.ranch_name || 'No especificado'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Siglas del Rancho (máx. 3 caracteres)
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.ranch_initials}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().slice(0, 3);
                    setProfile({ ...profile, ranch_initials: value });
                  }}
                  placeholder="Ej: EPR"
                  maxLength={3}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
                />
              ) : (
                <p className="px-4 py-3 rounded-xl bg-gray-50 text-gray-900">
                  {profile.ranch_initials || 'No especificado'}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Se usará automáticamente en el tatuaje derecho de los gazapos
              </p>
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-icons-round">save</span>
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Plan Info */}
        {planInfo && (
          <div className="bg-white rounded-squircle shadow-soft p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <span className="material-icons-round text-primary">workspace_premium</span>
              <span>Plan de Suscripción</span>
            </h2>
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-600 text-sm mb-1">Plan Actual</p>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold inline-block ${
                  planInfo.tipo_plan === 'Ilimitado'
                    ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {planInfo.tipo_plan}
                </span>
              </div>
              
              <div className="text-right">
                <p className="text-gray-600 text-sm mb-1">Capacidad</p>
                <p className="text-2xl font-bold text-gray-900">
                  {planInfo.tipo_plan === 'Ilimitado' ? '∞' : `${planInfo.rabbit_count}/10`}
                </p>
              </div>
            </div>

            {planInfo.plan_expiry_date && (
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center space-x-3">
                  <span className="material-icons-round text-green-600 text-3xl">check_circle</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Plan Activo</h3>
                    <p className="text-sm text-gray-700 mb-2">
                      Tu plan {planInfo.tipo_plan} está activo.
                    </p>
                    <div className="text-xs text-gray-600">
                      <p>Vence: {formatDateForDisplay(planInfo.plan_expiry_date)}</p>
                      {planInfo.billing_period && (
                        <p>Período: {planInfo.billing_period === 'monthly' ? 'Mensual' : 'Anual'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <a
                href="https://wa.me/message/PGHOY7QEPFZGF1"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span>Contactar por WhatsApp</span>
              </a>
            </div>
          </div>
        )}

        {/* Admin Access */}
        {planInfo?.is_admin && (
          <div className="bg-white rounded-squircle shadow-soft p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <span className="material-icons-round text-primary">admin_panel_settings</span>
              <span>Acceso de Administrador</span>
            </h2>
            <p className="text-gray-600 mb-4">
              Tienes acceso al panel de administración para gestionar usuarios y planes.
            </p>
            <button
              onClick={() => navigate('/admin')}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-squircle transition-all flex items-center justify-center space-x-2"
            >
              <span className="material-icons-round">dashboard</span>
              <span>Ir al Panel de Administración</span>
            </button>
          </div>
        )}

        {/* Account Actions */}
        <div className="bg-white rounded-squircle shadow-soft p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <span className="material-icons-round text-primary">settings</span>
            <span>Acciones de Cuenta</span>
          </h2>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-squircle transition-all flex items-center justify-center space-x-2"
          >
            <span className="material-icons-round">logout</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}
