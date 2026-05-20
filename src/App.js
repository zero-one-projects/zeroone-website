import { useEffect, useRef, useState } from 'react';
import './App.css';
import logo from './assets/company/canva.png';
import secLogo from './assets/company/sec.jpg';
import birLogo from './assets/company/BIR.png';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import CardSection from './components/CardSection';
import TeamSection from './components/TeamSection';
import TextSection from './components/TextSection';
import ImpactStatement from './components/ImpactStatement';
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
  const [solutionCardsVisible, setSolutionCardsVisible] = useState(false);
  const solutionProcessRef = useRef(null);
  const solutionCardsInViewRef = useRef(false);
  const footerLinks = [
    { label: 'Services', href: '#services' },
    { label: 'Solutions', href: '#services' },
    { label: 'About', href: '#about-us' },
    { label: 'Contact', href: `mailto:${companyProfile.contact.email}` }
  ];
  const socialLinks = [
    { label: 'Facebook', href: 'https://www.facebook.com/zeroone.it.inc' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/112718341/admin/dashboard/' },
    { label: 'Instagram', href: 'https://www.instagram.com/zerooneit.inc/' }
  ];

  useEffect(() => {
    const scrollToHashTarget = () => {
      const { hash } = window.location;

      if (!hash) {
        return;
      }

      const target = document.querySelector(hash);

      if (!target) {
        return;
      }

      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };

    scrollToHashTarget();
    window.addEventListener('hashchange', scrollToHashTarget);

    return () => {
      window.removeEventListener('hashchange', scrollToHashTarget);
    };
  }, []);

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

  useEffect(() => {
    const node = solutionProcessRef.current;

    if (!node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some((entry) => entry.isIntersecting);

        if (isIntersecting && !solutionCardsInViewRef.current) {
          solutionCardsInViewRef.current = true;
          setSolutionCardsVisible(true);
        }

        if (!isIntersecting && solutionCardsInViewRef.current) {
          solutionCardsInViewRef.current = false;
          setSolutionCardsVisible(false);
        }
      },
      {
        threshold: 0.22,
        rootMargin: '0px 0px -10% 0px'
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const baseNavigation = companyProfile.sections
    .filter(section => section.id !== 'vision' && section.id !== 'mission')
    .map(({ id, title }) => ({
      id,
      label: title,
      href: id === 'about' ? '#about-us' : `#${id}`
    }));
  const navigation = baseNavigation;

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
          <section
            key="about-vision-mission"
            className="section reveal-section reveal-delay-2"
            id="about-us"
          >
            <div id="about" aria-hidden="true" />
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
              <>
                <ImpactStatement
                  statement={section.highlightStatement}
                  className="about-impact-statement"
                />
                {section.highlightStatement.problemSection ? (
                  <section className="problem-solution-block">
                    <div className="problem-solution-header">
                      <p className="problem-eyebrow">
                        {section.highlightStatement.problemSection.eyebrow}
                      </p>
                      <h3 className="problem-title">
                        {section.highlightStatement.problemSection.title}
                      </h3>
                      <p className="problem-intro">
                        {section.highlightStatement.problemSection.intro}
                      </p>
                    </div>

                    <div className="problem-list" role="list">
                      {section.highlightStatement.problemSection.items.map((item) => (
                        <article key={item} className="problem-card" role="listitem">
                          <span className="problem-icon" aria-hidden="true">
                            ×
                          </span>
                          <p>{item}</p>
                        </article>
                      ))}
                    </div>

                    <p className="problem-emotional-line">
                      {section.highlightStatement.problemSection.emotionalLine}
                    </p>

                    <div className="problem-transition">
                      <span className="problem-transition-icon" aria-hidden="true">
                        →
                      </span>
                      <p>{section.highlightStatement.problemSection.transition}</p>
                    </div>

                    {section.highlightStatement.problemSection.solutionSection ? (
                      <section className="solution-process-block" ref={solutionProcessRef}>
                        <div className="solution-process-header">
                          <p className="solution-process-eyebrow">
                            {section.highlightStatement.problemSection.solutionSection.eyebrow}
                          </p>
                          <h3 className="solution-process-title">
                            {section.highlightStatement.problemSection.solutionSection.title}
                          </h3>
                          <p className="solution-process-intro">
                            {section.highlightStatement.problemSection.solutionSection.intro}
                          </p>
                        </div>

                        <div className="solution-process-grid" role="list">
                          {section.highlightStatement.problemSection.solutionSection.steps.map((step, index) => (
                            <article
                              key={step.title}
                              className={`solution-step-card reveal-flip-card ${solutionCardsVisible ? 'is-visible' : ''}`}
                              role="listitem"
                              style={{ '--stagger-index': index }}
                            >
                              <span className="solution-step-number">0{index + 1}</span>
                              <h4>{step.title}</h4>
                              <p>{step.description}</p>
                            </article>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </section>
                ) : null}
              </>
            ) : null}
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

        <footer
          className="section site-footer reveal-section reveal-delay-4"
          id={companyProfile.contact.id}
        >
          <div className="footer-grid">
            <div className="footer-intro">
              <p className="footer-kicker">{companyProfile.brand.name}</p>
              <h2 className="footer-title">Build software that fits the way your business works.</h2>
              <p className="footer-copy">
                We create modern websites, internal systems, and custom digital tools for teams
                that need reliable technology built around real operations.
              </p>
              <div className="footer-trustmarks" aria-label="Registration badges">
                <span className="footer-trustmark">
                  <img className="footer-trustmark-logo" src={secLogo} alt="SEC logo" />
                  SEC Registered
                </span>
                <span className="footer-trustmark">
                  <img className="footer-trustmark-logo" src={birLogo} alt="BIR logo" />
                  BIR Registered
                </span>
              </div>
            </div>

            <div className="footer-panel">
              <div className="footer-panel-section">
                <p className="footer-label">Email</p>
                <a className="footer-value" href={`mailto:${companyProfile.contact.email}`}>
                  {companyProfile.contact.email}
                </a>
              </div>
              <div className="footer-panel-section">
                <p className="footer-label">Phone</p>
                <a className="footer-value" href="tel:+639190797137">
                  +63 919 079 7137
                </a>
              </div>
              <div className="footer-panel-section">
                <p className="footer-label">Based In</p>
                <p className="footer-value">Philippines</p>
              </div>
              <div className="footer-panel-section">
                <p className="footer-label">What We Build</p>
                <p className="footer-value">
                  Custom software, SaaS platforms, websites, and workflow systems
                </p>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <nav className="footer-nav" aria-label="Footer">
              {footerLinks.map((item) => (
                <a key={item.label} href={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>
            <nav className="footer-social-nav" aria-label="Social links">
              {socialLinks.map((item) => (
                <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ))}
            </nav>
            <p className="footer-copyright">© 2026 ZeroOne IT Inc. All rights reserved.</p>
            <a className="footer-cta" href={`mailto:${companyProfile.contact.email}`}>
              Start a Project
            </a>
          </div>
        </footer>
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
