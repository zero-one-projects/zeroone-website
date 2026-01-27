import React from "react";
import './Team.css';
import PaulImg from '../assets/team/Paul.png';
import AlrizaImg from '../assets/team/Riza.png';
import AlKhalidImg from '../assets/team/Khalid.png';

import PaulResume from '../assets/resume/Paul.pdf';
import AlrizaResume from '../assets/resume/Alriza.pdf';
import AlKhalidResume from '../assets/resume/AlKhalid.pdf';

const teamMembers = [
    {
        name: "Paul John D. Peligro",
        role: "Senior Application Systems Engineer / Full-Stack Consultant",
        image: PaulImg,
        resume: PaulResume,
    },
    {
        name: "Alriza Muksan Palahuddin",
        role: "IT Support Engineer / Software Engineer",
        image: AlrizaImg,
        resume: AlrizaResume,
    },
    {
        name: "Al Khalid Muksan Palahuddin",
        role: "Computer Engineer",
        image: AlKhalidImg,
        resume: AlKhalidResume,
    }
];

function Team() {
    return (
        <section className="team-section">
            <h2 className="team-title">Meet the team</h2>
            <div className="team-grid">
                {teamMembers.map((member, idx) => (
                    <div className="team-card" key={idx}>
                        <img src={member.image} alt={member.name} className="team-photo" />
                        <h3 className="team-name">{member.name}</h3>
                        <p className="team-role">{member.role}</p>
                        {/* Minimal: no bio, no expertise */}
                        <a
                            href={member.resume}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="team-resume-link"
                            style={{
                                marginTop: 8,
                                color: '#FFB86B',
                                fontWeight: 500,
                                fontSize: '0.97rem',
                                textDecoration: 'underline',
                                letterSpacing: '0.01em',
                                fontFamily: 'Inter, Arial, sans-serif',
                                display: 'inline-block',
                                verticalAlign: 'middle',
                            }}
                        >
                            <span role="img" aria-label="link" style={{ marginRight: 6 }}>🔗</span>View CV
                        </a>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default Team;
