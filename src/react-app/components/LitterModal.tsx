import { useState, useEffect } from 'react';
import { Breeding } from '@/react-app/hooks/useBreedings';
import { Litter } from '@/react-app/hooks/useLitters';
import { getTodayDateString } from '@/react-app/utils/dateUtils';

interface LitterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (litter: Omit<Litter, 'id'> | Litter) => Promise<void>;
  breedings: Breeding[];
  preSelectedBreedingId?: number | null;
  litter?: Litter;
}

export default function LitterModal({ isOpen, onClose, onSave, breedings, preSelectedBreedingId, litter }: LitterModalProps) {
  const [formData, setFormData] = useState({
    breeding_id: '',
    birth_date: getTodayDateString(),
    total_kits: '',
    alive_kits: '',
    dead_kits: '',
    weaning_date: '',
    notes: '',
  });
  const [useUniqueTattoos, setUseUniqueTattoos] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ranchInitials, setRanchInitials] = useState<string | null>(null);

  const safeBreedings = Array.isArray(breedings) ? breedings : [];
  const pendingBreedings = safeBreedings.filter(b => b.status === 'pending');
  const availableBreedings = litter ? safeBreedings : pendingBreedings;

  // Fetch user profile to check ranch initials
  useEffect(() => {
    const fetchRanchInitials = async () => {
      try {
        const response = await fetch('/api/users/profile');
        if (response.ok) {
          const data = await response.json();
          setRanchInitials(data.ranch_initials || null);
        }
      } catch (error) {
        console.error('Error fetching ranch initials:', error);
      }
    };
    
    if (isOpen) {
      fetchRanchInitials();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && litter) {
      setFormData({
        breeding_id: litter.breeding_id.toString(),
        birth_date: litter.birth_date,
        total_kits: litter.total_kits.toString(),
        alive_kits: litter.alive_kits.toString(),
        dead_kits: litter.dead_kits.toString(),
        weaning_date: litter.weaning_date || '',
        notes: litter.notes || '',
      });
    } else if (!isOpen) {
      setFormData({
        breeding_id: '',
        birth_date: getTodayDateString(),
        total_kits: '',
        alive_kits: '',
        dead_kits: '',
        weaning_date: '',
        notes: '',
      });
      setError(null);
      setIsSubmitting(false);
    } else if (preSelectedBreedingId) {
      setFormData(prev => ({
        ...prev,
        breeding_id: preSelectedBreedingId.toString(),
      }));
    }
  }, [isOpen, preSelectedBreedingId, litter]);

  useEffect(() => {
    if (formData.total_kits && formData.dead_kits) {
      const total = parseInt(formData.total_kits);
      const dead = parseInt(formData.dead_kits);
      setFormData(prev => ({ ...prev, alive_kits: (total - dead).toString() }));
    }
  }, [formData.total_kits, formData.dead_kits]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const totalKits = parseInt(formData.total_kits);
    const aliveKits = parseInt(formData.alive_kits);
    const deadKits = parseInt(formData.dead_kits || '0');

    if (aliveKits + deadKits !== totalKits) {
      setError('El número de gazapos vivos + muertos debe ser igual al total');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Calculate weaning date (45 days after birth)
      const [year, month, day] = formData.birth_date.split('-').map(Number);
      const birthDate = new Date(year, month - 1, day);
      const weaningDate = new Date(birthDate);
      weaningDate.setDate(weaningDate.getDate() + 45);
      
      const weaningYear = weaningDate.getFullYear();
      const weaningMonth = String(weaningDate.getMonth() + 1).padStart(2, '0');
      const weaningDay = String(weaningDate.getDate()).padStart(2, '0');
      const calculatedWeaningDate = `${weaningYear}-${weaningMonth}-${weaningDay}`;

      const litterData = {
        breeding_id: parseInt(formData.breeding_id),
        birth_date: formData.birth_date,
        total_kits: totalKits,
        alive_kits: aliveKits,
        dead_kits: deadKits,
        weaning_date: calculatedWeaningDate,
        notes: formData.notes || undefined,
        use_unique_tattoos: useUniqueTattoos,
      };
      
      if (litter) {
        await onSave({ ...litterData, id: litter.id } as Litter);
      } else {
        await onSave(litterData as any);
      }
      onClose();
    } catch (err) {
      console.error('Error al guardar la camada:', err);
      setError('Error al guardar la camada. Por favor, intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-squircle p-6 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-premium">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {litter ? 'Editar Camada' : 'Registrar Camada'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="material-icons-round text-gray-500">close</span>
          </button>
        </div>

        {availableBreedings.length === 0 && !litter ? (
          <div className="text-center py-8">
            <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-700 mb-4">
              info
            </span>
            <p className="text-gray-600 dark:text-gray-400">
              No hay cruces pendientes de registrar camada.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Primero debes registrar un cruce antes de registrar una camada.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cruce *
              </label>
              <select
                required
                value={formData.breeding_id}
                onChange={(e) => setFormData({ ...formData, breeding_id: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
              >
                <option value="">Selecciona un cruce</option>
                {availableBreedings.map((breeding) => (
                  <option key={breeding.id} value={breeding.id}>
                    {breeding.male_name} × {breeding.female_name} - {new Date(breeding.breeding_date).toLocaleDateString('es-ES')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha de Parto *
              </label>
              <input
                type="date"
                required
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Gazapos *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.total_kits}
                  onChange={(e) => setFormData({ ...formData, total_kits: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Muertos
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.dead_kits}
                  onChange={(e) => setFormData({ ...formData, dead_kits: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vivos *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.alive_kits}
                  onChange={(e) => setFormData({ ...formData, alive_kits: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>
            </div>

            {/* Unique ID Toggle */}
            <div className={`rounded-xl p-4 border ${
              !ranchInitials && useUniqueTattoos
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-300 dark:border-amber-800/30'
                : 'bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800/30'
            }`}>
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useUniqueTattoos}
                  onChange={(e) => setUseUniqueTattoos(e.target.checked)}
                  disabled={!ranchInitials}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`material-icons-round text-xl ${
                      !ranchInitials && useUniqueTattoos
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-purple-600 dark:text-purple-400'
                    }`}>
                      {!ranchInitials ? 'warning' : 'fingerprint'}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">Generar IDs Únicos Automáticos</span>
                  </div>
                  
                  {!ranchInitials ? (
                    <>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-2 font-medium">
                        ⚠️ Primero debes configurar las siglas de tu rancho
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        Para generar IDs únicos automáticos (como RS001, RS002, etc.), necesitas establecer las siglas de tu rancho en tu perfil.
                      </p>
                      <button
                        type="button"
                        onClick={() => window.location.href = '/settings'}
                        className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                      >
                        <span className="material-icons-round text-sm">settings</span>
                        <span>Ir a Ajustes para configurar</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Al activar esta opción, cada gazapo de la camada recibirá el mismo ID único basado en las siglas de tu rancho 
                        más un número secuencial. Este formato es simple y fácil de recordar.
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-medium">
                        Ejemplo: Toda la camada tendrá el ID "{ranchInitials}001" (incrementa para cada nueva camada)
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>

            {formData.birth_date && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800/30">
                <div className="flex items-center space-x-3">
                  <span className="material-icons-round text-green-600 dark:text-green-400 text-xl">event</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Fecha de Destete (45 días)</h4>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {(() => {
                        const [year, month, day] = formData.birth_date.split('-').map(Number);
                        const birthDate = new Date(year, month - 1, day);
                        const weaningDate = new Date(birthDate);
                        weaningDate.setDate(weaningDate.getDate() + 45);
                        return weaningDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}



            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="Observaciones sobre la camada..."
              />
            </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 rounded-xl font-semibold bg-gradient-to-r from-primary-light to-primary text-white hover:scale-105 transition-all shadow-soft disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <span className="flex items-center space-x-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    <span>Guardando...</span>
                  </span>
                ) : litter ? (
                  'Actualizar Camada'
                ) : (
                  'Registrar Camada'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
