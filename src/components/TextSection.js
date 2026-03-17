import SectionHeading from './SectionHeading';

function TextSection({ id, title, paragraphs }) {
  return (
    <section className="section reveal-section reveal-delay-2" id={id}>
      <SectionHeading title={title} />
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="hero-copy">
          {paragraph}
        </p>
      ))}
    </section>
  );
}

export default TextSection;
