
'use client';

import { useState } from 'react';
import NewsletterModal from './NewsletterModal';
import { useLanguage } from '../contexts/LanguageContext';

export default function FinalCTA() {
  const [showNewsletter, setShowNewsletter] = useState(false);
  const { t } = useLanguage();

  return (
    <section className="bg-gradient-to-br from-warm-brown to-amber-900 text-white">
      {/* CTA Section */}
      <div className="section-padding">
        <div className="container-narrow text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-playfair font-bold mb-6 leading-tight tracking-tight">
            {t('cta.title1')}<br className="hidden sm:block" />
            {t('cta.title2')}<br className="hidden sm:block" />
            {t('cta.title3')}
          </h2>
          
          <p className="text-lg sm:text-xl text-white/80 max-w-xl mx-auto mb-10 leading-relaxed">
            {t('cta.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a 
              href="https://wa.me/243856223405" 
              className="inline-flex items-center justify-center gap-3 bg-white text-warm-brown px-8 py-4 rounded-full font-semibold transition-all duration-200 hover:bg-gold hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {t('cta.chatWhatsApp')}
            </a>
            
            <button 
              onClick={() => setShowNewsletter(true)}
              className="inline-flex items-center justify-center gap-2 border-2 border-white/60 text-white px-8 py-4 rounded-full font-semibold transition-all duration-200 hover:bg-white hover:text-warm-brown"
            >
              {t('cta.subscribe')}
            </button>
          </div>

          {/* Testimonial */}
          <div className="bg-white/10 rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto border border-white/10">
            <svg className="w-8 h-8 text-gold/60 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
            </svg>
            <p className="text-white/90 mb-4 italic leading-relaxed">
              {t('cta.testimonial')}
            </p>
            <div>
              <div className="font-semibold text-sm">{t('cta.testimonialName')}</div>
              <div className="text-white/60 text-sm">{t('cta.testimonialLocation')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="container-narrow py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <h3 className="text-xl font-playfair font-bold mb-3">Dada Bora AI</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                {t('footer.description')}
              </p>
            </div>
            
            {/* Links */}
            <div>
              <h4 className="font-semibold mb-3 text-sm">{t('footer.quickLinks')}</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li><a href="#about" className="hover:text-gold transition-colors">{t('footer.aboutUs')}</a></li>
                <li><a href="#features" className="hover:text-gold transition-colors">{t('footer.features')}</a></li>
                <li><a href="#team" className="hover:text-gold transition-colors">{t('footer.ourTeam')}</a></li>
              </ul>
            </div>
            
            {/* Social */}
            <div>
              <h4 className="font-semibold mb-3 text-sm">{t('footer.connect')}</h4>
              <div className="flex gap-3">
                <a 
                  href="https://twitter.com/DadaBoraAI" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Follow us on Twitter"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a 
                  href="https://www.instagram.com/dadaboraai/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Follow us on Instagram"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a 
                  href="https://linkedin.com/company/dada-bora-ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Follow us on LinkedIn"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-6 text-center text-sm text-white/60">
            <p className="mb-1">{t('footer.privacy')}</p>
            <p>{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>

      <NewsletterModal isOpen={showNewsletter} onClose={() => setShowNewsletter(false)} />
    </section>
  );
}
