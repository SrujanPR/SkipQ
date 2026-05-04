import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import type { College } from '../types';
import toast from 'react-hot-toast';
import { Building2 } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function GoogleSignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showCollegePicker, setShowCollegePicker] = useState(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollege, setSelectedCollege] = useState('');
  const [pendingCredential, setPendingCredential] = useState('');

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    });

    const buttonDiv = document.getElementById('google-signin-btn');
    if (buttonDiv) {
      window.google.accounts.id.renderButton(buttonDiv, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'signin_with',
        shape: 'pill',
      });
    }
  }, []);

  const handleGoogleResponse = async (response: { credential: string }) => {
    try {
      const data = await api.googleAuth(response.credential);

      if (data.needsCollege) {
        setColleges(data.colleges);
        setPendingCredential(response.credential);
        setShowCollegePicker(true);
        return;
      }

      login(data.token, data.user);
      toast.success(`Welcome${data.isNew ? '' : ' back'}, ${data.user.name}!`);
      if (data.user.role === 'college_admin') {
        navigate('/admin/dashboard');
      } else if (data.user.role === 'staff') {
        navigate('/staff/orders');
      } else {
        navigate('/canteens');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  };

  const handleCollegeSubmit = async () => {
    if (!selectedCollege) {
      toast.error('Please select your college');
      return;
    }
    try {
      const data = await api.googleAuth(pendingCredential, Number(selectedCollege));
      login(data.token, data.user);
      toast.success(`Welcome, ${data.user.name}! Account created.`);
      navigate('/canteens');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete sign-up');
    }
  };

  if (!GOOGLE_CLIENT_ID) return null;

  if (showCollegePicker) {
    return (
      <div className="google-college-picker">
        <p className="picker-title">Almost there! Select your college:</p>
        <div className="input-group">
          <Building2 size={18} className="input-icon" />
          <select
            value={selectedCollege}
            onChange={e => setSelectedCollege(e.target.value)}
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
        <button
          className="btn btn-primary btn-full"
          onClick={handleCollegeSubmit}
          disabled={!selectedCollege}
        >
          Complete Sign Up
        </button>
      </div>
    );
  }

  return (
    <div className="google-signin-wrapper">
      <div className="auth-divider">
        <span>or</span>
      </div>
      <div id="google-signin-btn" className="google-btn-container" />
    </div>
  );
}
