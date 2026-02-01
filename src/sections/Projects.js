
import React from "react";

const projects = [
    // Oldest to newest
    {
        title: "Freelance Full Stack Desktop & Web Developer (Jun 2014 – Feb 2020) [5 yrs 9 mos]",
        description: (
            <span>
                <b>Developed System’s Highlights:</b>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2.5rem', marginTop: 8, marginBottom: 8 }}>
                    <ul style={{ flex: 1, minWidth: 220, margin: 0, paddingLeft: 18 }}>
                        <li>POS</li>
                        <li>E-commerce</li>
                        <li>Management Information System</li>
                        <li>School Mgmt. System</li>
                        <li>OPAC Library System</li>
                    </ul>
                    <ul style={{ flex: 1, minWidth: 220, margin: 0, paddingLeft: 18 }}>
                        <li>Android Applications</li>
                        <li>School Dean Automize Student Evaluation System</li>
                        <li>Inventory and Monitoring System and many more minor systems developed</li>
                        <li>Harbour Fish Mgmt. System (New Zeeland)</li>
                    </ul>
                </div>
            </span>
        ),
        tags: ["POS", "E-commerce", "MIS", "School", "Library", "Android", "Evaluation", "Inventory", "Fishery", "Web App", "Desktop App"],
    },
    {
        title: "Enrollment System for Public School - Cagayan De Oro City",
        description: (
            <span>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Using Vb.Net programming Language</li>
                    <li>This system is designed to help school administrators save time and effort in creating schedules.</li>
                    <li>Efficient enrollment system for public school</li>
                    <li>Add Classroom Name and Building Name</li>
                    <li>Assign Classroom for Teacher and Students</li>
                    <li>Create Schedule per Teachers and Students</li>
                    <li>Print Report
                        via Excel</li>
                </ul>
            </span>
        ),
        tags: ["VB.Net", "Enrollment", "Scheduling", "Excel", "Public School"],
    },
    {
        title: "Real Estate Client (Philippines) (Apr 7, 2021 – Jun 24, 2022) [1 yr 2 mos]",
        description: (
            <span>
                <b>Developed Web Applications’ Highlights:</b><br />
                <i>Note: Systems below are all mobile responsive</i>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2.5rem', marginTop: 8, marginBottom: 8 }}>
                    <ul style={{ flex: 1, minWidth: 220, margin: 0, paddingLeft: 18 }}>
                        <li><b>Company Profiling Interface</b> – For marketing and for employee’s portal</li>
                        <li><b>Loan Monitoring System</b> – Includes Uploading Documents</li>
                        <li><b>Human Resource Management System</b>
                            <ul>
                                <li>Accounts/employee’s Account Mgmt.</li>
                                <li>Uploading and Downloading Loan Bulk of Data, etc.</li>
                            </ul>
                        </li>
                    </ul>
                    <ul style={{ flex: 1, minWidth: 220, margin: 0, paddingLeft: 18 }}>
                        <li><b>Chairman’s Monitoring System</b></li>
                        <li><b>Warehouse Systems</b>
                            <ul>
                                <li>Creation of Authority to Transfer Module</li>
                                <li>Transfer Out Materials Module</li>
                                <li>Transfer In Materials Module</li>
                                <li>Monitoring of Materials Module</li>
                                <li>Receiving of Materials Module</li>
                                <li>Releasing of Materials Module</li>
                                <li>(With Export to Excel and Printable Materials)</li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </span>
        ),
        tags: ["ReactJS", "Responsive Design", "HR", "Warehouse", "Document Upload", "Excel Export"],
    },
    {
        title: "Enterprise Client (June 27, 2022 – Present)",
        description: "Enhancement for an existing web application using ReactJS and Node.js (like Zoom/Google Meet with audio, video, chat, etc.). Added generative AI, transcribe AI, cobrowse, document upload/download, session timer, and more. Also built internal monitoring apps using PowerApps and Spring Boot.",
        tags: ["ReactJS", "Node.js", "AWS Lambda", "Amazon Bedrock", "PowerApps", "Spring Boot"],
    },
    {
        title: "Full-Stack Developer, ZeroOne Systems and Services (2025)",
        description: (
            <span>
                Built a complete POS system from scratch that now powers multiple retail businesses. Each business gets their own separate space with their data completely isolated. The system runs smoothly with zero downtime and handles everything in real-time — from tracking inventory across different locations to processing sales instantly.
            </span>
        ),
        tags: [
            "React 19", "Redux", "Node.js", "Express.js", "MySQL", "Sequelize ORM", "Socket.io", "JWT", "Role-based Access Control", "Real-time Updates", "Multi-tenant Architecture", "REST API", "Production-ready", "Git"
        ],
    },
    {
        title: "Full-Stack Developer, ZeroOne Systems and Services (2026)",
        description: (
            <span>
                Launched the POS system for a local coffee shop and pastry business. Trained the staff on how to use it and now it runs their daily operations — taking orders, tracking ingredients (especially important for perishables like pastries), and giving them insights into their sales. It's been running reliably with minimal downtime, processing hundreds of transactions every day.
            </span>
        ),
        tags: [
            "React 19", "Redux", "Node.js", "Express.js", "MySQL", "Sequelize ORM", "Socket.io", "JWT", "Role-based Access Control", "Real-time Updates", "Multi-tenant Architecture", "REST API", "Production Deployment", "Git"
        ],
    },
    {
        title: "PERATI",
        description: (
            <span>
                Developed and deployed a Flutter mobile app for PERATI, a CDO-based fintech payment platform. Built secure card transactions, real-time balance checks, and fare payment integration. Focused on smooth state management, reliable performance on low bandwidth, and seamless backend API integration.<br /><br />
                <b>Key Contributions:</b>
                <ul style={{ margin: '0.5rem 0 0 18px', padding: 0 }}>
                    <li>Implemented secure card transaction module</li>
                    <li>Built real-time balance synchronization</li>
                    <li>Integrated transportation fare payment system</li>
                    <li>Optimized app for low connectivity</li>
                    <li>Ensured reliable state management for transactions</li>
                    <li>Collaborated on backend API integration</li>
                </ul>
                <div style={{ marginTop: 8, color: 'var(--subtle-text, #B0B8C1)', fontSize: '0.97rem' }}>
                    <b>Tech Stack:</b> Flutter, Dart, Provider, HTTP Client, Payment APIs, Material Design (iOS & Android)
                </div>
            </span>
        ),
        tags: [
            "Flutter", "Dart", "Provider", "HTTP Client", "Payment APIs", "State Management", "Material Design", "iOS", "Android"
        ],
    },
];

function Projects() {
    return (
        <section
            style={{
                padding: '2.5rem 0 1.5rem 0',
                background: 'var(--main-bg)',
                color: 'var(--main-text)',
            }}
        >
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1.5rem' }}>
                <h2
                    style={{
                        color: 'var(--label-blue)',
                        fontWeight: 700,
                        fontSize: '1.5rem',
                        marginBottom: '1.7rem',
                        letterSpacing: '0.13em',
                        fontFamily: 'Fira Mono, Inter, Arial, sans-serif',
                        textTransform: 'uppercase',
                    }}
                >
                    Projects
                </h2>
                {projects.map((project, idx) => (
                    <div
                        key={idx}
                        style={{
                            marginBottom: '2.2rem',
                            borderBottom: '1px solid #fff',
                            paddingBottom: '1.2rem',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '0.3rem',
                            }}
                        >
                            <span
                                style={{
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    color: '#fff',
                                    fontFamily: 'Inter, Arial, sans-serif',
                                    letterSpacing: '-0.2px',
                                }}
                            >
                                {project.title}
                            </span>
                        </div>
                        <div
                            style={{
                                color: '#b0b8c1', // Consider making this a CSS variable if used elsewhere
                                fontSize: '0.93rem',
                                margin: '0.12rem 0 0.7rem 0',
                                fontFamily: 'Inter, Arial, sans-serif',
                                fontWeight: 400,
                                lineHeight: 1.55,
                                letterSpacing: '0.01em',
                            }}
                        >
                            {project.description}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {project.tags.map((tag, i) => (
                                <span
                                    key={i}
                                    style={{
                                        border: '1.2px solid #fff',
                                        color: '#fff',
                                        borderRadius: '6px',
                                        padding: '0.13rem 0.65rem',
                                        fontSize: '0.85rem',
                                        fontFamily: 'Fira Mono, Inter, Arial, sans-serif',
                                        fontWeight: 500,
                                        letterSpacing: '0.5px',
                                        background: 'transparent',
                                        marginBottom: '1px',
                                    }}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default Projects;
