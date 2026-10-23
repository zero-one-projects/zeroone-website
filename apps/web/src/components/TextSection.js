import SectionHeading from './SectionHeading';
import ImpactStatement from './ImpactStatement';

function TextSection({ id, title, paragraphs, highlightStatement, noWrapper = false, scrollReveal = false }) {
  const content = (
    <>
      <SectionHeading title={title} scrollReveal={scrollReveal} />
      <div className="text-section-body">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-section-copy" data-scroll-reveal-block={scrollReveal || undefined}>
            {scrollReveal ? <span className="scroll-reveal-content">{paragraph}</span> : paragraph}
          </p>
        ))}
      </div>
      {highlightStatement ? <ImpactStatement statement={highlightStatement} /> : null}
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
