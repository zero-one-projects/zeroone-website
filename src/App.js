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
  const navigation = companyProfile.sections.map(({ id, title }) => ({
    id,
    label: title
  }));

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

        {companyProfile.sections.map(renderSection)}

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
