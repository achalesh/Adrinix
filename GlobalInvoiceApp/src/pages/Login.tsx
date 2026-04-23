import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE } from '../config/api';
import { AdrinixLogo } from '../components/Logo';
import { Mail, Lock, Building, ArrowRight } from 'lucide-react';
import styles from './Login.module.css';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export const Login = () => {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (tokenParam) {
      setMode('reset');
    }
  }, [tokenParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload: any = { action: mode };

      if (mode === 'login' || mode === 'register') {
        payload.email = email;
        payload.password = password;
        if (mode === 'register') payload.company = company;
      } else if (mode === 'forgot') {
        payload.action = 'forgot_password';
        payload.email = email;
      } else if (mode === 'reset') {
        payload.action = 'reset_password';
        payload.token = tokenParam;
        payload.password = password;
      }

      const res = await fetch(`${API_BASE}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        if (mode === 'login' || mode === 'register') {
          login(data.token, data.refreshToken, data.user);
          navigate('/');
        } else if (mode === 'forgot') {
          setSuccess(data.message);
        } else if (mode === 'reset') {
          setSuccess('Password updated! You can now log in.');
          setMode('login');
          setPassword('');
        }
      } else {
        setError(data.message || 'Authentication Failed');
      }
    } catch (err) {
      setError('Network error: PHP backend not detected. Use Demo Mode.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    login('demo-token-123', 'demo-refresh-123', { id: 1, name: company || 'Demo Business', role: 'Owner' });
    navigate('/');
  };

  return (
    <div className={styles.container}>
      <div className={styles.backgroundGlow} />
      
      <div className={styles.authWrapper}>
        <div className={styles.brandSide}>
          <div className={styles.brandContent}>
            <AdrinixLogo size={60} className={styles.floatingLogo} />
            <h1 className={styles.brandTitle}>Adrinix</h1>
            <p className={styles.brandTagline}>Smart Billing. Anywhere.</p>
            
            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><ArrowRight size={14} /></div>
                <span>Multi-tenant secure workspace</span>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><ArrowRight size={14} /></div>
                <span>Automated recurring billing</span>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><ArrowRight size={14} /></div>
                <span>Premium branded portals</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formSide}>
          <div className={`${styles.authBox} glass-panel`}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>
                {mode === 'login' && 'Welcome Back'}
                {mode === 'register' && 'Get Started'}
                {mode === 'forgot' && 'Reset Password'}
                {mode === 'reset' && 'New Password'}
              </h2>
              <p className={styles.formSubtitle}>
                {mode === 'login' && 'Enter your credentials to continue'}
                {mode === 'register' && 'Create your business workspace today'}
                {mode === 'forgot' && 'We will send recovery instructions'}
                {mode === 'reset' && 'Choose a strong new password'}
              </p>
            </div>

            {error && <div className={styles.errorAlert}>{error}</div>}
            {success && <div className={styles.successAlert}>{success}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
              {mode === 'register' && (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Business Name</label>
                  <div className={styles.inputWrapper}>
                    <Building className={styles.inputIcon} size={18} />
                    <input 
                      className={styles.input} 
                      required 
                      value={company} 
                      onChange={e => setCompany(e.target.value)} 
                      placeholder="e.g. Acme Corp" 
                    />
                  </div>
                </div>
              )}
              
              {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Email Address</label>
                  <div className={styles.inputWrapper}>
                    <Mail className={styles.inputIcon} size={18} />
                    <input 
                      className={styles.input} 
                      type="email" 
                      required 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      placeholder="name@company.com" 
                    />
                  </div>
                </div>
              )}
              
              {(mode === 'login' || mode === 'register' || mode === 'reset') && (
                <div className={styles.inputGroup}>
                  <div className={styles.labelRow}>
                    <label className={styles.label}>Password</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => setMode('forgot')} className={styles.forgotLink}>
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className={styles.inputWrapper}>
                    <Lock className={styles.inputIcon} size={18} />
                    <input 
                      className={styles.input} 
                      type="password" 
                      required 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="••••••••" 
                      minLength={6} 
                    />
                  </div>
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ width: '100%', height: '48px' }} disabled={isLoading}>
                {isLoading ? 'Processing...' : (
                  mode === 'login' ? 'Login to Portal' :
                  mode === 'register' ? 'Create Account' :
                  mode === 'forgot' ? 'Send Link' :
                  'Update Password'
                )}
              </button>
              
              {(mode === 'login' || mode === 'register') && (
                <div className={styles.divider}>
                  <span>OR CONTINUE WITH</span>
                </div>
              )}

              {(mode === 'login' || mode === 'register') && (
                <button type="button" onClick={handleDemoLogin} className="btn-secondary" style={{ width: '100%', border: '1px dashed var(--primary-color)' }}>
                  Launch Instant Demo
                </button>
              )}
            </form>

            <div className={styles.footer}>
              <span>
                {mode === 'login' && "New to Adrinix? "}
                {mode === 'register' && "Already a member? "}
                {(mode === 'forgot' || mode === 'reset') && "Go back to "}
              </span>
              <button 
                className={styles.toggleMode}
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
              >
                {mode === 'login' ? 'Create an account' : 'Log in instead'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
