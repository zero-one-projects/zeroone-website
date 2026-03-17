import SectionHeading from './SectionHeading';

function CardSection({ id, title, intro, cards, variant }) {
  const isSwipe = variant === 'swipe';

  return (
    <section className="section reveal-section reveal-delay-2" id={id}>
      <SectionHeading title={title} intro={intro} />
      <div className={isSwipe ? 'swipe-grid' : 'card-grid'}>
        {cards.map((card, index) => (
          <article
            key={card.title}
            className={`${isSwipe ? 'feature-card swipe-card' : 'feature-card'} reveal-card`}
            style={{ '--stagger-index': index }}
          >
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default CardSection;
