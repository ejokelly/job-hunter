interface ThreeDotsLoaderProps {
  className?: string;
}

export default function ThreeDotsLoader({ className = '' }: ThreeDotsLoaderProps) {
  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      <div className="w-2 h-2 theme-dots rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 theme-dots rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 theme-dots rounded-full animate-bounce"></div>
    </div>
  );
}