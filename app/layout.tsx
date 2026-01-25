import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '../contexts/LanguageContext';
import { AuthProvider } from '../contexts/AuthContext';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });
const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair'
});

export const metadata: Metadata = {
  metadataBase: new URL('https://dadaboraai.com'),
  title: 'Dada Bora AI - The Big Sister You Wish You Had | AI Wellness for Black Women',
  description: 'Dada Bora AI is your 24/7 AI-powered wellness companion built specifically for Black women. Get culturally grounded support for mental health, hair & skin care, menstrual cycle tracking, and holistic wellness through WhatsApp. Available in English and French.',
  keywords: [
    'Dada Bora',
    'Dada Bora AI',
    'AI wellness for Black women',
    'Black women mental health',
    'African women wellness app',
    'AI therapy for Black women',
    'culturally competent mental health',
    'Black women self-care',
    'WhatsApp wellness bot',
    'AI companion for women',
    'mental wellness Black women',
    'natural hair care advice',
    'menstrual cycle tracking',
    'emotional support AI',
    'Black women health tech',
    'African wellness technology',
    'holistic health Black women',
    'meditation for Black women',
    'stress management Black women',
    'women of color mental health'
  ],
  authors: [{ name: 'Dr. Adam Shebindu' }, { name: 'Bora Technology' }],
  creator: 'Bora Technology',
  publisher: 'Bora Technology',
  applicationName: 'Dada Bora AI',
  category: 'Health & Wellness',
  classification: 'AI Health Assistant',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['fr_FR'],
    url: 'https://dadaboraai.com',
    siteName: 'Dada Bora AI',
    title: 'Dada Bora AI - Your AI Wellness Companion for Black Women',
    description: 'Get 24/7 culturally grounded wellness support for mental health, beauty care, and holistic guidance. Built for Black women, by Black women. Chat now on WhatsApp.',
    images: [
      {
        url: '/dada bora.PNG',
        width: 1200,
        height: 630,
        alt: 'Dada Bora AI - AI Wellness Companion for Black Women',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dada Bora AI - The Big Sister You Wish You Had',
    description: '24/7 AI wellness support for Black women. Mental health, beauty care, cycle tracking & more via WhatsApp.',
    images: ['/dada bora.PNG'],
    creator: '@DadaBoraAI',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
  alternates: {
    canonical: 'https://dadaboraai.com',
    languages: {
      'en-US': 'https://dadaboraai.com/en',
      'fr-FR': 'https://dadaboraai.com/fr',
    },
  },
  other: {
    'msapplication-TileColor': '#D4AF37',
    'theme-color': '#8B6F47',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Dada Bora AI',
    description: 'AI-powered wellness companion for Black women providing 24/7 support for mental health, beauty care, and holistic guidance',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: 'Dr. Adam Shebindu',
      jobTitle: 'Founder & CEO',
    },
    provider: {
      '@type': 'Organization',
      name: 'Bora Technology',
      url: 'https://dadaboraai.com',
      logo: 'https://dadaboraai.com/dada bora.PNG',
      sameAs: [
        'https://twitter.com/DadaBoraAI',
        'https://www.instagram.com/dadaboraai/',
        'https://linkedin.com/company/dada-bora-ai',
      ],
    },
    audience: {
      '@type': 'PeopleAudience',
      suggestedGender: 'female',
      suggestedMinAge: 18,
    },
    featureList: [
      '24/7 AI wellness support',
      'Mental health guidance',
      'Hair and skin care advice',
      'Menstrual cycle tracking',
      'Voice-first WhatsApp interface',
      'Culturally grounded support',
      'English and French support',
    ],
    inLanguage: ['en', 'fr'],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '100',
      bestRating: '5',
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/dada bora.PNG" />
        <link rel="apple-touch-icon" href="/dada bora.PNG" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${inter.className} ${playfair.variable}`}>
        <AuthProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}