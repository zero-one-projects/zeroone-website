function HeroSection({ brand, hero, stats, logo }) {
  return (
    <section className="hero section reveal-section reveal-delay-1">
      <div className="hero-layout">
        <div className="hero-content hero-copy-stack">
          <h1 className="hero-title">{hero.title}</h1>
          {hero.paragraphs.map((paragraph) => (
            <p key={paragraph} className="hero-copy">
              {paragraph}
            </p>
          ))}

          <div className="hero-actions">
            <a className="btn btn-solid" href={hero.primaryAction.href}>
              {hero.primaryAction.label}
            </a>
            <a className="btn btn-ghost" href={hero.secondaryAction.href}>
              {hero.secondaryAction.label}
            </a>
          </div>
        </div>

        <aside className="hero-logo-wrap" aria-label="Company logo">
          <img className="hero-logo" src={logo} alt={brand.name} />
        </aside>
      </div>

      <div className="stats-grid">
        {stats.map((item, index) => (
          <article
            key={item.label}
            className="stat-card reveal-card"
            style={{ '--stagger-index': index }}
          >
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HeroSection;
