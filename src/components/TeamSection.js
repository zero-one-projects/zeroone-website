import SectionHeading from './SectionHeading';

function TeamSection({ id, title, intro, members }) {
  return (
    <section className="section reveal-section reveal-delay-3" id={id}>
      <SectionHeading title={title} intro={intro} />
      <div className="team-grid">
        {members.map((member, index) => (
          <article
            key={member.name}
            className="team-card reveal-card"
            style={{ '--stagger-index': index }}
          >
            <img className="team-avatar" src={member.image} alt={member.name} />
            <h3>{member.name}</h3>
            <p className="team-role">{member.role}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default TeamSection;
