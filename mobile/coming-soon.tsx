'use client';

export default function ComingSoon() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 theme-homepage-bg theme-homepage-text">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21C5,22.11 5.89,23 7,23H17C18.11,23 19,22.11 19,21V3C19,1.89 18.11,1 17,1Z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4 theme-hero-title">
            Mobile Version Coming Soon
          </h1>
          <p className="text-lg theme-text-secondary leading-relaxed mb-8">
            We're working on an amazing mobile experience for resume building. 
            For now, please visit us on your desktop or laptop for the full experience.
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 text-sm theme-text-tertiary">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
            </svg>
            Expected: Q2 2025
          </div>
          
          <div className="pt-6 border-t theme-border-light">
            <p className="text-xs theme-text-tertiary">
              Want to get notified when mobile is ready?<br/>
              Visit us on desktop to sign up for updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}