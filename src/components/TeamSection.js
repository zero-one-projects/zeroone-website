import SectionHeading from './SectionHeading';

function TeamSection({ id, title, intro, members }) {
  const teamOrder = ['Riza', 'PJ', 'AL'];
  const getCardVariant = (member) => {
    if (member.name === 'PJ') {
      return 'featured';
    }

    if (member.role.includes('Business Development')) {
      return 'executive';
    }

    return 'operations';
  };
  const getRoleLabel = (member) => {
    if (member.name === 'PJ') {
      return 'Leadership & Technical Consulting';
    }

    if (member.role.includes('Business Development')) {
      return 'Business Development & Engineering';
    }

    return 'Account Management & Operations';
  };

  const orderedMembers = [...members].sort((a, b) => {
    const aIndex = teamOrder.indexOf(a.name);
    const bIndex = teamOrder.indexOf(b.name);

    return (aIndex === -1 ? teamOrder.length : aIndex) - (bIndex === -1 ? teamOrder.length : bIndex);
  });

  return (
    <section className="section reveal-section reveal-delay-3" id={id}>
      <div className="team-section-header">
        <SectionHeading title={title || 'Meet Our Team'} intro={intro} />
      </div>
      <div className="team-showcase">
        {orderedMembers.map((member, index) => (
          <article
            key={member.name}
            className={`team-card team-card-${getCardVariant(member)} reveal-card`}
            style={{ '--stagger-index': index }}
          >
            <div className="team-avatar-orbit">
              <div className="team-avatar-frame">
                <img className="team-avatar" src={member.image} alt={member.name} />
              </div>
            </div>
            <div className="team-name-band">
              <h3>{member.name}</h3>
            </div>
            <div className="team-card-body">
              <p className="team-role-label">{getRoleLabel(member)}</p>
              {member.role.split('\n').map((line, lineIndex) => (
                <p
                  key={`${member.name}-${lineIndex}`}
                  className={lineIndex === 0 ? 'team-role team-role-primary' : 'team-role team-role-secondary'}
                >
                  {line}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default TeamSection;
