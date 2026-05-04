import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import toast from 'react-hot-toast';
import { Zap, Mail, Lock, User, ArrowRight, Building2, Store, Shield } from 'lucide-react';

export default function CanteenAuth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const data = await api.login(email, password);
        if (data.user.role === 'student') {
          toast.error('This is the college/canteen login. Use the Student login instead.');
          setLoading(false);
          return;
        }
        login(data.token, data.user);
        toast.success(`Welcome back, ${data.user.name}!`);
        if (data.user.role === 'college_admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/staff/orders');
        }
      } else {
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (!collegeName.trim()) {
          toast.error('Please enter your college name');
          setLoading(false);
          return;
        }
        const data = await api.registerCollege(name, email, password, collegeName);
        login(data.token, data.user);
        toast.success('College registered! Set up your canteens.');
        navigate('/admin/dashboard');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-role-badge auth-role-canteen">
            <Store size={20} />
            Partner
          </div>
          <h1>{mode === 'login' ? 'Welcome back' : 'Register your college'}</h1>
          <p>{mode === 'login' ? 'Sign in as college admin or canteen staff' : 'Set up your college on SkipQ'}</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'auth-tab-active' : ''}`}
            onClick={() => setMode('login')}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'auth-tab-active' : ''}`}
            onClick={() => setMode('register')}
          >
            Register College
          </button>
        </div>

        {mode === 'login' && (
          <div className="auth-info-cards">
            <div className="auth-info-card">
              <Shield size={16} />
              <div>
                <strong>College Admin?</strong>
                <span>Login to manage canteens & staff</span>
              </div>
            </div>
            <div className="auth-info-card">
              <Store size={16} />
              <div>
                <strong>Canteen Staff?</strong>
                <span>Login with credentials from your admin</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="input-group">
              <User size={18} className="input-icon" />
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              placeholder={mode === 'register' ? 'Password (min. 6 characters)' : 'Password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={mode === 'register' ? 6 : undefined}
            />
          </div>

          {mode === 'register' && (
            <>
              <div className="input-group">
                <Building2 size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="College name (e.g. NIT Surathkal)"
                  value={collegeName}
                  onChange={e => setCollegeName(e.target.value)}
                  required
                />
              </div>
              <div className="auth-notice auth-notice-info">
                As college admin, you'll be able to create canteens and assign staff credentials. Canteen staff don't need to register — you create their accounts.
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading
              ? (mode === 'login' ? 'Signing in...' : 'Registering...')
              : (mode === 'login' ? 'Sign In' : 'Register College')
            }{' '}
            <ArrowRight size={18} />
          </button>
        </form>

        {mode === 'login' && (
          <div className="auth-demo">
            <p>Demo accounts:</p>
            <div className="demo-accounts">
              <button className="demo-btn" onClick={() => { setEmail('admin@skipq.com'); setPassword('admin123'); }}>
                College Admin
              </button>
              <button className="demo-btn" onClick={() => { setEmail('staff@skipq.com'); setPassword('staff123'); }}>
                Canteen Staff
              </button>
            </div>
          </div>
        )}

        <p className="auth-footer">
          Are you a student? <Link to="/student/auth">Student Login</Link>
        </p>
      </div>
    </div>
  );
}
