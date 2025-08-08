'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Header from '../auth/header';
import HeroSection from './hero-section';
import UploadSection from './upload-section';
import HowItWorksSection from './how-it-works-section';
import PricingSection from './pricing-section';
import Footer from '../layout/footer';
import LoginModal from '../auth/login-modal';
import { useUI } from '@/app/providers/ui-state-provider';
import { useAuth } from '@/app/providers/auth-provider';
import { createUploadSuccessHandler, createUploadErrorHandler } from './upload-handlers';

const ReactPageScroller = dynamic(() => import('react-page-scroller'), {
  ssr: false,
});

export default function Homepage() {
  const { showLoginModal, currentPage, closeLoginModal, openLoginModal, setCurrentPage } = useUI();
  const { refreshSession } = useAuth();
  const router = useRouter();

  const handleUploadSuccess = createUploadSuccessHandler(router, refreshSession);
  const handleUploadError = createUploadErrorHandler();

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <Header onLoginClick={openLoginModal} />
      
      <ReactPageScroller
        pageOnChange={setCurrentPage}
        customPageNumber={currentPage}
        animationTimer={1000}
        animationTimerBuffer={100}
        transitionTimingFunction="cubic-bezier(0.25, 0.46, 0.45, 0.94)"
        containerHeight="100vh"
        containerWidth="100vw"
        blockScrollUp={false}
        blockScrollDown={false}
        renderAllPagesOnFirstRender={false}
      >
        {/* Hero Section */}
        <div className="h-screen w-screen theme-homepage-bg theme-homepage-text">
          <HeroSection />
        </div>
        
        {/* Upload Section */}
        <div className="h-screen w-screen theme-homepage-bg theme-homepage-text">
          <UploadSection 
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </div>
        
        {/* How It Works Section */}
        <div className="h-screen w-screen theme-homepage-bg theme-homepage-text">
          <HowItWorksSection />
        </div>
        
        {/* Pricing Section */}
        <div className="h-screen w-screen theme-homepage-bg theme-homepage-text">
          <PricingSection />
        </div>
        
        {/* Footer Section */}
        <div className="h-screen w-screen theme-homepage-bg theme-homepage-text flex items-center justify-center">
          <Footer />
        </div>
      </ReactPageScroller>
      
      {showLoginModal && <LoginModal onClose={closeLoginModal} />}
    </div>
  );
}