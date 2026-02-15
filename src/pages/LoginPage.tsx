import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (signInError) {
      setError(signInError);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <img
            src="/white_transparent.png"
            alt="N4 Logo"
            style={styles.logo}
          />
        </div>
        <h1 style={styles.title}>Sign in to N4</h1>
        <p style={styles.subtitle}>Access your agentic information platform</p>

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
            placeholder="Your password"
            autoComplete="current-password"
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
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>
            Create one
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
