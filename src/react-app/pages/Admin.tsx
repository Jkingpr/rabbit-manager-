import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';

interface User {
  id: number;
  mocha_user_id: string;
  email: string | null;
  tipo_plan: 'Gratis' | 'Ilimitado';
  rabbit_count: number;
  created_at: string;
  plan_expiry_date: string | null;
  billing_period: 'monthly' | 'annual' | null;
  is_active: boolean;
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (response.status === 403) {
        setError('Acceso denegado. Solo administradores pueden ver esta página.');
        return;
      }
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ADMIN] Error response:', errorText);
        throw new Error('Error al cargar usuarios');
      }
      const data = await response.json();
      console.log('[ADMIN] Received users:', data);
      setUsers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('[ADMIN] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const updateUserPlan = async (userId: number, newPlan: 'Gratis' | 'Ilimitado', billingPeriod: 'monthly' | 'annual' = 'monthly') => {
    if (updatingUserId !== null) {
      return; // Prevent multiple simultaneous updates
    }
    
    console.log('[ADMIN UI] Updating plan for user:', userId, 'to:', newPlan);
    setUpdatingUserId(userId);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ tipo_plan: newPlan, billing_period: billingPeriod }),
      });
      
      console.log('[ADMIN UI] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ADMIN UI] Error response:', errorText);
        throw new Error('Error al actualizar el plan');
      }
      
      const result = await response.json();
      console.log('[ADMIN UI] Plan updated successfully:', result);
      
      // Update the user in the local state immediately for responsive UI
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === userId ? { ...u, tipo_plan: newPlan, plan_expiry_date: result.plan_expiry_date, billing_period: billingPeriod } : u
      ));
      
      // Also fetch fresh data to ensure consistency
      await fetchUsers();
    } catch (err) {
      console.error('[ADMIN UI] Error updating plan:', err);
      alert(err instanceof Error ? err.message : 'Error al actualizar el plan');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const deleteUser = async (userId: number, userEmail: string | null) => {
    const confirmMessage = `¿Estás seguro de que quieres eliminar al usuario ${userEmail || `#${userId}`}?\n\nEsto eliminará permanentemente:\n• El usuario\n• Todos sus conejos\n• Todos sus cruces\n• Todas sus camadas\n\nEsta acción NO se puede deshacer.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar el usuario');
      }
      
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar el usuario');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-light via-white to-primary-lighter flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-light via-white to-primary-lighter flex items-center justify-center p-4">
        <div className="bg-white rounded-squircle shadow-soft p-8 max-w-md w-full text-center">
          <span className="material-icons-round text-red-500 text-5xl mb-4">error</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/home')}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-squircle font-semibold transition-all"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-white to-primary-lighter">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
            <p className="text-gray-600">Administrador: {currentUser?.email}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center justify-center space-x-2 px-4 py-2 text-gray-600 hover:text-primary transition-colors"
            >
              <span className="material-icons-round">arrow_back</span>
              <span>Volver</span>
            </button>
            <button
              onClick={fetchUsers}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-squircle transition-colors"
            >
              <span className="material-icons-round">refresh</span>
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-squircle shadow-soft p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-icons-round text-primary text-2xl">group</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Usuarios</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-squircle shadow-soft p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <span className="material-icons-round text-gray-600 text-2xl">pets</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Plan Gratis</p>
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.tipo_plan === 'Gratis').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-squircle shadow-soft p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-100 to-yellow-100 flex items-center justify-center">
                <span className="material-icons-round text-amber-600 text-2xl">workspace_premium</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Plan Ilimitado</p>
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.tipo_plan === 'Ilimitado').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-squircle shadow-soft p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <span className="material-icons-round text-green-600 text-2xl">check_circle</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Activos</p>
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.is_active).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Table view */}
        <div className="hidden md:block bg-white rounded-squircle shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Conejos
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-medium">
                        #{user.id}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {user.email || <span className="text-gray-400 italic">Sin email</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                            user.tipo_plan === 'Ilimitado'
                              ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user.tipo_plan}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {user.is_active ? 'Activo' : 'Vencido'}
                          </span>
                        </div>
                        {user.plan_expiry_date && (
                          <span className="text-xs text-gray-500">
                            Vence: {new Date(user.plan_expiry_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        )}
                        {user.billing_period && (
                          <span className="text-xs text-gray-500">
                            {user.billing_period === 'monthly' ? 'Mensual ($6.99)' : 'Anual ($50)'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.rabbit_count} 
                      {user.tipo_plan === 'Gratis' && ' / 10'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <select
                          value={user.tipo_plan}
                          onChange={(e) => {
                            const newPlan = e.target.value as 'Gratis' | 'Ilimitado';
                            updateUserPlan(user.id, newPlan, user.billing_period || 'monthly');
                          }}
                          disabled={updatingUserId === user.id}
                          className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="Gratis">Gratis</option>
                          <option value="Ilimitado">Ilimitado</option>
                        </select>
                        <select
                          value={user.billing_period || 'monthly'}
                          onChange={(e) => {
                            const newPeriod = e.target.value as 'monthly' | 'annual';
                            updateUserPlan(user.id, user.tipo_plan, newPeriod);
                          }}
                          disabled={updatingUserId === user.id}
                          className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="monthly">Mensual</option>
                          <option value="annual">Anual</option>
                        </select>
                        {updatingUserId === user.id && (
                          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                        )}
                        <button
                          onClick={() => deleteUser(user.id, user.email)}
                          disabled={updatingUserId === user.id}
                          className="inline-flex items-center justify-center w-9 h-9 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-squircle transition-all shadow-md active:scale-95"
                          title="Eliminar usuario"
                        >
                          <span className="material-icons-round text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile: Card view */}
        <div className="md:hidden space-y-4">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-squircle shadow-soft p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-500">ID #{user.id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      user.tipo_plan === 'Ilimitado'
                        ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.tipo_plan}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? 'Activo' : 'Vencido'}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {user.email || <span className="text-gray-400 italic">Sin email</span>}
                  </div>
                  {user.plan_expiry_date && (
                    <div className="text-xs text-gray-500">
                      Vence: {new Date(user.plan_expiry_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div>
                  <span className="text-gray-500">Conejos:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {user.rabbit_count}
                    {user.tipo_plan === 'Gratis' && ' / 10'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Registro:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {new Date(user.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex flex-col space-y-2 pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <select
                    value={user.tipo_plan}
                    onChange={(e) => {
                      const newPlan = e.target.value as 'Gratis' | 'Ilimitado';
                      updateUserPlan(user.id, newPlan, user.billing_period || 'monthly');
                    }}
                    disabled={updatingUserId === user.id}
                    className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="Gratis">Plan Gratis</option>
                    <option value="Ilimitado">Plan Ilimitado</option>
                  </select>
                  {updatingUserId === user.id && (
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  )}
                  <button
                    onClick={() => deleteUser(user.id, user.email)}
                    disabled={updatingUserId === user.id}
                    className="inline-flex items-center justify-center w-11 h-11 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-squircle transition-all shadow-md active:scale-95 min-h-[44px]"
                    title="Eliminar usuario"
                  >
                    <span className="material-icons-round">delete</span>
                  </button>
                </div>
                <select
                  value={user.billing_period || 'monthly'}
                  onChange={(e) => {
                    const newPeriod = e.target.value as 'monthly' | 'annual';
                    updateUserPlan(user.id, user.tipo_plan, newPeriod);
                  }}
                  disabled={updatingUserId === user.id}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="monthly">Facturación Mensual</option>
                  <option value="annual">Facturación Anual</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <span className="material-icons-round text-gray-400 text-6xl mb-4">person_off</span>
            <p className="text-gray-500">No hay usuarios registrados aún</p>
          </div>
        )}
      </div>
    </div>
  );
}
