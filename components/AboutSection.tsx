
'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function AboutSection() {
  const { t } = useLanguage();
  
  return (
    <section className="section-padding bg-white">
      <div className="container-narrow">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <div className="order-2 lg:order-1">
            <span className="inline-block text-gold text-sm font-medium tracking-wide uppercase mb-3">
              About Us
            </span>
            <h2 className="section-title text-warm-brown">
              {t('about.title')}
            </h2>
            <div className="space-y-4 text-gray-600 mb-8">
              <p className="text-base lg:text-lg">
                {t('about.paragraph1')}
              </p>
              <p className="text-base lg:text-lg">
                {t('about.paragraph2')}
              </p>
            </div>
            <blockquote className="relative pl-6 border-l-2 border-gold">
              <p className="text-lg lg:text-xl text-warm-brown font-playfair italic leading-relaxed">
                {t('about.quote')}
              </p>
              <footer className="mt-3 text-sm text-gray-500 font-medium not-italic">
                {t('about.quoteAuthor')}
              </footer>
            </blockquote>
          </div>
          
          {/* Image */}
          <div className="order-1 lg:order-2">
            <div className="relative">
              <img
                src="/dada bora.PNG"
                alt="Dada Bora AI - Your AI Wellness Companion for Black Women"
                className="rounded-2xl shadow-lg object-cover w-full aspect-[4/5] object-top"
              />
              {/* Subtle accent */}
              <div className="absolute -z-10 top-4 -right-4 w-full h-full rounded-2xl bg-gold/10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
