import BackToTop from '../components/BackToTop';
import { useEffect, useRef, useState } from 'react';
import secLogo from '../assets/company/sec.jpg';
import birLogo from '../assets/company/BIR.png';
import ChatWidget from '../components/ChatWidget';
import Header from '../components/Header';
import { HeroMetrics } from '../components/HeroSection';
import CardSection from '../components/CardSection';
import Seo, { defaultSiteUrl, toAbsoluteUrl } from '../components/Seo';
import TeamSection from '../components/TeamSection';
import TextSection from '../components/TextSection';
import { companyProfile } from '../content/companyProfile';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import useScrollReveal from '../hooks/useScrollReveal';

const aboutRoute = '/about-us';
const companyProfileHomeUrl = '/';
const companyProfileServicesUrl = '/about-us#services';
const apiBaseUrl = getApiBaseUrl();
const aboutTitle = 'About ZeroOne IT Inc. | Software Development Team in the Philippines';
const aboutDescription =
  'Learn about ZeroOne IT Inc., a Philippine software development company building reliable web, mobile, internal business systems, and AI-powered solutions.';
const aboutStructuredData = [
  {
    '@type': 'AboutPage',
    '@id': `${defaultSiteUrl}/about-us#about-page`,
    name: 'About ZeroOne IT Inc.',
    url: `${defaultSiteUrl}/about-us`,
    description: aboutDescription,
    isPartOf: {
      '@id': `${defaultSiteUrl}/#website`
    },
    about: {
      '@id': `${defaultSiteUrl}/#organization`
    }
  },
  {
    '@type': 'Organization',
    '@id': `${defaultSiteUrl}/#organization`,
    name: 'ZeroOne IT Inc.',
    legalName: 'ZeroOne Information Technology Inc.',
    url: defaultSiteUrl,
    logo: toAbsoluteUrl('/android-chrome-512x512.png'),
    foundingDate: '2026-05',
    email: 'info@zerooneitinc.com',
    telephone: '+63 919 079 7137',
    areaServed: ['Philippines', 'Worldwide'],
    sameAs: [
      'https://www.facebook.com/zeroone.it.inc',
      'https://www.instagram.com/zerooneit.inc/',
      'https://www.linkedin.com/company/112718341/'
    ]
  },
  {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: defaultSiteUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'About Us',
        item: `${defaultSiteUrl}/about-us`
      }
    ]
  }
];

function getAboutAnchor() {
  return window.location.hash.replace('#', '');
}

function resolveUploadedAssetUrl(value) {
  if (typeof value !== 'string') {
    return value;
  }

  if (!value.startsWith('/api/uploads/')) {
    return value;
  }

  return `${apiBaseUrl}${value}`;
}

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

function mergeTeamMembers(defaultMembers = [], overrideMembers = []) {
  return overrideMembers.map((member, index) => {
    const defaultMember =
      defaultMembers.find((current) => current.name === member.name) ||
      defaultMembers[index] ||
      {};

    return {
      ...defaultMember,
      ...member,
      image: resolveUploadedAssetUrl(member.image || defaultMember.image)
    };
  });
}

function mergeSection(defaultSection, overrideContent) {
  if (!overrideContent) {
    return defaultSection;
  }

  const nextSection = {
    ...defaultSection,
    ...overrideContent
  };

  if (Array.isArray(overrideContent.cards)) {
    nextSection.cards = overrideContent.cards.map((card) => ({
      ...defaultSection.cards?.find((defaultCard) => defaultCard.title === card.title),
      ...card
    }));
  }

  if (Array.isArray(overrideContent.members)) {
    nextSection.members = mergeTeamMembers(defaultSection.members, overrideContent.members);
  }

  return nextSection;
}

function mergeAboutContent(profile, overrides) {
  if (!overrides.length) {
    return profile;
  }

  const overrideMap = new Map(overrides.map((item) => [item.sectionId, item.content]));
  const statsOverride = overrideMap.get('stats');
  const countersOverride = overrideMap.get('projectCounters');

  return {
    ...profile,
    stats: Array.isArray(statsOverride?.items) ? statsOverride.items : profile.stats,
    projectCounters: Array.isArray(countersOverride?.items) ? countersOverride.items : profile.projectCounters,
    sections: profile.sections.map((section) => mergeSection(section, overrideMap.get(section.id)))
  };
}

function App() {
  const [aboutContentOverrides, setAboutContentOverrides] = useState([]);
  const aboutSectionRef = useRef(null);
  useScrollReveal(aboutSectionRef, aboutContentOverrides);
  const [solutionCardsVisible, setSolutionCardsVisible] = useState(false);
  const solutionProcessRef = useRef(null);
  const solutionCardsInViewRef = useRef(false);
  const mergedProfile = mergeAboutContent(companyProfile, aboutContentOverrides);
  const pageProfile = {
    ...mergedProfile,
    // Keep these sections saved while hiding them from the public page.
    sections: mergedProfile.sections.filter((section) => !['business-partner', 'vision', 'mission'].includes(section.id))
  };
  const footerCapabilities = [
    { label: 'Custom Software', href: companyProfileServicesUrl },
    { label: 'AI Automation', href: companyProfileServicesUrl },
    { label: 'Internal Systems', href: companyProfileServicesUrl },
    { label: 'Web Platforms', href: companyProfileServicesUrl },
    { label: 'Mobile Apps', href: companyProfileServicesUrl }
  ];
  const footerLinks = [
    { label: 'Home', href: companyProfileHomeUrl },
    { label: 'About', href: aboutRoute },
    { label: 'Services', href: companyProfileServicesUrl },
    { label: 'Contact Us', href: '/#contact' },
    { label: 'Facebook', href: 'https://www.facebook.com/zeroone.it.inc' }
  ];
  const registrationBadges = [
    { label: 'SEC Registered', logo: secLogo, alt: 'SEC logo' },
    { label: 'BIR Registered', logo: birLogo, alt: 'BIR logo' }
  ];

  useEffect(() => {
    let ignore = false;

    async function loadAboutContent() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/about-content`);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || 'Unable to load about page content.');
        }

        if (!ignore) {
          setAboutContentOverrides(Array.isArray(payload?.sections) ? payload.sections : []);
        }
      } catch (error) {
        if (!ignore) {
          setAboutContentOverrides([]);
        }
      }
    }

    loadAboutContent();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const scrollToHashTarget = () => {
      const anchor = getAboutAnchor();

      if (!anchor) {
        return;
      }

      const target = document.getElementById(anchor);

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

  const navigation = [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'services', label: 'Services', href: companyProfileServicesUrl },
    { id: 'about', label: 'About Us', href: aboutRoute },
    { id: 'contact', label: 'Contact', href: '/#contact' }
  ];

  const renderSections = () => {
    const sections = [];
    let overview = null;
    let i = 0;
    while (i < pageProfile.sections.length) {
      const section = pageProfile.sections[i];
      if (section.id === 'about') {
        // Render about with optional vision/mission in a side column
        const visionSection = pageProfile.sections[i + 1];
        const missionSection = pageProfile.sections[i + 2];
        const hasVision = visionSection && visionSection.id === 'vision';
        const hasMission = missionSection && missionSection.id === 'mission';
        overview = (
          <section
            key="about-vision-mission"
            className="section about-introduction reveal-section reveal-delay-2"
            id="about-us"
            ref={aboutSectionRef}
          >
            <div id="about" aria-hidden="true" />
            <div className={`about-vision-mission-grid${hasVision || hasMission ? '' : ' about-overview-only'}`}>
              <div className="about-column">
                <TextSection
                  id={section.id}
                  title="Who We Are"
                  paragraphs={section.paragraphs}
                  noWrapper={true}
                  scrollReveal
                />
              </div>
              {hasVision || hasMission ? <div className="vision-mission-column">
                {hasVision ? (
                  <TextSection
                    id={visionSection.id}
                    title={visionSection.title}
                    paragraphs={visionSection.paragraphs}
                    noWrapper={true}
                    scrollReveal
                  />
                ) : null}
                {hasMission ? (
                  <TextSection
                    id={missionSection.id}
                    title={missionSection.title}
                    paragraphs={missionSection.paragraphs}
                    noWrapper={true}
                    scrollReveal
                  />
                ) : null}
              </div> : null}
            </div>
          </section>
        );
        sections.push(
          <section key="about-details" className="section about-details">
            {section.highlightStatement ? (
              <>
                {section.highlightStatement.problemSection?.solutionSection ? (
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
    return { overview, sections };
  };
  const renderedSections = renderSections();

  return (
    <div className="site about-page">
      <Seo
        title={aboutTitle}
        description={aboutDescription}
        canonicalPath="/about-us"
        structuredData={aboutStructuredData}
      />
      <Header
        brand={pageProfile.brand}
        className="landing-topbar"
        navigation={navigation}
      />

      <main>
        {renderedSections.overview}
        <HeroMetrics stats={pageProfile.stats} projectCounters={pageProfile.projectCounters} />

        {renderedSections.sections}

        <footer className="landing-site-footer" id={pageProfile.contact.id}>
          <div className="landing-footer-inner">
            <div className="landing-footer-main">
              <div className="landing-footer-brand">
                <a className="landing-footer-wordmark" href={companyProfileHomeUrl} aria-label="ZeroOne home">
                  <span className="landing-footer-wordmark-primary">Zero<span className="brand-one">One</span> IT <span className="brand-one">Inc.</span></span>
                </a>
                <p className="landing-footer-description">
                  Scaling operations requires software that works for operators. ZeroOne
                  builds precision IT solutions for modern businesses in the Philippines.
                </p>
                <div className="landing-footer-direct">
                  <p className="landing-footer-label">Direct Contact</p>
                  <a className="landing-footer-direct-link" href={`mailto:${pageProfile.contact.email}`}>
                    {pageProfile.contact.email}
                  </a>
                  <a className="landing-footer-direct-link" href="tel:+639190797137">
                    +63 919 079 7137
                  </a>
                </div>
              </div>

              <div className="landing-footer-column">
                <p className="landing-footer-label">Services</p>
                <nav className="landing-footer-list" aria-label="Services">
                  {footerCapabilities.map((item) => (
                    <a key={item.label} href={item.href}>
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>

              <div className="landing-footer-column">
                <p className="landing-footer-label">Navigation</p>
                <nav className="landing-footer-list" aria-label="Footer">
                  {footerLinks.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            <div className="landing-footer-badges" aria-label="Registration badges">
              {registrationBadges.map((badge) => (
                <span className="landing-footer-badge" key={badge.label}>
                  <img className="landing-footer-badge-logo" src={badge.logo} alt={badge.alt} />
                  <span>{badge.label}</span>
                </span>
              ))}
            </div>

            <div className="landing-footer-bottom">
              <p className="landing-footer-copyright">© 2026 ZEROONE IT INC. ALL RIGHTS RESERVED.</p>
            </div>
          </div>
        </footer>
      </main>

      <BackToTop />
      <ChatWidget />
    </div>
  );
}

export default App;

