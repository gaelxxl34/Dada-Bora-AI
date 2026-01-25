
'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function ProblemSection() {
  const { t } = useLanguage();

  const problems = [
    {
      key: 'limitedAccess',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'bg-rose-50 text-rose-600'
    },
    {
      key: 'fragmented',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      ),
      color: 'bg-amber-50 text-amber-600'
    },
    {
      key: 'barriers',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      color: 'bg-purple-50 text-purple-600'
    }
  ];

  return (
    <section className="section-padding bg-cream-50">
      <div className="container-narrow">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-warm-brown text-sm font-medium tracking-wide uppercase mb-3">
            The Challenge
          </span>
          <h2 className="section-title text-gray-900">
            {t('problem.title')}
          </h2>
          <p className="section-subtitle">
            {t('problem.subtitle')}
          </p>
        </div>
        
        {/* Problem Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {problems.map((problem, index) => (
            <article
              key={index}
              className="card group"
            >
              <div className={`icon-circle ${problem.color} mb-5`}>
                {problem.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t(`problem.${problem.key}.title`)}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t(`problem.${problem.key}.description`)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
