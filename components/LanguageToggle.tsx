'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="fixed top-5 right-5 z-50">
      <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-md border border-gray-100 p-1 flex gap-0.5">
        <button
          onClick={() => setLanguage('en')}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            language === 'en'
              ? 'bg-warm-brown text-white'
              : 'text-gray-600 hover:text-warm-brown'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLanguage('fr')}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            language === 'fr'
              ? 'bg-warm-brown text-white'
              : 'text-gray-600 hover:text-warm-brown'
          }`}
        >
          FR
        </button>
      </div>
    </div>
  );
}
