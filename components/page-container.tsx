interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`min-h-screen flex items-center justify-center p-8 -mt-32 ${className}`}>
      <div className="w-full max-w-4xl">
        {children}
      </div>
    </div>
  );
}