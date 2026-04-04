import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const { error: signUpError } = await signUp(email.trim(), password);
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError);
    }
  };

  const passwordStrength = (() => {
    if (!password) return { label: '', color: 'transparent', width: '0%' };
    if (password.length < 8) return { label: 'Too short', color: '#ff4757', width: '25%' };
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    if (score <= 1) return { label: 'Weak', color: '#ff4757', width: '33%' };
    if (score <= 2) return { label: 'Fair', color: '#ffd93d', width: '55%' };
    if (score <= 3) return { label: 'Good', color: '#00e5ff', width: '78%' };
    return { label: 'Strong', color: '#00ff88', width: '100%' };
  })();

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <img
            src="/datadesk_main_icon.png"
            alt="DATADESK Logo"
            style={styles.logo}
          />
        </div>
        <h1 style={styles.title}>Create your DATADESK account</h1>
        <p style={styles.subtitle}>Get started with the agentic information platform</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
          />
          {password && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -4 }}>
              <div style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: '#1e2330',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: passwordStrength.width,
                  background: passwordStrength.color,
                  borderRadius: 2,
                  transition: 'width 0.3s, background 0.3s',
                }} />
              </div>
              <span style={{ fontSize: 11, color: passwordStrength.color, minWidth: 52 }}>
                {passwordStrength.label}
              </span>
            </div>
          )}

          <label style={styles.label}>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
            placeholder="Re-enter your password"
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.button,
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <span style={styles.dividerLine} />
          </div>

          <button
            type="button"
            disabled={googleLoading || isSubmitting}
            onClick={async () => {
              setGoogleLoading(true);
              setError(null);
              const { error: gErr } = await signInWithGoogle();
              if (gErr) { setError(gErr); setGoogleLoading(false); }
            }}
            style={{
              ...styles.googleButton,
              opacity: googleLoading ? 0.6 : 1,
              cursor: googleLoading ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0a',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: '#111318',
    border: '1px solid #1e2330',
    borderRadius: 12,
    padding: '40px 32px',
  },
  logoRow: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 56,
    height: 56,
    objectFit: 'contain' as const,
  },
  title: {
    textAlign: 'center' as const,
    fontSize: 22,
    fontWeight: 700,
    color: '#f0f6fc',
    margin: 0,
    letterSpacing: -0.3,
  },
  subtitle: {
    textAlign: 'center' as const,
    fontSize: 13,
    color: '#6b7280',
    margin: '8px 0 28px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#9ca3af',
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    color: '#f0f6fc',
    background: '#0a0a0a',
    border: '1px solid #2a2f3a',
    borderRadius: 8,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
  button: {
    marginTop: 8,
    padding: '12px 0',
    fontSize: 14,
    fontWeight: 600,
    color: '#0a0a0a',
    background: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontFamily: 'inherit',
    letterSpacing: 0.3,
    transition: 'opacity 0.2s',
  },
  error: {
    padding: '10px 14px',
    fontSize: 13,
    color: '#ff4757',
    background: 'rgba(255,71,87,0.08)',
    border: '1px solid rgba(255,71,87,0.2)',
    borderRadius: 8,
  },
  footer: {
    textAlign: 'center' as const,
    fontSize: 13,
    color: '#6b7280',
    marginTop: 24,
  },
  link: {
    color: '#ffffff',
    textDecoration: 'none',
    fontWeight: 600,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '8px 0 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#2a2f3a',
  },
  dividerText: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  googleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    padding: '11px 0',
    fontSize: 14,
    fontWeight: 600,
    color: '#f0f6fc',
    background: '#0a0a0a',
    border: '1px solid #2a2f3a',
    borderRadius: 8,
    fontFamily: 'inherit',
    letterSpacing: 0.2,
    transition: 'border-color 0.2s, opacity 0.2s',
  },
};
