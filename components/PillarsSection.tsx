
'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function PillarsSection() {
  const { t } = useLanguage();

  const pillars = [
    {
      key: 'mentalWellness',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      color: 'bg-purple-600',
      bgLight: 'bg-purple-50'
    },
    {
      key: 'hairSkin',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      color: 'bg-amber-600',
      bgLight: 'bg-amber-50'
    },
    {
      key: 'menstrual',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-rose-600',
      bgLight: 'bg-rose-50'
    }
  ];

  return (
    <section className="section-padding bg-cream-50">
      <div className="container-narrow">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-warm-brown text-sm font-medium tracking-wide uppercase mb-3">
            Holistic Care
          </span>
          <h2 className="section-title text-gray-900">
            {t('pillars.title')}
          </h2>
          <p className="section-subtitle">
            {t('pillars.subtitle')}
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              className={`${pillar.bgLight} rounded-2xl p-6 lg:p-8 border border-gray-100`}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl ${pillar.color} flex items-center justify-center mb-6 text-white`}>
                {pillar.icon}
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t(`pillars.${pillar.key}.title`)}
              </h3>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                {t(`pillars.${pillar.key}.description`)}
              </p>
              
              {/* Features */}
              <ul className="space-y-2">
                {[0, 1, 2, 3].map((featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t(`pillars.${pillar.key}.features.${featureIndex}`)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Card */}
        <div className="card text-center max-w-3xl mx-auto">
          <h3 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-3">
            {t('pillars.holisticTitle')}
          </h3>
          <p className="text-gray-600 leading-relaxed">
            {t('pillars.holisticDescription')}
          </p>
        </div>
      </div>
    </section>
  );
}
