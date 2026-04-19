const processSteps = [
  {
    title: 'Research & Requirements Gathering',
    icon: 'research'
  },
  {
    title: 'Strategy & Planning',
    icon: 'strategy'
  },
  {
    title: 'Design & Layout',
    icon: 'design'
  },
  {
    title: 'Content Creation',
    icon: 'content'
  },
  {
    title: 'Coding & Development',
    icon: 'coding'
  },
  {
    title: 'Testing & SQA',
    icon: 'testing'
  },
  {
    title: 'Maintenance & Enhancements',
    icon: 'maintenance'
  }
];

const processIcons = {
  research: (
    <>
      <path d="M8 7h10" />
      <path d="M8 11h9" />
      <path d="M8 15h5" />
      <path d="M6 4h14v16H6z" />
      <circle cx="18" cy="18" r="3.2" />
      <path d="m20.4 20.4 3 3" />
    </>
  ),
  strategy: (
    <>
      <path d="M5 6h18v14H5z" />
      <path d="M9 16v-4" />
      <path d="M13 16V9" />
      <path d="M17 16v-6" />
      <path d="M8 9h2" />
      <path d="M19 9h1" />
      <path d="M19 12h1" />
    </>
  ),
  design: (
    <>
      <path d="M7 20 4 17l11-11 3 3Z" />
      <path d="m14 7 3 3" />
      <path d="M18 4h3v3" />
      <path d="M18 4 14 8" />
      <path d="M9 5 7 7" />
      <path d="M21 15 19 17" />
    </>
  ),
  content: (
    <>
      <path d="M5 5h18v15H5z" />
      <path d="M8 9h7" />
      <path d="M8 12h6" />
      <path d="M8 15h4" />
      <path d="m17 17 4-4" />
      <path d="m18 12 4 4" />
    </>
  ),
  coding: (
    <>
      <path d="m10 9-4 4 4 4" />
      <path d="m18 9 4 4-4 4" />
      <path d="m15 6-3 14" />
      <path d="M5 21h18" />
    </>
  ),
  testing: (
    <>
      <path d="M5 7h18v14H5z" />
      <path d="M8 17h12" />
      <path d="M9 12h5" />
      <path d="M17 10v5" />
      <path d="M15 12h5" />
      <path d="M9 4h6v6H9z" />
    </>
  ),
  maintenance: (
    <>
      <path d="M7 17h5l4 3h5" />
      <path d="M7 17v-5" />
      <path d="M12 11a5 5 0 1 0 2-3.9" />
      <path d="m12 5 2 2-2 2" />
      <path d="M17 11v3l2 1" />
    </>
  )
};

function ProcessCycle() {
  return (
    <div className="process-flow" aria-label="Stages of web development life cycle">
      <div className="process-flow-heading">
        <strong>From Idea to Deployment</strong>
      </div>
      <div className="process-flow-track">
        {processSteps.map((step, index) => (
          <article
            key={step.title}
            className={`process-flow-step process-flow-step-${index + 1}`}
            style={{ '--stagger-index': index }}
          >
            <p className="process-flow-title">{step.title}</p>
            <div className="process-node" aria-hidden="true">
              <span className="process-icon">
                <svg viewBox="0 0 28 28" focusable="false">
                  {processIcons[step.icon]}
                </svg>
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default ProcessCycle;
