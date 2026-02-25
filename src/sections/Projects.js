import React from "react";
import "./Projects.css";

const splitListStyle = { display: 'flex', flexWrap: 'wrap', gap: '2.5rem', marginTop: 8, marginBottom: 8 };
const splitColumnStyle = { flex: 1, minWidth: 220, margin: 0, paddingLeft: 18 };

const projects = [
    {
        title: "Full Stack Desktop & Web Developer",
        description: (
            <span>
                <b>Developed System's Highlights:</b>
                <div style={splitListStyle}>
                    <ul style={splitColumnStyle}>
                        <li>POS</li>
                        <li>E-commerce</li>
                        <li>Management Information System</li>
                        <li>School Mgmt. System</li>
                        <li>OPAC Library System</li>
                    </ul>
                    <ul style={splitColumnStyle}>
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
                    <li>Print Report via Excel</li>
                </ul>
            </span>
        ),
        tags: ["VB.Net", "Enrollment", "Scheduling", "Excel", "Public School"],
    },
    {
        title: "Real Estate Client (Philippines)",
        description: (
            <span>
                <b>Developed Web Applications' Highlights:</b><br />
                <i>Note: Systems below are all mobile responsive</i>
                <div style={splitListStyle}>
                    <ul style={splitColumnStyle}>
                        <li><b>Company Profiling Interface</b> - For marketing and for employee's portal</li>
                        <li><b>Loan Monitoring System</b> - Includes Uploading Documents</li>
                        <li><b>Human Resource Management System</b>
                            <ul>
                                <li>Accounts/employee's Account Mgmt.</li>
                                <li>Uploading and Downloading Loan Bulk of Data, etc.</li>
                            </ul>
                        </li>
                    </ul>
                    <ul style={splitColumnStyle}>
                        <li><b>Chairman's Monitoring System</b></li>
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
        title: "Enterprise Client",
        description: "Enhancement for an existing web application using ReactJS and Node.js (like Zoom/Google Meet with audio, video, chat, etc.). Added generative AI, transcribe AI, cobrowse, document upload/download, session timer, and more. Also built internal monitoring apps using PowerApps and Spring Boot.",
        tags: ["ReactJS", "Node.js", "AWS Lambda", "Amazon Bedrock", "PowerApps", "Spring Boot"],
    },
    {
        title: "SOTI Bakery & Convenience POS Platform",
        description: (
            <span>
                Built and maintained a multi-tenant POS platform for SOTI Bakery and Convenience and other businesses.
                <ul style={{ margin: '0.5rem 0', paddingLeft: 18 }}>
                    <li>Applied strict tenant isolation using customer_id across auth, inventory, orders, and notifications</li>
                    <li>Implemented role-based access for Super Admin, Admin, and POS users with branch-level controls</li>
                    <li>Delivered real-time low-stock alerts and operations updates with tenant-specific Socket.IO rooms</li>
                    <li>Developed modules for sales, branch inventory, raw materials, production/disposal logs, and analytics</li>
                </ul>
            </span>
        ),
        tags: [
            "React 19", "Redux Toolkit", "Node.js", "Express 5", "MySQL", "Sequelize ORM", "Socket.IO", "JWT Authentication", "Role-Based Access Control", "Multi-Tenant Architecture", "Branch-Level Inventory + Sales Tracking", "Real-Time Notifications", "REST API", "Docker + Nginx", "Git"
        ],
    },
    {
        title: "Full-Stack Developer, Zero One IT Solutions",
        description: (
            <span>
                Launched the POS system for a local coffee shop and pastry business. Trained the staff on how to use it and now it runs their daily operations - taking orders, tracking ingredients (especially important for perishables like pastries), and giving them insights into their sales. It's been running reliably with minimal downtime, processing hundreds of transactions every day.
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
                <div style={{ marginTop: 8, fontSize: '0.95rem' }}>
                    <b>Tech Stack:</b> Flutter, Dart, Provider, HTTP Client, Payment APIs, Material Design (iOS & Android)
                </div>
            </span>
        ),
        tags: ["Flutter", "Dart", "Provider", "HTTP Client", "Payment APIs", "State Management", "Material Design", "iOS", "Android"],
    },
];

function Projects() {
    return (
        <section className="projects-section">
            <div className="projects-inner">
                <h2 className="projects-title">Projects</h2>
                {projects.map((project, idx) => (
                    <article key={idx} className="project-entry">
                        <h3 className="project-entry-title">{project.title}</h3>
                        <div className="project-entry-desc">{project.description}</div>
                        <div className="project-tags">
                            {project.tags.map((tag, i) => (
                                <span key={i} className="project-tag">{tag}</span>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default Projects;
