import { useEffect, useRef, useState } from 'react';

function ImpactStatement({ id, statement, className = '' }) {
  const [isVisible, setIsVisible] = useState(false);
  const statementRef = useRef(null);

  useEffect(() => {
    const node = statementRef.current;
    if (!node || !statement) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.32,
        rootMargin: '0px 0px -10% 0px'
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [statement]);

  if (!statement) {
    return null;
  }

  const classes = ['impact-statement', isVisible ? 'is-visible' : '', className].filter(Boolean).join(' ');

  return (
    <div ref={statementRef} className={classes} id={id}>
      <div className="impact-lines">
        {statement.lines.map((line, lineIndex) => (
          <p key={`impact-line-${lineIndex}`} className="impact-line" style={{ '--line-index': lineIndex }}>
            {line.map((part, partIndex) => {
              const isLastPart = partIndex === line.length - 1;
              return (
                <span key={`impact-part-${lineIndex}-${partIndex}`}>
                  <span
                    className={`impact-word tone-${part.tone || 'base'}`}
                    style={{ '--word-index': partIndex }}
                  >
                    {part.text}
                  </span>
                  {isLastPart ? null : ' '}
                </span>
              );
            })}
          </p>
        ))}
      </div>
    </div>
  );
}

export default ImpactStatement;
