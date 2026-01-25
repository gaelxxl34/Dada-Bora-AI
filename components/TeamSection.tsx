
'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function TeamSection() {
  const { t } = useLanguage();
  
  const team = [
    {
      key: 'adam',
      initials: 'AM',
      color: 'bg-blue-600'
    },
    {
      key: 'gracia',
      initials: 'GN',
      color: 'bg-purple-600'
    },
    {
      key: 'shay',
      initials: 'SO',
      color: 'bg-rose-600'
    },
    {
      key: 'developers',
      initials: 'DT',
      color: 'bg-emerald-600'
    },
    {
      key: 'dina',
      initials: 'DM',
      color: 'bg-amber-600'
    }
  ];

  const expertise = [
    'Healthcare',
    'AI/ML', 
    'Psychology',
    'Engineering',
    'Design',
    'Business'
  ];

  return (
    <section className="section-padding bg-cream-50">
      <div className="container-narrow">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-gold text-sm font-medium tracking-wide uppercase mb-3">
            Meet the Team
          </span>
          <h2 className="section-title text-warm-brown">
            {t('team.title')}
          </h2>
          <p className="section-subtitle text-gray-600 mb-2">
            {t('team.subtitle')}
          </p>
          <p className="text-warm-brown font-medium">
            {t('team.tagline')}
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {team.map((member, index) => (
            <article
              key={index}
              className="card text-center group"
            >
              {/* Avatar */}
              <div className={`w-16 h-16 rounded-full ${member.color} flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg`}>
                {member.initials}
              </div>
              
              <h3 className="text-lg font-semibold text-warm-brown mb-1">
                {t(`team.members.${member.key}.name`)}
              </h3>
              
              <span className="inline-block bg-gold/20 text-warm-brown px-3 py-1 rounded-full text-xs font-medium mb-3">
                {t(`team.members.${member.key}.role`)}
              </span>
              
              <p className="text-sm text-gray-600 leading-relaxed">
                {t(`team.members.${member.key}.description`)}
              </p>
            </article>
          ))}
        </div>

        {/* Expertise Section */}
        <div className="card text-center max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-warm-brown mb-3">
            {t('team.diverseTitle')}
          </h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            {t('team.diverseDescription')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {expertise.map((item, index) => (
              <span
                key={index}
                className="bg-warm-brown/10 text-warm-brown px-4 py-1.5 rounded-full text-sm font-medium"
              >
                {t(`team.expertise.${index}`)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
