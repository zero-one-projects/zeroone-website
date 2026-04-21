import { useEffect, useState } from 'react';
import './App.css';
import logo from './assets/company/canva.png';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import CardSection from './components/CardSection';
import TeamSection from './components/TeamSection';
import TextSection from './components/TextSection';
import ImpactStatement from './components/ImpactStatement';
import ProcessCycle from './components/ProcessCycle';
import SectionHeading from './components/SectionHeading';
import { companyProfile } from './content/companyProfile';

const sectionRenderers = {
  text: (section) => (
    <TextSection
      key={section.id}
      id={section.id}
      title={section.title}
      paragraphs={section.paragraphs}
      highlightStatement={section.highlightStatement}
    />
  ),
  cards: (section) => (
    <CardSection
      key={section.id}
      id={section.id}
      title={section.title}
      intro={section.intro}
      outro={section.outro}
      cards={section.cards}
      variant={section.variant}
    />
  ),
  team: (section) => (
    <TeamSection
      key={section.id}
      id={section.id}
      title={section.title}
      intro={section.intro}
      members={section.members}
    />
  )
};

function renderSection(section) {
  const render = sectionRenderers[section.type];

  if (!render) {
    return null;
  }

  return render(section);
}

function App() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 260);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const baseNavigation = companyProfile.sections
    .filter(section => section.id !== 'vision' && section.id !== 'mission')
    .map(({ id, title }) => ({
      id,
      label: title
    }));
  const navigation = [...baseNavigation];

  const renderSections = () => {
    const sections = [];
    let i = 0;
    while (i < companyProfile.sections.length) {
      const section = companyProfile.sections[i];
      if (section.id === 'about') {
        // Render about with optional vision/mission in a side column
        const visionSection = companyProfile.sections[i + 1];
        const missionSection = companyProfile.sections[i + 2];
        const hasVision = visionSection && visionSection.id === 'vision';
        const hasMission = missionSection && missionSection.id === 'mission';
        sections.push(
          <section key="about-vision-mission" className="section reveal-section reveal-delay-2" id="about">
            <div className="about-vision-mission-grid">
              <div className="about-column">
                <TextSection
                  id={section.id}
                  title={section.title}
                  paragraphs={section.paragraphs}
                  noWrapper={true}
                />
              </div>
              <div className="vision-mission-column">
                {hasVision ? (
                  <TextSection
                    id={visionSection.id}
                    title={visionSection.title}
                    paragraphs={visionSection.paragraphs}
                    noWrapper={true}
                  />
                ) : null}
                {hasMission ? (
                  <TextSection
                    id={missionSection.id}
                    title={missionSection.title}
                    paragraphs={missionSection.paragraphs}
                    noWrapper={true}
                  />
                ) : null}
              </div>
            </div>
            {section.highlightStatement ? (
              <ImpactStatement
                statement={section.highlightStatement}
                className="about-impact-statement"
              />
            ) : null}
            <ProcessCycle />
          </section>
        );
        i += 1 + (hasVision ? 1 : 0) + (hasMission ? 1 : 0);
      } else if (section.id === 'vision' || section.id === 'mission') {
        // Skip vision and mission since they're already rendered with about
        i++;
      } else {
        sections.push(renderSection(section));
        i++;
      }
    }
    return sections;
  };

  return (
    <div className="site">
      <Header
        brand={companyProfile.brand}
        navigation={navigation}
        contactHref={`#${companyProfile.contact.id}`}
      />

      <main>
        <HeroSection
          brand={companyProfile.brand}
          hero={companyProfile.hero}
          stats={companyProfile.stats}
          projectCounters={companyProfile.projectCounters}
          logo={logo}
        />

        {renderSections()}

        <section className="section cta reveal-section reveal-delay-4" id={companyProfile.contact.id}>
          <span className="contact-arrow" aria-hidden="true">
            ↓
          </span>
          <SectionHeading
            title={companyProfile.contact.title}
            intro={companyProfile.contact.description}
          />
          <a className="btn btn-outline" href={`mailto:${companyProfile.contact.email}`}>
            {companyProfile.contact.email}
          </a>
        </section>
      </main>

      <button
        type="button"
        className={`scroll-top-btn ${showScrollTop ? 'is-visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 5l-7 7 1.4 1.4 4.6-4.6V19h2V8.8l4.6 4.6L19 12z" />
        </svg>
      </button>
    </div>
  );
}

export default App;
