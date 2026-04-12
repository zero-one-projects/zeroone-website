import { useEffect, useMemo, useRef, useState } from 'react';

function HeroIcon({ name }) {
  if (name === 'code') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 7 4 12l5 5M15 7l5 5-5 5M14 4l-4 16" />
      </svg>
    );
  }

  if (name === 'rocket') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 4c2 0 4 2 4 4v2l2 2-3 1-1 3-2-2h-2c-2 0-4-2-4-4V8c0-2 2-4 4-4h2Zm-8 12 3 2-2 3-3 1 2-3Z" />
      </svg>
    );
  }

  if (name === 'shield') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 5 6v6c0 5 3 8 7 9 4-1 7-4 7-9V6l-7-3Zm0 5v8" />
      </svg>
    );
  }

  if (name === 'pulse') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 12h4l2-4 3 8 2-4h7" />
      </svg>
    );
  }

  if (name === 'check') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12 4 4 10-10" />
      </svg>
    );
  }

  if (name === 'users') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19c0-3 2-5 5-5s5 2 5 5M11 19c0-2.5 1.8-4.2 4.5-4.2 2.3 0 4.5 1.4 4.5 4.2" />
      </svg>
    );
  }

  if (name === 'award') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-3 0-1 7 4-2 4 2-1-7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function AnimatedCounter({ value, shouldAnimate }) {
  const target = useMemo(() => Number.parseInt(value, 10), [value]);
  const width = `${value}`.length;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(target)) {
      return undefined;
    }

    if (!shouldAnimate) {
      setDisplayValue(0);
      return undefined;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setDisplayValue(target);
      return undefined;
    }

    let animationFrame = 0;
    const duration = 1050;
    const cycles = 2;
    const startTime = performance.now();

    const tick = (currentTime) => {
      const elapsed = currentTime - startTime;
      const cycleProgress = Math.min((elapsed % duration) / duration, 1);
      const progress = Math.min(elapsed / (duration * cycles), 1);
      const activeProgress = progress === 1 ? 1 : cycleProgress;
      const easedProgress = 1 - Math.pow(1 - activeProgress, 3);

      setDisplayValue(Math.round(target * easedProgress));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    animationFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [shouldAnimate, target]);

  if (!Number.isFinite(target)) {
    return `${value}+`;
  }

  return `${String(displayValue).padStart(width, '0')}+`;
}

function HeroSection({ brand, hero, stats, projectCounters = [], logo }) {
  const [countersVisible, setCountersVisible] = useState(false);
  const countersRef = useRef(null);

  useEffect(() => {
    const node = countersRef.current;
    if (!node || !projectCounters.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setCountersVisible(entries.some((entry) => entry.isIntersecting));
      },
      {
        threshold: 0.32,
        rootMargin: '0px 0px -10% 0px'
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [projectCounters.length]);

  return (
    <section className="hero section reveal-section reveal-delay-1">
      <div className="hero-layout">
        <div className="hero-content hero-copy-stack">
          <p className="eyebrow">
            {brand.eyebrow}
          </p>
          <h1 className="hero-title">
            <span className="hero-title-prefix">{hero.title.prefix}</span>
            <span className="hero-title-highlight">{hero.title.highlight}</span>
          </h1>
          {hero.paragraphs.map((paragraph) => (
            <p key={paragraph} className="hero-copy">
              {paragraph}
            </p>
          ))}

          <div className="hero-actions">
            <a className="btn btn-solid" href={hero.primaryAction.href}>
              {hero.primaryAction.label}
            </a>
            <a className="btn btn-ghost" href={hero.secondaryAction.href}>
              {hero.secondaryAction.label}
            </a>
          </div>
        </div>

        <aside className="hero-logo-wrap" aria-label="Company logo">
          <img className="hero-logo" src={logo} alt={brand.name} />
        </aside>
      </div>

      <div className="stats-grid">
        {stats.map((item, index) => (
          <article
            key={item.label}
            className="stat-card reveal-card"
            style={{ '--stagger-index': index }}
          >
            <span className="card-icon" aria-hidden="true">
              <HeroIcon name={item.icon} />
            </span>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </article>
        ))}
      </div>

      {projectCounters.length ? (
        <div
          ref={countersRef}
          className={`project-counters-grid ${countersVisible ? 'is-visible' : ''}`}
        >
          {projectCounters.map((item, index) => (
            <article
              key={item.label}
              className="counter-card"
              style={{ '--stagger-index': index }}
            >
              <strong>
                <AnimatedCounter value={item.value} shouldAnimate={countersVisible} />
              </strong>
              <span>{item.label}</span>
              <span className="card-icon counter-card-icon" aria-hidden="true">
                <HeroIcon name={item.icon} />
              </span>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default HeroSection;
