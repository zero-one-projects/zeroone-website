import './App.css';
import logo from './assets/company/logo.png';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import CardSection from './components/CardSection';
import TeamSection from './components/TeamSection';
import TextSection from './components/TextSection';
import SectionHeading from './components/SectionHeading';
import { companyProfile } from './content/companyProfile';

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
        logo={logo}
      />

      <main>
        <HeroSection
          brand={companyProfile.brand}
          hero={companyProfile.hero}
          stats={companyProfile.stats}
          logo={logo}
        />

        {companyProfile.sections.map((section) => {
          if (section.members) {
            return (
              <TeamSection
                key={section.id}
                id={section.id}
                title={section.title}
                intro={section.intro}
                members={section.members}
              />
            );
          }

          if (section.cards) {
            return (
              <CardSection
                key={section.id}
                id={section.id}
                title={section.title}
                intro={section.intro}
                cards={section.cards}
                variant={section.variant}
              />
            );
          }

          return (
            <TextSection
              key={section.id}
              id={section.id}
              title={section.title}
              paragraphs={section.paragraphs}
            />
          );
        })}

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
