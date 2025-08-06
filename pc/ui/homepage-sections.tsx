'use client';

import HeroSection from '../homepage/hero-section';
import UploadSection from '../homepage/upload-section';
import HowItWorksSection from '../homepage/how-it-works-section';
import PricingSection from '../homepage/pricing-section';
import Footer from '../layout/footer';

interface HomepageSectionsProps {
  onUploadSuccess: (userData: any) => Promise<void>;
  onUploadError: (error: string) => void;
}

const sectionClasses = "h-screen w-screen theme-homepage-bg theme-homepage-text";

export default function HomepageSections({ 
  onUploadSuccess, 
  onUploadError 
}: HomepageSectionsProps) {
  const sections = [
    {
      id: 'hero',
      component: <HeroSection />,
    },
    {
      id: 'upload',
      component: (
        <UploadSection 
          onUploadSuccess={onUploadSuccess}
          onUploadError={onUploadError}
        />
      ),
    },
    {
      id: 'how-it-works',
      component: <HowItWorksSection />,
    },
    {
      id: 'pricing',
      component: <PricingSection />,
    },
    {
      id: 'footer',
      component: <Footer />,
      wrapperClasses: `${sectionClasses} flex items-center justify-center`,
    },
  ];

  return (
    <>
      {sections.map((section) => (
        <div 
          key={section.id} 
          className={section.wrapperClasses || sectionClasses}
        >
          {section.component}
        </div>
      ))}
    </>
  );
}