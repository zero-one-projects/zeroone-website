import { useState } from 'react';
import SectionHeading from './SectionHeading';

function TeamSection({ id, title, intro, members }) {
  const [brokenImages, setBrokenImages] = useState({});
  const teamOrder = ['Riza', 'PJ', 'AL'];
  const isSoloSection = members.length === 1;
  const isCompactSection = members.length <= 2;
  const getInitials = (name = '') =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || '01';

  const getCardVariant = (member) => {
    if (member.name === 'PJ') {
      return 'featured';
    }

    if (member.role.includes('Partner')) {
      return 'executive';
    }

    if (member.role.includes('Business Development')) {
      return 'executive';
    }

    return 'operations';
  };
  const getRoleLabel = (member) => {
    if (member.roleLabel) return member.roleLabel;
    if (member.name === 'PJ') {
      return 'Leadership & Technical Consulting';
    }

    if (member.role.includes('Partner')) {
      return 'Client Relations & Partnerships';
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
    <section
      className={`section team-profile-section${isSoloSection ? ' team-profile-section-solo' : ''}${isCompactSection ? ' team-profile-section-compact' : ''} reveal-section reveal-delay-3`}
      id={id}
    >
      <div className="team-section-center">
        <div className="team-section-header">
          <SectionHeading title={title || 'Meet Our Team'} intro={intro} />
        </div>
        <div className={`team-showcase${isSoloSection ? ' team-showcase-solo' : ''}${isCompactSection ? ' team-showcase-compact' : ''}`}>
          {orderedMembers.map((member, index) => (
            <article
              key={`${member.name || 'member'}-${index}`}
              className={`team-card team-card-${getCardVariant(member)} reveal-card`}
              style={{ '--stagger-index': index }}
            >
              <div className="team-avatar-orbit">
                <div className="team-avatar-frame">
                  {member.image && brokenImages[`${member.name || 'member'}-${index}`] !== member.image ? (
                    <img
                      className="team-avatar"
                      src={member.image}
                      alt={member.name}
                      onError={() => {
                        setBrokenImages((current) => ({
                          ...current,
                          [`${member.name || 'member'}-${index}`]: member.image
                        }));
                      }}
                    />
                  ) : (
                    <span className="team-avatar team-avatar-placeholder" aria-hidden="true">
                      {getInitials(member.name)}
                    </span>
                  )}
                </div>
              </div>
              <div className="team-name-band">
                <h3>{member.name || 'Strategic Partner'}</h3>
              </div>
              <div className="team-card-body">
                <p className="team-role-label">{getRoleLabel(member)}</p>
                {(member.role || 'Partner').split('\n').map((line, lineIndex) => (
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
      </div>
    </section>
  );
}

export default TeamSection;
