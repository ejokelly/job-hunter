interface IconButtonProps {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  children: React.ReactNode;
}

export default function IconButton({ onClick, disabled = false, busy = false, children }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className={`text-lg p-1 transition-opacity ${
        disabled 
          ? 'opacity-30 cursor-not-allowed'
          : busy
          ? 'opacity-70 cursor-not-allowed animate-pulse'
          : 'opacity-70 hover:opacity-100'
      }`}
    >
      {children}
    </button>
  );
}