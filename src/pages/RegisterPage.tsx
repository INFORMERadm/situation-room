import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            src="/white_transparent.png"
            alt="N3 Logo"
            style={styles.logo}
          />
        </div>
        <h1 style={styles.title}>Create your N3 account</h1>
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
    background: '#fb8c00',
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
    color: '#fb8c00',
    textDecoration: 'none',
    fontWeight: 600,
  },
};
