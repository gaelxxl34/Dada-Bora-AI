
'use client';

import { useState } from 'react';
import WaitlistModal from './WaitlistModal';
import { useLanguage } from '../contexts/LanguageContext';

export default function HeroSection() {
  const [showWaitlist, setShowWaitlist] = useState(false);
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center">
      {/* Background Image with Subtle Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://readdy.ai/api/search-image?query=Beautiful%20confident%20Black%20women%20smiling%20together%2C%20sitting%20in%20a%20bright%20modern%20wellness%20space%20with%20natural%20lighting%2C%20soft%20earth%20tones%20and%20cream%20colors%2C%20one%20woman%20journaling%20while%20another%20meditates%2C%20peaceful%20and%20empowering%20atmosphere%2C%20professional%20photography%20style%20with%20warm%20golden%20hour%20lighting%20and%20minimalist%20African-inspired%20decor%20elements&width=1920&height=1080&seq=hero1&orientation=landscape')`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-warm-brown/90 via-warm-brown/70 to-warm-brown/40" />
      
      {/* Content */}
      <div className="relative z-10 container-narrow w-full py-20">
        <div className="max-w-2xl">
          <span className="inline-block text-gold text-sm font-medium tracking-wide uppercase mb-4">
            Your Wellness Companion
          </span>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-playfair font-bold text-white leading-[1.1] mb-6 text-balance">
            {t('hero.title')}
          </h1>
          
          <p className="text-lg sm:text-xl text-white/90 mb-10 max-w-lg leading-relaxed">
            {t('hero.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <a 
              href="https://wa.me/243856223405" 
              className="inline-flex items-center justify-center gap-3 bg-white text-warm-brown px-8 py-4 rounded-full font-semibold transition-all duration-200 hover:bg-gold hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {t('hero.chatWhatsApp')}
            </a>
            
            <button 
              onClick={() => setShowWaitlist(true)}
              className="inline-flex items-center justify-center gap-2 border-2 border-white/80 text-white px-8 py-4 rounded-full font-semibold transition-all duration-200 hover:bg-white hover:text-warm-brown"
            >
              {t('hero.joinWaitlist')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 animate-bounce hidden sm:block">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
      
      <WaitlistModal isOpen={showWaitlist} onClose={() => setShowWaitlist(false)} />
    </section>
  );
}
