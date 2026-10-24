import { useId, useRef, useState } from 'react';

function Header({ brand, className = '', navigation, contactHref }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigationId = useId();
  const menuToggleRef = useRef(null);
  return (
    <header className={`topbar ${className}`}>
      <a className="brand" href="/" aria-label="ZeroOne home">
        <img className="brand-tab-icon" src="/zeroone-tab-icon.svg" alt="" aria-hidden="true" />
        <div className="brand-copy">
          <strong>
            {brand.name.split(/(one|inc\.?)/i).map((part, index) =>
              index % 2 === 1 ? <span className="brand-one" key={index}>{part}</span> : part
            )}
          </strong>
        </div>
      </a>

      <button
        type="button"
        className="header-menu-toggle"
        ref={menuToggleRef}
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMenuOpen}
        aria-controls={navigationId}
        onClick={() => setIsMenuOpen((open) => !open)}
      >
        <svg className="header-menu-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" focusable="false">
          {isMenuOpen ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
      </button>

      <nav
        id={navigationId}
        className={`nav${isMenuOpen ? ' is-open' : ''}`}
        aria-label="Primary"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsMenuOpen(false);
            menuToggleRef.current?.focus();
          }
        }}
      >
        {navigation.map((item) => (
          <a key={item.id} className="nav-link" href={item.href ?? `#${item.id}`} onClick={(event) => {
            setIsMenuOpen(false);
            item.onClick?.(event);
          }}>
            {item.label}
          </a>
        ))}
        {contactHref ? (
          <a className="nav-link header-mobile-contact" href={contactHref} onClick={() => setIsMenuOpen(false)}>
            Contact Us
          </a>
        ) : null}
      </nav>

      {contactHref ? (
        <a className="btn btn-outline" href={contactHref}>
          Contact Us
        </a>
      ) : null}
    </header>
  );
}

export default Header;
