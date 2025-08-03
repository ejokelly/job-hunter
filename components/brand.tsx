interface BrandProps {
  className?: string;
}

export default function Brand({ className = '' }: BrandProps) {
  return (
    <span className={`font-bold ${className}`}>
      resume<span className="translate-y-[3px] inline-block">❤️</span>
    </span>
  );
}