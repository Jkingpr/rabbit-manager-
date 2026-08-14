import { Rabbit } from '@/react-app/hooks/useRabbits';
import { formatDetailedAge } from '@/react-app/utils/dateUtils';
import { exportRabbitPDF } from '@/react-app/utils/pdfExport';

interface RabbitCardProps {
  rabbit: Rabbit;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  onSell?: () => void;
  onUpdate?: (id: number, data: Partial<Rabbit>) => Promise<void>;
}

export default function RabbitCard({ rabbit, onEdit, onDelete, onClick, onSell }: RabbitCardProps) {
  const getWeightInPounds = (weightKg?: number) => {
    if (!weightKg) return '--';
    return (weightKg * 2.20462).toFixed(1);
  };

  const rabbitImage = rabbit.photo_url || 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&h=300&fit=crop';

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-900 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border ${
        rabbit.status === 'deceased' 
          ? 'border-gray-400 dark:border-gray-600 opacity-75' 
          : 'border-gray-200 dark:border-gray-800'
      } cursor-pointer group`}
    >
      <div className="flex items-stretch">
        <div className="w-32 h-32 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
          <img
            src={rabbitImage}
            alt={rabbit.name}
            className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${
              rabbit.status === 'deceased' ? 'grayscale' : ''
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          
          {rabbit.status === 'deceased' && (
            <div className="absolute top-2 right-2 bg-gray-800/90 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shadow-lg">
              <span className="material-icons-round text-sm">sentiment_very_dissatisfied</span>
              <span>Fallecido</span>
            </div>
          )}
          
          <div className={`absolute bottom-2 left-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm ${
            rabbit.sex === 'male' 
              ? 'bg-cyan-500/90' 
              : 'bg-pink-500/90'
          }`}>
            <span className="material-icons-round text-white text-base">
              {rabbit.sex === 'male' ? 'male' : 'female'}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="bg-gradient-to-r from-primary-light/10 to-primary/10 dark:from-primary-light/20 dark:to-primary/20 px-4 py-3 border-b border-primary/20">
            <h3 className="font-bold text-gray-900 dark:text-white text-base break-words">
              {rabbit.left_ear_tattoo ? `${rabbit.left_ear_tattoo} - ${rabbit.name}` : rabbit.name}
            </h3>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="material-icons-round text-primary text-base flex-shrink-0">pets</span>
                <span className="text-gray-900 dark:text-white font-medium break-words">{rabbit.breed}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="material-icons-round text-primary text-base flex-shrink-0">scale</span>
                <span className="text-gray-900 dark:text-white font-semibold">
                  {getWeightInPounds(rabbit.weight)} lb
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="material-icons-round text-primary text-base flex-shrink-0">calendar_today</span>
                <span className="break-words">{formatDetailedAge(rabbit.birth_date)}</span>
              </div>
            </div>

            {(rabbit.parent_male_name || rabbit.parent_female_name) && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
                  <span className="material-icons-round text-sm flex-shrink-0">family_restroom</span>
                  {rabbit.parent_male_name && (
                    <span className="text-cyan-600 dark:text-cyan-400 font-medium break-words">
                      ♂ {rabbit.parent_male_name}
                    </span>
                  )}
                  {rabbit.parent_male_name && rabbit.parent_female_name && (
                    <span>×</span>
                  )}
                  {rabbit.parent_female_name && (
                    <span className="text-pink-600 dark:text-pink-400 font-medium break-words">
                      ♀ {rabbit.parent_female_name}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center items-center gap-1.5 px-3 bg-gray-50 dark:bg-gray-800/50 border-l border-gray-200 dark:border-gray-800">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              exportRabbitPDF(rabbit);
            }}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200 group/btn"
            title="Exportar PDF"
          >
            <span className="material-icons-round text-gray-400 group-hover/btn:text-red-600 group-hover/btn:scale-110 transition-all text-xl">picture_as_pdf</span>
          </button>
          {onSell && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSell();
              }}
              className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-all duration-200 group/btn"
              title="Vender"
            >
              <span className="material-icons-round text-gray-400 group-hover/btn:text-green-600 group-hover/btn:scale-110 transition-all text-xl">sell</span>
            </button>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 group/btn"
            title="Editar"
          >
            <span className="material-icons-round text-gray-400 group-hover/btn:text-blue-600 group-hover/btn:scale-110 transition-all text-xl">edit</span>
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200 group/btn"
            title="Eliminar"
          >
            <span className="material-icons-round text-gray-400 group-hover/btn:text-red-600 group-hover/btn:scale-110 transition-all text-xl">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
