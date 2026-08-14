import { useState } from 'react';
import TopNav from '@/react-app/components/TopNav';
import BottomNav from '@/react-app/components/BottomNav';
import StatCard from '@/react-app/components/StatCard';
import RabbitCard from '@/react-app/components/RabbitCard';
import RabbitModal from '@/react-app/components/RabbitModal';
import RabbitDetailsModal from '@/react-app/components/RabbitDetailsModal';
import BreedingModal from '@/react-app/components/BreedingModal';
import LitterModal from '@/react-app/components/LitterModal';
import ConfirmModal from '@/react-app/components/ConfirmModal';
import SellModal from '@/react-app/components/SellModal';
import ExpenseModal from '@/react-app/components/ExpenseModal';
import { useRabbits, Rabbit } from '@/react-app/hooks/useRabbits';
import { useBreedings } from '@/react-app/hooks/useBreedings';
import { useLitters } from '@/react-app/hooks/useLitters';
import { useExpenses, Expense } from '@/react-app/hooks/useExpenses';
import { useImportantDateNotifications } from '@/react-app/hooks/useImportantDateNotifications';
import { exportBreedingPDF, exportExpensesPDF } from '@/react-app/utils/pdfExport';

export default function Home() {
  const [activeTab, setActiveTab] = useState('rabbits');
  const [searchQuery, setSearchQuery] = useState('');
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  const [breedFilter, setBreedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('age-desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBreedingModalOpen, setIsBreedingModalOpen] = useState(false);
  const [isLitterModalOpen, setIsLitterModalOpen] = useState(false);
  const [selectedBreedingId, setSelectedBreedingId] = useState<number | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRabbit, setEditingRabbit] = useState<Rabbit | undefined>();
  const [deletingRabbit, setDeletingRabbit] = useState<Rabbit | null>(null);
  const [editingBreeding, setEditingBreeding] = useState<any>(undefined);
  const [deletingBreeding, setDeletingBreeding] = useState<any>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<string>('all');
  const [expensePeriodFilter, setExpensePeriodFilter] = useState<string>('all');
  const [deleteType, setDeleteType] = useState<'rabbit' | 'breeding' | 'expense'>('rabbit');
  const [selectedRabbit, setSelectedRabbit] = useState<Rabbit | null>(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [inactiveFilter, setInactiveFilter] = useState<'all' | 'deceased' | 'slaughtered' | 'retired'>('all');


  const { rabbits, loading, addRabbit, updateRabbit, deleteRabbit, refetch: refetchRabbits } = useRabbits();
  const { breedings, addBreeding, updateBreeding, deleteBreeding, refetch: refetchBreedings } = useBreedings();
  const { litters, addLitter, updateLitter, refetch: refetchLitters } = useLitters();
  const { expenses, addExpense, updateExpense, deleteExpense, refetch: refetchExpenses } = useExpenses();

  useImportantDateNotifications();

  const safeRabbits = Array.isArray(rabbits) ? rabbits : [];
  const safeBreedings = Array.isArray(breedings) ? breedings : [];
  const safeLitters = Array.isArray(litters) ? litters : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  
  const filteredExpenses = safeExpenses.filter(expense => {
    if (expenseTypeFilter !== 'all' && expense.expense_type !== expenseTypeFilter) {
      return false;
    }
    
    if (expensePeriodFilter !== 'all') {
      const expenseDate = new Date(expense.expense_date);
      const today = new Date();
      
      if (expensePeriodFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        if (expenseDate < weekAgo) return false;
      } else if (expensePeriodFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        if (expenseDate < monthAgo) return false;
      } else if (expensePeriodFilter === 'year') {
        const yearAgo = new Date(today);
        yearAgo.setFullYear(today.getFullYear() - 1);
        if (expenseDate < yearAgo) return false;
      }
    }
    
    return true;
  });
  
  const activeRabbits = safeRabbits.filter(rabbit => 
    rabbit.status !== 'deceased' && 
    rabbit.status !== 'slaughtered' && 
    rabbit.status !== 'retired' &&
    !rabbit.sold_to
  );
  const inactiveRabbits = safeRabbits.filter(rabbit => rabbit.status === 'deceased' || rabbit.status === 'slaughtered' || rabbit.status === 'retired');
  
  const availableBreeds = Array.from(new Set(activeRabbits.map(r => r.breed).filter(Boolean))).sort();
  
  // Determine if rabbit is a kit (less than 6 months old)
  const isKit = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    const monthsDiff = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
    return monthsDiff < 6;
  };
  
  const getAgeInDays = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    return Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filteredRabbits = activeRabbits.filter(rabbit => {
    // Search filter
    const matchesSearch = (rabbit.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rabbit.ear_tag || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rabbit.breed || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // Breed filter
    const matchesBreed = breedFilter === 'all' || rabbit.breed === breedFilter;
    
    return matchesSearch && matchesBreed;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.id - a.id; // Más recientes primero (ID mayor = más nuevo)
      case 'oldest':
        return a.id - b.id; // Más antiguos primero
      case 'age-desc':
        return getAgeInDays(b.birth_date) - getAgeInDays(a.birth_date); // Mayor edad primero
      case 'age-asc':
        return getAgeInDays(a.birth_date) - getAgeInDays(b.birth_date); // Menor edad primero
      case 'name-asc':
        return (a.name || '').localeCompare(b.name || ''); // Nombre A-Z
      case 'name-desc':
        return (b.name || '').localeCompare(a.name || ''); // Nombre Z-A
      default:
        return b.id - a.id;
    }
  });

  const stats = {
    total: activeRabbits.length,
    males: activeRabbits.filter(r => r.sex === 'male').length,
    females: activeRabbits.filter(r => r.sex === 'female').length,
    kits: activeRabbits.filter(r => isKit(r.birth_date)).length,
  };

  const handleSaveRabbit = async (rabbit: Omit<Rabbit, 'id'> | Rabbit) => {
    try {
      let savedRabbit;
      if ('id' in rabbit) {
        savedRabbit = await updateRabbit(rabbit.id, rabbit);
      } else {
        savedRabbit = await addRabbit(rabbit);
      }
      setEditingRabbit(undefined);
      return savedRabbit;
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
      throw error;
    }
  };

  const handleEditRabbit = (rabbit: Rabbit) => {
    setEditingRabbit(rabbit);
    setIsModalOpen(true);
  };

  const handleViewDetails = (rabbit: Rabbit) => {
    setSelectedRabbit(rabbit);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteClick = (rabbit: Rabbit) => {
    setDeletingRabbit(rabbit);
    setDeleteType('rabbit');
    setIsDeleteModalOpen(true);
  };

  const handleDeleteBreedingClick = (breeding: any) => {
    setDeletingBreeding(breeding);
    setDeleteType('breeding');
    setIsDeleteModalOpen(true);
  };

  const handleDeleteExpenseClick = (expense: Expense) => {
    setDeletingExpense(expense);
    setDeleteType('expense');
    setIsDeleteModalOpen(true);
  };

  const handleSellClick = (rabbit: Rabbit) => {
    setSelectedRabbit(rabbit);
    setShowSellModal(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteType === 'rabbit' && deletingRabbit) {
      await deleteRabbit(deletingRabbit.id);
      setDeletingRabbit(null);
    } else if (deleteType === 'breeding' && deletingBreeding) {
      await deleteBreeding(deletingBreeding.id);
      setDeletingBreeding(null);
      await refetchBreedings();
    } else if (deleteType === 'expense' && deletingExpense) {
      await deleteExpense(deletingExpense.id);
      setDeletingExpense(null);
      await refetchExpenses();
    }
  };

  const handleSaveBreeding = async (breeding: any) => {
    if ('id' in breeding) {
      await updateBreeding(breeding.id, breeding);
    } else {
      await addBreeding(breeding);
    }
    await refetchBreedings();
    setEditingBreeding(undefined);
  };

  const handleSaveLitter = async (litter: any) => {
    if ('id' in litter) {
      await updateLitter(litter.id, litter);
    } else {
      await addLitter(litter);
    }
    await refetchLitters();
    await refetchRabbits();
    await refetchBreedings();
  };

  const handleRegisterLitter = (breedingId: number) => {
    setSelectedBreedingId(breedingId);
    setIsLitterModalOpen(true);
  };

  const handleSaveExpense = async (expenseData: Partial<Expense>) => {
    if (expenseData.id) {
      return await updateExpense(expenseData.id, expenseData);
    } else {
      return await addExpense(expenseData);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'rabbits':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Mis Conejos 🐰
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Gestiona tu granja cunícola de manera profesional
              </p>
            </div>

            {/* Quick Stats Pills */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="group relative overflow-hidden flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-light/20 to-primary/20 border border-primary/30 hover:border-primary hover:shadow-lg transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-light/0 to-primary/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span className="material-icons-round text-primary text-lg relative z-10">pets</span>
                <div className="relative z-10">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-none">Total</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white leading-none mt-0.5">{stats.total}</p>
                </div>
              </div>

              <div className="group relative overflow-hidden flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-300 dark:border-blue-700 hover:border-blue-500 hover:shadow-lg transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 to-blue-500/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span className="material-icons-round text-blue-600 dark:text-blue-400 text-lg relative z-10">male</span>
                <div className="relative z-10">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 leading-none">Machos</p>
                  <p className="text-lg font-bold text-blue-900 dark:text-blue-100 leading-none mt-0.5">{stats.males}</p>
                </div>
              </div>

              <div className="group relative overflow-hidden flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30 border border-pink-300 dark:border-pink-700 hover:border-pink-500 hover:shadow-lg transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-400/0 to-pink-500/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span className="material-icons-round text-pink-600 dark:text-pink-400 text-lg relative z-10">female</span>
                <div className="relative z-10">
                  <p className="text-xs font-medium text-pink-700 dark:text-pink-300 leading-none">Hembras</p>
                  <p className="text-lg font-bold text-pink-900 dark:text-pink-100 leading-none mt-0.5">{stats.females}</p>
                </div>
              </div>

              <div className="group relative overflow-hidden flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 border border-amber-300 dark:border-amber-700 hover:border-amber-500 hover:shadow-lg transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 to-amber-500/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span className="material-icons-round text-amber-600 dark:text-amber-400 text-lg relative z-10">child_care</span>
                <div className="relative z-10">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300 leading-none">Gazapos</p>
                  <p className="text-lg font-bold text-amber-900 dark:text-amber-100 leading-none mt-0.5">{stats.kits}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por nombre, etiqueta o raza..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <button 
                  onClick={() => {
                    setEditingRabbit(undefined);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl font-semibold bg-gradient-to-r from-primary-light to-primary text-white hover:scale-105 transition-all shadow-soft hover:shadow-premium"
                >
                  <span className="material-icons-round">add_circle</span>
                  <span>Nuevo Conejo</span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className="material-icons-round text-gray-400 text-sm">filter_list</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filtros:</span>
                </div>

                {/* Sort Filter */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="newest">Más recientes</option>
                  <option value="oldest">Más antiguos</option>
                  <option value="age-desc">Mayor a menor</option>
                  <option value="age-asc">Menor a mayor</option>
                </select>

                {/* Breed Filter */}
                <select
                  value={breedFilter}
                  onChange={(e) => setBreedFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="all">Todas las razas</option>
                  {availableBreeds.map(breed => (
                    <option key={breed} value={breed}>{breed}</option>
                  ))}
                </select>

                {/* Clear filters button */}
                {breedFilter !== 'all' && (
                  <button
                    onClick={() => {
                      setBreedFilter('all');
                    }}
                    className="px-3 py-1.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center space-x-1"
                  >
                    <span className="material-icons-round text-sm">close</span>
                    <span>Limpiar</span>
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin w-12 h-12 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full"></div>
                <p className="text-gray-500 dark:text-gray-400">Cargando conejos...</p>
              </div>
            ) : filteredRabbits.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRabbits.map((rabbit) => (
                  <RabbitCard 
                    key={rabbit.id} 
                    rabbit={rabbit}
                    onClick={() => handleViewDetails(rabbit)}
                    onSell={() => handleSellClick(rabbit)}
                    onEdit={() => handleEditRabbit(rabbit)}
                    onDelete={() => handleDeleteClick(rabbit)}
                    onUpdate={updateRabbit}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-700 mb-4">
                  {searchQuery ? 'search_off' : 'pets'}
                </span>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery 
                    ? 'No se encontraron conejos que coincidan con la búsqueda'
                    : 'No hay conejos registrados. Agrega tu primer conejo para comenzar.'}
                </p>
              </div>
            )}
          </div>
        );

      case 'breeding':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Cruces 💕
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Gestiona los cruces y reproducción
                </p>
              </div>
              <button 
                onClick={() => {
                  setEditingBreeding(undefined);
                  setIsBreedingModalOpen(true);
                }}
                className="flex items-center space-x-2 px-6 py-3 rounded-2xl font-semibold bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:scale-105 transition-all shadow-soft"
              >
                <span className="material-icons-round">favorite</span>
                <span>Nuevo Cruce</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Cruces Pendientes" value={safeBreedings.filter(b => b.status === 'pending').length.toString()} icon="favorite" />
              <StatCard title="Cruces Completados" value={safeBreedings.filter(b => b.status === 'completed').length.toString()} icon="check_circle" />
              <StatCard title="Cruces Fallidos" value={safeBreedings.filter(b => b.status === 'failed').length.toString()} icon="close" />
            </div>

            {safeBreedings.filter(b => b.status !== 'completed').length > 0 ? (
              <div className="space-y-4">
                {safeBreedings.filter(b => b.status !== 'completed').map((breeding) => (
                  <div
                    key={breeding.id}
                    className="bg-white dark:bg-gray-900 rounded-squircle p-6 shadow-soft border border-gray-100 dark:border-gray-800"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30 flex items-center justify-center">
                          <span className="material-icons-round text-pink-600 text-2xl">favorite</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">
                            {breeding.male_name} × {breeding.female_name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            #{breeding.male_ear_tag} × #{breeding.female_ear_tag}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        breeding.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {breeding.status === 'pending' ? 'Pendiente' : 'Fallido'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Fecha de Cruce</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {(() => {
                            const [year, month, day] = breeding.breeding_date.split('-').map(Number);
                            const date = new Date(year, month - 1, day);
                            return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                          })()}
                        </p>
                      </div>
                      {breeding.expected_birth_date && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Parto Esperado</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {(() => {
                              const [year, month, day] = breeding.expected_birth_date.split('-').map(Number);
                              const date = new Date(year, month - 1, day);
                              return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            })()}
                          </p>
                        </div>
                      )}
                      {breeding.actual_birth_date && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Parto Real</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {(() => {
                              const [year, month, day] = breeding.actual_birth_date.split('-').map(Number);
                              const date = new Date(year, month - 1, day);
                              return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            })()}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Barra de progreso de gestación */}
                    {breeding.status === 'pending' && breeding.expected_birth_date && (() => {
                      // Parse dates properly to avoid timezone issues
                      const [breedingYear, breedingMonth, breedingDay] = breeding.breeding_date.split('-').map(Number);
                      const breedingDate = new Date(breedingYear, breedingMonth - 1, breedingDay);
                      
                      const [expectedYear, expectedMonth, expectedDay] = breeding.expected_birth_date.split('-').map(Number);
                      const expectedDate = new Date(expectedYear, expectedMonth - 1, expectedDay);
                      
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      const totalDays = Math.ceil((expectedDate.getTime() - breedingDate.getTime()) / (1000 * 60 * 60 * 24));
                      const elapsedDays = Math.ceil((today.getTime() - breedingDate.getTime()) / (1000 * 60 * 60 * 24));
                      const remainingDays = Math.max(0, totalDays - elapsedDays);
                      const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
                      
                      return (
                        <div className="mb-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 rounded-xl border border-pink-200 dark:border-pink-800/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="material-icons-round text-pink-600 text-lg">schedule</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                Progreso de Gestación
                              </span>
                            </div>
                            <span className="text-sm font-bold text-pink-600 dark:text-pink-400">
                              {remainingDays > 0 ? `${remainingDays} días restantes` : '¡Parto inminente!'}
                            </span>
                          </div>
                          <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-500 shadow-soft"
                              style={{ width: `${progress}%` }}
                            >
                              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
                            <span>Día {elapsedDays} de {totalDays}</span>
                            <span className="font-semibold">{Math.round(progress)}%</span>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex items-center space-x-2">
                      {breeding.status === 'pending' && (
                        <button
                          onClick={() => handleRegisterLitter(breeding.id)}
                          className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white hover:scale-105 transition-all shadow-soft"
                          title="Registrar Camada"
                        >
                          <span className="material-icons-round text-sm">add_circle</span>
                          <span className="text-xs font-semibold">Registrar Camada</span>
                        </button>
                      )}
                      <button
                        onClick={() => exportBreedingPDF(breeding)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                        title="Exportar PDF"
                      >
                        <span className="material-icons-round text-gray-400 group-hover:text-red-500 text-lg">picture_as_pdf</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingBreeding(breeding);
                          setIsBreedingModalOpen(true);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <span className="material-icons-round text-gray-400 text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteBreedingClick(breeding)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                      >
                        <span className="material-icons-round text-gray-400 group-hover:text-red-500 text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-light/20 to-primary/20 flex items-center justify-center">
                  <span className="material-icons-round text-primary text-5xl">favorite</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Sin cruces registrados
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Los cruces registrados aparecerán aquí
                </p>
              </div>
            )}
          </div>
        );

      case 'expenses':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Gastos 💰
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Control de alimentos, medicinas y otros gastos
                </p>
              </div>
              <button 
                onClick={() => {
                  setEditingExpense(undefined);
                  setIsExpenseModalOpen(true);
                }}
                className="flex items-center space-x-2 px-6 py-3 rounded-2xl font-semibold bg-gradient-to-r from-green-500 to-green-600 text-white hover:scale-105 transition-all shadow-soft"
              >
                <span className="material-icons-round">payments</span>
                <span>Nuevo Gasto</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard 
                title="Total Gastos" 
                value={`$${filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}`} 
                icon="payments" 
              />
              <StatCard 
                title="Alimento" 
                value={`$${filteredExpenses.filter(e => e.expense_type === 'Alimento').reduce((sum, e) => sum + e.amount, 0).toFixed(2)}`} 
                icon="grass" 
              />
              <StatCard 
                title="Medicinas" 
                value={`$${filteredExpenses.filter(e => e.expense_type === 'Medicinas').reduce((sum, e) => sum + e.amount, 0).toFixed(2)}`} 
                icon="medical_services" 
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-2">
                <span className="material-icons-round text-gray-400">filter_list</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filtros:</span>
              </div>
              
              {/* Type filter */}
              <select 
                value={expenseTypeFilter}
                onChange={(e) => setExpenseTypeFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Todos los tipos</option>
                <option value="Alimento">Alimento</option>
                <option value="Medicinas">Medicinas</option>
              </select>

              {/* Period filter */}
              <select 
                value={expensePeriodFilter}
                onChange={(e) => setExpensePeriodFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Todo el tiempo</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mes</option>
                <option value="year">Este año</option>
              </select>

              {/* Export button */}
              <button
                onClick={() => exportExpensesPDF(filteredExpenses, expenseTypeFilter, expensePeriodFilter)}
                className="ml-auto flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg"
              >
                <span className="material-icons-round text-lg">picture_as_pdf</span>
                <span>Descargar PDF</span>
              </button>
            </div>

            {filteredExpenses.length > 0 ? (
              <div className="space-y-4">
                {filteredExpenses.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()).map((expense) => {
                  const typeIcons: Record<string, string> = {
                    'Alimento': 'grass',
                    'Medicinas': 'medical_services'
                  };
                  const typeLabels: Record<string, string> = {
                    'Alimento': 'Alimento',
                    'Medicinas': 'Medicinas'
                  };
                  return (
                    <div
                      key={expense.id}
                      className="bg-white dark:bg-gray-900 rounded-squircle p-6 shadow-soft border border-gray-100 dark:border-gray-800"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center">
                            <span className="material-icons-round text-green-600 text-2xl">{typeIcons[expense.expense_type] || 'payments'}</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">
                              {expense.description}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(expense.expense_date).toLocaleDateString('es-ES')} • {typeLabels[expense.expense_type]}
                            </p>
                          </div>
                        </div>
                        <span className="px-4 py-2 rounded-full text-lg font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          ${expense.amount.toFixed(2)}
                        </span>
                      </div>
                      {expense.quantity && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Cantidad: <span className="font-medium text-gray-900 dark:text-white">{expense.quantity}</span>
                          </p>
                        </div>
                      )}
                      {expense.notes && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">NOTAS</p>
                          <p className="text-sm text-gray-900 dark:text-white">{expense.notes}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                          onClick={() => {
                            setEditingExpense(expense);
                            setIsExpenseModalOpen(true);
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <span className="material-icons-round text-gray-400 text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteExpenseClick(expense)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                        >
                          <span className="material-icons-round text-gray-400 group-hover:text-red-500 text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center">
                  <span className="material-icons-round text-green-600 text-5xl">payments</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Sin gastos registrados
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Los gastos registrados aparecerán aquí
                </p>
              </div>
            )}
          </div>
        );

      case 'sales':
        const soldRabbits = safeRabbits.filter(r => r.sold_to && r.sale_price);
        
        // Filter by search query (ID, name, parent names, buyer name)
        const filteredSoldRabbits = soldRabbits.filter(rabbit => {
          if (!salesSearchQuery.trim()) return true;
          
          const query = salesSearchQuery.toLowerCase();
          const matchesName = rabbit.name.toLowerCase().includes(query);
          const matchesId = rabbit.left_ear_tattoo?.toLowerCase().includes(query);
          const matchesBuyer = rabbit.sold_to?.toLowerCase().includes(query);
          
          // Get parent names
          const parentMale = safeRabbits.find(r => r.id === rabbit.parent_male_id);
          const parentFemale = safeRabbits.find(r => r.id === rabbit.parent_female_id);
          const matchesParentMale = parentMale?.name.toLowerCase().includes(query);
          const matchesParentFemale = parentFemale?.name.toLowerCase().includes(query);
          
          return matchesName || matchesId || matchesBuyer || matchesParentMale || matchesParentFemale;
        });
        
        const totalSalesRevenue = soldRabbits.reduce((sum, r) => sum + (r.sale_price || 0), 0);

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Ventas 💰
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Historial de conejos vendidos
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                icon="sell"
                title="Total Vendidos"
                value={soldRabbits.length.toString()}
              />
              <StatCard
                icon="payments"
                title="Ingresos Totales"
                value={`$${totalSalesRevenue.toFixed(2)}`}
              />
            </div>

            {/* Search Bar */}
            <div className="relative">
              <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar por nombre, ID, comprador, o nombre de los padres..."
                value={salesSearchQuery}
                onChange={(e) => setSalesSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
              />
              {salesSearchQuery && (
                <button
                  onClick={() => setSalesSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <span className="material-icons-round">close</span>
                </button>
              )}
            </div>

            {filteredSoldRabbits.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredSoldRabbits.map((rabbit) => (
                  <div
                    key={rabbit.id}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => handleViewDetails(rabbit)}
                  >
                    <div className="flex items-start gap-4">
                      {rabbit.photo_url && (
                        <img
                          src={rabbit.photo_url}
                          alt={rabbit.name}
                          className="w-20 h-20 rounded-xl object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                              {rabbit.name}
                            </h3>
                            {rabbit.left_ear_tattoo && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                ID: {rabbit.left_ear_tattoo}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right mr-2">
                              <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                                ${rabbit.sale_price?.toFixed(2)}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditRabbit(rabbit);
                              }}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <span className="material-icons-round text-xl">edit</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(rabbit);
                              }}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <span className="material-icons-round text-xl">delete</span>
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <span className="material-icons-round text-base">person</span>
                            <span>Comprador: <strong className="text-gray-900 dark:text-white">{rabbit.sold_to}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <span className="material-icons-round text-base">calendar_today</span>
                            <span>Fecha: <strong className="text-gray-900 dark:text-white">{rabbit.sold_date ? new Date(rabbit.sold_date).toLocaleDateString('es-PR') : 'N/A'}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <span className="material-icons-round text-base">pets</span>
                            <span>Raza: <strong className="text-gray-900 dark:text-white">{rabbit.breed}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <span className="material-icons-round text-base">
                              {rabbit.sex === 'male' ? 'male' : 'female'}
                            </span>
                            <span>Sexo: <strong className="text-gray-900 dark:text-white">{rabbit.sex === 'male' ? 'Macho' : 'Hembra'}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : salesSearchQuery ? (
              <div className="text-center py-12">
                <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-700 mb-4">
                  search_off
                </span>
                <p className="text-gray-500 dark:text-gray-400">
                  No se encontraron ventas con "{salesSearchQuery}".
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-700 mb-4">
                  sell
                </span>
                <p className="text-gray-500 dark:text-gray-400">
                  No hay ventas registradas aún.
                </p>
              </div>
            )}
          </div>
        );

      case 'inactive':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Conejos Inactivos 📦
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Registro de conejos fallecidos, faenados y retirados - Su información se mantiene para el árbol genealógico
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
              <StatCard title="Total Inactivos" value={inactiveRabbits.length.toString()} icon="inventory_2" />
              <StatCard 
                title="Fallecidos" 
                value={inactiveRabbits.filter(r => r.status === 'deceased').length.toString()} 
                icon="broken_image" 
              />
              <StatCard 
                title="Faenados" 
                value={inactiveRabbits.filter(r => r.status === 'slaughtered').length.toString()} 
                icon="restaurant" 
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar por nombre, etiqueta o raza..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setInactiveFilter('all')}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    inactiveFilter === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setInactiveFilter('deceased')}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    inactiveFilter === 'deceased'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Fallecidos
                </button>
                <button
                  onClick={() => setInactiveFilter('slaughtered')}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    inactiveFilter === 'slaughtered'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Faenados
                </button>
                <button
                  onClick={() => setInactiveFilter('retired')}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    inactiveFilter === 'retired'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Retirados
                </button>
              </div>
            </div>

            {inactiveRabbits.filter(rabbit => {
              const matchesSearch = (rabbit.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (rabbit.ear_tag || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (rabbit.breed || '').toLowerCase().includes(searchQuery.toLowerCase());
              const matchesFilter = inactiveFilter === 'all' || rabbit.status === inactiveFilter;
              return matchesSearch && matchesFilter;
            }).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inactiveRabbits.filter(rabbit => {
                  const matchesSearch = (rabbit.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (rabbit.ear_tag || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (rabbit.breed || '').toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesFilter = inactiveFilter === 'all' || rabbit.status === inactiveFilter;
                  return matchesSearch && matchesFilter;
                }).map((rabbit) => (
                  <RabbitCard 
                    key={rabbit.id} 
                    rabbit={rabbit}
                    onClick={() => handleViewDetails(rabbit)}
                    onEdit={() => handleEditRabbit(rabbit)}
                    onDelete={() => handleDeleteClick(rabbit)}
                    onUpdate={updateRabbit}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-700 mb-4">
                  {searchQuery ? 'search_off' : 'inventory_2'}
                </span>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery 
                    ? 'No se encontraron conejos inactivos que coincidan con la búsqueda'
                    : 'No hay conejos inactivos registrados'}
                </p>
              </div>
            )}
          </div>
        );


      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors">
      <TopNav breedings={safeBreedings} litters={safeLitters} />
      
      <main className="pt-20 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto hide-scrollbar">
        {renderContent()}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <RabbitModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRabbit(undefined);
        }}
        onSave={handleSaveRabbit}
        rabbit={editingRabbit}
        allRabbits={safeRabbits}
        onRefresh={refetchRabbits}
      />

      <RabbitDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedRabbit(null);
        }}
        rabbit={selectedRabbit}
        allRabbits={safeRabbits}
        onEdit={() => {
          if (selectedRabbit) {
            handleEditRabbit(selectedRabbit);
          }
        }}
        onDelete={() => {
          if (selectedRabbit) {
            handleDeleteClick(selectedRabbit);
          }
        }}
      />

      <BreedingModal
        isOpen={isBreedingModalOpen}
        onClose={() => {
          setIsBreedingModalOpen(false);
          setEditingBreeding(undefined);
        }}
        onSave={handleSaveBreeding}
        rabbits={safeRabbits}
        breeding={editingBreeding}
      />

      <LitterModal
        isOpen={isLitterModalOpen}
        onClose={() => {
          setIsLitterModalOpen(false);
          setSelectedBreedingId(null);
        }}
        onSave={handleSaveLitter}
        breedings={safeBreedings}
        preSelectedBreedingId={selectedBreedingId}
      />

      {showSellModal && selectedRabbit && (
        <SellModal
          rabbit={selectedRabbit}
          isOpen={showSellModal}
          onClose={() => {
            setShowSellModal(false);
            setSelectedRabbit(null);
          }}
          onSave={updateRabbit}
        />
      )}

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(undefined);
        }}
        onSave={handleSaveExpense}
        expense={editingExpense}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingRabbit(null);
          setDeletingBreeding(null);
          setDeletingExpense(null);
        }}
        onConfirm={handleConfirmDelete}
        title={
          deleteType === 'rabbit' ? 'Eliminar Conejo' : 
          deleteType === 'breeding' ? 'Eliminar Cruce' : 
          'Eliminar Gasto'
        }
        message={
          deleteType === 'rabbit' 
            ? `¿Estás seguro que deseas eliminar a ${deletingRabbit?.name}? Esta acción no se puede deshacer.`
            : deleteType === 'breeding'
            ? `¿Estás seguro que deseas eliminar el cruce entre ${deletingBreeding?.male_name} y ${deletingBreeding?.female_name}? Esta acción no se puede deshacer.`
            : `¿Estás seguro que deseas eliminar este gasto? Esta acción no se puede deshacer.`
        }
        confirmText="Eliminar"
        confirmColor="bg-red-500 hover:bg-red-600"
      />
    </div>
  );
}
