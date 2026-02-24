import React from "react";
import { Typewriter } from 'react-simple-typewriter';
import "./Hero.css";

const Hero = () => (
    <section className="hero-section">
        <h1 className="hero-title">
            <span className="accent">
                <Typewriter
                    words={['Breakthrough']}
                    cursor
                    cursorStyle='|'
                    typeSpeed={120}
                    deleteSpeed={80}
                    delaySpeed={1200}
                />
            </span>{' '}Digital Solutions
        </h1>
        <h2 className="hero-title-thin">From Idea to Deployment</h2>
        <p className="hero-desc">
            Zero One IT Solutions designs and builds web, mobile, and AI-powered products that scale with your business.
        </p>
    </section>
);

export default Hero;
