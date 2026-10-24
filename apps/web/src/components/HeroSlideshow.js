import { useEffect, useRef, useState } from 'react';
import heroLogo from '../assets/company/zeroone-dark-logo.png';
import './HeroSlideshow.css';

const slides = [
  {
    label: 'Introduction',
    lines: ['Build. Transform.', 'Scale with Confidence.'],
    description: 'We build custom software, SaaS platforms, and AI-powered solutions that help organizations streamline operations, delight users, and accelerate growth.',
  },
  {
    label: 'Digital systems',
    lines: ['Digital systems.'],
    description: 'Build smarter digital systems that connect your teams, simplify everyday workflows, and bring your business data into one place. From internal tools to customer portals, we create solutions that reduce manual work, help you make informed decisions, and grow with your business.',
  },
  {
    label: 'Software & SaaS',
    lines: ['Software & SaaS.'],
    description: 'We design and build custom software and SaaS platforms around the way your business works. From customer-facing applications to subscription-based products, we turn your ideas into intuitive tools that simplify operations, serve your users, and support your next stage of growth.',
  },
  {
    label: 'Built around you',
    lines: ['Built around you.'],
    description: 'Your business has its own goals, processes, and challenges. We take the time to understand how your team works, then build software that fits your workflows and connects with the tools you already use. As your needs evolve, your solution can evolve with you—giving you the flexibility to move forward with confidence.',
  },
  {
    label: 'Idea to deployment',
    lines: ['From idea to', 'Deployment.'],
    description: 'ZeroOne IT Inc. builds intelligent digital experiences that drive business growth. From web and mobile applications to AI-powered platforms, we deliver reliable, scalable solutions engineered for long-term success.',
  },
  {
    label: 'Software that delivers',
    lines: ['We design and build.'],
    description: 'Software solutions that simplify processes and drive results.',
  },
];

export default function HeroSlideshow({ children }) {
  const touchStart = useRef(null);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const rotating = !focused && !hovered && !reducedMotion;

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media?.addEventListener?.('change', update);
    return () => media?.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (!rotating) return undefined;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 3000);
    return () => window.clearInterval(timer);
  }, [rotating, active]);

  function selectSlide(index) {
    setActive((index + slides.length) % slides.length);
  }

  return (
    <section
      className="landing-hero-slideshow"
      aria-label="ZeroOne introduction"
      aria-roledescription="carousel"
      onMouseEnter={() => {
        if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? true) setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (event.target.matches(':focus-visible')) setFocused(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          selectSlide(active + (event.key === 'ArrowLeft' ? -1 : 1));
        }
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = event.touches.length === 1 && !event.target.closest('a, button')
          ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start || !event.changedTouches.length) return;
        const touch = event.changedTouches[0];
        const horizontal = touch.clientX - start.x;
        const vertical = touch.clientY - start.y;
        if (Math.abs(horizontal) >= 50 && Math.abs(horizontal) > Math.abs(vertical) * 1.4) {
          selectSlide(active + (horizontal < 0 ? 1 : -1));
        }
      }}
      onTouchCancel={() => { touchStart.current = null; }}
    >
      <div className="hero-slideshow-stage">
        <div className="landing-hero-header">
          <div className="landing-hero-heading-block">
            <p className="landing-hero-eyebrow">
              <span className="hero-brand-dot" aria-hidden="true" />
              <span>Technology built around your business</span>
            </p>
            <div className="hero-slideshow-track" aria-live={rotating ? 'off' : 'polite'} aria-atomic="true">
              {slides.map((slide, index) => (
                <div
                  key={slide.label}
                  className={`hero-slideshow-slide${active === index ? ' is-active' : ''}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${slides.length}: ${slide.label}`}
                  aria-hidden={active !== index}
                >
                  <h1 className="landing-hero-title">
                    {slide.lines.map((line, lineIndex) => (
                      <span key={line}>{lineIndex > 0 ? ' ' : ''}<span className={`landing-hero-title-line${lineIndex === slide.lines.length - 1 ? ' hero-title-accent' : ''}`}>{line}</span></span>
                    ))}
                  </h1>
                  {slide.description ? <p className="landing-hero-lead">{slide.description}</p> : null}
                  {children}
                </div>
              ))}
            </div>
          </div>
          <div className="hero-brand-display">
            <div className="landing-hero-logo-panel">
            <img className="zeroone-hero-logo" src={heroLogo} alt="ZeroOne Information Technology Inc." />
            </div>
            <p className="hero-brand-caption">Custom software <span> / </span> SaaS <span> / </span> AI solutions</p>
          </div>
        </div>
        <div className="hero-slideshow-controls">
          <div className="hero-slideshow-dots" role="group" aria-label="Choose a slide">
            {slides.map((slide, index) => (
              <button
                key={slide.label}
                type="button"
                aria-label={`Show slide ${index + 1}: ${slide.label}`}
                aria-current={active === index ? 'true' : undefined}
                onClick={() => selectSlide(index)}
              ><span /></button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
