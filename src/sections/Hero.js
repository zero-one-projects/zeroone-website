import React from "react";
import { Typewriter } from "react-simple-typewriter";
import "./Hero.css";

const Hero = () => (
    <section className="hero-section" id="top">
        <p className="hero-eyebrow">Product Engineering Studio</p>
        <h1 className="hero-title">
            <span className="accent">
                <Typewriter
                    words={["ZeroOne"]}
                    cursor
                    cursorStyle="|"
                    typeSpeed={120}
                    deleteSpeed={80}
                    delaySpeed={1200}
                />
            </span>{" "}
            IT Solutions builds web, mobile, and AI products that scale with your business.
        </h1>
        <p className="hero-desc">
            We partner with founders and teams to move from idea to launch fast, with production-grade architecture, clear UX, and measurable business outcomes.
        </p>
        <div className="hero-actions">
            <a className="hero-btn hero-btn-primary" href="#projects">View Selected Work</a>
            <a className="hero-btn hero-btn-secondary" href="mailto:contact@zeroone-apps.com">Start a Project</a>
        </div>
        <ul className="hero-metrics" aria-label="Company highlights">
            <li><strong>Web, Mobile, AI</strong> under one product team</li>
            <li><strong>Production-ready</strong> architecture and deployment</li>
            <li><strong>Long-term support</strong> for growth and iteration</li>
        </ul>
    </section>
);

export default Hero;
