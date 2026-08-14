import { useState, useEffect, useMemo } from 'react';
import { Rabbit } from '@/react-app/hooks/useRabbits';
import { Breeding } from '@/react-app/hooks/useBreedings';
import { getTodayDateString, formatFutureDate, calculateAge } from '@/react-app/utils/dateUtils';

interface BreedingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (breeding: Omit<Breeding, 'id'> | Breeding) => Promise<void>;
  rabbits: Rabbit[];
  breeding?: Breeding;
}

function checkRelationship(male: Rabbit | undefined, female: Rabbit | undefined, allRabbits: Rabbit[]): {
  isRelated: boolean;
  relationship: string | null;
  severity: 'warning' | 'danger' | null;
} {
  if (!male || !female) return { isRelated: false, relationship: null, severity: null };
  
  // Padre/Madre - Hijo/Hija (cruce directo padre-hijo)
  if (male.id === female.parent_male_id || female.id === male.parent_female_id) {
    return { isRelated: true, relationship: 'Padre-Hija directos', severity: 'danger' };
  }
  if (female.id === male.parent_female_id || male.id === female.parent_male_id) {
    return { isRelated: true, relationship: 'Madre-Hijo directos', severity: 'danger' };
  }
  
  // Hermanos completos (mismo padre Y misma madre)
  if (male.parent_male_id && female.parent_male_id && 
      male.parent_female_id && female.parent_female_id &&
      male.parent_male_id === female.parent_male_id && 
      male.parent_female_id === female.parent_female_id) {
    return { isRelated: true, relationship: 'Hermanos completos (mismo padre y madre)', severity: 'danger' };
  }
  
  // Medio hermanos (mismo padre O misma madre)
  if (male.parent_male_id && female.parent_male_id && male.parent_male_id === female.parent_male_id) {
    return { isRelated: true, relationship: 'Medio hermanos (mismo padre)', severity: 'warning' };
  }
  if (male.parent_female_id && female.parent_female_id && male.parent_female_id === female.parent_female_id) {
    return { isRelated: true, relationship: 'Medio hermanos (misma madre)', severity: 'warning' };
  }
  
  // Abuelo/Abuela - Nieto/Nieta
  const maleFather = allRabbits.find(r => r.id === male.parent_male_id);
  const maleMother = allRabbits.find(r => r.id === male.parent_female_id);
  const femaleFather = allRabbits.find(r => r.id === female.parent_male_id);
  const femaleMother = allRabbits.find(r => r.id === female.parent_female_id);
  
  // Verificar si el macho es abuelo de la hembra
  if (femaleFather?.parent_male_id === male.id || femaleFather?.parent_female_id === male.id ||
      femaleMother?.parent_male_id === male.id || femaleMother?.parent_female_id === male.id) {
    return { isRelated: true, relationship: 'Abuelo-Nieta', severity: 'danger' };
  }
  
  // Verificar si la hembra es abuela del macho
  if (maleFather?.parent_male_id === female.id || maleFather?.parent_female_id === female.id ||
      maleMother?.parent_male_id === female.id || maleMother?.parent_female_id === female.id) {
    return { isRelated: true, relationship: 'Abuela-Nieto', severity: 'danger' };
  }
  
  // Primos (comparten abuelos)
  const maleGrandparents = [
    maleFather?.parent_male_id, maleFather?.parent_female_id,
    maleMother?.parent_male_id, maleMother?.parent_female_id
  ].filter(Boolean);
  
  const femaleGrandparents = [
    femaleFather?.parent_male_id, femaleFather?.parent_female_id,
    femaleMother?.parent_male_id, femaleMother?.parent_female_id
  ].filter(Boolean);
  
  const sharedGrandparents = maleGrandparents.filter(g => femaleGrandparents.includes(g));
  if (sharedGrandparents.length > 0) {
    return { isRelated: true, relationship: 'Primos (comparten abuelos)', severity: 'warning' };
  }
  
  return { isRelated: false, relationship: null, severity: null };
}

export default function BreedingModal({ isOpen, onClose, onSave, rabbits, breeding }: BreedingModalProps) {
  const [formData, setFormData] = useState({
    male_id: '',
    female_id: '',
    breeding_date: getTodayDateString(),
    status: 'pending' as 'pending' | 'completed' | 'failed',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgeRisk, setAcknowledgeRisk] = useState(false);

  // Función para calcular edad en meses
  const getAgeInMonths = (birthDate: string): number => {
    const age = calculateAge(birthDate);
    return age.years * 12 + age.months;
  };

  // Filtrar solo conejos con 5 meses o más y excluir fallecidos
  const males = rabbits.filter(r => 
    r.sex === 'male' && 
    r.status === 'active' && 
    getAgeInMonths(r.birth_date) >= 5
  );
  const females = rabbits.filter(r => 
    r.sex === 'female' && 
    (r.status === 'active' || r.status === 'breeding' || r.status === 'pregnant') &&
    getAgeInMonths(r.birth_date) >= 5
  );

  // Verificar parentesco cuando se seleccionan los conejos
  const selectedMale = rabbits.find(r => r.id === parseInt(formData.male_id));
  const selectedFemale = rabbits.find(r => r.id === parseInt(formData.female_id));
  
  const relationshipCheck = useMemo(() => {
    return checkRelationship(selectedMale, selectedFemale, rabbits);
  }, [selectedMale, selectedFemale, rabbits]);

  useEffect(() => {
    if (isOpen && breeding) {
      setFormData({
        male_id: breeding.male_id.toString(),
        female_id: breeding.female_id.toString(),
        breeding_date: breeding.breeding_date,
        status: breeding.status,
        notes: breeding.notes || '',
      });
    } else if (!isOpen) {
      setFormData({
        male_id: '',
        female_id: '',
        breeding_date: getTodayDateString(),
        status: 'pending',
        notes: '',
      });
      setError(null);
      setIsSubmitting(false);
      setAcknowledgeRisk(false);
    }
  }, [isOpen, breeding]);

  // Reset acknowledge when selection changes
  useEffect(() => {
    setAcknowledgeRisk(false);
  }, [formData.male_id, formData.female_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Bloquear cruces de alto riesgo sin confirmación
    if (relationshipCheck.severity === 'danger' && !acknowledgeRisk) {
      setError('Debes confirmar que entiendes los riesgos de este cruce consanguíneo.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const breedingData = {
        male_id: parseInt(formData.male_id),
        female_id: parseInt(formData.female_id),
        breeding_date: formData.breeding_date,
        status: formData.status,
        notes: formData.notes || undefined,
      };
      
      if (breeding) {
        await onSave({ ...breedingData, id: breeding.id } as Breeding);
      } else {
        await onSave(breedingData as any);
      }
      onClose();
    } catch (err) {
      console.error('Error al guardar el cruce:', err);
      setError('Error al guardar el cruce. Por favor, intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-squircle p-6 max-w-xl w-full max-h-[90vh] flex flex-col shadow-premium">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {breeding ? 'Editar Cruce' : 'Registrar Cruce'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="material-icons-round text-gray-500">close</span>
          </button>
        </div>

        {males.length === 0 || females.length === 0 ? (
          <div className="text-center py-8">
            <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-700 mb-4">
              warning
            </span>
            <p className="text-gray-600 dark:text-gray-400">
              {males.length === 0 && females.length === 0
                ? 'No hay machos ni hembras disponibles para cruzar.'
                : males.length === 0
                ? 'No hay machos disponibles para cruzar.'
                : 'No hay hembras disponibles para cruzar.'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Agrega conejos primero para poder registrar cruces.
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
                Macho *
              </label>
              <select
                required
                value={formData.male_id}
                onChange={(e) => setFormData({ ...formData, male_id: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
              >
                <option value="">Selecciona un macho</option>
                {males.map((rabbit) => (
                  <option key={rabbit.id} value={rabbit.id}>
                    {rabbit.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hembra *
              </label>
              <select
                required
                value={formData.female_id}
                onChange={(e) => setFormData({ ...formData, female_id: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
              >
                <option value="">Selecciona una hembra</option>
                {females.map((rabbit) => (
                  <option key={rabbit.id} value={rabbit.id}>
                    {rabbit.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Alerta de parentesco */}
            {relationshipCheck.isRelated && (
              <div className={`rounded-xl p-4 border ${
                relationshipCheck.severity === 'danger' 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' 
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
              }`}>
                <div className="flex items-start space-x-3">
                  <span className={`material-icons-round text-2xl ${
                    relationshipCheck.severity === 'danger' ? 'text-red-500' : 'text-amber-500'
                  }`}>
                    {relationshipCheck.severity === 'danger' ? 'dangerous' : 'warning'}
                  </span>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      relationshipCheck.severity === 'danger' 
                        ? 'text-red-700 dark:text-red-400' 
                        : 'text-amber-700 dark:text-amber-400'
                    }`}>
                      ⚠️ Alerta de Consanguinidad
                    </h4>
                    <p className={`text-sm mt-1 ${
                      relationshipCheck.severity === 'danger' 
                        ? 'text-red-600 dark:text-red-300' 
                        : 'text-amber-600 dark:text-amber-300'
                    }`}>
                      Estos conejos son <strong>{relationshipCheck.relationship}</strong>.
                    </p>
                    <p className={`text-xs mt-2 ${
                      relationshipCheck.severity === 'danger' 
                        ? 'text-red-500 dark:text-red-400' 
                        : 'text-amber-500 dark:text-amber-400'
                    }`}>
                      {relationshipCheck.severity === 'danger' 
                        ? 'Cruzar conejos con parentesco cercano puede causar problemas genéticos graves en las crías.' 
                        : 'Este cruce tiene riesgo moderado de problemas genéticos. Considera usar reproductores no emparentados.'}
                    </p>
                    
                    {relationshipCheck.severity === 'danger' && (
                      <label className="flex items-center space-x-2 mt-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acknowledgeRisk}
                          onChange={(e) => setAcknowledgeRisk(e.target.checked)}
                          className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-xs text-red-600 dark:text-red-400">
                          Entiendo los riesgos y deseo continuar de todas formas
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha de Cruce *
              </label>
              <input
                type="date"
                required
                value={formData.breeding_date}
                onChange={(e) => setFormData({ ...formData, breeding_date: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>

            {breeding && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  <option value="pending">Pendiente</option>
                  <option value="completed">Completado</option>
                  <option value="failed">Fallido</option>
                </select>
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
                placeholder="Observaciones del cruce..."
              />
            </div>

            <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 border border-primary/20">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">Fecha estimada de parto:</span>{' '}
                {formData.breeding_date && formatFutureDate(formData.breeding_date, 31)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                El período de gestación de los conejos es aproximadamente 31 días
              </p>
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
                disabled={isSubmitting || (relationshipCheck.severity === 'danger' && !acknowledgeRisk)}
                className={`px-6 py-2 rounded-xl font-semibold text-white transition-all shadow-soft disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                  relationshipCheck.severity === 'danger' 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:scale-105' 
                    : relationshipCheck.severity === 'warning'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:scale-105'
                    : 'bg-gradient-to-r from-pink-500 to-pink-600 hover:scale-105'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center space-x-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    <span>Guardando...</span>
                  </span>
                ) : breeding ? (
                  'Actualizar Cruce'
                ) : (
                  'Registrar Cruce'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
