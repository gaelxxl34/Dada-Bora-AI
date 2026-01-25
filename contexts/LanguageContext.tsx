'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

const translations = {
  en: {
    hero: {
      title: 'The Big Sister You Wish You Had',
      subtitle: 'Your AI-powered companion for emotional wellness, self-care, and holistic guidance — built for Black women, by Black women.',
      chatWhatsApp: 'Chat on WhatsApp',
      joinWaitlist: 'Join Waitlist'
    },
    about: {
      title: 'Empowering Women Through Intelligent Care',
      paragraph1: "Dada Bora isn't just another chatbot — she's the trusted companion you've been searching for. Born from the understanding that Black women deserve wellness solutions that truly see them, honor their experiences, and celebrate their strength.",
      paragraph2: "We bridge the gap between technology and empathy, creating a safe space where your wellness journey is supported with cultural understanding, genuine care, and the wisdom of sisterhood.",
      quote: "Every Black woman deserves a companion who understands her journey — someone who celebrates her strength while nurturing her wellness.",
      quoteAuthor: '— Dr. Adam Shebindu, PhD, MBA, Founder'
    },
    problem: {
      title: 'Addressing the Wellness Gap',
      subtitle: 'Black women face unique challenges in accessing wellness support that truly understands their lived experiences.',
      limitedAccess: {
        title: 'Limited Access',
        description: 'Culturally aware, affordable health tools are scarce, leaving Black women navigating wellness without proper support.'
      },
      fragmented: {
        title: 'Fragmented Solutions',
        description: 'Most apps ignore the intersection of emotional, mental, and lifestyle needs that Black women uniquely experience.'
      },
      barriers: {
        title: 'Societal Barriers',
        description: 'Shame, silence, and judgment in traditional health spaces prevent open conversations about wellness.'
      }
    },
    solution: {
      title: 'Meet Dada Bora',
      subtitle: 'Your compassionate AI companion, available 24/7 on WhatsApp, speaking both English and French with cultural understanding and privacy at heart.',
      available247: {
        title: '24/7 Availability',
        description: 'Always here when you need support, no appointments necessary'
      },
      voiceFirst: {
        title: 'Voice-First Experience',
        description: 'Communicate naturally through voice messages for deeper connection'
      },
      culturallyGrounded: {
        title: 'Culturally Grounded',
        description: "Built with deep understanding of Black women's experiences and needs"
      },
      privacyFocused: {
        title: 'Privacy Focused',
        description: 'Your conversations are secure, confidential, and completely private'
      },
      simpleTitle: 'Simple. Personal. Empowering.',
      steps: {
        sendVoice: {
          title: 'Send Voice',
          description: 'Share your thoughts, concerns, or questions through WhatsApp voice messages'
        },
        getAdvice: {
          title: 'Get Advice',
          description: 'Receive personalized, culturally grounded guidance from Dada Bora'
        },
        feelBetter: {
          title: 'Feel Better',
          description: 'Experience the support, affirmation, and care you deserve'
        }
      }
    },
    pillars: {
      title: 'The Heart of Dada Bora',
      subtitle: 'Three core pillars of wellness support, designed specifically for the unique needs of Black women.',
      mentalWellness: {
        title: 'Mental Wellness',
        description: 'Grounding techniques, daily affirmations, mood support, and emotional wellness guidance',
        features: ['Mindfulness practices', 'Stress management', 'Emotional regulation', 'Daily affirmations']
      },
      hairSkin: {
        title: 'Hair & Skin Care',
        description: 'Personalized beauty tips, product recommendations, and care routines for Black women',
        features: ['Natural hair care', 'Skincare routines', 'Product recommendations', 'Seasonal adjustments']
      },
      menstrual: {
        title: 'Menstrual Cycle',
        description: 'Cycle literacy, tracking support, symptom management, and reproductive health guidance',
        features: ['Cycle tracking', 'Symptom support', 'Health education', 'Wellness planning']
      },
      holisticTitle: 'Holistic Wellness Approach',
      holisticDescription: 'Because your wellness journey encompasses mind, body, and spirit — Dada Bora understands that true health means caring for every aspect of who you are.'
    },
    market: {
      title: 'Built for Black Women Everywhere',
      subtitle: 'Created by African founders with a global vision — reaching Black women across continents with culturally grounded wellness support.',
      stats: {
        africa: {
          number: '300M',
          label: 'Women in Sub-Saharan Africa'
        },
        us: {
          number: '20M+',
          label: 'Black Women in the U.S.'
        },
        whatsapp: {
          number: '80%',
          label: 'WhatsApp Penetration'
        }
      },
      foundersTitle: 'By African Founders, For Black Women Globally',
      foundersDescription: "Our team understands the unique intersection of culture, wellness, and technology. We're not just building an app — we're creating a movement that honors our heritage while embracing innovation for better health outcomes."
    },
    journey: {
      title: 'Our Story So Far',
      subtitle: 'From an idea born in Africa to a global movement empowering Black women worldwide.',
      mvp: {
        title: 'MVP Testing in DRC 🇨🇩',
        description: 'Launched our first pilot program with women in the Democratic Republic of Congo'
      },
      users100: {
        title: '100 Early Users',
        description: 'Reached our first 100 beta users, gathering invaluable feedback and testimonials'
      },
      languages: {
        title: 'English & French Support',
        description: 'Expanded language capabilities to serve our diverse community better'
      },
      usExpansion: {
        title: 'U.S. Expansion',
        description: 'Bringing Dada Bora to Black women across America — join our waitlist!'
      },
      completed: 'Completed',
      comingSoon: 'Coming Soon',
      continuesTitle: 'The Journey Continues',
      continuesDescription: 'Every milestone brings us closer to our vision: a world where every Black woman has access to culturally competent, compassionate wellness support.'
    },
    team: {
      title: 'Meet the Minds Behind Dada Bora',
      subtitle: 'A team of engineers, doctors, and dreamers redefining AI care.',
      tagline: 'United by purpose, driven by empathy, committed to excellence.',
      members: {
        adam: {
          name: 'Dr. Adam',
          role: 'Vision & Leadership',
          description: 'PhD, MBA - Guiding our mission with expertise and heart'
        },
        gracia: {
          name: 'Gracia',
          role: 'Tech Infrastructure',
          description: 'Building the robust foundation that powers Dada Bora'
        },
        shay: {
          name: 'Shay',
          role: 'Medical Content',
          description: 'Ensuring every piece of advice is medically sound and culturally relevant'
        },
        developers: {
          name: 'Exauce & Seth',
          role: 'AI Development',
          description: 'Crafting the intelligent, empathetic heart of our AI companion'
        },
        dina: {
          name: 'Dr. Dina',
          role: 'Clinical Psychology',
          description: 'Bringing deep expertise in mental health and cultural wellness practices'
        }
      },
      diverseTitle: 'Diverse Expertise, Shared Vision',
      diverseDescription: 'From the bustling tech hubs of Africa to the innovative corridors of American universities, our team brings together decades of combined experience in healthcare, technology, and human-centered design.',
      expertise: ['Healthcare', 'AI/ML', 'Psychology', 'Engineering', 'Design', 'Business']
    },
    cta: {
      title1: 'Your wellness.',
      title2: 'Your voice.',
      title3: 'Your Dada Bora.',
      subtitle: 'Join thousands of Black women who are reclaiming their wellness journey with compassionate, culturally grounded AI support.',
      chatWhatsApp: 'Chat on WhatsApp',
      subscribe: 'Subscribe for Updates',
      testimonial: '"Dada Bora changed how I approach my wellness. For the first time, I feel truly seen and supported."',
      testimonialName: 'Stephanie Wenge',
      testimonialLocation: 'Early User, Atlanta'
    },
    auth: {
      login: {
        badge: 'Member Access',
        title: 'Return to your wellness sanctuary',
        subtitle: 'Sign in to pick up right where you left off with your AI big sister.',
        stats: {
          members: '2,400+ women supported',
          response: '<5 min average response time'
        },
        highlight: {
          title: 'Clinically reviewed guidance',
          description: 'Every insight you receive is vetted by our medical and psychology advisors.'
        },
        benefits: {
          safeSpace: {
            title: 'Safe, judgment-free space',
            description: 'Conversations are encrypted and never shared without your consent.'
          },
          privacy: {
            title: 'Privacy-first security',
            description: 'Multi-layer protection keeps your records secure across devices.'
          },
          guidance: {
            title: 'Personalized guidance',
            description: 'Resurface past conversations and continue your rituals seamlessly.'
          }
        },
        form: {
          emailLabel: 'Email address',
          passwordLabel: 'Password',
          rememberMe: 'Remember me on this device',
          forgotPassword: 'Forgot password?',
          submit: 'Access my space',
          divider: 'or continue with',
          socialWhatsApp: 'WhatsApp',
          socialGoogle: 'Google',
          loading: 'Signing you in...'
        },
        waitlist: {
          prompt: 'New here?',
          link: 'Join the waitlist'
        },
        support: 'Need help? Email care@dadaboraai.com',
        backToHome: 'Back to homepage'
      }
    },
    footer: {
      description: 'The big sister you wish you had, powered by AI, guided by love.',
      quickLinks: 'Quick Links',
      aboutUs: 'About Us',
      features: 'Features',
      ourTeam: 'Our Team',
      connect: 'Connect',
      privacy: 'Your privacy and data security are our top priorities.',
      copyright: '© 2024 Bora Technology. Built with love for Black women everywhere.'
    }
  },
  fr: {
    hero: {
      title: 'La Grande Sœur Que Vous Auriez Aimé Avoir',
      subtitle: 'Votre compagne alimentée par IA pour le bien-être émotionnel, les soins personnels et les conseils holistiques — conçue pour les femmes noires, par des femmes noires.',
      chatWhatsApp: 'Discuter sur WhatsApp',
      joinWaitlist: 'Rejoindre la Liste d\'Attente'
    },
    about: {
      title: 'Autonomiser les Femmes par des Soins Intelligents',
      paragraph1: "Dada Bora n'est pas qu'un simple chatbot — c'est la compagne de confiance que vous recherchiez. Née de la conviction que les femmes noires méritent des solutions de bien-être qui les voient vraiment, honorent leurs expériences et célèbrent leur force.",
      paragraph2: "Nous comblons le fossé entre technologie et empathie, créant un espace sûr où votre parcours de bien-être est soutenu par une compréhension culturelle, des soins authentiques et la sagesse de la sororité.",
      quote: "Chaque femme noire mérite une compagne qui comprend son parcours — quelqu'un qui célèbre sa force tout en nourrissant son bien-être.",
      quoteAuthor: '— Dr. Adam Shebindu, PhD, MBA, Fondateur'
    },
    problem: {
      title: 'Combler le Fossé du Bien-être',
      subtitle: 'Les femmes noires font face à des défis uniques pour accéder à un soutien de bien-être qui comprend vraiment leurs expériences vécues.',
      limitedAccess: {
        title: 'Accès Limité',
        description: 'Les outils de santé culturellement conscients et abordables sont rares, laissant les femmes noires naviguer le bien-être sans soutien adéquat.'
      },
      fragmented: {
        title: 'Solutions Fragmentées',
        description: 'La plupart des applications ignorent l\'intersection des besoins émotionnels, mentaux et de style de vie que les femmes noires vivent de manière unique.'
      },
      barriers: {
        title: 'Barrières Sociétales',
        description: 'La honte, le silence et le jugement dans les espaces de santé traditionnels empêchent les conversations ouvertes sur le bien-être.'
      }
    },
    solution: {
      title: 'Rencontrez Dada Bora',
      subtitle: 'Votre compagne IA compatissante, disponible 24h/24 et 7j/7 sur WhatsApp, parlant anglais et français avec compréhension culturelle et confidentialité.',
      available247: {
        title: 'Disponibilité 24/7',
        description: 'Toujours là quand vous avez besoin de soutien, sans rendez-vous nécessaire'
      },
      voiceFirst: {
        title: 'Expérience Vocale Prioritaire',
        description: 'Communiquez naturellement par messages vocaux pour une connexion plus profonde'
      },
      culturallyGrounded: {
        title: 'Ancrée Culturellement',
        description: 'Construite avec une profonde compréhension des expériences et besoins des femmes noires'
      },
      privacyFocused: {
        title: 'Axée sur la Confidentialité',
        description: 'Vos conversations sont sécurisées, confidentielles et totalement privées'
      },
      simpleTitle: 'Simple. Personnel. Autonomisant.',
      steps: {
        sendVoice: {
          title: 'Envoyer un Message Vocal',
          description: 'Partagez vos pensées, préoccupations ou questions via messages vocaux WhatsApp'
        },
        getAdvice: {
          title: 'Recevoir des Conseils',
          description: 'Recevez des conseils personnalisés et culturellement ancrés de Dada Bora'
        },
        feelBetter: {
          title: 'Se Sentir Mieux',
          description: 'Expérimentez le soutien, l\'affirmation et les soins que vous méritez'
        }
      }
    },
    pillars: {
      title: 'Le Cœur de Dada Bora',
      subtitle: 'Trois piliers fondamentaux de soutien au bien-être, conçus spécifiquement pour les besoins uniques des femmes noires.',
      mentalWellness: {
        title: 'Bien-être Mental',
        description: 'Techniques d\'ancrage, affirmations quotidiennes, soutien de l\'humeur et conseils de bien-être émotionnel',
        features: ['Pratiques de pleine conscience', 'Gestion du stress', 'Régulation émotionnelle', 'Affirmations quotidiennes']
      },
      hairSkin: {
        title: 'Soins Capillaires et Cutanés',
        description: 'Conseils beauté personnalisés, recommandations de produits et routines de soins pour les femmes noires',
        features: ['Soins capillaires naturels', 'Routines de soins de la peau', 'Recommandations de produits', 'Ajustements saisonniers']
      },
      menstrual: {
        title: 'Cycle Menstruel',
        description: 'Littératie du cycle, soutien au suivi, gestion des symptômes et conseils en santé reproductive',
        features: ['Suivi du cycle', 'Soutien des symptômes', 'Éducation à la santé', 'Planification du bien-être']
      },
      holisticTitle: 'Approche Holistique du Bien-être',
      holisticDescription: 'Parce que votre parcours de bien-être englobe l\'esprit, le corps et l\'âme — Dada Bora comprend que la vraie santé signifie prendre soin de chaque aspect de qui vous êtes.'
    },
    market: {
      title: 'Conçue pour les Femmes Noires Partout',
      subtitle: 'Créée par des fondateurs africains avec une vision mondiale — touchant les femmes noires à travers les continents avec un soutien de bien-être culturellement ancré.',
      stats: {
        africa: {
          number: '300M',
          label: 'Femmes en Afrique Subsaharienne'
        },
        us: {
          number: '20M+',
          label: 'Femmes Noires aux États-Unis'
        },
        whatsapp: {
          number: '80%',
          label: 'Pénétration WhatsApp'
        }
      },
      foundersTitle: 'Par des Fondateurs Africains, Pour les Femmes Noires Mondialement',
      foundersDescription: "Notre équipe comprend l'intersection unique de la culture, du bien-être et de la technologie. Nous ne construisons pas seulement une application — nous créons un mouvement qui honore notre patrimoine tout en embrassant l'innovation pour de meilleurs résultats en matière de santé."
    },
    journey: {
      title: 'Notre Histoire Jusqu\'à Présent',
      subtitle: 'D\'une idée née en Afrique à un mouvement mondial autonomisant les femmes noires dans le monde entier.',
      mvp: {
        title: 'Test MVP en RDC 🇨🇩',
        description: 'Lancé notre premier programme pilote avec des femmes en République Démocratique du Congo'
      },
      users100: {
        title: '100 Premiers Utilisateurs',
        description: 'Atteint nos 100 premiers utilisateurs bêta, recueillant des retours et témoignages inestimables'
      },
      languages: {
        title: 'Support Anglais et Français',
        description: 'Étendu les capacités linguistiques pour mieux servir notre communauté diverse'
      },
      usExpansion: {
        title: 'Expansion aux États-Unis',
        description: 'Amener Dada Bora aux femmes noires à travers l\'Amérique — rejoignez notre liste d\'attente!'
      },
      completed: 'Terminé',
      comingSoon: 'Bientôt Disponible',
      continuesTitle: 'Le Parcours Continue',
      continuesDescription: 'Chaque étape nous rapproche de notre vision : un monde où chaque femme noire a accès à un soutien de bien-être culturellement compétent et compatissant.'
    },
    team: {
      title: 'Rencontrez les Esprits Derrière Dada Bora',
      subtitle: 'Une équipe d\'ingénieurs, de médecins et de rêveurs redéfinissant les soins par IA.',
      tagline: 'Unis par un objectif, motivés par l\'empathie, engagés dans l\'excellence.',
      members: {
        adam: {
          name: 'Dr. Adam',
          role: 'Vision et Leadership',
          description: 'PhD, MBA - Guidant notre mission avec expertise et cœur'
        },
        gracia: {
          name: 'Gracia',
          role: 'Infrastructure Technologique',
          description: 'Construisant la fondation robuste qui alimente Dada Bora'
        },
        shay: {
          name: 'Shay',
          role: 'Contenu Médical',
          description: 'S\'assurant que chaque conseil est médicalement solide et culturellement pertinent'
        },
        developers: {
          name: 'Exauce & Seth',
          role: 'Développement IA',
          description: 'Créant le cœur intelligent et empathique de notre compagne IA'
        },
        dina: {
          name: 'Dr. Dina',
          role: 'Psychologie Clinique',
          description: 'Apportant une expertise approfondie en santé mentale et pratiques de bien-être culturel'
        }
      },
      diverseTitle: 'Expertise Diverse, Vision Partagée',
      diverseDescription: 'Des centres technologiques animés d\'Afrique aux couloirs innovants des universités américaines, notre équipe rassemble des décennies d\'expérience combinée en soins de santé, technologie et conception centrée sur l\'humain.',
      expertise: ['Santé', 'IA/ML', 'Psychologie', 'Ingénierie', 'Design', 'Business']
    },
    cta: {
      title1: 'Votre bien-être.',
      title2: 'Votre voix.',
      title3: 'Votre Dada Bora.',
      subtitle: 'Rejoignez des milliers de femmes noires qui reprennent leur parcours de bien-être avec un soutien IA compatissant et culturellement ancré.',
      chatWhatsApp: 'Discuter sur WhatsApp',
      subscribe: 'S\'abonner aux Mises à Jour',
      testimonial: '"Dada Bora a changé ma façon d\'aborder mon bien-être. Pour la première fois, je me sens vraiment vue et soutenue."',
      testimonialName: 'Stephanie Wenge',
      testimonialLocation: 'Première Utilisatrice, Atlanta'
    },
    auth: {
      login: {
        badge: 'Accès Membre',
        title: 'Retrouvez votre sanctuaire de bien-être',
        subtitle: 'Connectez-vous pour reprendre exactement là où vous vous êtes arrêtée avec votre grande sœur IA.',
        stats: {
          members: '2 400+ femmes accompagnées',
          response: '<5 min de temps de réponse moyen'
        },
        highlight: {
          title: 'Conseils validés cliniquement',
          description: 'Chaque insight est relu par nos conseillères médicales et psychologues.'
        },
        benefits: {
          safeSpace: {
            title: 'Espace sûr et sans jugement',
            description: 'Les conversations sont chiffrées et jamais partagées sans votre consentement.'
          },
          privacy: {
            title: 'Sécurité centrée sur la confidentialité',
            description: 'Une protection multi-couches sécurise vos données sur tous les appareils.'
          },
          guidance: {
            title: 'Guidance personnalisée',
            description: 'Retrouvez vos échanges passés et poursuivez vos rituels en douceur.'
          }
        },
        form: {
          emailLabel: 'Adresse e-mail',
          passwordLabel: 'Mot de passe',
          rememberMe: 'Se souvenir de moi sur cet appareil',
          forgotPassword: 'Mot de passe oublié ?',
          submit: 'Accéder à mon espace',
          divider: 'ou continuer avec',
          socialWhatsApp: 'WhatsApp',
          socialGoogle: 'Google',
          loading: 'Connexion en cours...'
        },
        waitlist: {
          prompt: 'Première visite ?',
          link: 'Rejoindre la liste d\'attente'
        },
        support: 'Besoin d\'aide ? Écrivez à care@dadaboraai.com',
        backToHome: 'Retourner à l\'accueil'
      }
    },
    footer: {
      description: 'La grande sœur que vous auriez aimé avoir, alimentée par IA, guidée par l\'amour.',
      quickLinks: 'Liens Rapides',
      aboutUs: 'À Propos',
      features: 'Fonctionnalités',
      ourTeam: 'Notre Équipe',
      connect: 'Connecter',
      privacy: 'Votre confidentialité et la sécurité de vos données sont nos priorités absolues.',
      copyright: '© 2024 Bora Technology. Construit avec amour pour les femmes noires partout.'
    }
  }
};
