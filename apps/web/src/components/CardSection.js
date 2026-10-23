import SectionHeading from './SectionHeading';

function CardSection({ id, title, intro, outro, cards, variant }) {
  const isCapabilities = variant === 'swipe';

  return (
    <section className={`section reveal-section reveal-delay-2${isCapabilities ? ' services-editorial' : ''}`} id={id}>
      <SectionHeading title={title} intro={intro} />
      <div className={isCapabilities ? 'services-cap-grid' : 'card-grid'}>
        {cards.map((card, index) => (
          <article
            key={card.title}
            className={`${isCapabilities ? 'services-cap-card' : 'feature-card'} reveal-card`}
            style={{ '--stagger-index': index }}
          >
            {isCapabilities ? (
              <>
                <span className="services-cap-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="services-cap-title">{card.title}</h3>
                <div className="services-cap-detail">
                  <p className="services-cap-description">{card.description}</p>
                  {card.tags?.length ? (
                    <ul className="services-cap-tags" aria-label={`${card.title} capabilities`}>
                      {card.tags.map((tag) => <li key={tag}>{tag}</li>)}
                    </ul>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </>
            )}
          </article>
        ))}
      </div>
      {outro ? <p className="services-outro"><span>{outro}</span></p> : null}
    </section>
  );
}

export default CardSection;
