import SectionHeading from './SectionHeading';

function TextSection({ id, title, paragraphs, noWrapper = false }) {
  const content = (
    <>
      <SectionHeading title={title} />
      <div className="text-section-body">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-section-copy">
            {paragraph}
          </p>
        ))}
      </div>
    </>
  );

  if (noWrapper) {
    return content;
  }

  return (
    <section className="section reveal-section reveal-delay-2" id={id}>
      {content}
    </section>
  );
}

export default TextSection;
