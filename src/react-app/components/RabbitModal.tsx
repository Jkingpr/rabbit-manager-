import { useState, useEffect } from 'react';
import { Rabbit } from '@/react-app/hooks/useRabbits';
import { useCustomBreeds } from '@/react-app/hooks/useCustomBreeds';

interface RabbitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rabbit: Omit<Rabbit, 'id'> | Rabbit) => Promise<void>;
  rabbit?: Rabbit;
  allRabbits?: Rabbit[];
  onRefresh?: () => Promise<void>;
}

export default function RabbitModal({ isOpen, onClose, onSave, rabbit, allRabbits = [], onRefresh }: RabbitModalProps) {
  const { customBreeds, addCustomBreed } = useCustomBreeds();
  const [showAddBreed, setShowAddBreed] = useState(false);
  const [newBreedName, setNewBreedName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    ear_tag: '',
    sex: 'female' as 'male' | 'female',
    breed: '',
    birth_date: '',
    weight: '',
    color: '',
    status: 'active' as 'active' | 'pregnant' | 'breeding' | 'retired' | 'deceased' | 'slaughtered',
    notes: '',
    parent_male_id: '' as string | number,
    parent_female_id: '' as string | number,
    left_ear_tattoo: '',
    right_ear_tattoo: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter available parents
  const availableMales = allRabbits.filter(r => r.sex === 'male' && r.id !== rabbit?.id);
  const availableFemales = allRabbits.filter(r => r.sex === 'female' && r.id !== rabbit?.id);

  useEffect(() => {
    if (rabbit) {
      // Convert kg to lb for display
      const weightInPounds = rabbit.weight ? (rabbit.weight * 2.20462).toFixed(1) : '';
      setFormData({
        name: rabbit.name,
        ear_tag: rabbit.ear_tag,
        sex: rabbit.sex,
        breed: rabbit.breed,
        birth_date: rabbit.birth_date,
        weight: weightInPounds,
        color: rabbit.color || '',
        status: rabbit.status,
        notes: rabbit.notes || '',
        parent_male_id: rabbit.parent_male_id || '',
        parent_female_id: rabbit.parent_female_id || '',
        left_ear_tattoo: rabbit.left_ear_tattoo || '',
        right_ear_tattoo: rabbit.right_ear_tattoo || '',
      });
      setPhotoPreview(rabbit.photo_url || null);
    } else {
      setFormData({
        name: '',
        ear_tag: '',
        sex: 'female',
        breed: '',
        birth_date: '',
        weight: '',
        color: '',
        status: 'active',
        notes: '',
        parent_male_id: '',
        parent_female_id: '',
        left_ear_tattoo: '',
        right_ear_tattoo: '',
      });
      setPhotoPreview(null);
    }
    setPhotoFile(null);
    setError(null);
    setIsSubmitting(false);
  }, [rabbit, isOpen]);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      // Convert pounds to kg for storage
      const weightInKg = formData.weight ? parseFloat(formData.weight) / 2.20462 : undefined;
      
      const dataToSave = {
        ...formData,
        weight: weightInKg,
        parent_male_id: formData.parent_male_id ? Number(formData.parent_male_id) : null,
        parent_female_id: formData.parent_female_id ? Number(formData.parent_female_id) : null,
        left_ear_tattoo: formData.left_ear_tattoo || null,
        right_ear_tattoo: null, // No longer using right ear
        ...(rabbit && { id: rabbit.id }),
      };
      
      // Save rabbit data
      const savedRabbit = await onSave(dataToSave as any);
      
      // Upload photo if one was selected
      // For new rabbits, we need to get the id from the saved rabbit
      // For existing rabbits, use the rabbit.id
      const rabbitId = rabbit?.id || (savedRabbit as any)?.id;
      
      if (photoFile && rabbitId && photoPreview) {
        // Send photo as base64 JSON instead of FormData for better compatibility
        const photoResponse = await fetch(`/api/rabbits/${rabbitId}/photo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photo: photoPreview,
            filename: photoFile.name,
            mimeType: photoFile.type,
          }),
          credentials: 'include',
        });
        
        if (!photoResponse.ok) {
          const errorData = await photoResponse.json();
          console.error('Error uploading photo:', errorData);
          setError('Error al subir la foto. Por favor, intenta de nuevo.');
          setIsSubmitting(false);
          return;
        }
        
        // Refresh the rabbits list to show the new photo
        if (onRefresh) {
          await onRefresh();
        }
      }
      
      onClose();
    } catch (err) {
      console.error('Error al guardar el conejo:', err);
      setError('Error al guardar el conejo. Por favor, intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-squircle p-6 max-w-2xl w-full min-h-screen sm:min-h-0 sm:max-h-[85vh] sm:my-8 overflow-y-auto shadow-premium">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {rabbit ? 'Editar Conejo' : 'Nuevo Conejo'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="material-icons-round text-gray-500">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => {
                const newName = e.target.value;
                setFormData({ 
                  ...formData, 
                  name: newName,
                  // Auto-generate ear_tag from name if creating new rabbit
                  ear_tag: rabbit ? formData.ear_tag : newName
                });
              }}
              placeholder="Nombre del conejo"
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sexo *
              </label>
              <select
                required
                value={formData.sex}
                onChange={(e) => setFormData({ ...formData, sex: e.target.value as 'male' | 'female' })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
              >
                <option value="female">Hembra</option>
                <option value="male">Macho</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Raza *
              </label>
              
              {showAddBreed ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newBreedName}
                      onChange={(e) => setNewBreedName(e.target.value)}
                      placeholder="Nombre de la nueva raza"
                      className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (newBreedName.trim()) {
                          const success = await addCustomBreed(newBreedName.trim());
                          if (success) {
                            setFormData({ ...formData, breed: newBreedName.trim() });
                            setNewBreedName('');
                            setShowAddBreed(false);
                          }
                        }
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                    >
                      <span className="material-icons-round text-sm">check</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddBreed(false);
                        setNewBreedName('');
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
                    >
                      <span className="material-icons-round text-sm">close</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Escribe el nombre de tu raza personalizada y presiona el botón de check
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    required
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                  >
                    <option value="">Selecciona una raza</option>
                    
                    {/* Custom breeds section */}
                    {customBreeds.length > 0 && (
                      <optgroup label="Mis Razas Personalizadas">
                        {customBreeds.map((breed) => (
                          <option key={`custom-${breed.id}`} value={breed.breed_name}>
                            {breed.breed_name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    
                    {/* ARBA breeds section */}
                    <optgroup label="Razas ARBA">
                <option value="American">American</option>
                <option value="American Chinchilla">American Chinchilla</option>
                <option value="American Fuzzy Lop">American Fuzzy Lop</option>
                <option value="American Sable">American Sable</option>
                <option value="Argente Brun">Argente Brun</option>
                <option value="Belgian Hare">Belgian Hare</option>
                <option value="Beveren">Beveren</option>
                <option value="Blanc de Hotot">Blanc de Hotot</option>
                <option value="Britannia Petite">Britannia Petite</option>
                <option value="Californian">Californian</option>
                <option value="Champagne D'Argent">Champagne D'Argent</option>
                <option value="Checkered Giant">Checkered Giant</option>
                <option value="Cinnamon">Cinnamon</option>
                <option value="Creme D'Argent">Creme D'Argent</option>
                <option value="Dutch">Dutch</option>
                <option value="Dwarf Hotot">Dwarf Hotot</option>
                <option value="English Angora">English Angora</option>
                <option value="English Lop">English Lop</option>
                <option value="English Spot">English Spot</option>
                <option value="Flemish Giant">Flemish Giant</option>
                <option value="Florida White">Florida White</option>
                <option value="French Angora">French Angora</option>
                <option value="French Lop">French Lop</option>
                <option value="Giant Angora">Giant Angora</option>
                <option value="Giant Chinchilla">Giant Chinchilla</option>
                <option value="Harlequin">Harlequin</option>
                <option value="Havana">Havana</option>
                <option value="Himalayan">Himalayan</option>
                <option value="Holland Lop">Holland Lop</option>
                <option value="Jersey Wooly">Jersey Wooly</option>
                <option value="Lilac">Lilac</option>
                <option value="Lionhead">Lionhead</option>
                <option value="Mini Lop">Mini Lop</option>
                <option value="Mini Rex">Mini Rex</option>
                <option value="Mini Satin">Mini Satin</option>
                <option value="Netherland Dwarf">Netherland Dwarf</option>
                <option value="New Zealand">New Zealand</option>
                <option value="Palomino">Palomino</option>
                <option value="Polish">Polish</option>
                <option value="Rex">Rex</option>
                <option value="Rhinelander">Rhinelander</option>
                <option value="Satin">Satin</option>
                <option value="Satin Angora">Satin Angora</option>
                <option value="Silver">Silver</option>
                <option value="Silver Fox">Silver Fox</option>
                <option value="Silver Marten">Silver Marten</option>
                <option value="Standard Chinchilla">Standard Chinchilla</option>
                <option value="Tan">Tan</option>
                <option value="Thrianta">Thrianta</option>
                    </optgroup>
                  </select>
                  
                  <button
                    type="button"
                    onClick={() => setShowAddBreed(true)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light rounded-xl hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                  >
                    <span className="material-icons-round text-sm">add</span>
                    <span className="text-sm font-medium">¿No encuentras tu raza? Agrégala aquí</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha de Nacimiento *
              </label>
              <input
                type="date"
                required
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Peso (lb)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="ej: 10.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="ej: Blanco, Gris, Negro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
              >
                <option value="active">Activo</option>
                <option value="pregnant">Gestante</option>
                <option value="breeding">Reproducción</option>
                <option value="retired">Retirado</option>
                <option value="slaughtered">Faenado</option>
                <option value="deceased">Fallecido</option>
              </select>
            </div>
          </div>

          {/* Sección de Foto */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <span className="material-icons-round text-primary">photo_camera</span>
              <span>Foto del Conejo</span>
            </h3>
            
            <div className="space-y-3">
              {photoPreview && (
                <div className="relative w-full aspect-square max-w-xs mx-auto rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                  <img 
                    src={photoPreview} 
                    alt="Vista previa" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl cursor-pointer transition-colors">
                  <span className="material-icons-round">photo_camera</span>
                  <span className="font-medium">
                    {photoPreview ? 'Cambiar Foto' : 'Tomar/Subir Foto'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Toma una foto con la cámara o selecciona una de tu galería
                </p>
              </div>
            </div>
          </div>

          {/* Sección de Código de Identificación */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <span className="material-icons-round text-primary">qr_code</span>
              <span>Código de Identificación</span>
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Código de Identificación
              </label>
              <input
                type="text"
                value={formData.left_ear_tattoo}
                onChange={(e) => setFormData({ ...formData, left_ear_tattoo: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none font-mono"
                placeholder="ej: A001, RB-123, cualquier código que prefieras"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ingresa el código de identificación que prefieras para este conejo
              </p>
            </div>
          </div>

          {/* Sección de Padres */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <span className="material-icons-round text-primary">family_restroom</span>
              <span>Información Genealógica (Opcional)</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Padre (Macho)
                </label>
                <select
                  value={formData.parent_male_id}
                  onChange={(e) => setFormData({ ...formData, parent_male_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  <option value="">Sin padre registrado</option>
                  {availableMales.map(male => (
                    <option key={male.id} value={male.id}>
                      {male.name} ({male.ear_tag}) - {male.breed}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Madre (Hembra)
                </label>
                <select
                  value={formData.parent_female_id}
                  onChange={(e) => setFormData({ ...formData, parent_female_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  <option value="">Sin madre registrada</option>
                  {availableFemales.map(female => (
                    <option key={female.id} value={female.id}>
                      {female.name} ({female.ear_tag}) - {female.breed}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Registrar los padres ayuda a evitar cruces entre familiares y mantener un historial genealógico.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
              placeholder="Información adicional sobre el conejo..."
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
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
              ) : (
                rabbit ? 'Guardar Cambios' : 'Crear Conejo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
