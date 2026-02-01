import React, { useState } from "react";
import RequestCVForm from '../components/RequestCVForm';
import '../components/RequestCVModal.css';
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
    const [showRequestCV, setShowRequestCV] = useState({ open: false, to: null });
    return (
        <section className="team-section">
            <h2 className="team-title">Our Team</h2>
            <div className="team-grid">
                {teamMembers.map((member, idx) => (
                    <div className="team-card" key={idx}>
                        <img src={member.image} alt={member.name} className="team-photo" />
                        <h3 className="team-name">{member.name}</h3>
                        <p className="team-role">{member.role}</p>
                        {/* Minimal: no bio, no expertise */}
                        {member.name === "Al Khalid Muksan Palahuddin" ? (
                            <button
                                type="button"
                                className="team-resume-link"
                                style={{
                                    marginTop: 8,
                                    color: 'var(--accent)',
                                    fontWeight: 500,
                                    fontSize: '0.97rem',
                                    textDecoration: 'underline',
                                    letterSpacing: '0.01em',
                                    fontFamily: 'Inter, Arial, sans-serif',
                                    display: 'inline-block',
                                    verticalAlign: 'middle',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setShowRequestCV({ open: true, to: { name: 'Al Khalid Muksan Palahuddin', email: 'palahuddinalkhalid@gmail.com' } })}
                            >
                                <span role="img" aria-label="link" style={{ marginRight: 6 }}>🔗</span>Request CV
                            </button>
                        ) : member.name === "Alriza Muksan Palahuddin" ? (
                            <button
                                type="button"
                                className="team-resume-link"
                                style={{
                                    marginTop: 8,
                                    color: 'var(--accent)',
                                    fontWeight: 500,
                                    fontSize: '0.97rem',
                                    textDecoration: 'underline',
                                    letterSpacing: '0.01em',
                                    fontFamily: 'Inter, Arial, sans-serif',
                                    display: 'inline-block',
                                    verticalAlign: 'middle',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setShowRequestCV({ open: true, to: { name: 'Alriza Muksan Palahuddin', email: 'muksanalriza@gmail.com' } })}
                            >
                                <span role="img" aria-label="link" style={{ marginRight: 6 }}>🔗</span>Request CV
                            </button>
                        ) : member.name === "Paul John D. Peligro" ? (
                            <button
                                type="button"
                                className="team-resume-link"
                                style={{
                                    marginTop: 8,
                                    color: 'var(--accent)',
                                    fontWeight: 500,
                                    fontSize: '0.97rem',
                                    textDecoration: 'underline',
                                    letterSpacing: '0.01em',
                                    fontFamily: 'Inter, Arial, sans-serif',
                                    display: 'inline-block',
                                    verticalAlign: 'middle',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setShowRequestCV({ open: true, to: { name: 'Paul John D. Peligro', email: 'pauljohn.peligro@gmail.com' } })}
                            >
                                <span role="img" aria-label="link" style={{ marginRight: 6 }}>🔗</span>Request CV
                            </button>
                        ) : (
                            <a
                                href={member.resume}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="team-resume-link"
                                style={{
                                    marginTop: 8,
                                    color: 'var(--accent)',
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
                        )}
                    </div>
                ))}
            </div>
            {showRequestCV.open && (
                <div className="request-cv-modal-overlay">
                    <RequestCVForm onClose={() => setShowRequestCV({ open: false, to: null })} to={showRequestCV.to} />
                </div>
            )}
        </section>
    );
}

export default Team;
