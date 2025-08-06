interface SkillPillProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'missing' | 'matching'
  className?: string
}

export default function SkillPill({ children, onClick, variant = 'matching', className = '' }: SkillPillProps) {
  const baseClasses = "px-4 py-2 rounded-full text-sm font-medium transition-transform hover:scale-105 cursor-pointer"
  
  const variantClasses = {
    missing: "theme-btn-primary", // Use accent color for missing skills
    matching: "theme-text-primary" // Just text, no background
  }
  
  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  )
}