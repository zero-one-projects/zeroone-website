import SectionHeading from './SectionHeading';

function TextSection({ id, title, paragraphs }) {
  return (
    <section className="section reveal-section reveal-delay-2" id={id}>
      <SectionHeading title={title} />
      <div className="text-section-body">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-section-copy">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

export default TextSection;
