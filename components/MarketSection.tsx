'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function MarketSection() {
  const { t } = useLanguage();
  
  const stats = [
    {
      key: 'africa',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      key: 'us',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      key: 'whatsapp',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      )
    }
  ];

  return (
    <section className="section-padding bg-warm-brown text-white">
      <div className="container-narrow">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-gold text-sm font-medium tracking-wide uppercase mb-3">
            Our Impact
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-playfair font-bold mb-4 tracking-tight">
            {t('market.title')}
          </h2>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
            {t('market.subtitle')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center bg-white/5 rounded-2xl p-8 border border-white/10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold/20 text-gold mb-5">
                {stat.icon}
              </div>
              <div className="text-4xl lg:text-5xl font-bold text-gold mb-2">
                {t(`market.stats.${stat.key}.number`)}
              </div>
              <div className="text-white/80">
                {t(`market.stats.${stat.key}.label`)}
              </div>
            </div>
          ))}
        </div>

        {/* Founders Note */}
        <div className="bg-white/5 rounded-2xl p-8 lg:p-10 border border-white/10 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-1 h-8 bg-gold rounded-full" />
            <h3 className="text-2xl lg:text-3xl font-playfair font-bold">
              {t('market.foundersTitle')}
            </h3>
            <div className="w-1 h-8 bg-gold rounded-full" />
          </div>
          <p className="text-white/80 leading-relaxed text-lg">
            {t('market.foundersDescription')}
          </p>
        </div>
      </div>
    </section>
  );
}
