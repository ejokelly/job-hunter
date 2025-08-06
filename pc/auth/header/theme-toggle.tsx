'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/app/providers/theme-provider';
import posthog from 'posthog-js';

interface ThemeToggleProps {
  isMobile?: boolean;
}

export default function ThemeToggle({ isMobile = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const handleThemeToggle = (from: string, to: string) => {
    const eventName = isMobile ? 'mobile_theme_toggle_clicked' : 'theme_toggle_clicked';
    posthog.capture(eventName, { from, to });
    toggleTheme();
  };

  return (
    <div className="flex items-center theme-bg-tertiary rounded-full p-1">
      <button
        onClick={() => handleThemeToggle('dark', 'light')}
        className={`p-2 rounded-full transition-colors ${
          theme === 'light' ? 'theme-bg-primary text-white' : 'text-gray-400'
        }`}
        aria-label="Light mode"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleThemeToggle('light', 'dark')}
        className={`p-2 rounded-full transition-colors ${
          theme === 'dark' ? 'theme-bg-primary text-white' : 'text-gray-400'
        }`}
        aria-label="Dark mode"
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  );
}