interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'rabbits', icon: 'pets', label: 'Conejos' },
    { id: 'breeding', icon: 'favorite', label: 'Cruces' },
    { id: 'sales', icon: 'sell', label: 'Ventas' },
    { id: 'expenses', icon: 'payments', label: 'Gastos' },
    { id: 'inactive', icon: 'inventory_2', label: 'Inactivos' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-ios bg-white/80 dark:bg-background-dark/80 border-t border-gray-200/50 dark:border-gray-800/50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-around h-20 pt-2 pb-6 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center space-y-0.5 px-1.5 sm:px-4 py-2 rounded-xl transition-all flex-1 min-w-0 ${
                activeTab === tab.id
                  ? 'text-primary'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className={`material-icons-round text-xl sm:text-2xl ${activeTab === tab.id ? 'animate-float' : ''}`}>
                {tab.icon}
              </span>
              <span className="text-[10px] sm:text-xs font-medium truncate w-full text-center">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
