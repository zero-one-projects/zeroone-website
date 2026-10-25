import { useEffect } from 'react';

const defaultSiteUrl = process.env.REACT_APP_SITE_URL || 'https://zerooneitinc.com';
const publicUrl = process.env.PUBLIC_URL || '';
const defaultImagePath = `${publicUrl}/og-image-hero-2026.png?v=20261026-hero`;

function normalizeSiteUrl(value) {
  return value.replace(/\/+$/, '');
}

function toAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl) {
    return `${normalizeSiteUrl(defaultSiteUrl)}${defaultImagePath}`;
  }

  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${normalizeSiteUrl(defaultSiteUrl)}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

function setMeta(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  element.setAttribute('data-seo-managed', 'true');
}

function setLink(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('link');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  element.setAttribute('data-seo-managed', 'true');
}

function setStructuredData(structuredData) {
  document.head.querySelectorAll('script[data-seo-structured-data]').forEach((node) => {
    node.remove();
  });

  if (!structuredData) {
    return;
  }

  const graph = Array.isArray(structuredData) ? structuredData : [structuredData];
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-seo-structured-data', 'true');
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph
  });
  document.head.appendChild(script);
}

function Seo({
  title,
  description,
  canonicalPath = '/',
  image = defaultImagePath,
  type = 'website',
  noindex = false,
  structuredData
}) {
  useEffect(() => {
    const canonicalUrl = toAbsoluteUrl(canonicalPath);
    const imageUrl = toAbsoluteUrl(image);
    const robotsContent = noindex ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large';

    document.title = title;

    setMeta('meta[name="description"]', { name: 'description', content: description });
    setMeta('meta[name="robots"]', { name: 'robots', content: robotsContent });
    setMeta('meta[name="author"]', { name: 'author', content: 'ZeroOne IT Inc.' });
    setMeta('meta[name="application-name"]', { name: 'application-name', content: 'ZeroOne IT Inc.' });
    setMeta('meta[name="keywords"]', {
      name: 'keywords',
      content:
        'ZeroOne IT Inc., custom software development, AI automation, web development, mobile apps, internal systems, Philippines software company'
    });

    setMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'ZeroOne IT Inc.' });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    setMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl });
    setMeta('meta[property="og:image:secure_url"]', { property: 'og:image:secure_url', content: imageUrl });
    setMeta('meta[property="og:image:type"]', { property: 'og:image:type', content: 'image/png' });
    setMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: '1200' });
    setMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: '630' });
    setMeta('meta[property="og:image:alt"]', {
      property: 'og:image:alt',
      content: 'Zero One IT Inc. — Build. Transform. Scale with Confidence. Custom software, SaaS platforms, and AI-powered solutions, with the Zero One wordmark and Get a Quote.'
    });
    setMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'en_PH' });

    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });

    setLink('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl });
    setStructuredData(structuredData);
  }, [canonicalPath, description, image, noindex, structuredData, title, type]);

  return null;
}

export { defaultSiteUrl, toAbsoluteUrl };
export default Seo;
