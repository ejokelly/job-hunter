import { Loader2 } from 'lucide-react';

interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'skill';
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function ActionButton({ 
  onClick, 
  children, 
  variant = 'primary', 
  busy = false, 
  disabled = false,
  className = ''
}: ActionButtonProps) {
  const isDisabled = disabled || busy;
  
  // Special handling for skill variant
  if (variant === 'skill') {
    return (
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-2 disabled:bg-gray-200 disabled:cursor-not-allowed ${className}`}
      >
        {busy && <Loader2 className="w-3 h-3 animate-spin" />}
        {children}
      </button>
    );
  }
  
  const baseClasses = "px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors";
  
  const variantClasses = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    secondary: "bg-green-600 hover:bg-green-700 text-white",
    ghost: "text-gray-600 hover:text-gray-800 bg-transparent hover:bg-gray-100"
  };
  
  const disabledClasses = "disabled:bg-gray-400 disabled:cursor-not-allowed";
  
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}