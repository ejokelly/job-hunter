
'use client';

export default function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Paste Job Description",
      description: "Simply copy and paste any job posting. Our AI analyzes the requirements, skills, and qualifications they're looking for.",
      icon: <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>
    },
    {
      number: "02", 
      title: "AI Creates Resume",
      description: "Our advanced AI generates a professional resume tailored specifically to match that job's requirements and keywords.",
      icon: <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M7.5,5.6L5,7L6.4,4.5L5,2L7.5,3.4L10,2L8.6,4.5L10,7L7.5,5.6M19.5,15.4L22,14L20.6,16.5L22,19L19.5,17.6L17,19L18.4,16.5L17,14L19.5,15.4M22,2L20.6,4.5L22,7L19.5,5.6L17,7L18.4,4.5L17,2L19.5,3.4L22,2M13.34,12.78L15.78,10.34L13.66,8.22L11.22,10.66L13.34,12.78M14.37,7.29L16.71,9.63C17.1,10 17.1,10.65 16.71,11.04L5.04,22.71C4.65,23.1 4,23.1 3.63,22.71L1.29,20.37C0.9,20 0.9,19.35 1.29,18.96L12.96,7.29C13.35,6.9 14,6.9 14.37,7.29Z"/></svg>
    },
    {
      number: "03",
      title: "Download & Apply",
      description: "Get your customized resume and cover letter instantly. Ready to submit with your job application.",
      icon: <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>
    }
  ];

  return (
    <section className="h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 theme-works-bg">
      <div className="max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold theme-works-title mb-6">
            How It Works
          </h2>
          <p className="text-xl theme-works-text max-w-3xl mx-auto">
            Get a perfectly tailored resume for any job in just three simple steps. No resume upload needed - we create one from scratch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="theme-works-card rounded-2xl p-8 border transition-colors hover:border-gray-600">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 theme-works-icon-bg rounded-xl flex items-center justify-center mr-4">
                    {step.icon}
                  </div>
                  <span className="theme-works-number font-bold text-2xl">{step.number}</span>
                </div>
                
                <h3 className="text-2xl font-bold theme-works-title mb-4">
                  {step.title}
                </h3>
                
                <p className="theme-works-text leading-relaxed">
                  {step.description}
                </p>
              </div>
              
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-8 transform -translate-y-1/2">
                  <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="theme-works-bottom-card rounded-2xl p-8 border">
            <h3 className="text-2xl font-bold theme-works-bottom-title mb-4">
              Why AI-Generated Resumes Work Better
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13,2.05V5.08C16.39,5.57 19,8.47 19,12C19,12.9 18.82,13.75 18.5,14.54L21.12,16.07C21.68,14.83 22,13.45 22,12C22,6.82 18.05,2.55 13,2.05M12,19C8.13,19 5,15.87 5,12C5,8.13 8.13,5 12,5V2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C13.59,22 15.1,21.59 16.42,20.84L14.28,18.7C13.58,18.89 12.8,19 12,19M15,12A3,3 0 0,0 12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12Z"/>
                  </svg>
                </div>
                <h4 className="font-semibold theme-works-bottom-feature-title mb-2">Instant Creation</h4>
                <p className="theme-works-bottom-feature-text text-sm">Get a perfect resume in seconds</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10Z"/>
                  </svg>
                </div>
                <h4 className="font-semibold theme-works-bottom-feature-title mb-2">Perfect Match</h4>
                <p className="theme-works-bottom-feature-text text-sm">Exactly matches job requirements</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5,9V21H9V9H5M10,21H14V3H10V21M16,21H20V11H16V21Z"/>
                  </svg>
                </div>
                <h4 className="font-semibold theme-works-bottom-feature-title mb-2">Higher Success</h4>
                <p className="theme-works-bottom-feature-text text-sm">More interviews, better results</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
