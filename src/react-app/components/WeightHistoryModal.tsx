import { useState, useEffect } from 'react';
import { useWeightHistory } from '@/react-app/hooks/useWeightHistory';
import { Rabbit } from '@/react-app/hooks/useRabbits';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WeightHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  rabbit: Rabbit;
}

export default function WeightHistoryModal({ isOpen, onClose, rabbit }: WeightHistoryModalProps) {
  const { weights, loading, addWeight, deleteWeight } = useWeightHistory(rabbit?.id);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    weight: '',
    weight_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsAdding(false);
      setFormData({
        weight: '',
        weight_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      setError('Por favor ingresa un peso válido');
      return;
    }

    try {
      // Convert pounds to kg for storage
      const weightInKg = parseFloat(formData.weight) / 2.20462;
      await addWeight(weightInKg, formData.weight_date, formData.notes);
      setIsAdding(false);
      setFormData({
        weight: '',
        weight_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    } catch (err) {
      setError('Error al guardar el peso');
    }
  };

  const handleDelete = async (weightId: number) => {
    if (confirm('¿Estás seguro de eliminar este registro de peso?')) {
      try {
        await deleteWeight(weightId);
      } catch (err) {
        setError('Error al eliminar el peso');
      }
    }
  };

  const formatWeight = (kg: number) => {
    const lb = kg * 2.20462;
    return `${lb.toFixed(1)} lb (${kg.toFixed(2)} kg)`;
  };

  // Prepare chart data (sorted by date, oldest first for timeline)
  const chartData = [...weights]
    .sort((a, b) => new Date(a.weight_date).getTime() - new Date(b.weight_date).getTime())
    .map(weight => ({
      date: new Date(weight.weight_date).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short' 
      }),
      peso: parseFloat((weight.weight * 2.20462).toFixed(1)),
      fullDate: weight.weight_date,
    }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-premium w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Historial de Peso</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rabbit.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <span className="material-icons-round text-gray-600 dark:text-gray-400">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Add Weight Button */}
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full mb-6 py-4 rounded-2xl bg-gradient-to-r from-primary-light to-primary text-white font-semibold hover:scale-[1.02] transition-all shadow-soft flex items-center justify-center space-x-2"
            >
              <span className="material-icons-round">add</span>
              <span>Agregar Pesaje</span>
            </button>
          )}

          {/* Add Weight Form */}
          {isAdding && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Peso (lb)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0.0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formData.weight_date}
                    onChange={(e) => setFormData({ ...formData, weight_date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ej: Después del destete"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Weight History List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Cargando historial...</p>
            </div>
          ) : weights.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-icons-round text-gray-400 text-6xl mb-4">monitor_weight</span>
              <p className="text-gray-500 dark:text-gray-400">No hay registros de peso aún</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Agrega el primer pesaje para comenzar el seguimiento</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Weight Chart */}
              <div className="bg-gradient-to-br from-primary/5 to-primary-light/10 dark:from-primary/10 dark:to-primary-light/5 rounded-2xl p-6 border border-primary/20">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="material-icons-round text-primary">show_chart</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Progresión de Peso</h3>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af"
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      label={{ value: 'Peso (lb)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '2px solid #3b82f6',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                      labelStyle={{ color: '#111827', fontWeight: 'bold', marginBottom: '4px' }}
                      formatter={(value: any) => [`${value} lb`, 'Peso']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="peso" 
                      stroke="#3b82f6" 
                      strokeWidth={4}
                      dot={{ fill: '#3b82f6', stroke: '#fff', strokeWidth: 3, r: 6 }}
                      activeDot={{ r: 8, fill: '#2563eb', stroke: '#fff', strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Weight History List */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="material-icons-round text-gray-600 dark:text-gray-400">history</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Registros</h3>
                </div>
                <div className="space-y-3">
              {weights.map((weight) => (
                <div
                  key={weight.id}
                  className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-soft transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="material-icons-round text-primary">monitor_weight</span>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatWeight(weight.weight)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="material-icons-round text-xs">calendar_today</span>
                        <span>
                          {new Date(weight.weight_date).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      {weight.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                          {weight.notes}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(weight.id)}
                      className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors"
                    >
                      <span className="material-icons-round text-red-500 text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
