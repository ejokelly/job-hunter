
'use client';

export default function PricingSection() {
  const plans = [
    {
      name: "Free",
      price: "0",
      period: "forever",
      features: [
        "20 customized resumes/month",
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
        "100 customized resumes/month",
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
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold theme-pricing-title mb-6">
            Choose Your Plan
          </h2>
          <p className="text-xl theme-pricing-text max-w-3xl mx-auto">
            Everyone starts free. When you run out of free generations, you'll automatically upgrade to Starter. Need more? Upgrade to Unlimited.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`relative theme-pricing-card rounded-2xl p-8 border transition-all duration-300 hover:transform hover:scale-105 ${
                plan.popular 
                  ? 'theme-pricing-popular' 
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
                <h3 className="text-2xl font-bold theme-pricing-plan-title mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center mb-4">
                  <span className="text-5xl font-bold theme-pricing-plan-price">${plan.price}</span>
                  <span className="theme-pricing-plan-period ml-2">/{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                      </svg>
                    </div>
                    <span className="theme-pricing-feature">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a 
            href="#upload" 
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold theme-pricing-cta-text theme-pricing-cta-bg hover:theme-pricing-cta-bg rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Upload your resume to start
          </a>
        </div>


      </div>
    </section>
  );
}
