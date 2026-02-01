import React from "react";
import "./About.css";

const About = () => (
    <section className="about-section">
        <h2
            className="section-heading"
            style={{
                textAlign: 'hy the bg',
                marginLeft: '2px',
            }}
        >
            About Us
        </h2>
        <p className="about-desc">
            Zero One Systems Services is a digital product team focused on building reliable, scalable web, mobile, and AI-powered solutions.<br />
            We partner with businesses to turn ideas into production-ready products—designed with clarity, built with purpose, and delivered with quality.
        </p>
        <div style={{ marginTop: '2.2rem', fontSize: '1.13rem', color: 'var(--main-text)', fontFamily: 'Inter, Arial, sans-serif', letterSpacing: '0.01em' }}>
            Get in touch <span role="img" aria-label="point">👉</span>
            <a
                href="mailto:hello@zeroone.com"
                style={{
                    color: 'var(--main-text)',
                    textDecoration: 'underline',
                    marginLeft: 8,
                    fontWeight: 500,
                    fontFamily: 'Inter, Arial, sans-serif',
                }}
            >
                muksanalriza@gmail.com
            </a>
        </div>
    </section>
);

export default About;
