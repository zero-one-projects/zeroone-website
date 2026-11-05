import { useEffect, useMemo, useState } from 'react';
import SharedBillingPage from './pages/SharedBillingPage';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import SharedQuotationPage from './pages/SharedQuotationPage';
import VerificationCodePage from './pages/VerificationCodePage';
import { getApiBaseUrl } from './utils/apiBaseUrl';

const apiBaseUrl = getApiBaseUrl();
const duplicateVisitWindowMs = 1500;
let lastTrackedVisit = {
  path: '',
  time: 0
};

function getRouteFromLocation() {
  const { hash, pathname } = window.location;
  const hasAdminToken = Boolean(window.localStorage.getItem('zerooneAdminToken'));

  if (pathname === '/verification-code') {
    return { page: 'verification-code', codeFragment: hash, anchor: '' };
  }

  if (/^\/billing\/[a-f0-9]{64}$/.test(pathname)) return { page: 'shared-billing', token: pathname.slice('/billing/'.length), anchor: '' };

  if (pathname.startsWith('/quotation/')) {
    return { page: 'shared-quotation', token: pathname.slice('/quotation/'.length), anchor: '' };
  }

  if (pathname === '/about-us') {
    return {
      page: 'about',
      anchor: hash.replace('#', '')
    };
  }

  if (pathname === '/admin/login') {
    return {
      page: 'admin-login',
      anchor: ''
    };
  }

  if (pathname === '/admin' || pathname === '/admin/dashboard') {
    if (!hasAdminToken) {
      window.history.replaceState({}, '', '/admin/login');
      return {
        page: 'admin-login',
        anchor: ''
      };
    }

    return {
      page: 'admin-dashboard',
      anchor: ''
    };
  }

  if (pathname === '/admin/quotation-list') {
    if (!hasAdminToken) {
      window.history.replaceState({}, '', '/admin/login');
      return { page: 'admin-login', anchor: '' };
    }
    return { page: 'admin-quotation-list', anchor: '' };
  }

  if (pathname === '/admin/clients/add') {
    if (!hasAdminToken) { window.history.replaceState({}, '', '/admin/login'); return { page: 'admin-login', anchor: '' }; }
    return { page: 'admin-add-client', anchor: '' };
  }

  if (pathname === '/admin/clients') {
    if (!hasAdminToken) { window.history.replaceState({}, '', '/admin/login'); return { page: 'admin-login', anchor: '' }; }
    return { page: 'admin-clients', anchor: '' };
  }

  if (pathname === '/admin/billing' || (pathname === '/admin/quotations' && new URLSearchParams(window.location.search).get('tab') === 'billing')) {
    if (!hasAdminToken) { window.history.replaceState({}, '', '/admin/login'); return { page: 'admin-login', anchor: '' }; }
    if (pathname !== '/admin/billing') window.history.replaceState({}, '', '/admin/billing');
    return { page: 'admin-billing', anchor: '' };
  }

  if (pathname === '/admin/contracts') {
    if (!hasAdminToken) { window.history.replaceState({}, '', '/admin/login'); return { page: 'admin-login', anchor: '' }; }
    return { page: 'admin-contracts', anchor: '' };
  }

  if (pathname === '/admin/quotations') {
    if (!hasAdminToken) {
      window.history.replaceState({}, '', '/admin/login');
      return { page: 'admin-login', anchor: '' };
    }
    return { page: 'admin-quotations', anchor: '' };
  }

  if (pathname === '/admin/mail-config') {
    if (!hasAdminToken) {
      window.history.replaceState({}, '', '/admin/login');
      return {
        page: 'admin-login',
        anchor: ''
      };
    }

    return {
      page: 'admin-mail-config',
      anchor: ''
    };
  }

  if (pathname === '/admin/content') {
    if (!hasAdminToken) {
      window.history.replaceState({}, '', '/admin/login');
      return {
        page: 'admin-login',
        anchor: ''
      };
    }

    return {
      page: 'admin-content',
      anchor: ''
    };
  }

  if (pathname === '/admin/knowledge-base') {
    if (!hasAdminToken) {
      window.history.replaceState({}, '', '/admin/login');
      return {
        page: 'admin-login',
        anchor: ''
      };
    }

    return {
      page: 'admin-knowledge-base',
      anchor: ''
    };
  }

  if (hash === '#contact') {
    return {
      page: 'landing',
      anchor: 'contact'
    };
  }

  return {
    page: 'landing',
    anchor: ''
  };
}

function App() {
  const [route, setRoute] = useState(() => getRouteFromLocation());

  useEffect(() => {
    const onRouteChange = () => {
      setRoute(getRouteFromLocation());
    };

    window.addEventListener('hashchange', onRouteChange);
    window.addEventListener('popstate', onRouteChange);

    return () => {
      window.removeEventListener('hashchange', onRouteChange);
      window.removeEventListener('popstate', onRouteChange);
    };
  }, []);

  useEffect(() => {
    if (!route.anchor) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    requestAnimationFrame(() => {
      document.getElementById(route.anchor)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }, [route]);

  useEffect(() => {
    if (!['landing', 'about'].includes(route.page)) {
      return;
    }

    const path = `${window.location.pathname}${window.location.hash}`;
    const now = Date.now();

    if (lastTrackedVisit.path === path && now - lastTrackedVisit.time < duplicateVisitWindowMs) {
      return;
    }

    lastTrackedVisit = {
      path,
      time: now
    };

    fetch(`${apiBaseUrl}/api/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path }),
      keepalive: true
    }).catch(() => {});
  }, [route.page, route.anchor]);

  const page = useMemo(() => {
    if (route.page === 'verification-code') {
      return <VerificationCodePage key={route.codeFragment} fragment={route.codeFragment} />;
    }
    if (route.page === 'shared-billing') return <SharedBillingPage key={route.token} token={route.token} />;
    if (route.page === 'shared-quotation') {
      return <SharedQuotationPage token={route.token} />;
    }
    if (route.page === 'admin-login') {
      return <AdminLoginPage />;
    }

    if (route.page === 'admin-dashboard') {
      return <AdminDashboardPage page="dashboard" />;
    }

    if (route.page === 'admin-quotation-list') {
      return <AdminDashboardPage page="quotation-list" />;
    }

    if (route.page === 'admin-add-client') return <AdminDashboardPage page="add-client" />;

    if (route.page === 'admin-clients') return <AdminDashboardPage page="clients" />;

    if (route.page === 'admin-billing') return <AdminDashboardPage page="billing" />;

    if (route.page === 'admin-contracts') return <AdminDashboardPage page="contracts" />;

    if (route.page === 'admin-quotations') {
      return <AdminDashboardPage page="quotations" />;
    }

    if (route.page === 'admin-mail-config') {
      return <AdminDashboardPage page="mail-config" />;
    }

    if (route.page === 'admin-content') {
      return <AdminDashboardPage page="content" />;
    }

    if (route.page === 'admin-knowledge-base') {
      return <AdminDashboardPage page="knowledge-base" />;
    }

    if (route.page === 'about') {
      return <AboutPage />;
    }

    return <LandingPage />;
  }, [route.page, route.token, route.codeFragment]);

  return page;
}

export default App;
