function SectionHeading({ title, intro, scrollReveal = false }) {
  return (
    <div className="section-heading">
      <h2 data-scroll-reveal-block={scrollReveal || undefined}>
        {scrollReveal ? <span className="scroll-reveal-content">{title}</span> : title}
      </h2>
      {intro ? <p className="section-copy">{intro}</p> : null}
    </div>
  );
}

export default SectionHeading;
