import { RotateCcw } from 'lucide-react';

interface RegenerateButtonProps {
  onClick: () => void;
  isRegenerating: boolean;
  disabled?: boolean;
}

export default function RegenerateButton({ onClick, isRegenerating, disabled = false }: RegenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isRegenerating}
      className={`
        p-1 transition-all duration-300 
        ${disabled 
          ? 'opacity-30 cursor-not-allowed' 
          : isRegenerating
          ? 'theme-text-accent cursor-not-allowed animate-pulse'
          : 'opacity-70 hover:opacity-100 hover:theme-text-accent'
        }
      `}
    >
      <RotateCcw 
        className={`w-4 h-4 transition-transform duration-300 ${
          isRegenerating ? 'animate-spin' : ''
        }`} 
      />
    </button>
  );
}