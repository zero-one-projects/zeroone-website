import BackToTop from '../components/BackToTop';
import ArrowUpRight from '../components/ArrowUpRight';
import { useEffect, useRef, useState } from "react";
import HeroSlideshow from "../components/HeroSlideshow";
import rcmVenturesProject from '../assets/featured-projects/rcm-ventures-login.png';
import rcmVenturesBusinesses from '../assets/featured-projects/rcm-ventures-businesses.png';
import rcmVenturesReleaseAnalytics from '../assets/featured-projects/rcm-ventures-release-analytics.png';
import diamondlinkProject from '../assets/featured-projects/diamond-link-ict.png';
import diamondlinkClientLogin from '../assets/featured-projects/diamond-link-client-login.png';
import diamondlinkCareers from '../assets/featured-projects/diamond-link-careers.png';
import birLogo from "../assets/landing/BIR.png";
import secLogo from "../assets/landing/sec.jpg";
import italianHolidaysProject from "../assets/featured-projects/italian-holidays-login.png";
import italianHolidaysAbout from "../assets/featured-projects/italian-holidays-about.png";
import italianHolidaysContact from "../assets/featured-projects/italian-holidays-contact.png";
import madrasaManagementProject from "../assets/featured-projects/madrasa-management-login.png";
import madrasaLoginPortal from "../assets/featured-projects/madrasa-login-portal.png";
import madrasaDashboard from "../assets/featured-projects/madrasa-management-dashboard.png";
import synccourtProject from "../assets/featured-projects/synccourt-platform.png";
import livePosProject from "../assets/featured-projects/zeroone-pos-login.png";
import posDashboard from "../assets/featured-projects/zeroone-pos-dashboard.png";
import posReports from "../assets/featured-projects/zeroone-pos-reports.png";
import ChatWidget from "../components/ChatWidget";
import Header from "../components/Header";
import Seo, { defaultSiteUrl, toAbsoluteUrl } from "../components/Seo";
import { getApiBaseUrl } from "../utils/apiBaseUrl";

const companyProfileAboutUrl = "/about-us";
const companyProfileServicesUrl = "/about-us#services";
const companyProfileHomeUrl = "/";
const apiBaseUrl = getApiBaseUrl();
const contactCooldownStorageKey = "zerooneContactCooldownUntil";
const contactCooldownMs = 5 * 60 * 1000;
const landingBrand = {
  name: "ZeroOne IT Inc.",
};
const landingNavigation = [
  { id: "home", label: "Home", href: "/" },
  { id: "services", label: "Services", href: companyProfileServicesUrl },
  { id: "about", label: "About Us", href: "/about-us" },
  { id: "contact", label: "Contact", href: "/#contact" },
];
const homeTitle = "ZeroOne IT Inc. | Custom Software, Web Platforms and AI Automation";
const homeDescription =
  "ZeroOne IT Inc. builds custom software, modern websites, web platforms, mobile apps, internal systems, and AI automation for growing businesses in the Philippines.";
const homeStructuredData = [
  {
    "@type": "Organization",
    "@id": `${defaultSiteUrl}/#organization`,
    name: "ZeroOne IT Inc.",
    legalName: "ZeroOne Information Technology Inc.",
    url: defaultSiteUrl,
    logo: toAbsoluteUrl("/android-chrome-512x512.png"),
    foundingDate: "2026-05",
    email: "info@zerooneitinc.com",
    telephone: "+63 919 079 7137",
    areaServed: ["Philippines", "Worldwide"],
    sameAs: [
      "https://www.facebook.com/zeroone.it.inc",
      "https://www.instagram.com/zerooneit.inc/",
      "https://www.linkedin.com/company/112718341/"
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "info@zerooneitinc.com",
        telephone: "+63 919 079 7137",
        areaServed: "PH",
        availableLanguage: ["English", "Filipino"]
      }
    ]
  },
  {
    "@type": "WebSite",
    "@id": `${defaultSiteUrl}/#website`,
    name: "ZeroOne IT Inc.",
    url: defaultSiteUrl,
    publisher: {
      "@id": `${defaultSiteUrl}/#organization`
    }
  },
  {
    "@type": "ProfessionalService",
    "@id": `${defaultSiteUrl}/#professional-service`,
    name: "ZeroOne IT Inc.",
    url: defaultSiteUrl,
    image: toAbsoluteUrl("/android-chrome-512x512.png"),
    email: "info@zerooneitinc.com",
    telephone: "+63 919 079 7137",
    address: {
      "@type": "PostalAddress",
      addressCountry: "PH"
    },
    areaServed: {
      "@type": "Country",
      name: "Philippines"
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Software development services",
      itemListElement: [
        "Custom software development",
        "AI automation",
        "Internal systems",
        "Web platforms",
        "Mobile apps",
        "Business workflow solutions"
      ].map((name) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name
        }
      }))
    }
  }
];

const featuredProjects = [
  {
    title: "Italian Holidays Travel Platform",
    category: "Travel & Tourism",
    description:
      "A premium travel website experience for curated Italian holiday tours, destination discovery, and lead generation.",
    image: italianHolidaysProject,
    imageLabel: "Traveler login",
    previewLabels: { left: "About Us", right: "Contact" },
    previewImages: {
      left: italianHolidaysAbout,
      right: italianHolidaysContact,
    },
    alt: "Italian Holidays traveler login page with a Cinque Terre coastal image and account sign-in form",
    tags: ["Travel Web", "Booking UX", "SEO"],
    href: "https://italianholidays.net/login",
    cta: "View Live Project",
    status: "Live",
  },
  {
    title: "RCM Ventures Business Portal",
    category: "Business Operations",
    description:
      "A centralized business portal for tenant operations, user administration, and branch coordination, with dedicated administrator access.",
    image: rcmVenturesProject,
    imageLabel: "Administrator login",
    previewLabels: { right: "Business portals", left: "Release analytics" },
    previewImages: {
      right: rcmVenturesBusinesses,
      left: rcmVenturesReleaseAnalytics,
    },
    alt: "RCM Ventures business portal with tenant operations, user administration, branch coordination, and an administrator sign-in form",
    tags: ["Business Portal", "Tenant Operations", "User Management"],
    href: "https://www.rcmventures.net/admin/login",
    cta: "View Live Project",
    status: "Completed",
  },
  {
    title: "Madrasa Management Enrollment System",
    category: "Education Management",
    description:
      "An ongoing centralized platform for admissions, enrollment, students, attendance, payments, hifz tracking, and reports.",
    image: madrasaLoginPortal,
    imageLabel: "Login portal",
    previewLabels: { left: "Alternate login", right: "Dashboard" },
    previewImages: {
      left: madrasaManagementProject,
      right: madrasaDashboard,
    },
    alt: "Madrasa Management and Enrollment System login portal with a centered school crest and sign-in form on an ivory background",
    tags: ["Enrollment", "Payments", "Reports"],
    href: "",
    cta: "Ongoing Project",
    status: "Ongoing",
  },
  {
    title: "SaaS Pickleball Booking Platform",
    category: "Sports & Recreation",
    description:
      "An ongoing SaaS product for court reservations, player profiles, tournaments, memberships, schedules, and online payments.",
    image: synccourtProject,
    alt: "Sync Court coming-soon website with its pickleball club dashboard and mobile booking preview",
    tags: ["SaaS", "Bookings", "Payments"],
    href: "",
    cta: "Ongoing Project",
    status: "Ongoing",
  },
  {
    title: "SaaS POS Platform",
    category: "Retail Operations",
    description:
      "A SaaS point-of-sale platform for checkout, inventory, orders, receipts, cashier activity, and daily sales reporting.",
    image: livePosProject,
    imageLabel: "Staff login",
    previewLabels: { left: "Dashboard", right: "Reports" },
    previewImages: {
      left: posDashboard,
      right: posReports,
    },
    alt: "ZeroOne Point of Sale System staff login page with sales and operations features",
    tags: ["SaaS", "POS", "Inventory", "Sales"],
    href: "https://pos.zeroone-apps.com/login",
    cta: "View Live Project",
    status: "Live",
  },
  {
    title: "Diamondlink ICT Services Platform",
    category: "ICT & Connected Services",
    description:
      "An ongoing platform for technology support, connected security, and smart-space services, with client accounts and staff access.",
    image: diamondlinkProject,
    imageLabel: "ICT services homepage",
    previewLabels: { left: "Client login", right: "Careers" },
    previewImages: {
      left: diamondlinkClientLogin,
      right: diamondlinkCareers,
    },
    alt: "Diamondlink ICT homepage with a blue cityscape, client and staff login links, and technology support, security, and smart-space services",
    tags: ["ICT Services", "Client Portal", "Smart Spaces"],
    href: "https://www.diamondlinkict.com/",
    cta: "View Project Preview",
    status: "Ongoing",
  },
];

const footerCapabilities = [
  { label: "Custom Software", href: companyProfileServicesUrl },
  { label: "AI Automation", href: companyProfileServicesUrl },
  { label: "Internal Systems", href: companyProfileServicesUrl },
  { label: "Web Platforms", href: companyProfileServicesUrl },
  { label: "Mobile Apps", href: companyProfileServicesUrl },
];

const footerLinks = [
  { label: "Home", href: companyProfileHomeUrl },
  { label: "About", href: companyProfileAboutUrl },
  { label: "Services", href: companyProfileServicesUrl },
  { label: "Contact Us", href: "/#contact" },
  { label: "Facebook", href: "https://www.facebook.com/zeroone.it.inc" },
];

const registrationBadges = [
  { label: "SEC Registered", logo: secLogo, alt: "SEC logo" },
  { label: "BIR Registered", logo: birLogo, alt: "BIR logo" },
];

const contactMethods = [
  {
    title: "Email us",
    value: "info@zerooneitinc.com",
    href: "mailto:info@zerooneitinc.com",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
        <path d="m5.5 7 6.5 5 6.5-5" />
      </svg>
    ),
  },
  {
    title: "Call us",
    value: "+63 919 079 7137",
    href: "tel:+639190797137",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.2 4.8c.5-.5 1.4-.5 1.9 0l1.7 1.7c.5.5.5 1.2.1 1.8l-1.4 1.8a13.6 13.6 0 0 0 4.4 4.4l1.8-1.4c.5-.4 1.3-.4 1.8.1l1.7 1.7c.5.5.5 1.4 0 1.9l-1.2 1.2c-.8.8-2 1.1-3.1.7A18.3 18.3 0 0 1 4.5 8.9c-.4-1.1-.1-2.3.7-3.1z" />
        <path d="M14.5 5.5a5 5 0 0 1 4 4" />
        <path d="M14.5 2.5a8 8 0 0 1 7 7" />
      </svg>
    ),
  },
  {
    title: "Our location",
    value: "Philippines",
    href: "https://maps.google.com/?q=Philippines",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" />
        <path d="M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      </svg>
    ),
  },
];

function ProjectBrowserPreview({ project, variant = 'main' }) {
  const decorative = variant !== 'main';
  const image = decorative ? project.previewImages?.[variant] || project.image : project.image;
  const label = project.href ? new URL(project.href).hostname : 'Product preview';
  return (
    <div className={`landing-browser-preview landing-browser-preview--${variant}`} aria-hidden={decorative || undefined}>
      <div className="landing-browser-toolbar" aria-hidden="true">
        <span className="landing-browser-lights"><i /><i /><i /></span>
        <span className="landing-browser-address">{label}</span>
        <span className="landing-browser-expand"><ArrowUpRight /></span>
      </div>
      <div className="landing-browser-viewport">
        <img src={image} alt={decorative ? '' : project.alt} loading="lazy" />
      </div>
    </div>
  );
}

function FeaturedProjectCard({ project }) {
  const galleryRef = useRef(null);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || !window.IntersectionObserver) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      gallery.dataset.visible = String(entry.isIntersecting && entry.intersectionRatio >= 0.25);
    }, { threshold: [0, 0.25], rootMargin: '-80px 0px 0px 0px' });

    observer.observe(gallery);
    return () => observer.disconnect();
  }, []);

  return (
    <article className="landing-featured-project-card">
      <div className="landing-project-info">
        <div className="landing-project-meta">
          <p className="landing-project-category">{project.category}</p>
          <span className="landing-featured-project-status">{project.status}</span>
        </div>
        <h3 className="landing-featured-project-name">{project.title}</h3>
        <p className="landing-featured-project-description">{project.description}</p>
      </div>
      <div className="landing-project-gallery" ref={galleryRef}>
        <ProjectBrowserPreview project={project} variant="left" />
        <ProjectBrowserPreview project={project} variant="right" />
        <ProjectBrowserPreview project={project} />
      </div>
      <div className="landing-featured-project-footer">
        <div className="landing-featured-project-tags" aria-label={`${project.title} technologies`}>
          {project.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        {project.href ? (
          <a className="landing-featured-project-link" href={project.href} target="_blank" rel="noreferrer">
            {project.cta || "View Live Project"}<ArrowUpRight />
          </a>
        ) : (
          <span className="landing-featured-project-link landing-is-pending">Currently in development</span>
        )}
      </div>
    </article>
  );
}

export default function App() {
  const projectStackRef = useRef(null);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    message: "",
  });
  const isContactCoolingDown = cooldownRemainingMs > 0;
  const cooldownTotalSeconds = Math.ceil(cooldownRemainingMs / 1000);
  const cooldownMinutes = Math.floor(cooldownTotalSeconds / 60);
  const cooldownSeconds = cooldownTotalSeconds % 60;
  const cooldownLabel = `${cooldownMinutes}:${String(cooldownSeconds).padStart(2, "0")}`;
  const [submitState, setSubmitState] = useState({
    status: "idle",
    message: "",
  });

  useEffect(() => {
    const stack = projectStackRef.current;
    const media = window.matchMedia?.(
      '(prefers-reduced-motion: no-preference)',
    );
    if (!stack || !media) return undefined;

    const slides = Array.from(stack.children);
    let frame = 0;
    function updateStack() {
      frame = 0;
      const preferredTop = Number.parseFloat(window.getComputedStyle(stack).getPropertyValue('--stack-offset')) || 112;
      slides.forEach((slide) => {
        const card = slide.firstElementChild;
        // Tall cards scroll fully into view before sticking, even on short phones.
        const top = Math.min(preferredTop, window.innerHeight - card.offsetHeight - 24);
        slide.style.setProperty('--stack-top', `${top}px`);
      });
      const positions = slides.map((slide) => slide.getBoundingClientRect());
      slides.forEach((slide, index) => {
        const top = Number.parseFloat(slide.style.getPropertyValue('--stack-top'));
        const next = positions[index + 1];
        const progress = media.matches && next
          ? Math.min(1, Math.max(0, 1 - (next.top - top) / Math.max(1, positions[index].height)))
          : 0;
        slide.style.setProperty('--stack-scale', String(1 - progress * 0.15));
        slide.style.setProperty('--stack-brightness', String(1 - progress * 0.25));
      });
    }
    function queueUpdate() {
      if (!frame) frame = window.requestAnimationFrame(updateStack);
    }
    queueUpdate();
    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate);
    media.addEventListener?.('change', queueUpdate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', queueUpdate);
      window.removeEventListener('resize', queueUpdate);
      media.removeEventListener?.('change', queueUpdate);
    };
  }, []);

  useEffect(() => {
    function syncCooldown() {
      const cooldownUntil = Number(window.localStorage.getItem(contactCooldownStorageKey) || 0);
      const nextRemainingMs = Math.max(0, cooldownUntil - Date.now());

      setCooldownRemainingMs(nextRemainingMs);

      if (nextRemainingMs === 0 && cooldownUntil) {
        window.localStorage.removeItem(contactCooldownStorageKey);
        setSubmitState((current) =>
          current.status === "error" && current.message.includes("Please wait 5 minutes")
            ? {
                status: "idle",
                message: "",
              }
            : current,
        );
      }
    }

    syncCooldown();
    const intervalId = window.setInterval(syncCooldown, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  function scrollToContact(event) {
    event.preventDefault();

    const contactSection = document.getElementById("contact");
    if (!contactSection) {
      return;
    }

    const topbar = document.querySelector(".landing-topbar");
    const topbarHeight = topbar?.getBoundingClientRect().height || 72;
    const scrollTop = Math.max(
      0,
      contactSection.getBoundingClientRect().top + window.scrollY - topbarHeight - 12,
    );

    window.history.pushState(null, "", "/#contact");
    window.scrollTo({
      top: scrollTop,
      behavior: "smooth",
    });
  }

  function scrollToFeaturedProjects(event) {
    event.preventDefault();

    const featuredProjectsSection = document.getElementById("featured-projects");
    if (!featuredProjectsSection) {
      return;
    }

    const topbar = document.querySelector(".landing-topbar");
    const topbarHeight = topbar?.getBoundingClientRect().height || 72;
    const scrollTop = Math.max(
      0,
      featuredProjectsSection.getBoundingClientRect().top + window.scrollY - topbarHeight - 12,
    );

    window.history.pushState(null, "", "/#featured-projects");
    window.scrollTo({
      top: scrollTop,
      behavior: "smooth",
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isContactCoolingDown) {
      setSubmitState({
        status: "error",
        message: `Please wait ${cooldownLabel} before sending another message.`,
      });
      return;
    }

    setSubmitState({
      status: "submitting",
      message: "Sending your message...",
    });

    try {
      const response = await fetch(`${apiBaseUrl}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formState.name,
          email: formState.email,
          message: formState.message,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);

        if (response.status === 429) {
          const retryAfterSeconds = Number(response.headers.get("Retry-After") || 300);
          const cooldownUntil = Date.now() + retryAfterSeconds * 1000;
          window.localStorage.setItem(contactCooldownStorageKey, String(cooldownUntil));
          setCooldownRemainingMs(cooldownUntil - Date.now());
        }

        throw new Error(errorPayload?.message || "Unable to submit form");
      }

      const payload = await response.json().catch(() => null);
      const cooldownUntil = Date.now() + Number(payload?.cooldownSeconds || contactCooldownMs / 1000) * 1000;
      window.localStorage.setItem(contactCooldownStorageKey, String(cooldownUntil));
      setCooldownRemainingMs(cooldownUntil - Date.now());

      setSubmitState({
        status: "success",
        message: "Thanks. Your message has been sent.",
      });
      setFormState({
        name: "",
        email: "",
        message: "",
      });
    } catch (error) {
      setSubmitState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please email us directly at info@zerooneitinc.com.",
      });
    }
  }

  return (
    <div className="landing-page-shell">
      <Seo
        title={homeTitle}
        description={homeDescription}
        canonicalPath="/"
        structuredData={homeStructuredData}
      />
      <Header
        brand={landingBrand}
        className="landing-topbar"
        navigation={landingNavigation.map((item) =>
          item.id === "contact"
            ? {
                ...item,
                onClick: scrollToContact,
              }
            : item,
        )}
      />

      <main className="landing-hero-shell">
        <section className="landing-hero-copy">
          <HeroSlideshow>
            <div className="landing-hero-actions">
              <a
                className="landing-hero-button landing-hero-button-primary"
                href="/#contact"
                onClick={scrollToContact}
              >
                Get a Quote
              </a>
              <a className="landing-hero-button landing-hero-button-secondary" href="/#featured-projects" onClick={scrollToFeaturedProjects}>
                View Our Work <ArrowUpRight />
              </a>
            </div>
          </HeroSlideshow>
        </section>
      </main>

      <section
        className="landing-featured-projects-shell"
        id="featured-projects"
      >
        <div className="landing-featured-projects-header">
          <div>
            <p className="landing-footer-kicker">Featured Projects</p>
            <h2 className="landing-featured-projects-title">Built for real business momentum.</h2>
            <p className="landing-featured-projects-lead">
              Real products. Real impact. Explore the platforms we have built for businesses like yours.
            </p>
          </div>
          <div className="landing-featured-projects-actions">
            <a className="landing-featured-projects-contact" href="/#contact" onClick={scrollToContact}>
              <span>Get a Quote</span>
            </a>
          </div>
        </div>

        <p className="landing-projects-scroll-hint">Scroll to explore our work <span aria-hidden="true">↓</span></p>
        <div
          className="landing-project-stack"
          ref={projectStackRef}
          role="region"
          aria-label="Featured projects"
        >
          {featuredProjects.map((project, index) => (
            <div
              className="landing-project-stack-slide"
              key={project.title}
              style={{ zIndex: index + 1 }}
              onFocus={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  const stack = projectStackRef.current;
                  const gap = Number.parseFloat(window.getComputedStyle(stack).rowGap) || 0;
                  const precedingHeight = Array.from(stack.children).slice(0, index)
                    .reduce((height, slide) => height + slide.offsetHeight + gap, 0);
                  window.scrollTo({
                    top: stack.getBoundingClientRect().top + window.scrollY + precedingHeight - (Number.parseFloat(window.getComputedStyle(event.currentTarget).top) || 112),
                    behavior: 'instant',
                  });
                }
              }}
            >
              <FeaturedProjectCard
                project={project}
              />
            </div>
          ))}
        </div>

      </section>

      <section className="landing-contact-shell" id="contact">
        <div className="landing-contact-section">
          <div className="landing-contact-grid">
            <div className="landing-contact-copy">
              <h2 className="landing-contact-title">Contact Us</h2>
              <p className="landing-contact-copy-text">
                Have questions or ready to transform your business with AI automation,
                custom software, or internal systems?
              </p>

              <div className="landing-contact-card-list">
                {contactMethods.map((item) => (
                  <a
                    className="landing-contact-card"
                    key={item.title}
                    href={item.href}
                    onClick={item.href === '/#contact' ? scrollToContact : undefined}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                  >
                    <span className="landing-contact-card-icon">{item.icon}</span>
                    <span className="landing-contact-card-body">
                      <span className="landing-contact-card-title">{item.title}</span>
                      <span className="landing-contact-card-value">{item.value}</span>
                    </span>
                    <span className="landing-contact-card-arrow" aria-hidden="true">
                      <ArrowUpRight />
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="landing-contact-form-column">
              <div className="landing-contact-form-copy">
                <p className="landing-contact-form-heading">
                  <span>Build software that fits</span>{' '}
                  <span>the way your business works.</span>
                </p>
              </div>

              <form className="landing-contact-form-panel" onSubmit={handleSubmit}>
                <label className="landing-contact-field">
                  <span className="landing-contact-field-label">Name</span>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    value={formState.name}
                    onChange={handleChange}
                    required
                  />
                </label>
                <label className="landing-contact-field">
                  <span className="landing-contact-field-label">Email</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={formState.email}
                    onChange={handleChange}
                    required
                  />
                </label>
                <label className="landing-contact-field landing-contact-field-textarea">
                  <span className="landing-contact-field-label">Message</span>
                  <textarea
                    name="message"
                    placeholder="Tell us about your project and what you’d like to build."
                    rows="6"
                    value={formState.message}
                    onChange={handleChange}
                    required
                  />
                </label>
                <button
                  className="landing-contact-submit"
                  type="submit"
                  disabled={submitState.status === "submitting" || isContactCoolingDown}
                >
                  {submitState.status === "submitting"
                    ? "Sending..."
                    : isContactCoolingDown
                      ? `Send again in ${cooldownLabel}`
                      : "Submit"}
                </button>
                <p
                  className={
                    submitState.status === "error"
                      ? "landing-contact-submit-message landing-is-error"
                      : "landing-contact-submit-message"
                  }
                  role="status"
                >
                  {submitState.message}
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-site-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-main">
            <div className="landing-footer-brand">
              <a className="landing-footer-wordmark" href={companyProfileHomeUrl} aria-label="ZeroOne home">
                <span className="landing-footer-wordmark-primary">Zero<span className="brand-one">One</span> IT <span className="brand-one">Inc.</span></span>
              </a>
              <p className="landing-footer-description">
                Scaling operations requires software that works for operators. ZeroOne
                builds precision IT solutions for modern businesses in the Philippines.
              </p>
              <div className="landing-footer-direct">
                <p className="landing-footer-label">Direct Contact</p>
                <a className="landing-footer-direct-link" href="mailto:info@zerooneitinc.com">
                  info@zerooneitinc.com
                </a>
                <a className="landing-footer-direct-link" href="tel:+639190797137">
                  +63 919 079 7137
                </a>
              </div>
            </div>

            <div className="landing-footer-column">
              <p className="landing-footer-label">Services</p>
              <nav className="landing-footer-list" aria-label="Services">
                {footerCapabilities.map((item) => (
                  <a key={item.label} href={item.href}>
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="landing-footer-column">
              <p className="landing-footer-label">Navigation</p>
              <nav className="landing-footer-list" aria-label="Footer">
                {footerLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>

          <div className="landing-footer-badges" aria-label="Registration badges">
            {registrationBadges.map((badge) => (
              <span className="landing-footer-badge" key={badge.label}>
                <img className="landing-footer-badge-logo" src={badge.logo} alt={badge.alt} />
                <span>{badge.label}</span>
              </span>
            ))}
          </div>

          <div className="landing-footer-bottom">
            <p className="landing-footer-copyright">© 2026 ZEROONE IT INC. ALL RIGHTS RESERVED.</p>
          </div>
        </div>
      </footer>
      <BackToTop />
      <ChatWidget />
    </div>
  );
}
