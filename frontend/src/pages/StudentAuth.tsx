import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import type { College } from '../types';
import toast from 'react-hot-toast';
import { Zap, Mail, Lock, User, ArrowRight, Building2, GraduationCap } from 'lucide-react';
import GoogleSignIn from '../components/GoogleSignIn';

export default function StudentAuth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.getColleges().then(setColleges).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const data = await api.login(email, password);
        if (data.user.role !== 'student') {
          toast.error('This is the student login. Use the Canteen/College login instead.');
          setLoading(false);
          return;
        }
        login(data.token, data.user);
        toast.success(`Welcome back, ${data.user.name}!`);
        navigate('/canteens');
      } else {
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (!collegeId) {
          toast.error('Please select your college');
          setLoading(false);
          return;
        }
        const data = await api.register(name, email, password, Number(collegeId));
        login(data.token, data.user);
        toast.success('Account created! Start ordering!');
        navigate('/canteens');
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
          <div className="auth-role-badge auth-role-student">
            <GraduationCap size={20} />
            Student
          </div>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
          <p>{mode === 'login' ? 'Sign in to skip the queue' : 'Join SkipQ and never wait in line again'}</p>
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
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="input-group">
              <User size={18} className="input-icon" />
              <input
                type="text"
                placeholder="Full name"
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
                <select
                  value={collegeId}
                  onChange={e => setCollegeId(e.target.value)}
                  required
                  className="auth-select"
                >
                  <option value="">Select your college</option>
                  {colleges.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {colleges.length === 0 && (
                <div className="auth-notice">
                  No colleges registered yet. Ask your college admin to sign up first!
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || (mode === 'register' && colleges.length === 0)}
          >
            {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign In' : 'Sign Up')}{' '}
            <ArrowRight size={18} />
          </button>
        </form>

        <GoogleSignIn />

        <p className="auth-footer">
          Not a student? <Link to="/canteen/auth">Partner Login</Link>
        </p>
      </div>
    </div>
  );
}
