import { useState } from 'react';
import { Rabbit } from '@/react-app/hooks/useRabbits';
import { formatAge, formatDateForDisplay } from '@/react-app/utils/dateUtils';
import WeightHistoryModal from './WeightHistoryModal';

interface RabbitDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rabbit: Rabbit | null;
  onEdit: () => void;
  onDelete: () => void;
  allRabbits?: Rabbit[];
}

export default function RabbitDetailsModal({ isOpen, onClose, rabbit, onEdit, onDelete, allRabbits = [] }: RabbitDetailsModalProps) {
  const [isWeightHistoryOpen, setIsWeightHistoryOpen] = useState(false);
  
  if (!isOpen || !rabbit) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pregnant':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'breeding':
        return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300';
      case 'retired':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-primary/10 text-primary dark:bg-primary/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pregnant':
        return 'Gestante';
      case 'breeding':
        return 'Reproducción';
      case 'retired':
        return 'Retirado';
      default:
        return 'Activo';
    }
  };



  // Obtener información genealógica
  const father = allRabbits.find(r => r.id === rabbit.parent_male_id);
  const mother = allRabbits.find(r => r.id === rabbit.parent_female_id);
  
  // Obtener abuelos
  const paternalGrandfather = father ? allRabbits.find(r => r.id === father.parent_male_id) : null;
  const paternalGrandmother = father ? allRabbits.find(r => r.id === father.parent_female_id) : null;
  const maternalGrandfather = mother ? allRabbits.find(r => r.id === mother.parent_male_id) : null;
  const maternalGrandmother = mother ? allRabbits.find(r => r.id === mother.parent_female_id) : null;
  
  // Obtener hermanos (mismo padre Y misma madre)
  const fullSiblings = allRabbits.filter(r => 
    r.id !== rabbit.id &&
    r.parent_male_id && r.parent_female_id &&
    r.parent_male_id === rabbit.parent_male_id && 
    r.parent_female_id === rabbit.parent_female_id
  );
  
  // Obtener medio hermanos (mismo padre O misma madre, pero no ambos)
  const halfSiblings = allRabbits.filter(r => 
    r.id !== rabbit.id &&
    ((r.parent_male_id === rabbit.parent_male_id && r.parent_male_id) || 
     (r.parent_female_id === rabbit.parent_female_id && r.parent_female_id)) &&
    !(r.parent_male_id === rabbit.parent_male_id && r.parent_female_id === rabbit.parent_female_id)
  );
  
  // Obtener hijos (donde este conejo es padre o madre)
  const children = allRabbits.filter(r => 
    r.parent_male_id === rabbit.id || r.parent_female_id === rabbit.id
  );

  const hasGenealogy = father || mother || fullSiblings.length > 0 || halfSiblings.length > 0 || children.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-squircle p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-premium hide-scrollbar">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            {rabbit.photo_url ? (
              <img
                src={rabbit.photo_url}
                alt={rabbit.name}
                className="w-20 h-20 rounded-2xl object-cover"
              />
            ) : (
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                rabbit.sex === 'male'
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'bg-pink-100 dark:bg-pink-900/30'
              }`}>
                <span className={`material-icons-round text-4xl ${
                  rabbit.sex === 'male' ? 'text-blue-600' : 'text-pink-600'
                }`}>
                  {rabbit.sex === 'male' ? 'male' : 'female'}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {rabbit.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">#{rabbit.ear_tag}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="material-icons-round text-gray-500">close</span>
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(rabbit.status)}`}>
              {getStatusLabel(rabbit.status)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="material-icons-round text-primary text-sm">category</span>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">RAZA</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{rabbit.breed}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="material-icons-round text-primary text-sm">cake</span>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">EDAD</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatAge(rabbit.birth_date)}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="material-icons-round text-primary text-sm">palette</span>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">COLOR</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{rabbit.color}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="material-icons-round text-primary text-sm">monitor_weight</span>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">PESO</p>
                </div>
                <button
                  onClick={() => setIsWeightHistoryOpen(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                >
                  <span className="material-icons-round text-sm">history</span>
                  <span>Ver Historial</span>
                </button>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {rabbit.weight ? `${(rabbit.weight * 2.20462).toFixed(1)} lb` : 'Sin registrar'}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="material-icons-round text-primary text-sm">event</span>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">FECHA DE NACIMIENTO</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatDateForDisplay(rabbit.birth_date)}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="material-icons-round text-primary text-sm">
                  {rabbit.sex === 'male' ? 'male' : 'female'}
                </span>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">SEXO</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {rabbit.sex === 'male' ? 'Macho' : 'Hembra'}
              </p>
            </div>
          </div>

          {/* Árbol Genealógico */}
          {hasGenealogy && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center space-x-2 mb-4">
                <span className="material-icons-round text-emerald-600 dark:text-emerald-400 text-xl">account_tree</span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Árbol Genealógico</h3>
              </div>

              {/* Abuelos */}
              {(paternalGrandfather || paternalGrandmother || maternalGrandfather || maternalGrandmother) && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center">
                    <span className="material-icons-round text-sm mr-1">elderly</span>
                    ABUELOS
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Línea Paterna</p>
                      {paternalGrandfather && (
                        <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg p-2">
                          <span className="material-icons-round text-blue-500 text-sm">male</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{paternalGrandfather.name}</span>
                        </div>
                      )}
                      {paternalGrandmother && (
                        <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg p-2">
                          <span className="material-icons-round text-pink-500 text-sm">female</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{paternalGrandmother.name}</span>
                        </div>
                      )}
                      {!paternalGrandfather && !paternalGrandmother && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sin registrar</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Línea Materna</p>
                      {maternalGrandfather && (
                        <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg p-2">
                          <span className="material-icons-round text-blue-500 text-sm">male</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{maternalGrandfather.name}</span>
                        </div>
                      )}
                      {maternalGrandmother && (
                        <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg p-2">
                          <span className="material-icons-round text-pink-500 text-sm">female</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{maternalGrandmother.name}</span>
                        </div>
                      )}
                      {!maternalGrandfather && !maternalGrandmother && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sin registrar</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Padres */}
              {(father || mother) && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center">
                    <span className="material-icons-round text-sm mr-1">family_restroom</span>
                    PADRES
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {father ? (
                      <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg p-3">
                        <span className="material-icons-round text-blue-500">male</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{father.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{father.breed}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <span className="material-icons-round text-gray-300 dark:text-gray-600">male</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500 italic">Padre no registrado</span>
                      </div>
                    )}
                    {mother ? (
                      <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg p-3">
                        <span className="material-icons-round text-pink-500">female</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{mother.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{mother.breed}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <span className="material-icons-round text-gray-300 dark:text-gray-600">female</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500 italic">Madre no registrada</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hermanos */}
              {fullSiblings.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center">
                    <span className="material-icons-round text-sm mr-1">people</span>
                    HERMANOS COMPLETOS ({fullSiblings.length})
                  </p>
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Padres: {father?.name} {father?.left_ear_tattoo && `(${father.left_ear_tattoo})`} × {mother?.name} {mother?.left_ear_tattoo && `(${mother.left_ear_tattoo})`}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {fullSiblings.map(sibling => (
                        <div key={sibling.id} className="flex flex-col bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5">
                          <div className="flex items-center space-x-1">
                            <span className={`material-icons-round text-sm ${sibling.sex === 'male' ? 'text-blue-500' : 'text-pink-500'}`}>
                              {sibling.sex === 'male' ? 'male' : 'female'}
                            </span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{sibling.name}</span>
                          </div>
                          {sibling.left_ear_tattoo && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 ml-5 font-mono">
                              ID: {sibling.left_ear_tattoo}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Medio hermanos */}
              {halfSiblings.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center">
                    <span className="material-icons-round text-sm mr-1">people_outline</span>
                    MEDIO HERMANOS ({halfSiblings.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {halfSiblings.map(sibling => {
                      const siblingFather = allRabbits.find(r => r.id === sibling.parent_male_id);
                      const siblingMother = allRabbits.find(r => r.id === sibling.parent_female_id);
                      const sharedParent = sibling.parent_male_id === rabbit.parent_male_id ? siblingFather : siblingMother;
                      const sharedParentLabel = sharedParent ? `${sharedParent.name}${sharedParent.left_ear_tattoo ? ` (${sharedParent.left_ear_tattoo})` : ''}` : '';
                      
                      return (
                        <div key={sibling.id} className="flex flex-col bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5">
                          <div className="flex items-center space-x-1">
                            <span className={`material-icons-round text-sm ${sibling.sex === 'male' ? 'text-blue-500' : 'text-pink-500'}`}>
                              {sibling.sex === 'male' ? 'male' : 'female'}
                            </span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{sibling.name}</span>
                          </div>
                          {sibling.left_ear_tattoo && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 ml-5 font-mono">
                              ID: {sibling.left_ear_tattoo}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400 ml-5">
                            vía {sharedParentLabel}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hijos */}
              {children.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center">
                    <span className="material-icons-round text-sm mr-1">child_care</span>
                    {rabbit.sex === 'male' ? 'DESCENDENCIA' : 'CRÍAS'} ({children.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {children.map(child => (
                      <div key={child.id} className="flex flex-col bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5">
                        <div className="flex items-center space-x-1">
                          <span className={`material-icons-round text-sm ${child.sex === 'male' ? 'text-blue-500' : 'text-pink-500'}`}>
                            {child.sex === 'male' ? 'male' : 'female'}
                          </span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{child.name}</span>
                        </div>
                        {child.left_ear_tattoo && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 ml-5 font-mono">
                            ID: {child.left_ear_tattoo}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {rabbit.notes && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="material-icons-round text-primary text-sm">notes</span>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">NOTAS</p>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{rabbit.notes}</p>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="flex items-center space-x-2 px-6 py-2 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-icons-round text-lg">edit</span>
              <span>Editar</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="flex items-center space-x-2 px-6 py-2 rounded-xl font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span className="material-icons-round text-lg">delete</span>
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Weight History Modal */}
      {rabbit && (
        <WeightHistoryModal
          isOpen={isWeightHistoryOpen}
          onClose={() => setIsWeightHistoryOpen(false)}
          rabbit={rabbit}
        />
      )}
    </div>
  );
}
