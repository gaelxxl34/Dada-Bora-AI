'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function JourneySection() {
  const { t } = useLanguage();
  
  const milestones = [
    {
      key: 'mvp',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      status: 'completed'
    },
    {
      key: 'users100',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      status: 'completed'
    },
    {
      key: 'languages',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      ),
      status: 'completed'
    },
    {
      key: 'usExpansion',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      status: 'upcoming'
    }
  ];

  return (
    <section className="section-padding bg-white">
      <div className="container-narrow">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-gold text-sm font-medium tracking-wide uppercase mb-3">
            Our Progress
          </span>
          <h2 className="section-title text-warm-brown">
            {t('journey.title')}
          </h2>
          <p className="section-subtitle">
            {t('journey.subtitle')}
          </p>
        </div>

        {/* Timeline */}
        <div className="max-w-3xl mx-auto">
          <div className="space-y-0">
            {milestones.map((milestone, index) => (
              <div key={index} className="relative flex gap-6">
                {/* Timeline Line & Dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    milestone.status === 'completed' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {milestone.icon}
                  </div>
                  {index < milestones.length - 1 && (
                    <div className={`w-0.5 flex-1 my-2 ${
                      milestone.status === 'completed' ? 'bg-green-200' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
                
                {/* Content */}
                <div className="pb-10">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-warm-brown">
                      {t(`journey.${milestone.key}.title`)}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      milestone.status === 'completed' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {milestone.status === 'completed' ? (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {t('journey.completed')}
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('journey.comingSoon')}
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    {t(`journey.${milestone.key}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Card */}
        <div className="mt-12 card text-center max-w-2xl mx-auto bg-cream-50">
          <h3 className="text-xl font-semibold text-warm-brown mb-3">
            {t('journey.continuesTitle')}
          </h3>
          <p className="text-gray-600">
            {t('journey.continuesDescription')}
          </p>
        </div>
      </div>
    </section>
  );
}
