interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({ title, value, icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-soft hover:shadow-premium transition-all duration-300 border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{value}</h3>
          {trend && (
            <div className={`flex items-center space-x-1 text-xs font-medium ${
              trendUp ? 'text-primary' : 'text-red-500'
            }`}>
              <span className="material-icons-round text-sm">
                {trendUp ? 'trending_up' : 'trending_down'}
              </span>
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-light/20 to-primary/20 flex items-center justify-center">
          <span className="material-icons-round text-primary text-lg">{icon}</span>
        </div>
      </div>
    </div>
  );
}
