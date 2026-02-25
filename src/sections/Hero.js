import React from "react";
import { Typewriter } from "react-simple-typewriter";
import "./Hero.css";

const Hero = () => (
    <section className="hero-section">
        <h1 className="hero-title">
            <span className="accent">
                <Typewriter
                    words={['ZeroOne']}
                    cursor
                    cursorStyle='|'
                    typeSpeed={120}
                    deleteSpeed={80}
                    delaySpeed={1200}
                />
            </span>{' '}IT Solutions
        </h1>
        <h2 className="hero-title-thin">From Idea to Deployment</h2>
        <p className="hero-desc">
            ZeroOne IT Solutions builds intelligent digital experiences that drive business growth.
        </p>
        <p className="hero-desc hero-desc-secondary">
            From web and mobile applications to AI-powered platforms, we deliver reliable, scalable solutions engineered for long-term success.
        </p>
    </section>
);

export default Hero;
