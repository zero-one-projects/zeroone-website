import Header from '../components/Header';
import Seo from '../components/Seo';
import './SupportPage.css';

const navigation = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'services', label: 'Services', href: '/about-us#services' },
  { id: 'about', label: 'About Us', href: '/about-us' },
  { id: 'support', label: 'Support', href: '/support' },
  { id: 'contact', label: 'Contact Us', href: '/#contact' },
];

export default function SupportPage() {
  return (
    <div className="site about-page support-page">
      <Seo
        title="Support — Coming Soon | ZeroOne IT Inc."
        description="The ZeroOne support hub is coming soon. Contact our team for help in the meantime."
        canonicalPath="/support"
      />
      <Header brand={{ name: 'ZeroOne IT Inc.' }} className="landing-topbar" navigation={navigation} />
      <main className="support-main">
        <section className="support-content" aria-labelledby="support-title">
          <div className="support-emblem" aria-hidden="true">
            <span className="support-orbit support-orbit-outer" />
            <span className="support-orbit support-orbit-inner" />
            <span className="support-emblem-core">
              <svg width="54" height="54" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 26v-7a14 14 0 0 1 28 0v7M38 30v3a7 7 0 0 1-7 7h-4" />
                <rect x="7" y="21" width="8" height="13" rx="4" />
                <rect x="33" y="21" width="8" height="13" rx="4" />
                <rect x="21" y="37" width="8" height="5" rx="2.5" />
              </svg>
            </span>
            <span className="support-spark support-spark-one" />
            <span className="support-spark support-spark-two" />
          </div>
          <p className="support-eyebrow">ZeroOne Support</p>
          <h1 id="support-title">Coming <span>soon.</span></h1>
          <p className="support-description">A little more connected.<br />A lot more supported.</p>
          <p className="support-detail">We’re creating a dedicated space to help you get the most out of your ZeroOne solutions. Stay tuned.</p>
          <div className="support-status"><span aria-hidden="true" /> Something helpful is in the works</div>
          <div className="support-actions">
            <a className="support-contact" href="/#contact">Contact our team <span aria-hidden="true">↗</span></a>
            <a className="support-home" href="/">Back to home <span aria-hidden="true">→</span></a>
          </div>
          <p className="support-note">Need a hand now? We’re just a message away.</p>
        </section>
      </main>
      <footer className="support-footer"><span>ZeroOne IT Inc.</span><span>Built around your business.</span></footer>
    </div>
  );
}
