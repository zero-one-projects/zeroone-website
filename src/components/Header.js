function Header({ brand, navigation, contactHref }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-copy">
          <strong>{brand.name}</strong>
        </div>
      </div>

      <nav className="nav" aria-label="Primary">
        {navigation.map((item) => (
          <a key={item.id} className="nav-link" href={`#${item.id}`}>
            {item.label}
          </a>
        ))}
      </nav>

      <a className="btn btn-outline contact-btn" href={contactHref}>
        Contact Us
      </a>
    </header>
  );
}

export default Header;
