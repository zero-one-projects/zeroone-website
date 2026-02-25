import React from "react";
import "./About.css";

const About = () => (
    <section className="about-section">
        <h2 className="section-heading">About Us</h2>
        <p className="about-desc">
            Zero One IT Solutions is a digital product team focused on building reliable, scalable web, mobile, and AI-powered solutions.<br />
            We partner with businesses to turn ideas into production-ready products designed with clarity, built with purpose, and delivered with quality.
        </p>
        <div className="about-contact">
            Get in touch <span role="img" aria-label="point">👉</span>
            <a href="mailto:hello@zeroone.com" className="about-email">
                contact@zeroone-apps.com
            </a>
        </div>
    </section>
);

export default About;
