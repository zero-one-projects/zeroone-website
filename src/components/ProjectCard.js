import React from "react";
import "./ProjectCard.css";




const ExternalIcon = () => (
    <svg className="external-icon" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="15" stroke="#bbb" strokeWidth="2" fill="none" />
        <path d="M12 20L20 12" stroke="#bbb" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 12H20V18" stroke="#bbb" strokeWidth="2" strokeLinecap="round" />
    </svg>
);


const ProjectCard = ({ title, highlights, tags, link, category }) => (
    <div className="project-card">
        {category && <div className="project-category">{category}</div>}
        <div className="project-title-row">
            <span className="project-title-big">{title}</span>
        </div>
        <div className="project-highlights-alt">
            {highlights.map((item, idx) => (
                <div key={idx} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
        </div>
        {tags && tags.length > 0 && (
            <div className="project-tags">
                {tags.map((tag, idx) => (
                    <span className="project-tag" key={idx}>{tag}</span>
                ))}
            </div>
        )}
        {link && (
            <a className="project-external-link" href={link} target="_blank" rel="noopener noreferrer">
                <ExternalIcon />
            </a>
        )}
    </div>
);

export default ProjectCard;
