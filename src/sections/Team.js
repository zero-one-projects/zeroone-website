import React, { useEffect, useRef, useState } from "react";
import RequestCVForm from '../components/RequestCVForm';
import '../components/RequestCVModal.css';
import './Team.css';
import PaulImg from '../assets/team/Paul.png';
import AlrizaImg from '../assets/team/Riza.png';
import AlKhalidImg from '../assets/team/Khalid.png';

const teamMembers = [
    {
        name: "Paul John D. Peligro",
        role: "Senior Application Systems Engineer / Full-Stack Consultant",
        image: PaulImg,
        email: 'pauljohn.peligro@gmail.com',
    },
    {
        name: "Alriza Muksan Palahuddin",
        role: "IT Support Engineer / Software Engineer",
        image: AlrizaImg,
        email: 'muksanalriza@gmail.com',
    },
    {
        name: "Al Khalid Muksan Palahuddin",
        role: "Computer Engineer",
        image: AlKhalidImg,
        email: 'palahuddinalkhalid@gmail.com',
    }
];

function Team() {
    const [showRequestCV, setShowRequestCV] = useState({ open: false, to: null });
    const [isVisible, setIsVisible] = useState(false);
    const sectionRef = useRef(null);

    useEffect(() => {
        const sectionEl = sectionRef.current;
        if (!sectionEl) return undefined;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
        );

        observer.observe(sectionEl);
        return () => observer.disconnect();
    }, []);

    return (
        <section ref={sectionRef} className={`team-section ${isVisible ? "team-visible" : ""}`}>
            <h2 className="team-title">Our Team</h2>
            <div className="team-grid">
                {teamMembers.map((member, idx) => (
                    <div className="team-card" key={idx}>
                        <img src={member.image} alt={member.name} className="team-photo" />
                        <h3 className="team-name">{member.name}</h3>
                        <p className="team-role">{member.role}</p>
                        <button
                            type="button"
                            className="team-resume-link"
                            onClick={() => setShowRequestCV({ open: true, to: { name: member.name, email: member.email } })}
                        >
                            <span role="img" aria-label="link">🔗</span>Request CV
                        </button>
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
