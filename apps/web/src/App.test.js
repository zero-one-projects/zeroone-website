import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

test('support navigation leads to a dedicated coming soon page', () => {
  const landing = render(<App />);
  expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
  landing.unmount();

  window.history.pushState({}, '', '/support');
  render(<App />);
  expect(screen.getByRole('heading', { name: /coming soon/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /contact our team/i })).toHaveAttribute('href', '/#contact');
  expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
});

test('renders landing hero heading by default', () => {
  render(<App />);

  const heading = screen.getByRole('heading', {
    name: /build\. transform\. scale with confidence\./i
  });

  expect(heading).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /open chat/i })).toBeInTheDocument();
});

test('about services display numbered capabilities and tags followed by the team', () => {
  window.history.pushState({}, '', '/about-us');
  render(<App />);
  const services = screen.getByRole('heading', { name: 'Capabilities', level: 2 }).closest('section');
  expect(services.querySelectorAll('.services-cap-card')).toHaveLength(6);
  expect(services.querySelector('.services-cap-number')).toHaveTextContent('01');
  expect(services.querySelectorAll('.services-cap-number')[5]).toHaveTextContent('06');
  expect(screen.getByRole('list', { name: 'Custom Web Application Development capabilities' }))
    .toHaveTextContent('Web Portals');
  expect(screen.getByRole('list', { name: 'AI & Business Automation capabilities' }))
    .toHaveTextContent('Workflow Automation');
  for (const [title, description] of [
    ['Custom Web Application Development', 'Business platforms, dashboards, web portals, MIS, ERP, payroll, and management systems'],
    ['Mobile App Development', 'Android and iOS apps, customer applications, business applications'],
    ['Desktop Application Development', 'Desktop software, school systems, office applications'],
    ['POS, Inventory & Retail Solutions', 'POS, inventory, e-commerce, sales tracking, multi-branch management'],
    ['Booking & Business Management Systems', 'Hotel management, online reservations, appointments, scheduling'],
    ['AI & Business Automation', 'AI integrations, workflow automation, intelligent business solutions']
  ]) {
    const row = screen.getByRole('heading', { name: title, level: 3 }).closest('article');
    expect(row.querySelector('.services-cap-description')).toHaveTextContent(description);
  }
  expect(screen.getByRole('heading', { name: 'Team' })).toBeInTheDocument();
  expect(document.getElementById('services').nextElementSibling).toHaveAttribute('id', 'team');
  expect(screen.queryByRole('link', { name: 'Team' })).not.toBeInTheDocument();
  expect(screen.queryByText('Common Challenges')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Operational bottlenecks should not hold your business back.' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'A practical process built around your business.' })).toBeInTheDocument();
});

test('renders about page from the about route', () => {
  window.history.pushState({}, '', '/about-us');

  render(<App />);

  const heading = screen.getByRole('heading', {
    name: /who we are/i
  });

  expect(heading).toBeInTheDocument();
  expect(heading).not.toHaveAttribute('data-scroll-reveal-block');
  expect(heading.querySelector('.scroll-reveal-content')).toBeNull();
  expect(screen.queryByRole('heading', { name: /from idea to deployment/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /open chat/i })).toBeInTheDocument();
});

test('renders hidden admin login page from the admin route', () => {
  window.history.pushState({}, '', '/admin/login');

  render(<App />);

  const heading = screen.getByRole('heading', {
    name: /admin login/i
  });

  expect(heading).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /open chat/i })).not.toBeInTheDocument();
});

test('featured project stack shows every project with its image and live destination', () => {
  render(<App />);
  const showcase = screen.getByRole('region', { name: 'Featured projects' });
  expect(showcase.querySelectorAll('article')).toHaveLength(6);
  for (const title of [
    'Italian Holidays Travel Platform',
    'RCM Ventures Business Portal',
    'Madrasa Management Enrollment System',
    'SaaS Pickleball Booking Platform',
    'SaaS POS Platform',
    'Diamondlink ICT Services Platform'
  ]) {
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  }
  expect(showcase.querySelectorAll('.landing-browser-preview--main img')).toHaveLength(6);
  const diamondlink = showcase.querySelector('a[href="https://www.diamondlinkict.com/"]');
  expect(diamondlink).toHaveTextContent('View Project Preview');
  expect(diamondlink.closest('article')).toHaveTextContent('Ongoing');
  expect(diamondlink.closest('article').querySelector('.landing-browser-preview--main img'))
    .toHaveAttribute('src', expect.stringContaining('diamond-link-ict'));
  const rcmLink = showcase.querySelector('a[href="https://www.rcmventures.net/admin/login"]');
  expect(rcmLink).toBeInTheDocument();
  expect(rcmLink.closest('article')).toHaveTextContent('Completed');
  expect(rcmLink.closest('article').querySelector('.landing-browser-preview--main img'))
    .toHaveAttribute('src', expect.stringContaining('rcm-ventures-login'));
  expect(showcase.querySelector('a[href="https://italianholidays.net/login"]')).toBeInTheDocument();
  expect(showcase.querySelector('a[href="https://pos.zeroone-apps.com/login"]')).toBeInTheDocument();
});

test('project stacking works on narrow screens and lets tall cards scroll into view', () => {
  const originalMatchMedia = window.matchMedia;
  const originalWidth = window.innerWidth;
  window.innerWidth = 390;
  window.matchMedia = jest.fn((query) => ({
    matches: query === '(prefers-reduced-motion: no-preference)',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
  let update;
  const animation = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    update = callback;
    return 1;
  });
  const heights = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(900);
  const positions = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return { top: Number(this.style.zIndex || 0) * 100, height: 500 };
  });
  let view;
  try {
    view = render(<App />);
    act(() => update());
    const slide = screen.getByRole('region', { name: 'Featured projects' }).firstElementChild;
    expect(slide.style.getPropertyValue('--stack-top')).toBe(`${Math.min(112, window.innerHeight - 924)}px`);
    expect(Number(slide.style.getPropertyValue('--stack-scale'))).toBeLessThan(1);
    expect(Number(slide.style.getPropertyValue('--stack-brightness'))).toBeLessThan(1);
  } finally {
    view?.unmount();
    animation.mockRestore();
    heights.mockRestore();
    positions.mockRestore();
    window.matchMedia = originalMatchMedia;
    window.innerWidth = originalWidth;
  }
});

test('navigation menu toggles and closes after choosing a destination', () => {
  render(<App />);
  const toggle = screen.getByRole('button', { name: /menu/i });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const primary = screen.getByRole('navigation', { name: 'Primary' });
  fireEvent.keyDown(primary, { key: 'Escape' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveFocus();
  fireEvent.click(toggle);
  fireEvent.click(primary.querySelector('a[href="/"]'));
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('layered previews preserve the supplied front and background screenshots', () => {
  render(<App />);
  const cards = screen.getByRole('region', { name: 'Featured projects' }).querySelectorAll('article');
  expect(cards[0].querySelector('.landing-browser-preview--left img'))
    .toHaveAttribute('src', expect.stringContaining('italian-holidays-about'));
  expect(cards[0].querySelector('.landing-browser-preview--right img'))
    .toHaveAttribute('src', expect.stringContaining('italian-holidays-contact'));
  expect(cards[2].querySelector('.landing-browser-preview--main img'))
    .toHaveAttribute('src', expect.stringContaining('madrasa-login-portal'));
  expect(cards[2].querySelector('.landing-browser-preview--left img'))
    .toHaveAttribute('src', expect.stringContaining('madrasa-management-login'));
  expect(cards[2].querySelector('.landing-browser-preview--right img'))
    .toHaveAttribute('src', expect.stringContaining('madrasa-management-dashboard'));
  const diamondlink = screen.getByRole('heading', { name: 'Diamondlink ICT Services Platform' }).closest('article');
  expect(diamondlink.querySelector('.landing-browser-preview--main img'))
    .toHaveAttribute('src', expect.stringContaining('diamond-link-ict'));
  expect(diamondlink.querySelector('.landing-browser-preview--left img'))
    .toHaveAttribute('src', expect.stringContaining('diamond-link-client-login'));
  expect(diamondlink.querySelector('.landing-browser-preview--right img'))
    .toHaveAttribute('src', expect.stringContaining('diamond-link-careers'));
  const pos = screen.getByRole('heading', { name: 'SaaS POS Platform' }).closest('article');
  expect(pos.querySelector('.landing-browser-preview--main img'))
    .toHaveAttribute('src', expect.stringContaining('zeroone-pos-login'));
  expect(pos.querySelector('.landing-browser-preview--left img'))
    .toHaveAttribute('src', expect.stringContaining('zeroone-pos-dashboard'));
  expect(pos.querySelector('.landing-browser-preview--right img'))
    .toHaveAttribute('src', expect.stringContaining('zeroone-pos-reports'));
});

test('client record sidebar route opens its two payment types for an authenticated admin', async () => {
  const previousFetch = global.fetch;
  localStorage.setItem('zerooneAdminToken', 'client-route-test');
  window.history.pushState({}, '', '/admin/clients');
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ clients: [], total: 0 }) }));
  try {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Client Record' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clients' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Client Records' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Add Client' })).toHaveAttribute('href', '/admin/clients/add');
    expect(screen.getByRole('tab', { name: 'Custom Subscriptions' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Custom One-time Payment' })).toBeInTheDocument();
    expect(await screen.findByText(/No custom subscription client records found/)).toBeInTheDocument();
  } finally { global.fetch = previousFetch; localStorage.removeItem('zerooneAdminToken'); }
});

test.each(['/admin/billing', '/admin/quotations?tab=billing'])('opens standalone billing from %s', async (path) => {
  localStorage.setItem('zerooneAdminToken', 'test-session');
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ subscriptions: [], statements: [], total: 0 }) }));
  window.history.replaceState({}, '', path);
  try {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Billing', level: 1 })).toBeInTheDocument();
    await screen.findByText('No billing statements found.');
    expect(screen.getByRole('link', { name: 'Billing' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Billing' })).toHaveAttribute('href', '/admin/billing');
    expect(screen.getByRole('button', { name: 'Sales & Contract' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('tab', { name: 'Billing' })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/billing');
  } finally {
    localStorage.removeItem('zerooneAdminToken');
    global.fetch = previousFetch;
  }
});

test('Clients submenu opens Add Client and returns to Client Records after cancel', async () => {
  const previousFetch = global.fetch;
  HTMLDialogElement.prototype.showModal = jest.fn(function () { this.setAttribute('open', ''); });
  HTMLDialogElement.prototype.close = jest.fn(function () { this.removeAttribute('open'); });
  localStorage.setItem('zerooneAdminToken', 'client-menu-test');
  window.history.replaceState({}, '', '/admin/clients/add');
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ clients: [], total: 0 }) }));
  try {
    render(<App />);
    expect(await screen.findByRole('dialog', { name: 'Add Client' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add Client' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Payment type')).toHaveValue('subscription');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(window.location.pathname).toBe('/admin/clients');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Client Records' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Clients' }));
    expect(screen.getByRole('button', { name: 'Clients' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Add Client' })).not.toBeInTheDocument();
  } finally { global.fetch = previousFetch; localStorage.removeItem('zerooneAdminToken'); }
});
