import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      return;
    }

    if (!user) {
      setError('No authenticated user found.');
      return;
    }

    setIsSubmitting(true);

    const { data: emailData, error: emailError } = await supabase
      .rpc('generate_n4_email', {
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
      });

    if (emailError || !emailData) {
      setIsSubmitting(false);
      setError(emailError?.message || 'Failed to generate N4 email.');
      return;
    }

    const n4Email = emailData as string;
    const displayName = `${firstName.trim()} ${lastName.trim()}`;

    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        n4_email: n4Email,
        display_name: displayName,
        onboarding_completed: true,
      });

    setIsSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setGeneratedEmail(n4Email);
    await refreshProfile();
  };

  if (generatedEmail) {
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
          <h1 style={styles.title}>Welcome to N4</h1>
          <p style={styles.subtitle}>Your account is ready</p>

          <div style={styles.emailDisplay}>
            <span style={styles.emailLabel}>Your N4 Email Address</span>
            <span style={styles.emailValue}>{generatedEmail}</span>
          </div>

          <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', margin: '16px 0 24px', lineHeight: 1.6 }}>
            This is your unique N4 platform email address. You can use it to communicate with other N4 users.
          </p>

          <a href="/" style={styles.button}>
            Continue to Dashboard
          </a>
        </div>
      </div>
    );
  }

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
        <h1 style={styles.title}>Set Up Your Profile</h1>
        <p style={styles.subtitle}>
          Tell us your name and we'll generate your unique N4 email address
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <label style={styles.label}>First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={styles.input}
            placeholder="Peter"
            autoFocus
          />

          <label style={styles.label}>Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            style={styles.input}
            placeholder="Smith"
          />

          {firstName.trim() && lastName.trim() && (
            <div style={styles.preview}>
              <span style={{ color: '#6b7280', fontSize: 11 }}>Preview:</span>
              <span style={{ color: '#fb8c00', fontSize: 13 }}>
                {firstName.trim().toLowerCase().replace(/[^a-z]/gi, '')}.
                {lastName.trim().toLowerCase().replace(/[^a-z]/gi, '')}@n4mail.com
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.button,
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Generating...' : 'Generate My N4 Email'}
          </button>
        </form>
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
    maxWidth: 420,
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
    lineHeight: 1.5,
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
    display: 'block',
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
    textAlign: 'center' as const,
    textDecoration: 'none',
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
  preview: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'rgba(251,140,0,0.06)',
    border: '1px solid rgba(251,140,0,0.15)',
    borderRadius: 8,
  },
  emailDisplay: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 6,
    padding: '20px 16px',
    background: 'rgba(251,140,0,0.06)',
    border: '1px solid rgba(251,140,0,0.2)',
    borderRadius: 10,
    marginTop: 24,
  },
  emailLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  emailValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fb8c00',
    letterSpacing: 0.3,
  },
};
