const defaultContractText = `1. PROJECT SCOPE & AGREED DELIVERABLES
The accepted quotation identifies the project scope, features, and functionality to be delivered.

**All features and functionality agreed upon in the accepted quotation will be implemented as agreed** and form part of the project scope.

2. IMPLEMENTATION TIMELINE
• **Standard Implementation:** 10–12 weeks.
• **Accelerated (Rush) Implementation:** Approximately 8–10 weeks.

The timeline depends on timely Client feedback, approval cycles, system readiness, and availability of required data.

Rush implementation is available upon request, **subject to feasibility and additional fees.** Final pricing may vary based on timeline and resource requirements.

3. MAJOR MODIFICATIONS & ADDITIONAL FEATURES
**All qualifying minor enhancements are provided free of charge during the included three (3)-month support period**, as described in Section 5.

Major modifications, redesigns, or additional features **outside the agreed quotation scope** are excluded and will be evaluated and quoted separately.

4. TECHNICAL SUPPORT
During the **three (3)-month post-deployment warranty and support period after final system sign-off**, the Client shall be entitled to **unlimited qualifying Technical Support at no additional charge** for the agreed features and functionality included in the accepted quotation.

**“Technical Support”** means reasonable assistance relating to the operation and use of the delivered System, including troubleshooting errors, bugs, and unexpected System behavior; assistance with existing System functionality; guidance regarding proper use; investigation and resolution of System-related technical issues; corrective maintenance; reasonable configuration assistance; and general technical assistance relating to the delivered System.

**“Unlimited Technical Support”** means that there is **no fixed numerical limit on qualifying technical support requests** during the included three (3)-month support period.

Unlimited Technical Support does not mean guaranteed immediate resolution, dedicated full-time personnel, unlimited development work, unlimited simultaneous work, or twenty-four-hour (24/7) support unless expressly agreed in writing.

Support requests may be reasonably prioritized based on their nature, severity, technical complexity, dependencies, current support/development commitments, and the Provider's reasonable scheduling and availability.

Technical Support does not automatically include new modules, major features, substantial redesign/redevelopment, major workflow changes, data migration, new or materially modified third-party integrations, substantial infrastructure/database/security/architecture changes, on-site services, or extensive retraining.

After the included three (3)-month period, continued Technical Support will be provided only upon the Client’s request, under a separate support agreement and subject to applicable fees.

5. MINOR ENHANCEMENTS
A **“Minor Enhancement”** means a small modification, adjustment, improvement, or refinement to existing functionality that remains within the agreed Feature Scope in the accepted quotation and the existing System architecture.

Examples may include reasonable text or label changes, small UI adjustments, simple field additions/removals, simple validation adjustments, small report modifications, minor workflow adjustments, or comparable refinements that do not require material development.

During the **three (3)-month post-deployment warranty and support period after final system sign-off**, there shall be **no fixed numerical limit on qualifying Minor Enhancement requests**, and qualifying Minor Enhancements shall be implemented **without an additional development charge**.

**“Unlimited Minor Enhancements”** does not mean unlimited simultaneous development, immediate implementation, unlimited development hours, or that every requested change automatically qualifies as a Minor Enhancement.

The Provider shall reasonably assess and classify each requested enhancement according to its actual scope, technical complexity, development effort, impact on existing functionality, architecture, database, workflows, integrations, infrastructure, security, testing requirements, and maintenance requirements.

Minor Enhancement requests may be reasonably prioritized and scheduled by the Provider.

6. WARRANTY & SUPPORT
The project includes a **three (3)-month post-deployment warranty and support period** after final system sign-off, covering:

• Bug fixes related to delivered functionality.
• Minor refinements and small enhancements not requiring major system or architectural changes.

After the initial three (3)-month support period, continued maintenance and technical support will be subject to applicable fees and provided only upon the Client’s request, under a separate support agreement.

7. DOMAIN & SERVER COSTS
Domain and server costs are not included in the project cost. These recurring expenses shall be shouldered by the Client and billed separately from the project cost.

• **Virtual Private Server (VPS) Hosting:** Hosting costs depend on the selected provider, server specifications, and actual resource usage. Hosting fees are billed separately from the project cost.
• **Domain Name Registration:** Registration and renewal costs depend on the chosen domain extension (e.g., .com, .ph, .net) and registrar pricing. Domain registration and renewal fees are billed separately from the project cost.

8. DOMAIN & SERVER ACCESS HANDOVER
Upon project completion and final handover, **all administrative access credentials for the domain and server will be fully transferred to the Client.**

From that point onward, the Client shall be responsible for managing, maintaining, and renewing the domain and server services, unless a separate support or management agreement is requested and agreed upon in writing.

9. PROJECT SUSPENSION
If the Client fails to provide the required information, approvals, materials, feedback, or milestone payments for **more than thirty (30) calendar days**, the Provider reserves the right to place the project on hold.

The project schedule and delivery timeline may be revised accordingly. Development work will resume only after all outstanding requirements and payments have been fulfilled. Any delays resulting from such suspension shall not be considered the responsibility of the Provider

10. PAYMENT TERMS
The agreed project cost shall be paid according to the following milestones:

1. **20% Down Payment (DP)** — before project start.
2. **70% Second Payment** — upon completion of development.
3. **10% Final Payment** — upon system go-live.

Progression to the next project milestone is subject to settlement of the corresponding milestone payment.

11. PAYMENT & CANCELLATION POLICY
Upon acceptance of the quotation and payment of the down payment, the Provider will allocate personnel, schedule development resources, and commence work on the project.

**All milestone payments are non-refundable**, as they cover project planning, requirements analysis, system design, software development, resource allocation, and administrative costs.

Should the Client voluntarily cancel, suspend indefinitely, or terminate the project after development has commenced, all payments already made shall be retained by the Provider to cover work completed and resources committed to the project.

Any completed modules, source code, documentation, designs, or other deliverables shall remain the exclusive property of the Provider **until full payment of the agreed project cost has been received.**`;

const defaultContractTexts = { project: defaultContractText, subscription: '', sync_court: '', pos: require('../content/pos-contract-reference.json').terms };
function quotationContract(document) { if (document.clientFlow === 'quotation_only') return ''; if (document.contractSource === 'pdf' && document.contractPdf) return `Uploaded PDF contract: ${document.contractPdf.fileName}\nSHA-256: ${document.contractPdf.sha256}`; return document.contractText?.trim() || defaultContractTexts[document.quoteType || 'project'] || ''; }
module.exports = { defaultContractText, defaultContractTexts, quotationContract };
