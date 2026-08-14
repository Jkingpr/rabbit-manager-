interface ActionButtonProps {
  label: string;
  icon: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export default function ActionButton({ label, icon, onClick, variant = 'primary' }: ActionButtonProps) {
  const isPrimary = variant === 'primary';
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 shadow-soft hover:shadow-premium ${
        isPrimary
          ? 'bg-gradient-to-r from-primary-light to-primary text-white hover:scale-105'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      <span className="material-icons-round">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
