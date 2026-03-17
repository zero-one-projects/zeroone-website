import React from "react";
import "./About.css";

const About = () => (
    <section className="about-section" id="about">
        <h2 className="section-heading">About Us</h2>
        <p className="about-desc">
            ZeroOne IT Solutions is a digital product development company focused on business-ready software. We combine strategic planning, modern engineering, and user-focused design to build products that are reliable, scalable, and built for long-term growth.
        </p>
        <div className="about-capabilities">
            <article className="about-capability">
                <h3>Web Platforms</h3>
                <p>Custom web systems, dashboards, and portals with maintainable architecture and fast delivery cycles.</p>
            </article>
            <article className="about-capability">
                <h3>Mobile Products</h3>
                <p>Cross-platform and native mobile apps optimized for performance, usability, and business workflows.</p>
            </article>
            <article className="about-capability">
                <h3>AI Integrations</h3>
                <p>Practical AI features, automation flows, and intelligent assistants that improve operations and decisions.</p>
            </article>
        </div>
        <div className="about-process">
            <h3>How We Work</h3>
            <p>Discover - Build - Launch - Scale</p>
        </div>
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
