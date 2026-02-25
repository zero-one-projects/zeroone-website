import React from "react";
import "./About.css";

const About = () => (
    <section className="about-section">
        <h2 className="section-heading">About Us</h2>
        <p className="about-desc">
            ZeroOne IT Solutions is a digital product development company specializing in web, mobile, and AI-powered solutions. We help businesses transform ideas into high-performance digital products that are reliable, scalable, and built for growth.
            <br />
            <br />
            Our team combines strategic thinking, modern technologies, and user-focused design to deliver solutions that solve real business challenges. From concept to deployment, we ensure every product is engineered with precision, clarity, and long-term success in mind.
        </p>
        <div className="about-contact">
            Let’s build something impactful together.
            <br />
            Contact us at:{" "}
            <a href="mailto:contact@zeroone-apps.com" className="about-email">
                contact@zeroone-apps.com
            </a>
        </div>
    </section>
);

export default About;
