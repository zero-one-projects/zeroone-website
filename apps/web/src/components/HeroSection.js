import { useEffect, useRef, useState } from 'react';

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

function HeroSection({ hero }) {
  return (
    <section className="hero section reveal-section reveal-delay-1">
      <div className="hero-layout">
        <div className="hero-content hero-copy-stack">
          <h1 className="hero-title">
            <span className="hero-title-prefix">{hero.title.prefix}</span>{' '}
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


      </div>


    </section>
  );
}

export function HeroMetrics({ stats, projectCounters = [] }) {
  const countersRef = useRef(null);
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    const counters = countersRef.current;
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!counters || !window.IntersectionObserver || media?.matches) return undefined;

    let frame = 0;
    let start;
    let inView = false;
    setProgress(0);
    function animate(now) {
      start ??= now;
      const elapsed = Math.min((now - start) / 1600, 1);
      setProgress(1 - (1 - elapsed) ** 3);
      if (elapsed < 1) frame = window.requestAnimationFrame(animate);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.4 && !inView) {
        inView = true;
        start = undefined;
        setProgress(0);
        frame = window.requestAnimationFrame(animate);
      } else if (!entry.isIntersecting) {
        inView = false;
        window.cancelAnimationFrame(frame);
        start = undefined;
        setProgress(0);
      }
    }, { threshold: [0, 0.4] });
    observer.observe(counters);

    function finish() {
      if (media.matches) {
        observer.disconnect();
        window.cancelAnimationFrame(frame);
        setProgress(1);
      }
    }
    media?.addEventListener?.('change', finish);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      media?.removeEventListener?.('change', finish);
    };
  }, []);

  return (
    <div className="hero-metrics-panel">
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
          className="project-counters-grid counter-strip is-visible"
          ref={countersRef}
        >
          <div className="project-counter-items">
            {projectCounters.map((item) => (
              <article key={item.label} className="counter-card">
                <strong aria-label={`${item.value}+`}>
                  {String(Math.round(Number(item.value) * progress)).padStart(String(item.value).length, '0')}+
                </strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </div>
      ) : null}
      </div>
  );
}

export default HeroSection;
