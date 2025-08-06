
'use client';

interface PricingSectionProps {
  onUploadClick?: () => void;
}

export default function PricingSection({ onUploadClick }: PricingSectionProps) {

  const plans = [
    {
      name: "Free",
      price: "0",
      period: "forever",
      features: [
        `${process.env.NEXT_PUBLIC_FREE_MONTHLY_LIMIT} customized resumes/month`,
        "Customized cover letters", 
        "PDF downloads"
      ],
      popular: false
    },
    {
      name: "Starter",
      price: "25",
      period: "month",
      features: [
        `${process.env.NEXT_PUBLIC_STARTER_MONTHLY_LIMIT} customized resumes/month`,
        "Customized cover letters",
        "PDF downloads", 
        "Email support"
      ],
      popular: true
    },
    {
      name: "Unlimited",
      price: "250",
      period: "month",
      features: [
        "Unlimited customized resumes/month",
        "Customized cover letters",
        "PDF downloads",
        "Email support"
      ],
      popular: false
    }
  ];

  return (
    <section className="h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 theme-pricing-bg">
      <div className="max-w-7xl mx-auto w-full">
        <div className="text-center mb-20">
          <h2 className="text-5xl sm:text-6xl font-black theme-pricing-title mb-8 tracking-tight">
            Plans for everyone
          </h2>
          <p className="text-xl sm:text-2xl theme-pricing-text max-w-3xl mx-auto font-medium leading-relaxed">
            Try {process.env.NEXT_PUBLIC_FREE_MONTHLY_LIMIT} customized resumes free, then choose the plan that works for you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`relative theme-pricing-card rounded-2xl p-10 border transition-all duration-300 hover:transform hover:scale-105 shadow-lg hover:shadow-xl ${
                plan.popular 
                  ? 'theme-pricing-popular shadow-2xl' 
                  : 'hover:border-gray-600'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="theme-pricing-popular-badge px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-black theme-pricing-plan-title mb-2 tracking-tight">{plan.name}</h3>
                <div className="flex items-baseline justify-center mb-4">
                  <span className="text-6xl font-black theme-pricing-plan-price tracking-tight">${plan.price}</span>
                  <span className="theme-pricing-plan-period ml-2 text-lg font-medium opacity-75">/{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0 shadow-md">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                      </svg>
                    </div>
                    <span className="theme-pricing-feature font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button 
            onClick={() => onUploadClick && onUploadClick()}
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold theme-pricing-cta-text theme-pricing-cta-bg hover:theme-pricing-cta-bg rounded-lg transition-all duration-300 shadow-lg hover:shadow-2xl hover:transform hover:-translate-y-1 tracking-wide"
          >
            Upload your resume to start
          </button>
        </div>


      </div>
    </section>
  );
}
