
'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function SolutionSection() {
  const { t } = useLanguage();
  
  const features = [
    { 
      key: 'available247', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-blue-50 text-blue-600'
    },
    { 
      key: 'voiceFirst', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      color: 'bg-emerald-50 text-emerald-600'
    },
    { 
      key: 'culturallyGrounded', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      color: 'bg-purple-50 text-purple-600'
    },
    { 
      key: 'privacyFocused', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      color: 'bg-amber-50 text-amber-600'
    }
  ];

  const steps = [
    { 
      key: 'sendVoice', 
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      )
    },
    { 
      key: 'getAdvice', 
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    { 
      key: 'feelBetter', 
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  return (
    <section className="section-padding bg-white">
      <div className="container-narrow">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-gold text-sm font-medium tracking-wide uppercase mb-3">
            Our Solution
          </span>
          <h2 className="section-title text-warm-brown">
            {t('solution.title')}
          </h2>
          <p className="section-subtitle">
            {t('solution.subtitle')}
          </p>
        </div>

        {/* Features & Image Grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
          {/* Features List */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className={`icon-circle ${feature.color} shrink-0`}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-warm-brown mb-1">
                    {t(`solution.${feature.key}.title`)}
                  </h3>
                  <p className="text-gray-600">
                    {t(`solution.${feature.key}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Image */}
          <div className="relative order-first lg:order-last">
            <img
              src="https://readdy.ai/api/search-image?query=Beautiful%20Black%20woman%20using%20smartphone%20in%20a%20cozy%20wellness%20space%2C%20natural%20lighting%2C%20peaceful%20expression%2C%20surrounded%20by%20plants%20and%20earth-tone%20decor%2C%20modern%20minimalist%20setting%20with%20African-inspired%20textures%2C%20conveying%20comfort%20and%20technology%20integration%2C%20warm%20and%20inviting%20atmosphere&width=600&height=600&seq=solution1&orientation=squarish"
              alt="Woman using Dada Bora"
              className="rounded-2xl shadow-lg object-cover w-full aspect-square object-top"
            />
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-cream-50 rounded-2xl p-8 lg:p-12">
          <h3 className="text-2xl lg:text-3xl font-playfair font-bold text-warm-brown text-center mb-12">
            {t('solution.simpleTitle')}
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div key={index} className="text-center relative">
                {/* Step Number */}
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-warm-brown text-white text-sm font-bold mb-4">
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-5 text-warm-brown">
                  {step.icon}
                </div>
                
                <h4 className="text-lg font-semibold text-warm-brown mb-2">
                  {t(`solution.steps.${step.key}.title`)}
                </h4>
                <p className="text-gray-600 text-sm">
                  {t(`solution.steps.${step.key}.description`)}
                </p>
                
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gray-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
