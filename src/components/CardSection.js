import SectionHeading from './SectionHeading';

function ServiceIcon({ index }) {
  const icons = [
    <path key="grid" d="M4 4h7v7H4Zm9 0h7v7h-7ZM4 13h7v7H4Zm9 0h7v7h-7Z" />,
    <path
      key="sliders"
      d="M4 7h8m4 0h4M9 5v4M4 17h4m4 0h8M15 15v4M4 12h16"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />,
    <path key="desktop" d="M5 5h14v10H5Zm5 12h4M8 19h8" fill="none" strokeLinecap="round" />,
    <path key="store" d="M5 6h14l-1 3H6Zm1 3h12v10H6Zm2 3h3v4H8Zm5 0h3v4h-3" />,
    <path key="layers" d="m12 4 8 4-8 4-8-4Zm0 6 8 4-8 4-8-4" fill="none" strokeLinecap="round" />,
    <path
      key="spark"
      d="M12 4v4m0 8v4M4 12h4m8 0h4m-3.2-5.2-2.8 2.8m0 4.8 2.8 2.8m-9.6 0 2.8-2.8m0-4.8L7.2 6.8"
      fill="none"
      strokeLinecap="round"
    />
  ];

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[index % icons.length]}
    </svg>
  );
}

function CardSection({ id, title, intro, outro, cards, variant }) {
  const isCapabilities = variant === 'swipe';

  return (
    <section className="section reveal-section reveal-delay-2" id={id}>
      <SectionHeading title={title} intro={intro} />
      <div className={isCapabilities ? 'services-cap-grid' : 'card-grid'}>
        {cards.map((card, index) => {
          return (
          <article
            key={card.title}
            className={`${isCapabilities ? 'services-cap-card' : 'feature-card'} reveal-card`}
            style={{ '--stagger-index': index }}
          >
            {isCapabilities ? (
              <>
                <span className="services-cap-icon" aria-hidden="true">
                  <ServiceIcon index={index} />
                </span>
                <div className="services-cap-copy">
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              </>
            ) : (
              <>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </>
            )}
          </article>
          );
        })}
      </div>
      {outro ? (
        <p className="services-outro">
          <span>{outro}</span>
        </p>
      ) : null}
    </section>
  );
}

export default CardSection;
