import './App.css';
import logo from './assets/company/logo.png';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import CardSection from './components/CardSection';
import TeamSection from './components/TeamSection';
import TextSection from './components/TextSection';
import SectionHeading from './components/SectionHeading';
import { companyProfile } from './content/companyProfile';

const sectionRenderers = {
  text: (section) => (
    <TextSection
      key={section.id}
      id={section.id}
      title={section.title}
      paragraphs={section.paragraphs}
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
  const navigation = companyProfile.sections
    .filter(section => section.id !== 'vision' && section.id !== 'mission')
    .map(({ id, title }) => ({
      id,
      label: title
    }));

  const renderSections = () => {
    const sections = [];
    let i = 0;
    while (i < companyProfile.sections.length) {
      const section = companyProfile.sections[i];
      if (section.id === 'about') {
        // Render about, vision, and mission in a grid layout
        const visionSection = companyProfile.sections[i + 1];
        const missionSection = companyProfile.sections[i + 2];
        sections.push(
          <section key="about-vision-mission" className="section reveal-section reveal-delay-2" id="about">
            <div className="about-vision-mission-grid">
              <div className="about-column">
                {renderSection(section)}
              </div>
              <div className="vision-mission-column">
                <TextSection
                  id={visionSection.id}
                  title={visionSection.title}
                  paragraphs={visionSection.paragraphs}
                  noWrapper={true}
                />
                <TextSection
                  id={missionSection.id}
                  title={missionSection.title}
                  paragraphs={missionSection.paragraphs}
                  noWrapper={true}
                />
              </div>
            </div>
          </section>
        );
        i += 3; // Skip vision and mission since we rendered them
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
          <SectionHeading
            title={companyProfile.contact.title}
            intro={companyProfile.contact.description}
          />
          <a className="btn btn-solid" href={`mailto:${companyProfile.contact.email}`}>
            {companyProfile.contact.email}
          </a>
        </section>
      </main>
    </div>
  );
}

export default App;
