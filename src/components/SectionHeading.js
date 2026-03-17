function SectionHeading({ title, intro }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {intro ? <p className="section-copy">{intro}</p> : null}
    </div>
  );
}

export default SectionHeading;
