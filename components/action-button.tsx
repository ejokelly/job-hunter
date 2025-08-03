import { Loader2 } from 'lucide-react';

interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'skill' | 'outline';
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
        className={`theme-btn-skill px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-2 ${isDisabled ? 'theme-btn-disabled' : ''} ${className}`}
      >
        {busy && <Loader2 className="w-3 h-3 animate-spin" />}
        {children}
      </button>
    );
  }
  
  const baseClasses = "px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors";
  
  const variantClasses = {
    primary: "theme-btn-primary",
    secondary: "theme-btn-secondary",
    ghost: "theme-btn-ghost",
    outline: "border-2 theme-border theme-text-primary hover:theme-bg-tertiary"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses[variant]} ${isDisabled ? 'theme-btn-disabled' : ''} ${className}`}
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}