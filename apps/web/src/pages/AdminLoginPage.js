import { useState } from 'react';
import Seo from '../components/Seo';
import loginLogo from '../assets/company/zeroone-dark-logo.png';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import '../admin-theme.css';

const apiBaseUrl = getApiBaseUrl();

function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formState, setFormState] = useState({
    email: '',
    password: ''
  });
  const [submitState, setSubmitState] = useState({
    status: 'idle',
    message: ''
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setFormState((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitState({
      status: 'submitting',
      message: 'Signing in...'
    });

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formState)
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to sign in.');
      }

      window.localStorage.setItem('zerooneAdminToken', payload.token);
      window.localStorage.setItem('zerooneAdminUser', JSON.stringify(payload.user));
      const returnTo = new URLSearchParams(window.location.search).get('returnTo');
      const destination = returnTo === '/admin/contracts' ? returnTo : '/admin/dashboard';
      window.history.pushState({}, '', destination);
      window.dispatchEvent(new PopStateEvent('popstate'));
      setSubmitState({
        status: 'success',
        message: 'Signed in successfully.'
      });
    } catch (error) {
      setSubmitState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to sign in.'
      });
    }
  }

  return (
    <main className="admin-theme admin-login min-h-screen overflow-hidden text-white">
      <Seo
        title="Admin Login | ZeroOne IT Inc."
        description="Private ZeroOne IT Inc. administrator login."
        canonicalPath="/admin/login"
        noindex
      />
      <section className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">


        <div className="hidden lg:block">
          <div className="admin-login-feature inline-flex h-12 items-center gap-3 rounded-full border border-white/15 px-4 text-sm font-semibold text-violet-100 shadow-2xl shadow-blue-950/20 backdrop-blur">
            <span className="grid h-7 w-7 place-items-center rounded-full admin-brand-surface text-xs font-black text-white">
              01
            </span>
            ZeroOne IT Inc.
          </div>

          <h1 className="mt-8 max-w-xl text-6xl font-bold leading-[0.95] tracking-normal text-white">
            Admin Login
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Access the internal dashboard for managing inquiries, website content, and operational tools.
          </p>

          <div className="mt-10 grid max-w-xl grid-cols-2 gap-4">
            {['Website content', 'Visitor insights', 'Knowledge base', 'Mail settings'].map((item) => (
              <div
                className="admin-login-feature rounded-lg border border-white/15 p-4 text-sm font-semibold text-slate-200"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[29rem]">
          <div className="mb-7 flex items-center justify-between lg:hidden">
            <a className="text-sm font-bold text-violet-100" href="/">
              ZeroOne
            </a>
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-300">
              Admin
            </span>
          </div>

          <form
            className="admin-login-panel relative p-6 sm:p-8"
            onSubmit={handleSubmit}
          >
            <div className="admin-login-logo">
              <img src={loginLogo} alt="ZeroOne Information Technology Inc." />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
                  Secure Portal
                </p>
                <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
                  Welcome Back
                </h2>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/5 text-sm font-black text-violet-100">
                01
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Email</span>
                <input
                  className="h-[52px] w-full rounded-lg border border-white/15 bg-white/5 px-4 text-base text-white outline-none transition placeholder:text-slate-400 focus:border-[#817391] focus:bg-white/10 focus:ring-4 focus:ring-[#817391]/15"
                  type="email"
                  name="email"
                  value={formState.email}
                  onChange={handleChange}
                  autoComplete="username"
                  placeholder="admin@zeroone.local"
                  required
                />
              </label>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200" htmlFor="admin-password">Password</label>
                <div className="relative">
                  <input
                    id="admin-password"
                    className="h-[52px] w-full rounded-lg border border-white/15 bg-white/5 pl-4 pr-20 text-base text-white outline-none transition placeholder:text-slate-400 focus:border-[#817391] focus:bg-white/10 focus:ring-4 focus:ring-[#817391]/15"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formState.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    className="absolute inset-y-0 right-2 my-auto h-10 rounded px-3 text-sm font-semibold text-violet-100 transition hover:text-white"
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-controls="admin-password"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            <button
              className="mt-7 flex h-[52px] w-full items-center justify-center rounded-lg admin-brand-surface font-bold text-white shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:brightness-110 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70"
              type="submit"
              disabled={submitState.status === 'submitting'}
            >
              {submitState.status === 'submitting' ? 'Signing In...' : 'Sign In'}
            </button>

            <p
              className={`mt-5 min-h-5 rounded-lg border px-4 py-3 text-sm ${
                submitState.status === 'error'
                  ? 'border-rose-300/20 bg-rose-500/10 text-rose-200'
                  : submitState.status === 'success'
                    ? 'border-emerald-300/20 bg-emerald-500/10 text-emerald-200'
                    : 'border-transparent bg-transparent text-slate-400'
              } ${submitState.message ? 'block' : 'hidden'}`}
              role="status"
            >
              {submitState.message}
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

export default AdminLoginPage;
