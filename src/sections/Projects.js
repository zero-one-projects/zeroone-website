import React from "react";
import "./Projects.css";

const projects = [
    {
        title: "Multi-Tenant POS Platform",
        summary: "Built a production-ready POS platform for bakery and retail operations with role-based controls, branch-level inventory, and real-time operational updates.",
        outcome: "Enabled daily high-volume transactions with reliable uptime and faster branch reporting.",
        tags: ["React 19", "Node.js", "Express 5", "MySQL", "Socket.IO", "Docker"],
    },
    {
        title: "Enterprise Collaboration Enhancements",
        summary: "Improved a live enterprise collaboration platform with AI-assisted capabilities, session utilities, and document workflows while maintaining performance.",
        outcome: "Expanded product value without interrupting core business communication workflows.",
        tags: ["ReactJS", "Node.js", "AWS Lambda", "Amazon Bedrock", "Spring Boot"],
    },
    {
        title: "Real Estate Operations Suite",
        summary: "Delivered multiple internal web systems covering HR, loan monitoring, and warehouse process tracking with responsive UX for distributed teams.",
        outcome: "Reduced manual operations and improved visibility across finance, HR, and logistics teams.",
        tags: ["ReactJS", "Responsive UI", "HR Systems", "Warehouse Tracking", "Excel Export"],
    },
    {
        title: "PERATI Fintech Mobile App",
        summary: "Developed and deployed a mobile payment app with secure card transactions, fare integration, and resilient performance under low-connectivity conditions.",
        outcome: "Provided dependable cashless transaction flows for end users in daily transport use cases.",
        tags: ["Flutter", "Dart", "Provider", "Payment APIs", "Android", "iOS"],
    },
];

function Projects() {
    return (
        <section className="projects-section" id="projects">
            <div className="projects-inner">
                <h2 className="projects-title">Selected Work</h2>
                <p className="projects-intro">
                    We design and ship digital products that solve operational bottlenecks, unlock revenue opportunities, and stay maintainable as your business scales.
                </p>
                <div className="project-grid">
                    {projects.map((project, idx) => (
                        <article key={idx} className="project-entry">
                            <h3 className="project-entry-title">{project.title}</h3>
                            <p className="project-entry-desc">{project.summary}</p>
                            <p className="project-entry-outcome">
                                <span>Outcome:</span> {project.outcome}
                            </p>
                            <div className="project-tags">
                                {project.tags.map((tag, i) => (
                                    <span key={i} className="project-tag">{tag}</span>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Projects;
