
import HeroSection from '../components/HeroSection';
import AboutSection from '../components/AboutSection';
import ProblemSection from '../components/ProblemSection';
import SolutionSection from '../components/SolutionSection';
import PillarsSection from '../components/PillarsSection';
import MarketSection from '../components/MarketSection';
import JourneySection from '../components/JourneySection';
import TeamSection from '../components/TeamSection';
import FinalCTA from '../components/FinalCTA';
import LanguageToggle from '../components/LanguageToggle';
import Script from 'next/script';

export default function Home() {
  return (
    <>
      <main className="min-h-screen bg-cream-50">
        <LanguageToggle />
        <HeroSection />
        <AboutSection />
        <ProblemSection />
        <SolutionSection />
        <PillarsSection />
        <MarketSection />
        <JourneySection />
        <TeamSection />
        <FinalCTA />
      </main>
      
      {/* Tawk.to Live Chat - Only on landing page */}
      <Script
        id="tawk-to"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
            (function(){
              var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
              s1.async=true;
              s1.src='https://embed.tawk.to/68ef99e70524d4194f52f0ba/1j7jv2cnl';
              s1.charset='UTF-8';
              s1.setAttribute('crossorigin','*');
              s0.parentNode.insertBefore(s1,s0);
            })();
          `,
        }}
      />
    </>
  );
}