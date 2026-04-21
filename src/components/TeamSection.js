import teamMarkerIcon from '../assets/icons/s.png';

function TeamSection({ id, members }) {
  const teamOrder = ['Allen', 'Riza', 'PJ', 'Khalid', 'Ridz'];
  const orderedMembers = [...members].sort((a, b) => {
    const aIndex = teamOrder.indexOf(a.name);
    const bIndex = teamOrder.indexOf(b.name);

    return (aIndex === -1 ? teamOrder.length : aIndex) - (bIndex === -1 ? teamOrder.length : bIndex);
  });

  return (
    <section className="section reveal-section reveal-delay-3" id={id}>
      <h2 className="team-title">Meet Our Team</h2>
      <div className="team-showcase">
        {orderedMembers.map((member, index) => (
          <article
            key={member.name}
            className="team-card reveal-card"
            style={{ '--stagger-index': index }}
          >
            <div className="team-avatar-frame">
              <img className="team-avatar" src={member.image} alt={member.name} />
            </div>
            <img className="team-dot" src={teamMarkerIcon} alt="" aria-hidden="true" />
            <h3>{member.name}</h3>
            <p className="team-role">{member.role}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default TeamSection;
