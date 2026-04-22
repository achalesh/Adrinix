import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE } from '../config/api';
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
      <div className={styles.authBox}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src="/logo.png" alt="Adrinix Logo" style={{ width: '60px', marginBottom: '10px' }} />
          <h2 style={{ margin: 0, fontSize: '24px' }}>
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset' && 'Create New Password'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '5px' }}>
            {mode === 'login' && 'Enter your credentials to access the portal'}
            {mode === 'register' && 'Set up your Adrinix billing workspace'}
            {mode === 'forgot' && 'We will send a secure link to your email'}
            {mode === 'reset' && 'Secure your account with a fresh password'}
          </p>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}
        {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {mode === 'register' && (
            <div className="form-group">
              <label>Business Name</label>
              <input className="input-field" required value={company} onChange={e => setCompany(e.target.value)} placeholder="Adrinix Ltd." />
            </div>
          )}
          
          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <div className="form-group">
              <label>Email Address</label>
              <input className="input-field" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
          )}
          
          {(mode === 'login' || mode === 'register' || mode === 'reset') && (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label>Password</label>
                {mode === 'login' && (
                  <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '12px', cursor: 'pointer', padding: 0 }}>
                    Forgot?
                  </button>
                )}
              </div>
              <input className="input-field" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={isLoading}>
            {isLoading ? 'Processing...' : (
              mode === 'login' ? 'Secure Login' :
              mode === 'register' ? 'Register Account' :
              mode === 'forgot' ? 'Send Recovery Link' :
              'Save New Password'
            )}
          </button>
          
          {(mode === 'login' || mode === 'register') && (
            <button type="button" onClick={handleDemoLogin} className="btn-secondary" style={{ width: '100%' }}>
              UI Preview (No Database)
            </button>
          )}
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {mode === 'login' && "Don't have an account? "}
            {mode === 'register' && "Already have an account? "}
            {(mode === 'forgot' || mode === 'reset') && "Ready to return? "}
          </span>
          <button 
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
};
