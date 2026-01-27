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
        <h1 className="hero-title hero-title-thin" style={{ marginTop: '-0.7rem' }}>
            From Idea to Deployment
        </h1>
        <p className="hero-desc" style={{ marginTop: '1.2rem' }}>
            Zero One Systems Services designs and builds web, mobile, and AI-powered products that scale with your business.
        </p>
    </section>
);

export default Hero;
